import { LogLevel, Tracer } from "../statics/Tracer";
import { Project, SourceFile, SyntaxKind } from "ts-morph";
import { ConvertedComponents } from "../statics/ConvertedComponents";
import { NativeSchemaRegistry } from "../statics/NativeSchemaRegistry";

/**
 * Analyzes component schemas to determine which native schemas are actually used
 */
export function analyzeNativeSchemaDependencies(): void {
  Tracer.log(LogLevel.DEBUG, "Starting native schema dependency analysis", "analyzeNativeSchemaDependencies");

  // Create a ts-morph project to analyze the generated schemas
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      target: 99, // Latest
    },
  });

  // Get all converted component schemas and create a source file for analysis
  const allComponentContent = ConvertedComponents.getAllValues().join("\n");
  const componentSourceFile = project.createSourceFile("components.ts", allComponentContent);

  // Get all native schema names from the registry and convert them to schema names
  const nativeSchemaReferences = new Map<string, string>();
  for (const interfaceName of NativeSchemaRegistry.getAll().keys()) {
    const schemaName = interfaceNameToSchemaName(interfaceName);
    nativeSchemaReferences.set(schemaName, interfaceName);
  }

  // Check each native schema to see if it's referenced in component schemas
  for (const [schemaName, interfaceName] of nativeSchemaReferences.entries()) {
    if (isSchemaReferencedInSourceFile(schemaName, componentSourceFile)) {
      NativeSchemaRegistry.markAsUsed(interfaceName);
      Tracer.log(LogLevel.DEBUG, `Native schema '${interfaceName}' (${schemaName}) is used by components`);
    } else {
      Tracer.log(LogLevel.DEBUG, `Native schema '${interfaceName}' (${schemaName}) is NOT used by components`);
    }
  }

  // Also check for indirect dependencies - native schemas that reference other native schemas
  const usedSchemas = NativeSchemaRegistry.getUsed();
  for (const [, schemaContent] of usedSchemas.entries()) {
    findIndirectDependencies(schemaContent, nativeSchemaReferences, project);
  }

  const stats = NativeSchemaRegistry.getUsageStats();
  Tracer.log(
    LogLevel.INFO, 
    `Dependency analysis complete: ${stats.used}/${stats.total} native schemas are used (${stats.unused} unused schemas excluded)`
  );
}

/**
 * Converts an interface name to its corresponding schema name
 * e.g., "StoryblokAsset" -> "storyblokAssetSchema"
 */
function interfaceNameToSchemaName(interfaceName: string): string {
  // Convert PascalCase to camelCase and add "Schema" suffix
  const camelCaseName = interfaceName.charAt(0).toLowerCase() + interfaceName.slice(1);
  return camelCaseName + "Schema";
}

/**
 * Checks if a schema name is referenced in the given source file using ts-morph
 */
function isSchemaReferencedInSourceFile(schemaName: string, sourceFile: SourceFile): boolean {
  // Find all identifier references in the source file
  const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
  
  // Check if any identifier matches our schema name
  return identifiers.some(identifier => identifier.getText() === schemaName);
}

/**
 * Finds native schemas that are indirectly referenced by other native schemas using ts-morph
 */
function findIndirectDependencies(
  currentSchemaContent: string,
  nativeSchemaReferences: Map<string, string>,
  project: Project
): void {
  // Create a source file for the current schema to analyze its dependencies
  const schemaSourceFile = project.createSourceFile(`temp_${Date.now()}.ts`, currentSchemaContent);
  
  // Find all identifiers in this schema
  const identifiers = schemaSourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
  
  for (const identifier of identifiers) {
    const identifierText = identifier.getText();
    
    // Check if this identifier is a reference to another native schema
    if (nativeSchemaReferences.has(identifierText)) {
      const referencedInterfaceName = nativeSchemaReferences.get(identifierText)!;
      
      if (NativeSchemaRegistry.has(referencedInterfaceName) && !NativeSchemaRegistry.isUsed(referencedInterfaceName)) {
        NativeSchemaRegistry.markAsUsed(referencedInterfaceName);
        Tracer.log(LogLevel.DEBUG, `Native schema '${referencedInterfaceName}' is used indirectly by other native schemas`);
        
        // Recursively find dependencies of this referenced schema
        const referencedSchemaContent = NativeSchemaRegistry.get(referencedInterfaceName)!;
        findIndirectDependencies(referencedSchemaContent, nativeSchemaReferences, project);
      }
    }
  }
  
  // Clean up the temporary source file
  project.removeSourceFile(schemaSourceFile);
}