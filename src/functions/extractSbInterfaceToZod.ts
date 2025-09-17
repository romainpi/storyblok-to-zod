import { generate } from "ts-to-zod";
import { LogLevel, Tracer } from "../statics/Tracer";
import { CLIOptions, ValidationError, isNonEmptyString } from "../validation";
import { InterfaceDeclaration } from "ts-morph";
import { pascalToCamelCase } from "../utils";

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
export default function extractSbInterfaceToZod(
  interfaceDeclaration: InterfaceDeclaration,
  options: CLIOptions
): string {
  const interfaceName = interfaceDeclaration.getName();
  Tracer.log(LogLevel.DEBUG, `Enter with interfaceName='${interfaceName}'`, "extractSbInterfaceToZod");

  const interfaceDefinition = interfaceDeclaration.getText();
  const interfaceProperties = interfaceDeclaration.getProperties();

  Tracer.log(
    LogLevel.DEBUG,
    `Found interface '${interfaceName}' with ${interfaceProperties.length} properties`,
    "extractSbInterfaceToZod"
  );

  /*
  We have a special case for Storyblok's "StoryblokMultiasset" interface which extends Array<StoryblokAsset> as follows:
  ```
  interface StoryblokMultiasset extends Array<StoryblokAsset> {
  }
  ```

  The test is:
  - the interface has only one "extends" clause
  - the interface "extends" clause is an Array<T> or a T[] expression
  - the interface has zero properties

  */
  const extendsExpressions = interfaceDeclaration.getExtends();
  const typeArgs = extendsExpressions.map((expr) => expr.getTypeArguments().map((arg) => arg.getText())).flat();

  const entriesTest = extendsExpressions.length === 1 && interfaceProperties.length === 0;
  const hasMultiAssetExtensionSignature =
    entriesTest &&
    extendsExpressions[0] &&
    (extendsExpressions[0].getText().startsWith("Array<") || extendsExpressions[0].getText().endsWith("[]"));

  if (hasMultiAssetExtensionSignature && options.extendsArray) {
    // In that case we want to generate a Zod schema like this:
    // const storyblokMultiassetSchema = z.array(storyblokAssetSchema);

    Tracer.log(
      LogLevel.VERBOSE,
      `Interface '${interfaceName}' has signature of type 'storyblokMultiassetSchema'. Bypassing 'ts-to-zod'...`,
      "extractSbInterfaceToZod"
    );

    const arrayTypeArg = typeArgs[0]; // Should be the "Something" in Array<Something> or Something[]
    if (!arrayTypeArg || !isNonEmptyString(arrayTypeArg)) {
      throw new ValidationError(
        `Failed to determine array type argument for interface '${interfaceName}' extending Array<T>`,
        { typeName: interfaceName }
      );
    }

    const zodSchema = `const ${pascalToCamelCase(interfaceName)}Schema = z.array(${pascalToCamelCase(
      arrayTypeArg
    )}Schema);`;

    return zodSchema;
  }

  try {
    // Validate inputs
    if (!isNonEmptyString(interfaceName)) {
      throw new ValidationError("Interface's name must be a non-empty string", { typeName: interfaceName });
    }

    // Convert interface to Zod schema using ts-to-zod
    let schemaGenerator;
    let zodSchema;

    try {
      schemaGenerator = generate({ sourceText: interfaceDefinition });
      zodSchema = schemaGenerator.getZodSchemasFile("~/types/storyblok.d");
    } catch (error) {
      throw new Error(
        `Failed to generate Zod schema for interface '${interfaceName}': ${
          error instanceof Error ? error.message : "Unknown ts-to-zod error"
        }`
      );
    }

    if (!zodSchema || !zodSchema.trim()) {
      throw new ValidationError(`Generated empty Zod schema for interface '${interfaceName}'`, {
        typeName: interfaceName,
      });
    }

    // Remove the first two lines (imports and empty line) and clean up
    const lines = zodSchema.split("\n");
    if (lines.length < 3) {
      throw new ValidationError(`Generated Zod schema for '${interfaceName}' has insufficient content`, {
        typeName: interfaceName,
        lineCount: lines.length,
      });
    }

    const cleanedSchema = lines.slice(2).join("\n").trim();

    if (!cleanedSchema) {
      Tracer.log(LogLevel.WARN, `Interface '${interfaceName}' results in an empty Zod definition`);
    } else {
      Tracer.log(
        LogLevel.DEBUG,
        `Successfully generated Zod schema for interface '${interfaceName}'`,
        "extractSbInterfaceToZod"
      );
    }

    return cleanedSchema;
  } catch (error) {
    if (error instanceof ValidationError) {
      Tracer.log(LogLevel.ERROR, `Validation error extracting interface '${interfaceName}': ${error.message}`);
      throw error;
    }

    const wrappedError = new Error(
      `Unexpected error extracting interface '${interfaceName}': ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );

    Tracer.log(LogLevel.ERROR, wrappedError.message);
    throw wrappedError;
  }
}
