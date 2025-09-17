import fs from "fs/promises";
import path from "path";
import { LogLevel, Tracer } from "./statics/Tracer";
import { FileOperationError } from "./validation";

export function kebabToCamelCase(text: string): string {
  return text.replace(/-\w/g, clearAndUpper);
}

export function kebabToPascalCase(text: string): string {
  return text.replace(/(^\w|-\w)/g, clearAndUpper);
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

function clearAndUpper(text: string): string {
  return text.replace(/-/, "").toUpperCase();
}
