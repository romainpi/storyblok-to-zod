import { Project, InterfaceDeclaration, ModuleDeclaration, SyntaxKind } from "ts-morph";
import { LogLevel, Tracer } from "../statics/Tracer";

/**
 * Utility class for extracting TypeScript interfaces from external npm packages using ts-morph.
 * This class provides a robust way to locate and extract interface definitions from packages
 * installed via npm or pnpm, handling various package manager structures and file locations.
 * 
 * @example
 * ```typescript
 * const extractor = new ExternalInterfaceExtractor();
 * const interface = extractor.extractInterfaceFromPackage("storyblok-js-client", "ISbStoryData");
 * if (interface) {
 *   console.log("Found interface:", interface.getName());
 * }
 * extractor.dispose(); // Clean up resources
 * ```
 */
export class ExternalInterfaceExtractor {
  private project: Project;

  constructor() {
    this.project = new Project({
      tsConfigFilePath: "tsconfig.json",
      skipAddingFilesFromTsConfig: true,
      useInMemoryFileSystem: false,
    });
  }

  /**
   * Extracts a TypeScript interface declaration from a node_modules package.
   * This method searches through various possible package locations and file patterns
   * to locate the specified interface, supporting both npm and pnpm package structures.
   * 
   * @param packageName - The name of the npm package (e.g., "storyblok-js-client", "storyblok-js-client")
   * @param interfaceName - The name of the interface to extract (e.g., "ISbStoryData")
   * @returns The InterfaceDeclaration if found, null if not found
   * @throws {Error} If there are issues accessing package files or parsing TypeScript
   * 
   * @example
   * ```typescript
   * const extractor = new ExternalInterfaceExtractor();
   * const storyInterface = extractor.extractInterfaceFromPackage("storyblok-js-client", "ISbStoryData");
   * if (storyInterface) {
   *   const properties = storyInterface.getProperties();
   *   console.log(`Interface has ${properties.length} properties`);
   * }
   * ```
   */
  public extractInterfaceFromPackage(packageName: string, interfaceName: string): InterfaceDeclaration | null {
    Tracer.log(LogLevel.DEBUG, `Extracting interface '${interfaceName}' from package '${packageName}'`, "extractInterfaceFromPackage");

    try {
      // Try different possible paths for the package (handle pnpm structure)
      const possiblePaths = [
        `node_modules/${packageName}`,
        `node_modules/.pnpm/${packageName.replace('@', '').replace('/', '+')}*/node_modules/${packageName}`,
        `node_modules/.pnpm/*${packageName.split('/').pop()}*/node_modules/${packageName}`
      ];
      
      let foundFiles: any[] = [];
      
      // Try each possible path
      for (const pathPattern of possiblePaths) {
        try {
          const sourceFiles = this.project.addSourceFilesAtPaths([
            `${pathPattern}/**/*.d.ts`,
            `${pathPattern}/**/*.ts`
          ]);
          
          if (sourceFiles.length > 0) {
            foundFiles = foundFiles.concat(sourceFiles);
            Tracer.log(LogLevel.DEBUG, `Found ${sourceFiles.length} TypeScript files in pattern '${pathPattern}'`);
          }
        } catch (error) {
          // Ignore errors for patterns that don't match
          continue;
        }
      }

      if (foundFiles.length === 0) {
        Tracer.log(LogLevel.WARN, `No TypeScript files found for package '${packageName}'`);
        return null;
      }

      Tracer.log(LogLevel.DEBUG, `Total found ${foundFiles.length} TypeScript files for package '${packageName}'`);

      // Search for the interface across all files
      for (const sourceFile of foundFiles) {
        const filePath = sourceFile.getFilePath();
        
        // First, try to find the interface directly in the file
        const directInterface = sourceFile.getInterface(interfaceName);
        if (directInterface) {
          Tracer.log(LogLevel.DEBUG, `Found interface '${interfaceName}' directly in file: ${filePath}`);
          return directInterface;
        }

        // Also search in module declarations (for ambient modules)
        const moduleDeclarations = sourceFile.getModules();
        for (const moduleDecl of moduleDeclarations) {
          const moduleInterface = this.searchInterfaceInModule(moduleDecl, interfaceName);
          if (moduleInterface) {
            Tracer.log(LogLevel.DEBUG, `Found interface '${interfaceName}' in module '${moduleDecl.getName()}' in file: ${filePath}`);
            return moduleInterface;
          }
        }

        // Search for exported interfaces
        const exportedDeclarations = sourceFile.getExportedDeclarations();
        for (const [exportName, declarations] of exportedDeclarations) {
          if (exportName === interfaceName) {
            for (const declaration of declarations) {
              if (declaration.getKind() === SyntaxKind.InterfaceDeclaration) {
                Tracer.log(LogLevel.DEBUG, `Found exported interface '${interfaceName}' in file: ${filePath}`);
                return declaration as InterfaceDeclaration;
              }
            }
          }
        }
      }

      Tracer.log(LogLevel.WARN, `Interface '${interfaceName}' not found in package '${packageName}'`);
      return null;

    } catch (error) {
      Tracer.log(LogLevel.ERROR, `Error extracting interface '${interfaceName}' from package '${packageName}': ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Recursively searches for an interface within a module declaration
   */
  private searchInterfaceInModule(moduleDecl: ModuleDeclaration, interfaceName: string): InterfaceDeclaration | null {
    // Check for interface directly in this module
    const directInterface = moduleDecl.getInterface(interfaceName);
    if (directInterface) {
      return directInterface;
    }

    // Search in nested modules
    const nestedModules = moduleDecl.getModules();
    for (const nestedModule of nestedModules) {
      const nestedInterface = this.searchInterfaceInModule(nestedModule, interfaceName);
      if (nestedInterface) {
        return nestedInterface;
      }
    }

    return null;
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    // ts-morph project cleanup is handled automatically
  }
}