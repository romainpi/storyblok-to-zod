import fs from "fs/promises";
import { Project } from "ts-morph";
import { LogLevel, Tracer } from "../statics/Tracer";
import extractSbInterfaceToZod from "./extractSbInterfaceToZod";
import {
  FileOperationError,
  ValidationError,
} from "../validation";

/**
 * Process Storyblok interface definitions
 */
export async function processStoryblokInterfaces(pathToSbInterfaceFile: string): Promise<Map<string, string>> {
  const schemaRegistry = new Map<string, string>();

  try {
    Tracer.log(LogLevel.DEBUG, `Processing Storyblok interfaces from: ${pathToSbInterfaceFile}`);

    // Load and validate the storyblok.d.ts file as text
    const storyblokTypesFileContent = await fs.readFile(pathToSbInterfaceFile, "utf-8");

    if (!storyblokTypesFileContent || !storyblokTypesFileContent.trim()) {
      throw new ValidationError("Storyblok types file is empty or could not be read");
    }

    // Use ts-morph to analyze the file
    const storyblokTypesDefinitionFile = new Project().addSourceFileAtPath(pathToSbInterfaceFile);
    const interfaces = storyblokTypesDefinitionFile.getInterfaces();

    if (interfaces.length === 0) {
      Tracer.log(LogLevel.WARN, "No interfaces found in Storyblok types file");
      return schemaRegistry;
    }

    for (const currentInterface of interfaces) {
      const interfaceName = currentInterface.getName();

      try {
        const schema = extractSbInterfaceToZod(currentInterface, storyblokTypesFileContent);
        schemaRegistry.set(interfaceName, schema);
        Tracer.log(LogLevel.DEBUG, `Processed interface: ${interfaceName}`);
      } catch (error) {
        Tracer.log(
          LogLevel.WARN,
          `Failed to process interface '${interfaceName}': ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    Tracer.log(LogLevel.VERBOSE, `Processed ${schemaRegistry.size} interfaces`);
    return schemaRegistry;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof FileOperationError) {
      throw error;
    }
    throw new Error(
      `Failed to process Storyblok interfaces: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}