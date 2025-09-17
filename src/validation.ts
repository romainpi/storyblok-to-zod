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
 * Type guard to check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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
    errors.push("Space ID is required and must be a non-empty string");
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
