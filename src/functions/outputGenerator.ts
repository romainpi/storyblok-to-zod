import path from "path";
import { LogLevel, Tracer } from "../statics/Tracer";
import { ConvertedComponents } from "../statics/ConvertedComponents";
import { safeWriteFile } from "../utils";
import * as CONSTANTS from "../constants";
import chalk from "chalk";

/**
 * Generate the final output file
 */
export async function generateFinalOutput(schemaRegistry: Map<string, string>, outputPath?: string): Promise<void> {
  try {
    const allNativeSchemas = Array.from(schemaRegistry.values()).join("\n");
    const allComponentSchemas = ConvertedComponents.getAllValues().join("\n");

    const finalContent = `${CONSTANTS.FILE_HEADER}\n${allNativeSchemas}\n${allComponentSchemas}`;

    if (outputPath) {
      await safeWriteFile(outputPath, finalContent);
      Tracer.log(LogLevel.DEBUG, `Final output written to: ${path.resolve(outputPath)}`);

      Tracer.log(
        LogLevel.INFO,
        chalk.green("Zod definitions generated successfully at ") + chalk.underline(path.resolve(outputPath))
      );
    } else {
      // Remove final newline so it doesn't spoil the output when piping
      const finalOutput = finalContent.trimEnd();

      console.log(finalOutput);
    }
  } catch (error) {
    throw new Error(`Failed to generate final output: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
