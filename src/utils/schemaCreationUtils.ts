/**
 * Shared utilities for schema creation patterns
 * Consolidates common logic for creating Zod schemas and handling edge cases
 */

import { LogLevel, Tracer } from "../statics/Tracer";

/**
 * Options for schema creation
 */
export interface SchemaCreationOptions {
  /** Whether to mark non-required fields as optional */
  handleOptionalFields?: boolean;
  /** Default value to use for invalid/null fields */
  defaultForInvalid?: string;
  /** Types to skip during schema creation */
  skipTypes?: string[];
}

/**
 * Default options for schema creation
 */
const DEFAULT_SCHEMA_OPTIONS: Required<SchemaCreationOptions> = {
  handleOptionalFields: true,
  defaultForInvalid: 'z.any()',
  skipTypes: ['tab', 'section']
};

/**
 * Creates a Zod object schema from component fields
 * Consolidates the common pattern found across component processors
 * 
 * @param schemaData - The schema data containing field definitions
 * @param componentName - Name of the component for logging
 * @param typeConverter - Function to convert Storyblok types to Zod types
 * @param options - Schema creation options
 * @returns Formatted Zod schema string
 */
export function createZodObjectSchema(
  schemaData: Record<string, any>,
  componentName: string,
  typeConverter: (value: any, componentName: string) => string,
  options: SchemaCreationOptions = {}
): string {
  const opts = { ...DEFAULT_SCHEMA_OPTIONS, ...options };
  let outputContent = `z.object({\n`;

  for (const propName of Object.keys(schemaData)) {
    const value = schemaData[propName];

    // Handle null/undefined values
    if (!value) {
      Tracer.log(LogLevel.WARN, `Field '${propName}' in component '${componentName}' is null/undefined. Skipping.`);
      continue;
    }

    // Validate field structure
    if (!isValidField(value)) {
      Tracer.log(
        LogLevel.WARN,
        `Field '${propName}' in component '${componentName}' has invalid structure. Defaulting to '${opts.defaultForInvalid}'.`
      );
      outputContent += `  ${propName}: ${opts.defaultForInvalid},\n`;
      continue;
    }

    // Skip certain types
    if (value.type && opts.skipTypes.includes(value.type)) {
      Tracer.log(LogLevel.DEBUG, `Skipping field '${propName}' with type '${value.type}'`);
      continue;
    }

    const required = value.required || false;
    const zodType = typeConverter(value, componentName);

    outputContent += `  ${propName}: ${zodType}`;
    if (!required && opts.handleOptionalFields) {
      outputContent += `.optional()`;
    }
    outputContent += ",\n";
  }

  outputContent += "})";
  return outputContent;
}

/**
 * Creates an empty schema for components with no fields
 * 
 * @param componentName - Name of the component for logging
 * @returns Empty Zod object schema
 */
export function createEmptySchema(componentName: string): string {
  Tracer.log(LogLevel.WARN, `Component '${componentName}' has an empty schema`);
  return "z.object({\n})";
}

/**
 * Validates if a field has the expected structure for schema conversion
 * 
 * @param field - The field to validate
 * @returns True if the field is valid for conversion
 */
function isValidField(field: any): boolean {
  return field && typeof field === 'object' && field.type;
}

/**
 * Formats a complete component schema export
 * 
 * @param componentName - Component name in kebab-case
 * @param schemaContent - The Zod schema content
 * @returns Formatted export statement
 */
export function formatComponentSchemaExport(componentName: string, schemaContent: string): string {
  const kebabToCamelCase = (str: string): string => {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  };
  
  const componentNameCamel = kebabToCamelCase(componentName) + "Schema";
  return `export const ${componentNameCamel} = ${schemaContent};\n`;
}

/**
 * Common validation patterns used across schema creation
 */
export const VALIDATION_PATTERNS = {
  /** Checks if a component has valid schema data */
  hasValidSchemaData: (data: any): data is { schema: Record<string, any> } => {
    return data && typeof data === 'object' && data.schema && typeof data.schema === 'object';
  },

  /** Checks if a component name is valid */
  isValidComponentName: (name: string): boolean => {
    return typeof name === 'string' && name.length > 0 && /^[a-z0-9-]+$/.test(name);
  },

  /** Checks if schema has any processable fields */
  hasProcessableFields: (schema: Record<string, any>, skipTypes: string[] = ['tab', 'section']): boolean => {
    return Object.values(schema).some(field => 
      field && typeof field === 'object' && field.type && !skipTypes.includes(field.type)
    );
  }
};

/**
 * Standard error messages for schema creation
 */
export const SCHEMA_ERROR_MESSAGES = {
  INVALID_COMPONENT_NAME: 'Component name must be a non-empty string with valid characters',
  EMPTY_SCHEMA_DATA: 'Component schema data is empty or invalid',
  INVALID_FIELD_STRUCTURE: 'Field has invalid structure for schema conversion',
  NO_PROCESSABLE_FIELDS: 'Component has no processable fields after filtering'
};