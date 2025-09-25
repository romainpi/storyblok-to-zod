import { Project } from "ts-morph";
import { LogLevel, Tracer } from "../statics/Tracer";
import { NativeSchemaRegistry } from "../statics/NativeSchemaRegistry";
import extractSbInterfaceToZod from "./extractSbInterfaceToZod";
import { ensureISbStoryDataSchema } from "./isbStoryDataProcessor";
import { CLIOptions, FileOperationError, ValidationError } from "../validation";

/**
 * Process Storyblok interface definitions
 */
export async function processStoryblokInterfaces(pathToSbInterfaceFile: string, options: CLIOptions): Promise<void> {
  // Directly use NativeSchemaRegistry for storing schemas

  try {
    Tracer.log(LogLevel.DEBUG, `Processing Storyblok interfaces from: ${pathToSbInterfaceFile}`);

    // First, ensure ISbStoryData schema is available
    ensureISbStoryDataSchema(options);

    // Use ts-morph to analyze the file
    const storyblokTypesDefinitionFile = new Project().addSourceFileAtPath(pathToSbInterfaceFile);
    const interfaces = storyblokTypesDefinitionFile.getInterfaces();

    if (interfaces.length === 0) {
      Tracer.log(LogLevel.WARN, "No interfaces found in Storyblok types file");
      return;
    }

    for (const currentInterface of interfaces) {
      const interfaceName = currentInterface.getName();

      try {
        const schema = extractSbInterfaceToZod(currentInterface, options);
        NativeSchemaRegistry.set(interfaceName, schema);
        Tracer.log(LogLevel.DEBUG, `Processed interface: ${interfaceName}`);
      } catch (error) {
        Tracer.log(
          LogLevel.WARN,
          `Failed to process interface '${interfaceName}': ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    Tracer.log(LogLevel.VERBOSE, `Processed ${NativeSchemaRegistry.getAll().size} interfaces`);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof FileOperationError) {
      throw error;
    }
    throw new Error(
      `Failed to process Storyblok interfaces: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
