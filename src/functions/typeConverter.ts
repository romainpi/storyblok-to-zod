import type { Components } from "@storyblok/management-api-client";
import { LogLevel, Tracer } from "../statics/Tracer";
import { handleBloksType } from "./bloksHandler";

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
export function convertSbToZodType(value: Components.ComponentSchemaField, parentComponentName: string): string {
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

  try {
    const stringTypes = ["text", "textarea", "markdown"];
    const convertToAnyTypes: string[] = [];

    if (stringTypes.includes(storyblokType)) {
      return "z.string()";
    } else if (convertToAnyTypes.includes(storyblokType)) {
      return "z.any()";
    } else if (storyblokType === "bloks") {
      return handleBloksType(value, parentComponentName);
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
    } else if (storyblokType === "number") {
      return "z.number()";
    } else if (storyblokType === "boolean") {
      return "z.boolean()";
    } else if (storyblokType === "datetime") {
      return "z.string().datetime()";
    }

    // Fallback for unknown types
    Tracer.log(
      LogLevel.WARN,
      `Unknown Storyblok field type '${storyblokType}' in component '${parentComponentName}'. Using fallback.`
    );

    return `z.any() /* Unknown type: ${storyblokType} */`;
  } catch (error) {
    Tracer.log(
      LogLevel.ERROR,
      `Error converting field type '${storyblokType}' in component '${parentComponentName}': ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return "z.any()";
  }
}