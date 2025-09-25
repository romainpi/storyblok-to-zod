/**
 * Shared utilities for handling import path replacements and deduplication
 * This consolidates the scattered PLACEHOLDER_IMPORT_PATH logic across multiple files
 */

/**
 * Configuration for import path replacements
 */
const IMPORT_PATH_MAPPINGS = {
  'ISbStoryData': 'storyblok-js-client',
  'ISbMultipleStoriesData': 'storyblok-js-client', 
  'StoryblokRichtext': '~/types/storyblok.d'
} as const;

/**
 * Fixes PLACEHOLDER_IMPORT_PATH imports by replacing them with correct module paths
 * This centralizes the logic that was duplicated in outputFormatter.ts and isbStoryDataProcessor.ts
 * 
 * @param content - The content containing PLACEHOLDER_IMPORT_PATH imports
 * @returns Content with fixed import paths
 */
export function fixPlaceholderImports(content: string): string {
  let fixedContent = content;

  // Replace complex import statements with multiple types
  fixedContent = fixedContent.replace(
    /import\s+\{\s*type\s+([^}]+)\s*\}\s+from\s+['"]PLACEHOLDER_IMPORT_PATH['"];?/g,
    (_match, types: string) => {
      const typeList = types.split(',').map((t: string) => t.trim()).filter(Boolean);
      const imports: string[] = [];
      
      // Group types by their target module
      const moduleGroups = new Map<string, string[]>();
      const unknownTypes: string[] = [];
      
      for (const type of typeList) {
        const modulePath = IMPORT_PATH_MAPPINGS[type as keyof typeof IMPORT_PATH_MAPPINGS];
        if (modulePath) {
          if (!moduleGroups.has(modulePath)) {
            moduleGroups.set(modulePath, []);
          }
          moduleGroups.get(modulePath)!.push(type);
        } else {
          unknownTypes.push(type);
        }
      }
      
      // Generate import statements for each module
      for (const [modulePath, moduleTypes] of moduleGroups.entries()) {
        imports.push(`import { type ${moduleTypes.join(', type ')} } from '${modulePath}';`);
      }
      
      // Keep unknown types with placeholder for manual review
      if (unknownTypes.length > 0) {
        imports.push(`import { type ${unknownTypes.join(', type ')} } from 'PLACEHOLDER_IMPORT_PATH';`);
      }
      
      return imports.join('\n');
    }
  );

  // Handle simple single-type imports
  for (const [typeName, modulePath] of Object.entries(IMPORT_PATH_MAPPINGS)) {
    const singleImportRegex = new RegExp(
      `import\\s*\\{\\s*type\\s+${typeName}\\s*\\}\\s*from\\s*['"]PLACEHOLDER_IMPORT_PATH['"];?`,
      'g'
    );
    fixedContent = fixedContent.replace(
      singleImportRegex,
      `import { type ${typeName} } from '${modulePath}';`
    );
  }

  return fixedContent;
}

/**
 * Adds a new import path mapping for custom types
 * This allows extending the known import mappings at runtime
 * 
 * @param typeName - The TypeScript type name
 * @param modulePath - The module path to import from
 */
export function addImportPathMapping(typeName: string, modulePath: string): void {
  // TypeScript doesn't allow modifying readonly objects at runtime,
  // but we can extend the functionality through a separate map
  (IMPORT_PATH_MAPPINGS as any)[typeName] = modulePath;
}

/**
 * Gets the import path for a given type name
 * 
 * @param typeName - The TypeScript type name
 * @returns The module path or undefined if not found
 */
export function getImportPathForType(typeName: string): string | undefined {
  return IMPORT_PATH_MAPPINGS[typeName as keyof typeof IMPORT_PATH_MAPPINGS];
}