import chalk from "chalk";
import type { Components } from "@storyblok/management-api-client";
import fs from "fs/promises";
import path from "path";
import { Project } from "ts-morph";
import { LogLevel, Tracer } from "./statics/Tracer";
import convertComponentJsonToZod from "./functions/convertComponentJsonToZod";
import { ConvertedComponents } from "./statics/ConvertedComponents";
import extractSbInterfaceToZod from "./functions/extractSbInterfaceToZod";
import * as CONSTANTS from "./constants";
import { Command } from "commander";
import { safeReadJsonFile, safeWriteFile } from "./utils";
import { FileOperationError, validateCLIOptions, validatePaths, ValidationError } from "./validation";

const program = new Command();
program
  .name("storyblok-to-zod")
  .description("Generates a Zod schema from your Storyblok components")
  .requiredOption("-s, --space <storyblokSpaceId>", "Storyblok space ID")
  .option("-f, --folder <folderPath>", "Path to the folder containing Storyblok components", ".storyblok")
  .option("-o, --output <filePath>", "Output file for result Zod file", "src/types/storyblok.zod.ts")
  .option("-v, --verbose", "show verbose information")
  .option("-d, --debug", "show debug information");

program.parse(process.argv);

const rawOptions = program.opts();
const options = validateCLIOptions(rawOptions);

const logLevel = options.debug ? LogLevel.DEBUG : options.verbose ? LogLevel.VERBOSE : LogLevel.INFO;
Tracer.logLevel = logLevel;

if (logLevel >= LogLevel.VERBOSE) {
  Tracer.log(LogLevel.VERBOSE, `Log level set to ${LogLevel[logLevel]}`);
}

// Validate all required paths
await validatePaths(options);

// Initialize paths
const folderPath = path.resolve(options.folder);
const jsonPath = `${folderPath}/components/${options.space}/`;

/** A registry to store converted Zod schemas for Storyblok native types */
const schemaRegistry = new Map<string, string>();

const pathToSbInterfaceFile = path.join(folderPath, "types", CONSTANTS.SB_INTERFACES_FILE);
Tracer.log(LogLevel.DEBUG, `pathToSbInterfaceFile: '${pathToSbInterfaceFile}'`);

// Check file exists
try {
  await fs.access(pathToSbInterfaceFile);

  Tracer.log(LogLevel.DEBUG, `The specified file '${pathToSbInterfaceFile}' exists and is accessible.`);
} catch (err) {
  Tracer.log(LogLevel.ERROR, `The specified file "${pathToSbInterfaceFile}" does not exist or is not accessible.`);
  process.exit(1);
}

// Load the storyblok.d.ts file using ts-morph to analyze imports
const storyblokTypesDefinitionFile = new Project().addSourceFileAtPath(pathToSbInterfaceFile);

// Extract the definition of interface StoryblokAsset from src/types/storyblok.d.ts
const storyblokTypesFileContent = await fs.readFile(pathToSbInterfaceFile, "utf-8");

for (const currentInterface of storyblokTypesDefinitionFile.getInterfaces()) {
  const typeName = currentInterface.getName();

  try {
    const schema = extractSbInterfaceToZod(typeName, storyblokTypesFileContent);
    schemaRegistry.set(typeName, schema);
    Tracer.log(LogLevel.DEBUG, `Processed interface: ${typeName}`);
  } catch (error) {
    Tracer.log(
      LogLevel.WARN,
      `Failed to process interface '${typeName}': ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

Tracer.log(LogLevel.DEBUG);

// List all components in the JSON_PATH directory
const allFiles = await fs.readdir(jsonPath);

const ignoredFiles = ["groups.json", "tags.json"];
const componentFiles = allFiles.filter((file) => file.endsWith(".json") && !ignoredFiles.includes(file));

Tracer.log(LogLevel.VERBOSE, `Found ${componentFiles.length} component JSON files in folder '${jsonPath}'.`);

// Scan all components and create a dependency graph to determine conversion order:
const componentDependencies = new Map<string, string[]>();
for (const fileName of componentFiles) {
  const componentName = path.basename(fileName, ".json");
  const fileContent = await safeReadJsonFile(path.join(jsonPath, fileName));
  const schemaData = fileContent.schema as Record<string, Components.ComponentSchemaField> | undefined;

  if (!schemaData) {
    Tracer.log(LogLevel.WARN, `Invalid or missing schema in JSON for component '${componentName}'. Skipping.`);
    continue;
  }

  const dependencies: string[] = [];
  for (const fieldName of Object.keys(schemaData)) {
    const field = schemaData[fieldName];

    if (!field) continue;

    if (field.type === "bloks" && Array.isArray(field.component_whitelist)) {
      dependencies.push(...field.component_whitelist);
    }
  }

  componentDependencies.set(componentName, dependencies);
}

const sortedComponents = performTopologicalSort(componentDependencies);

/**
 * Perform topological sort on component dependencies
 */
function performTopologicalSort(componentDependencies: Map<string, string[]>): string[] {
  const sortedComponents: string[] = [];
  const visited = new Set<string>();

  function visit(component: string, tempMarks: Set<string>): void {
    if (tempMarks.has(component)) {
      throw new ValidationError(`Cyclic dependency detected involving component '${component}'`, {
        component,
        tempMarks: Array.from(tempMarks),
      });
    }

    if (!visited.has(component)) {
      tempMarks.add(component);
      const deps = componentDependencies.get(component) || [];

      for (const dep of deps) {
        if (componentDependencies.has(dep)) {
          visit(dep, tempMarks);
        }
      }

      tempMarks.delete(component);
      visited.add(component);
      sortedComponents.push(component);
    }
  }

  try {
    for (const component of componentDependencies.keys()) {
      visit(component, new Set<string>());
    }

    Tracer.log(LogLevel.DEBUG, `Component conversion order: [${sortedComponents.join(", ")}]`);
    return sortedComponents;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new Error(`Failed to sort components: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Convert components
await convertComponents(sortedComponents, jsonPath);

// Generate final output
await generateFinalOutput(schemaRegistry, options.output);

console.log(chalk.green("Zod definitions generated successfully at"), chalk.underline(path.resolve(options.output)));

/**
 * Convert all components to Zod schemas
 */
async function convertComponents(sortedComponents: string[], jsonPath: string): Promise<void> {
  for (const componentName of sortedComponents) {
    try {
      await convertComponentJsonToZod(componentName, jsonPath);
      Tracer.log(LogLevel.VERBOSE, `Converted component: ${componentName}`);
    } catch (error) {
      Tracer.log(
        LogLevel.ERROR,
        `Failed to convert component '${componentName}': ${error instanceof Error ? error.message : "Unknown error"}`
      );

      // Continue with other components instead of failing entirely
      if (error instanceof ValidationError || error instanceof FileOperationError) {
        continue;
      }
      throw error;
    }
  }

  const convertedCount = ConvertedComponents.getAll().length;
  Tracer.log(LogLevel.VERBOSE, `Successfully converted ${convertedCount} components`);
}

async function generateFinalOutput(schemaRegistry: Map<string, string>, outputPath: string): Promise<void> {
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
