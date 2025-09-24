import path from "path";
import { LogLevel, Tracer } from "../statics/Tracer";
import { ConvertedComponents } from "../statics/ConvertedComponents";
import { NativeSchemaRegistry } from "../statics/NativeSchemaRegistry";
import { safeWriteFile } from "../utils";
import * as CONSTANTS from "../constants";
import chalk from "chalk";
import { formatFinalOutput } from "./outputFormatter";
import { analyzeNativeSchemaDependencies } from "./dependencyAnalyzer";

/**
 * Generate the final output file
 */
export async function generateFinalOutput(outputPath?: string): Promise<void> {
  try {
    // Analyze which native schemas are actually used by components
    analyzeNativeSchemaDependencies();

    const stats = NativeSchemaRegistry.getUsageStats();
    Tracer.log(
      LogLevel.INFO,
      `Using ${stats.used}/${stats.total} native schemas (${stats.unused} unused schemas excluded)`
    );

    // Use only the used native schemas
    const usedNativeSchemas = NativeSchemaRegistry.getUsed();
    const allNativeSchemas = Array.from(usedNativeSchemas.values()).join("\n");

    const allComponentSchemas = ConvertedComponents.getAllValues().join("\n");

    // Use the new formatter for better organization and formatting
    const formattedContent = formatFinalOutput(CONSTANTS.FILE_HEADER, allNativeSchemas, allComponentSchemas);

    if (outputPath) {
      await safeWriteFile(outputPath, formattedContent);
      Tracer.log(LogLevel.DEBUG, `Final output written to: ${path.resolve(outputPath)}`);

      Tracer.log(
        LogLevel.INFO,
        chalk.green("Zod definitions generated successfully at ") + chalk.underline(path.resolve(outputPath))
      );
    } else {
      // Remove final newline so it doesn't spoil the output when piping
      const finalOutput = formattedContent.trimEnd();

      console.log(finalOutput);
    }
  } catch (error) {
    throw new Error(`Failed to generate final output: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
