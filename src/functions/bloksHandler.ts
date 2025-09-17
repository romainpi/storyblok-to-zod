import type { Components } from "@storyblok/management-api-client";
import { LogLevel, Tracer } from "../statics/Tracer";
import { ConvertedComponents } from "../statics/ConvertedComponents";
import { kebabToCamelCase } from "../utils";

/**
 * Handles the conversion of 'bloks' type fields with proper validation
 */
export function handleBloksType(value: Components.ComponentSchemaField, parentComponentName: string): string {
  if (!Array.isArray(value.component_whitelist)) {
    Tracer.log(
      LogLevel.WARN,
      `Bloks field in component '${parentComponentName}' has no component_whitelist or invalid format. Defaulting to 'z.any()'.`
    );
    return "z.any()";
  }

  if (value.component_whitelist.length === 0) {
    return "z.any()"; // No whitelist means any component is allowed
  }

  // Validate that all whitelisted components exist
  const validComponents: string[] = [];

  for (const componentName of value.component_whitelist) {
    if (!componentName || typeof componentName !== "string") {
      Tracer.log(
        LogLevel.WARN,
        `Invalid component name in whitelist for '${parentComponentName}': ${JSON.stringify(componentName)}`
      );
      continue;
    }

    if (!ConvertedComponents.has(componentName)) {
      Tracer.log(
        LogLevel.WARN,
        `Nested component '${componentName}' used in '${parentComponentName}' has not been converted yet.`
      );
      return "z.any()"; // Fallback to z.any() if nested component is not converted
    }

    validComponents.push(componentName);
  }

  if (validComponents.length === 0) {
    return "z.any()";
  }

  if (validComponents.length === 1) {
    const componentName = validComponents[0];
    if (!componentName) {
      return "z.any()";
    }
    return kebabToCamelCase(componentName) + "Schema";
  }

  const whitelistedComponents = validComponents.map((comp) => kebabToCamelCase(comp) + "Schema").join(", ");
  return `z.union([${whitelistedComponents}])`;
}