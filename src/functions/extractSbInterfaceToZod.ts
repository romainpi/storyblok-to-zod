import { generate } from "ts-to-zod";
import { LogLevel, Tracer } from "../statics/Tracer";

/**
 * Extracts a TypeScript interface from Storyblok's types definitions and returns it to a Zod schema.
 *
 * @param typeName - The name of the type/interface to extract from the Storyblok types file
 * @returns A string containing the generated Zod schema with import statements and initial lines removed
 * @throws {Error} When the specified interface cannot be found in the storyblok.d.ts file
 *
 * @example
 * ```typescript
 * const zodSchema = extractInterfaceFromSbTypes('StoryblokAsset');
 * // Returns: "export const StoryblokAssetSchema = z.object({ ... });"
 * ```
 */
export default function extractSbInterfaceToZod(typeName: string, sbTypesFileContent: string): string {
  Tracer.log(LogLevel.DEBUG, `Enter with typeName='${typeName}'`, "extractSbInterfaceToZod");

  const sbAssetInterfaceRegex = new RegExp(`interface ${typeName}( extends.*)* {[^}]+}`);
  const sbAssetMatch = sbTypesFileContent.match(sbAssetInterfaceRegex);

  if (!sbAssetMatch) {
    throw new Error(`Could not find ${typeName} interface in storyblok.d.ts`);
  }

  const sbAssetInterface = sbAssetMatch[0];

  // Convert StoryblokAsset to Zod and use the result as the beginning of our file
  const schemaGenerator = generate({ sourceText: sbAssetInterface });
  const zodSchema = schemaGenerator.getZodSchemasFile("~/types/storyblok.d");

  // Remove the first two lines
  return zodSchema.split("\n").slice(2).join("\n").trim();
}
