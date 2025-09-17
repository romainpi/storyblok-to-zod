import fs from "fs/promises";
import path from "path";
import type { Components } from "@storyblok/management-api-client";
import { LogLevel, Tracer } from "./statics/Tracer";

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(message: string, public readonly context?: Record<string, any>) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Custom error class for file operation errors
 */
export class FileOperationError extends Error {
  constructor(message: string, public readonly filePath: string, public readonly operation: string) {
    super(message);
    this.name = "FileOperationError";
  }
}

/**
 * Type guard to check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Type guard to check if a value is a valid directory path
 */
export async function isValidDirectoryPath(dirPath: string): Promise<boolean> {
  try {
    const resolvedPath = path.resolve(dirPath);
    const stats = await fs.stat(resolvedPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Validates CLI options
 */
export interface CLIOptions {
  space: string;
  folder: string;
  output: string;
  verbose?: boolean;
  debug?: boolean;
}

export function validateCLIOptions(options: any): CLIOptions {
  const errors: string[] = [];

  if (!isNonEmptyString(options.space)) {
    errors.push("Storyblok space ID is required and must be a non-empty string");
  }

  if (!isNonEmptyString(options.folder)) {
    errors.push("Folder path is required and must be a non-empty string");
  }

  if (!isNonEmptyString(options.output)) {
    errors.push("Output path is required and must be a non-empty string");
  }

  if (errors.length > 0) {
    throw new ValidationError(`Invalid CLI options: ${errors.join(", ")}`, { options });
  }

  return {
    space: options.space,
    folder: options.folder,
    output: options.output,
    verbose: Boolean(options.verbose),
    debug: Boolean(options.debug),
  };
}

/**
 * Validates a Storyblok component schema field
 */
export function isValidComponentSchemaField(value: unknown): value is Components.ComponentSchemaField {
  if (!value || typeof value !== "object") {
    return false;
  }

  const field = value as any;
  return typeof field.type === "string" && field.type.length > 0;
}

/**
 * Validates component JSON data structure
 */
export interface ComponentData {
  schema: Record<string, Components.ComponentSchemaField>;
}

export function validateComponentData(data: unknown, componentName: string): ComponentData {
  if (!data || typeof data !== "object") {
    throw new ValidationError(`Invalid JSON data for component '${componentName}': expected object`, {
      componentName,
      dataType: typeof data,
    });
  }

  const jsonData = data as any;

  if (!jsonData.schema || typeof jsonData.schema !== "object") {
    throw new ValidationError(`Missing or invalid schema in component '${componentName}'`, {
      componentName,
      hasSchema: !!jsonData.schema,
      schemaType: typeof jsonData.schema,
    });
  }

  const schema = jsonData.schema as Record<string, any>;
  const validatedSchema: Record<string, Components.ComponentSchemaField> = {};

  for (const [fieldName, fieldValue] of Object.entries(schema)) {
    if (!isValidComponentSchemaField(fieldValue)) {
      Tracer.log(
        LogLevel.WARN,
        `Invalid field '${fieldName}' in component '${componentName}': ${JSON.stringify(fieldValue)}`
      );
      continue;
    }
    validatedSchema[fieldName] = fieldValue;
  }

  if (Object.keys(validatedSchema).length === 0) {
    throw new ValidationError(`No valid fields found in component '${componentName}'`, {
      componentName,
      originalFieldCount: Object.keys(schema).length,
    });
  }

  return { schema: validatedSchema };
}

/**
 * Validates that all required paths exist and are accessible
 */
export async function validatePaths(options: CLIOptions): Promise<void> {
  const errors: string[] = [];

  // Validate folder path
  const folderPath = path.resolve(options.folder);
  if (!(await isValidDirectoryPath(folderPath))) {
    errors.push(`Folder path does not exist or is not a directory: ${folderPath}`);
  } else {
    // Check for required subdirectories
    const componentsPath = path.join(folderPath, "components", options.space);
    if (!(await isValidDirectoryPath(componentsPath))) {
      errors.push(`Components directory does not exist: ${componentsPath}`);
    }

    const typesPath = path.join(folderPath, "types");
    if (!(await isValidDirectoryPath(typesPath))) {
      errors.push(`Types directory does not exist: ${typesPath}`);
    }
  }

  // Validate output directory can be created
  const outputDir = path.dirname(path.resolve(options.output));
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error) {
    errors.push(
      `Cannot create output directory: ${outputDir} - ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  if (errors.length > 0) {
    throw new ValidationError(`Path validation failed: ${errors.join("; ")}`, { options });
  }
}

/**
 * Validates component name format
 */
export function validateComponentName(componentName: string): void {
  if (!isNonEmptyString(componentName)) {
    throw new ValidationError("Component name must be a non-empty string", { componentName });
  }

  // Check for valid kebab-case format
  const kebabCaseRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  if (!kebabCaseRegex.test(componentName)) {
    throw new ValidationError(`Component name '${componentName}' is not in valid kebab-case format`, { componentName });
  }
}
