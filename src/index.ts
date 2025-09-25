import path from "path";
import { LogLevel, Tracer } from "./statics/Tracer";
import * as CONSTANTS from "./constants";
import { Command } from "commander";
import { validateCLIOptions, validatePaths } from "./validation";
import { processStoryblokInterfaces } from "./functions/interfaceProcessor";
import { discoverComponentFiles, buildDependencyGraph, convertComponents } from "./functions/componentProcessor";
import { generateFinalOutput } from "./functions/outputGenerator";
import { handleError } from "./functions/errorHandler";
import { exportISbStoryDataSchema, exportISbStoryDataSchemaBundle } from "./functions/isbStoryDataProcessor";

const program = new Command();
program
  .name("storyblok-to-zod")
  .description("Generates a Zod schema from your Storyblok components")
  .requiredOption("-s, --space <storyblokSpaceId>", "Storyblok space ID")
  .option("-o, --output <filePath>", "output to file")
  .option("-f, --folder <folderPath>", "path to the folder containing Storyblok components", ".storyblok")
  .option("-v, --verbose", "show verbose information")
  .option("-d, --debug", "show debug information")
  .option("--no-extends-array", "will not automatically convert StoryblokMultiasset's interface definition")
  .option("--export-isb <outputPath>", "export ISbStoryData schema to specified file path")
  .option("--export-isb-bundle [outputDir]", "export ISbStoryData schema bundle to directory (default: ./schemas)");

program.parse(process.argv);

/**
 * Main execution function with comprehensive error handling
 */
async function main(): Promise<void> {
  try {
    const rawOptions = program.opts();
    const options = validateCLIOptions(rawOptions);

    const logLevel = options.debug ? LogLevel.DEBUG : options.verbose ? LogLevel.VERBOSE : LogLevel.INFO;
    Tracer.logLevel = logLevel;

    if (logLevel >= LogLevel.VERBOSE) {
      Tracer.log(LogLevel.VERBOSE, `Log level set to ${LogLevel[logLevel]}`);
    }

    // Export ISbStoryData schema to specified file if requested
    if (rawOptions.exportIsb) {
      console.log(`📤 Exporting ISbStoryData schema to: ${rawOptions.exportIsb}\n`);
      
      try {
        exportISbStoryDataSchema(options, rawOptions.exportIsb);
        console.log("✅ Successfully exported ISbStoryData schema");
        
      } catch (error) {
        console.error("❌ Export failed:", error instanceof Error ? error.message : "Unknown error");
      }
      
      return; // Exit after export
    }

    // Export ISbStoryData schema bundle if requested
    if (rawOptions.exportIsbBundle !== undefined) {
      const outputDir = rawOptions.exportIsbBundle || "./schemas";
      console.log(`📦 Exporting ISbStoryData schema bundle to: ${outputDir}\n`);
      
      try {
        exportISbStoryDataSchemaBundle(options, outputDir);
        console.log("✅ Successfully exported ISbStoryData schema bundle");
        
      } catch (error) {
        console.error("❌ Bundle export failed:", error instanceof Error ? error.message : "Unknown error");
      }
      
      return; // Exit after bundle export
    }

    Tracer.log(LogLevel.VERBOSE, `Starting conversion for space: ${options.space}`);
    Tracer.log(LogLevel.DEBUG, `Options: ${JSON.stringify(options, null, 2)}`);

    // Validate all required paths
    await validatePaths(options);

    // Initialize paths
    const folderPath = path.resolve(options.folder);
    const jsonPath = path.join(folderPath, "components", options.space);
    const pathToSbInterfaceFile = path.join(folderPath, "types", CONSTANTS.SB_INTERFACES_FILE);

    Tracer.log(
      LogLevel.DEBUG,
      `Resolved paths - folder: ${folderPath}, json: ${jsonPath}, types: ${pathToSbInterfaceFile}`
    );

    // Process Storyblok interface file
    await processStoryblokInterfaces(pathToSbInterfaceFile, options);

    // Process component files
    const componentFiles = await discoverComponentFiles(jsonPath);

    if (componentFiles.length === 0) {
      Tracer.log(LogLevel.WARN, `No component files found in ${jsonPath}`);
      return;
    }

    Tracer.log(LogLevel.VERBOSE, `Found ${componentFiles.length} component JSON files.`);

    // Build dependency graph and sort components
    const sortedComponents = await buildDependencyGraph(componentFiles, jsonPath);

    // Convert components
    await convertComponents(sortedComponents, jsonPath);

    // Generate final output
    await generateFinalOutput(options.output);
  } catch (error) {
    await handleError(error);
  }
}

// Execute main function
main().catch(handleError);
