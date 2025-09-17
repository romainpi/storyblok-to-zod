import chalk from "chalk";
import { LogLevel, Tracer } from "../statics/Tracer";
import {
  FileOperationError,
  ValidationError,
} from "../validation";

/**
 * Centralized error handling
 */
export async function handleError(error: unknown): Promise<void> {
  if (error instanceof ValidationError) {
    console.error(chalk.red("❌ Validation Error:"), error.message);
    if (error.context) {
      console.error(chalk.gray("Context:"), JSON.stringify(error.context, null, 2));
    }
    process.exit(1);
  }

  if (error instanceof FileOperationError) {
    console.error(chalk.red("❌ File Operation Error:"), error.message);
    console.error(chalk.gray("File:"), error.filePath);
    console.error(chalk.gray("Operation:"), error.operation);
    process.exit(1);
  }

  if (error instanceof Error) {
    console.error(chalk.red("❌ Unexpected Error:"), error.message);
    if (Tracer.logLevel >= LogLevel.DEBUG && error.stack) {
      console.error(chalk.gray("Stack:"), error.stack);
    }
    process.exit(1);
  }

  console.error(chalk.red("❌ Unknown Error:"), String(error));
  process.exit(1);
}