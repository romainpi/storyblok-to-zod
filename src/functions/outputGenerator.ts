import path from "path";
import { LogLevel, Tracer } from "../statics/Tracer";
import { ConvertedComponents } from "../statics/ConvertedComponents";
import { safeWriteFile } from "../utils";
import * as CONSTANTS from "../constants";

/**
 * Generate the final output file
 */
export async function generateFinalOutput(schemaRegistry: Map<string, string>, outputPath: string): Promise<void> {
  try {
    const allNativeSchemas = Array.from(schemaRegistry.values()).join("\n");
    const allComponentSchemas = Array.from(ConvertedComponents.getAll())
      .map((result) => result[1])
      .join("\n");

    const finalContent = `${CONSTANTS.FILE_HEADER}\n${allNativeSchemas}\n${allComponentSchemas}`;

    await safeWriteFile(outputPath, finalContent);

    Tracer.log(LogLevel.DEBUG, `Final output written to: ${path.resolve(outputPath)}`);
  } catch (error) {
    throw new Error(`Failed to generate final output: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}