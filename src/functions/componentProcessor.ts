import fs from "fs/promises";
import path from "path";
import type { Components } from "@storyblok/management-api-client";
import { LogLevel, Tracer } from "../statics/Tracer";
import { ConvertedComponents } from "../statics/ConvertedComponents";
import convertComponentJsonToZod from "./convertComponentJsonToZod";
import { safeReadJsonFile } from "../utils";
import {
  FileOperationError,
  isValidDirectoryPath,
  ValidationError,
} from "../validation";

/**
 * Discover and validate component files
 */
export async function discoverComponentFiles(jsonPath: string): Promise<string[]> {
  try {
    if (!(await isValidDirectoryPath(jsonPath))) {
      throw new ValidationError(`Components directory does not exist: ${jsonPath}`);
    }

    const allFiles = await fs.readdir(jsonPath);
    const ignoredFiles = ["groups.json", "tags.json"];
    const componentFiles = allFiles.filter((file) => file.endsWith(".json") && !ignoredFiles.includes(file));

    Tracer.log(LogLevel.DEBUG, `Discovered ${componentFiles.length} component files in ${jsonPath}`);

    return componentFiles;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new FileOperationError(
      `Failed to discover component files: ${error instanceof Error ? error.message : "Unknown error"}`,
      jsonPath,
      "readdir"
    );
  }
}

/**
 * Build dependency graph and determine conversion order
 */
export async function buildDependencyGraph(componentFiles: string[], jsonPath: string): Promise<string[]> {
  const componentDependencies = new Map<string, string[]>();

  // Scan all components and create a dependency graph
  for (const fileName of componentFiles) {
    const componentName = path.basename(fileName, ".json");

    try {
      const fileContent = await safeReadJsonFile(path.join(jsonPath, fileName));
      const schemaData = fileContent?.schema as Record<string, Components.ComponentSchemaField> | undefined;

      if (!schemaData) {
        Tracer.log(LogLevel.WARN, `Invalid or missing schema in JSON for component '${componentName}'. Skipping.`);
        continue;
      }

      const dependencies: string[] = [];
      for (const fieldName of Object.keys(schemaData)) {
        const field = schemaData[fieldName];

        if (!field || field.type !== "bloks" || !Array.isArray(field.component_whitelist)) {
          continue;
        }

        dependencies.push(...field.component_whitelist.filter((comp) => typeof comp === "string"));
      }

      componentDependencies.set(componentName, dependencies);
      Tracer.log(LogLevel.DEBUG, `Component '${componentName}' has dependencies: [${dependencies.join(", ")}]`);
    } catch (error) {
      Tracer.log(
        LogLevel.WARN,
        `Failed to process component '${componentName}': ${
          error instanceof Error ? error.message : "Unknown error"
        }. Skipping.`
      );
    }
  }

  // Topological sort to determine conversion order
  return performTopologicalSort(componentDependencies);
}

/**
 * Perform topological sort on component dependencies
 */
export function performTopologicalSort(componentDependencies: Map<string, string[]>): string[] {
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

/**
 * Convert all components to Zod schemas
 */
export async function convertComponents(sortedComponents: string[], jsonPath: string): Promise<void> {
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