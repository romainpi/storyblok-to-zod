import path from "path";
import { LogLevel, Tracer } from "../statics/Tracer";
import { kebabToCamelCase, safeReadJsonFile } from "../utils";
import { ConvertedComponents } from "../statics/ConvertedComponents";
import { NativeSchemaRegistry } from "../statics/NativeSchemaRegistry";
import {
  FileOperationError,
  isValidComponentSchemaField,
  validateComponentData,
  validateComponentName,
  ValidationError,
} from "../validation";
import { convertSbToZodType } from "./typeConverter";

/**
 * Converts a Storyblok component schema JSON file to a Zod schema definition.
 *
 * @param componentName - The name of the component (kebab-case) to convert, used to locate the JSON file
 * @returns A Promise that resolves to a string containing the generated Zod schema code
 *
 * @remarks
 * This function reads a JSON schema file, parses the Storyblok component schema, and generates corresponding Zod
 * validation schema code. The generated schema:
 * - Loads the JSON file for the specified component at `.storyblok/components/${STORYBLOK_SPACE_ID}/`
 * - Formats the component name with correct casing and 'Schema' suffix
 * - Maps Storyblok field types to appropriate Zod types using convertSbToZodType()
 * - Marks non-required fields as optional in the Zod schema
 *
 * @example
 * ```typescript
 * const schema = await convertToZod('hero-section');
 * // Returns: "export const heroSectionSchema = z.object({ ... });"
 * ```
 *
 * @throws {ValidationError} When component name is invalid or component data is malformed
 * @throws {FileOperationError} When the JSON file cannot be read or parsed
 */
export default async function convertComponentJsonToZod(
  componentName: string,
  containingFolder: string
): Promise<string> {
  Tracer.log(LogLevel.DEBUG, `Enter with componentName='${componentName}'`, "convertComponentJsonToZod");

  try {
    // Validate component name format
    validateComponentName(componentName);

    // Load and validate the JSON file for the component
    const inputFilePath = path.join(containingFolder, componentName + ".json");

    const jsonData = await safeReadJsonFile(inputFilePath, (data) => validateComponentData(data, componentName));

    Tracer.log(
      LogLevel.DEBUG,
      `Loaded and validated JSON for component '${componentName}.json'`,
      "convertComponentJsonToZod"
    );

    // Format the component name to camelCase and add 'Schema' suffix
    const componentNameCamel = kebabToCamelCase(componentName) + "Schema";
    let outputContent = `export const ${componentNameCamel} = z.object({\n`;

    const schemaData = jsonData.schema;

    for (const propName of Object.keys(schemaData)) {
      const value = schemaData[propName];

      if (!value) {
        Tracer.log(LogLevel.WARN, `Field '${propName}' in component '${componentName}' is null/undefined. Skipping.`);
        continue;
      }

      if (!isValidComponentSchemaField(value)) {
        Tracer.log(
          LogLevel.WARN,
          `Field '${propName}' in component '${componentName}' has invalid structure. Defaulting to 'z.any()'.`
        );
        outputContent += `  ${propName}: z.any(),\n`;
        continue;
      }

      Tracer.log(LogLevel.DEBUG, `propName: '${propName}', value.type: '${value.type}'`, "convertComponentJsonToZod");

      // Skip certain types
      const skippableTypes = ["tab", "section"];
      if (value.type && skippableTypes.includes(value.type)) {
        continue;
      }

      const required = value.required || false;

      const zodType = convertSbToZodType(value, componentName);

      outputContent += `  ${propName}: ${zodType}`;
      if (!required) {
        outputContent += `.optional()`;
      }
      outputContent += ",\n";
    }

    outputContent += "});\n";

    // Add the component schema to the registry
    ConvertedComponents.add(componentName, outputContent);

    // Generate ISbStoryData variant for this component if ISbStoryData schema exists
    if (NativeSchemaRegistry.has("ISbStoryData")) {
      const isbVariantName = kebabToCamelCase(componentName) + "StorySchema";
      // Instead of using .extend() on a lazy schema, manually create the object structure
      // This avoids the issue where .extend() is called on lazy schemas which don't support it
      const isbVariantContent = `export const ${isbVariantName}: z.ZodSchema<ISbStoryData & { content: z.infer<typeof ${componentNameCamel}> }> = z.lazy(() => z.object({
  alternates: z.array(iSbAlternateObjectSchema),
  breadcrumbs: z.array(iSbLinkURLObjectSchema).optional(),
  content: ${componentNameCamel},
  created_at: z.string(),
  deleted_at: z.string().optional(),
  default_full_slug: z.string().optional().nullable(),
  default_root: z.string().optional(),
  disable_fe_editor: z.boolean().optional(),
  favourite_for_user_ids: z.array(z.number()).optional().nullable(),
  first_published_at: z.string().optional().nullable(),
  full_slug: z.string(),
  group_id: z.string(),
  id: z.number(),
  imported_at: z.string().optional(),
  is_folder: z.boolean().optional(),
  is_startpage: z.boolean().optional(),
  lang: z.string(),
  last_author: z.object({
    id: z.number(),
    userid: z.string()
  }).optional(),
  last_author_id: z.number().optional(),
  localized_paths: z.array(localizedPathSchema).optional().nullable(),
  meta_data: z.any(),
  name: z.string(),
  parent: iSbStoryDataSchema.optional(),
  parent_id: z.number().nullable(),
  path: z.string().optional(),
  pinned: z.union([z.literal("1"), z.boolean()]).optional(),
  position: z.number(),
  preview_token: previewTokenSchema.optional(),
  published: z.boolean().optional(),
  published_at: z.string().nullable(),
  release_id: z.number().optional().nullable(),
  scheduled_date: z.string().optional().nullable(),
  slug: z.string(),
  sort_by_date: z.string().nullable(),
  tag_list: z.array(z.string()),
  translated_slugs: z.array(z.object({
    path: z.string(),
    name: z.string().nullable(),
    lang: z.string(),
    published: z.boolean()
  })).optional().nullable(),
  unpublished_changes: z.boolean().optional(),
  updated_at: z.string().optional(),
  uuid: z.string()
}));\n`;

      // Add the ISbStoryData variant as a separate entry
      ConvertedComponents.add(componentName + "_story", isbVariantContent);
      
      Tracer.log(LogLevel.DEBUG, `Successfully converted component '${componentName}' with ISbStoryData variant`);
    } else {
      Tracer.log(LogLevel.DEBUG, `Successfully converted component '${componentName}' (ISbStoryData schema not available)`);
    }

    return outputContent;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof FileOperationError) {
      Tracer.log(LogLevel.ERROR, `Failed to convert component '${componentName}': ${error.message}`);
      throw error;
    }

    const unknownError = new Error(
      `Unexpected error converting component '${componentName}': ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    Tracer.log(LogLevel.ERROR, unknownError.message);
    throw unknownError;
  }
}
