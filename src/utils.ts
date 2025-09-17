import fs from "fs/promises";
import path from "path";
import { LogLevel, Tracer } from "./statics/Tracer";
import { FileOperationError, ValidationError } from "./validation";

export function kebabToCamelCase(text: string): string {
  return text.replace(/-\w/g, clearAndUpper);
}

export function kebabToPascalCase(text: string): string {
  return text.replace(/(^\w|-\w)/g, clearAndUpper);
}

export function pascalToCamelCase(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * Safely writes content to a file with directory creation
 */
export async function safeWriteFile(filePath: string, content: string): Promise<void> {
  try {
    const resolvedPath = path.resolve(filePath);
    const directory = path.dirname(resolvedPath);

    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });

    // Write file
    await fs.writeFile(resolvedPath, content, "utf-8");

    Tracer.log(LogLevel.VERBOSE, `Successfully wrote file: ${resolvedPath}`);
  } catch (error) {
    if ((error as any).code === "EACCES") {
      throw new FileOperationError(`Permission denied`, filePath, "write");
    }

    if ((error as any).code === "ENOSPC") {
      throw new FileOperationError(`No space left on device`, filePath, "write");
    }

    throw new FileOperationError(
      `Failed to write file: ${error instanceof Error ? error.message : "Unknown error"}`,
      filePath,
      "write"
    );
  }
}

/**
 * Safely reads and parses a JSON file with validation
 */
export async function safeReadJsonFile<T = any>(filePath: string, validator?: (data: any) => T): Promise<T> {
  try {
    const resolvedPath = path.resolve(filePath);

    // Check if file exists and is readable
    await fs.access(resolvedPath, fs.constants.R_OK);

    const fileContent = await fs.readFile(resolvedPath, "utf-8");

    if (!fileContent.trim()) {
      throw new FileOperationError(`File is empty`, resolvedPath, "read");
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(fileContent);
    } catch (parseError) {
      throw new FileOperationError(
        `Invalid JSON format: ${parseError instanceof Error ? parseError.message : "Unknown parse error"}`,
        resolvedPath,
        "parse"
      );
    }

    if (validator) {
      return validator(parsedData);
    }

    return parsedData;
  } catch (error) {
    if (error instanceof FileOperationError || error instanceof ValidationError) {
      throw error;
    }

    if ((error as any).code === "ENOENT") {
      throw new FileOperationError(`File does not exist`, filePath, "access");
    }

    if ((error as any).code === "EACCES") {
      throw new FileOperationError(`Permission denied`, filePath, "access");
    }

    throw new FileOperationError(
      `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      filePath,
      "read"
    );
  }
}

function clearAndUpper(text: string): string {
  return text.replace(/-/, "").toUpperCase();
}
