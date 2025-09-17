import fs from "fs/promises";
import path from "path";

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
