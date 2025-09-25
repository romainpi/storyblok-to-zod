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
import { createComponentStorySchema } from "../utils/isbStoryDataTemplates";

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
      const isbVariantContent = createComponentStorySchema(componentName, componentNameCamel);

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
