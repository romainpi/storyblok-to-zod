import { generate } from "ts-to-zod";
import { LogLevel, Tracer } from "../statics/Tracer";
import { ValidationError, isNonEmptyString } from "../validation";

/**
 * Extracts a TypeScript interface from Storyblok's types definitions and returns it to a Zod schema.
 *
 * @param typeName - The name of the type/interface to extract from the Storyblok types file
 * @param sbTypesFileContent - The content of the storyblok.d.ts file
 * @returns A string containing the generated Zod schema with import statements and initial lines removed
 * @throws {ValidationError} When the specified interface cannot be found or is invalid
 * @throws {Error} When ts-to-zod fails to generate the schema
 *
 * @example
 * ```typescript
 * const zodSchema = extractInterfaceFromSbTypes('StoryblokAsset');
 * // Returns: "export const StoryblokAssetSchema = z.object({ ... });"
 * ```
 */
export default function extractSbInterfaceToZod(typeName: string, sbTypesFileContent: string): string {
  Tracer.log(LogLevel.DEBUG, `Enter with typeName='${typeName}'`, "extractSbInterfaceToZod");

  try {
    // Validate inputs
    if (!isNonEmptyString(typeName)) {
      throw new ValidationError("Type name must be a non-empty string", { typeName });
    }

    if (!isNonEmptyString(sbTypesFileContent)) {
      throw new ValidationError("Storyblok types file content must be a non-empty string", {
        contentType: typeof sbTypesFileContent,
        contentLength: (sbTypesFileContent as any)?.length || 0,
      });
    }

    // Create regex to find the interface definition
    const sbAssetInterfaceRegex = new RegExp(`interface ${typeName}( extends.*)* {[^}]+}`);

    const sbAssetMatch = sbTypesFileContent.match(sbAssetInterfaceRegex);

    if (!sbAssetMatch || !sbAssetMatch[0]) {
      throw new ValidationError(`Could not find interface '${typeName}' in storyblok.d.ts file`, {
        typeName,
        fileContentLength: sbTypesFileContent.length,
        availableInterfaces: extractAvailableInterfaces(sbTypesFileContent),
      });
    }

    const sbAssetInterface = sbAssetMatch[0];

    if (!sbAssetInterface.trim()) {
      throw new ValidationError(`Found empty interface definition for '${typeName}'`, { typeName });
    }

    Tracer.log(
      LogLevel.DEBUG,
      `Found interface '${typeName}' with length ${sbAssetInterface.length}`,
      "extractSbInterfaceToZod"
    );

    // Convert interface to Zod schema using ts-to-zod
    let schemaGenerator;
    let zodSchema;

    try {
      schemaGenerator = generate({ sourceText: sbAssetInterface });
      zodSchema = schemaGenerator.getZodSchemasFile("~/types/storyblok.d");
    } catch (error) {
      throw new Error(
        `Failed to generate Zod schema for interface '${typeName}': ${
          error instanceof Error ? error.message : "Unknown ts-to-zod error"
        }`
      );
    }

    if (!zodSchema || !zodSchema.trim()) {
      throw new ValidationError(`Generated empty Zod schema for interface '${typeName}'`, { typeName });
    }

    // Remove the first two lines (imports and empty line) and clean up
    const lines = zodSchema.split("\n");
    if (lines.length < 3) {
      throw new ValidationError(`Generated Zod schema for '${typeName}' has insufficient content`, {
        typeName,
        lineCount: lines.length,
      });
    }

    const cleanedSchema = lines.slice(2).join("\n").trim();

    if (!cleanedSchema) {
      throw new ValidationError(`Cleaned Zod schema for '${typeName}' is empty`, { typeName });
    }

    Tracer.log(LogLevel.DEBUG, `Successfully generated Zod schema for '${typeName}'`, "extractSbInterfaceToZod");

    return cleanedSchema;
  } catch (error) {
    if (error instanceof ValidationError) {
      Tracer.log(
        LogLevel.ERROR,
        `Validation error extracting interface '${typeName}': ${error.message}`,
        "extractSbInterfaceToZod"
      );
      throw error;
    }

    const wrappedError = new Error(
      `Unexpected error extracting interface '${typeName}': ${error instanceof Error ? error.message : "Unknown error"}`
    );

    Tracer.log(LogLevel.ERROR, wrappedError.message, "extractSbInterfaceToZod");
    throw wrappedError;
  }
}

/**
 * Helper function to extract available interfaces from the types file for better error reporting
 */
function extractAvailableInterfaces(fileContent: string): string[] {
  try {
    const interfaceRegex = /interface\s+(\w+)/g;
    const matches = [];
    let match;

    while ((match = interfaceRegex.exec(fileContent)) !== null) {
      if (match[1]) {
        matches.push(match[1]);
      }
    }

    return matches;
  } catch {
    return [];
  }
}
