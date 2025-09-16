import type { Components } from "@storyblok/management-api-client";
import fs from "fs/promises";
import path from "path";
import { LogLevel, Tracer } from "../statics/Tracer";
import { kebabToCamelCase } from "../utils";
import { ConvertedComponents } from "../statics/ConvertedComponents";

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
 * @throws Will throw an error if the JSON file cannot be read or parsed
 */
export default async function convertComponentJsonToZod(
  componentName: string,
  containingFolder: string
): Promise<string> {
  Tracer.log(LogLevel.DEBUG, `Enter with componentName='${componentName}'`, "convertComponentJsonToZod");

  // Load the JSON file for the component
  const inputFilePath = path.join(containingFolder, componentName + ".json");
  const fileContent = await fs.readFile(inputFilePath, "utf-8");

  if (!fileContent) {
    throw new Error(`Could not read file for component '${componentName}' at path '${inputFilePath}'.`);
  }

  // Format the component name to camelCase and add 'Schema' suffix
  const componentNameCamel = kebabToCamelCase(componentName) + "Schema";
  let outputContent = `export const ${componentNameCamel} = z.object({\n`;

  // Parse the JSON content
  const jsonData = JSON.parse(fileContent);
  const schemaData = jsonData.schema as Record<string, Components.ComponentSchemaField> | undefined;

  if (!jsonData || !schemaData) {
    throw new Error(`Invalid or missing schema in JSON for component '${componentName}'.`);
  }

  for (const propName of Object.keys(schemaData)) {
    if (schemaData[propName] === undefined) {
      Tracer.log(
        LogLevel.WARN,
        `Field '${propName}' in component '${componentName}' is undefined. Defaulting to 'z.any()'.`
      );
      outputContent += `  ${propName}: z.any(),\n`;
      continue;
    }

    const value: Components.ComponentSchemaField = schemaData[propName];

    Tracer.log(LogLevel.DEBUG, `propName: '${propName}', value.type: '${value.type}'`, "convertComponentJsonToZod");

    if (!value.type) {
      Tracer.log(
        LogLevel.WARN,
        `Field '${propName}' in component '${componentName}' is missing a 'type' property. Defaulting to 'z.any()'. Full field definition: ${JSON.stringify(
          value
        )}`,
        "convertComponentJsonToZod"
      );
      outputContent += `  ${propName}: z.any(),\n`;
      continue;
    }

    // Skip certain types
    const skippableTypes = ["tab", "section"];
    if (skippableTypes.includes(value.type)) {
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

  ConvertedComponents.add(componentName, outputContent);

  Tracer.log(LogLevel.DEBUG);

  return outputContent;
}

/**
 * Converts a Storyblok field type to its corresponding Zod schema string representation.
 *
 * This function maps various Storyblok field types to appropriate Zod validation schemas,
 * handling primitive types, nested components, assets, and rich text content.
 *
 * @param value - The Storyblok field configuration object containing type and other metadata
 * @param parentComponentName - The name of the parent component that contains this field
 * @returns A string representation of the corresponding Zod schema
 *
 * @example
 * ```typescript
 * // For a text field
 * convertSbToZodType({ type: 'text' }, 'Hero') // Returns: 'z.string()'
 *
 * // For a bloks field with component whitelist
 * convertSbToZodType({
 *   type: 'bloks',
 *   component_whitelist: ['Button', 'Image']
 * }, 'Section') // Returns: 'z.any()'
 * ```
 *
 * @remarks
 * - String types (text, textarea) are converted to `z.string()`
 * - Bloks fields with component whitelists will log warnings for unconverted nested components
 * - Special Storyblok types like multilink, asset, and richtext use predefined schema references
 * - Options fields support both number and string values
 * - Fallback behavior returns `z.${storyblokType}()` for unhandled types
 */
function convertSbToZodType(value: Components.ComponentSchemaField, parentComponentName: string): string {
  Tracer.log(
    LogLevel.DEBUG,
    `Enter with parentComponentName='${parentComponentName}', value.type='${value.type}'`,
    "convertSbToZodType",
    2
  );

  if (!value.type) {
    Tracer.log(
      LogLevel.WARN,
      `Field in component '${parentComponentName}' is missing a 'type' property. Defaulting to 'z.any()'. Full field definition: ${JSON.stringify(
        value
      )}`,
      "convertSbToZodType"
    );
    return "z.any()";
  }

  const storyblokType = value.type;

  const stringTypes = ["text", "textarea", "markdown"];
  const convertToAnyTypes: string[] = [];

  if (stringTypes.includes(storyblokType)) {
    return "z.string()";
  } else if (convertToAnyTypes.includes(storyblokType)) {
    return "z.any()";
  } else if (storyblokType === "bloks") {
    for (const componentName of value.component_whitelist || []) {
      if (!ConvertedComponents.has(componentName)) {
        Tracer.log(
          LogLevel.WARN,
          `Nested component '${componentName}' used in '${parentComponentName}' has not been converted yet.`
        );

        return "z.any()"; // Fallback to z.any() if nested component is not converted
      }
    }

    // Assign corresponding Zod schema for bloks field
    if (value.component_whitelist && value.component_whitelist.length > 0) {
      if (value.component_whitelist.length == 1) {
        // If only one component is whitelisted, use that schema directly
        const singleComponent = value.component_whitelist[0];
        return kebabToCamelCase(singleComponent) + "Schema";
      }
      const whitelistedComponents = value.component_whitelist
        .map((comp) => kebabToCamelCase(comp) + "Schema")
        .join(", ");
      return `z.union([${whitelistedComponents}])`;
    } else {
      return "z.any()"; // No whitelist means any component is allowed
    }
  } else if (storyblokType === "multilink") {
    return "storyblokMultilinkSchema";
  } else if (storyblokType === "option") {
    return "z.union([z.number(), z.string()])";
  } else if (storyblokType === "options") {
    return "z.array(z.union([z.number(), z.string()]))";
  } else if (storyblokType === "asset") {
    return "storyblokAssetSchema";
  } else if (storyblokType === "richtext") {
    return "storyblokRichtextSchema";
  }

  return `z.${storyblokType}()`;
}
