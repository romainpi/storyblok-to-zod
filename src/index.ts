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

// Global version variable injected by the build process
declare const __VERSION__: string;

console.log(chalk.bold("storyblok-to-zod"), `v${__VERSION__}`);

const program = new Command();
program
  .name("storyblok-to-zod")
  .description("Generates a Zod schema from your Storyblok components")
  .requiredOption("-s, --space <storyblokSpaceId>", "Storyblok space ID")
  .option("-v, --verbose", "show verbose information")
  .option("-d, --debug", "show debug information");

program.parse(process.argv);

const options = program.opts();

const logLevel = options.debug ? LogLevel.DEBUG : options.verbose ? LogLevel.VERBOSE : LogLevel.INFO;
Tracer.logLevel = logLevel;

if (logLevel >= LogLevel.VERBOSE) {
  Tracer.log(LogLevel.VERBOSE, `Log level set to ${LogLevel[logLevel]}`);
}

const jsonPath = `.storyblok/components/${options.space}/`;
if (!options.space) throw new Error("Missing Storyblok space ID");

/** A registry to store converted Zod schemas for Storyblok native types */
const schemaRegistry = new Map<string, string>();

// Load the storyblok.d.ts file using ts-morph to analyze imports
const storyblokTypesDefinitionFile = new Project().addSourceFileAtPath(
  path.join(process.cwd(), CONSTANTS.TYPES_PATH, CONSTANTS.SB_INTERFACES_FILE)
);

// Extract the definition of interface StoryblokAsset from src/types/storyblok.d.ts
const storyblokTypesFileContent = await fs.readFile(
  path.join(process.cwd(), CONSTANTS.TYPES_PATH, CONSTANTS.SB_INTERFACES_FILE),
  "utf-8"
);

for (const currentInterface of storyblokTypesDefinitionFile.getInterfaces()) {
  const type = currentInterface.getName();

  const schema = extractSbInterfaceToZod(type, storyblokTypesFileContent);
  schemaRegistry.set(type, schema);
}

Tracer.log(LogLevel.DEBUG);

// List all components in the JSON_PATH directory
const allFiles = await fs.readdir(path.join(process.cwd(), jsonPath));

const ignoredFiles = ["groups.json", "tags.json"];
const componentFiles = allFiles.filter((file) => file.endsWith(".json") && !ignoredFiles.includes(file));

// Scan all components and create a dependency graph to determine conversion order:
const componentDependencies = new Map<string, string[]>();
for (const fileName of componentFiles) {
  const componentName = path.basename(fileName, ".json");
  const fileContent = await fs.readFile(path.join(process.cwd(), jsonPath, fileName), "utf-8");
  const jsonSchema = JSON.parse(fileContent);
  const schemaData = jsonSchema.schema as Components.ComponentSchemaField[] | undefined;

  if (!jsonSchema || !schemaData) {
    Tracer.log(LogLevel.WARN, `Invalid or missing schema in JSON for component '${componentName}'. Skipping.`);
    continue;
  }

  const dependencies: string[] = [];
  for (const field of schemaData) {
    if (field.type === "bloks" && Array.isArray(field.component_whitelist)) {
      dependencies.push(...field.component_whitelist);
    }
  }

  componentDependencies.set(componentName, dependencies);
}

// Simple topological sort to determine conversion order
const sortedComponents: string[] = [];
const visited = new Set<string>();

function visit(component: string, tempMarks: Set<string>) {
  if (tempMarks.has(component)) {
    throw new Error(`Cyclic dependency detected involving component '${component}'`);
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

for (const component of componentDependencies.keys()) {
  visit(component, new Set<string>());
}

// Start conversion process
for (const componentName of sortedComponents) {
  await convertComponentJsonToZod(componentName, path.join(process.cwd(), jsonPath));
}

const allNativeSchemas = Array.from(schemaRegistry.values()).join("\n");
const allComponentSchemas = Array.from(ConvertedComponents.getAll())
  .map(([schema]) => schema)
  .join("\n");

const finalContent = `\
${CONSTANTS.FILE_HEADER}
${allNativeSchemas}
${allComponentSchemas}`;

const outputFilePath = path.join(process.cwd(), CONSTANTS.TYPES_PATH, "storyblok.zod.ts");
await fs.writeFile(outputFilePath, finalContent, "utf-8");

console.log(chalk.green("Zod schemas generated successfully at"), chalk.underline(outputFilePath));
