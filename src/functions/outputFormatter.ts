import { Project } from "ts-morph";
import { LogLevel, Tracer } from "../statics/Tracer";

/**
 * Analyzes the generated code content to extract imports and schemas
 */
function analyzeGeneratedContent(content: string): { imports: Set<string>; schemas: string[] } {
  const lines = content.split("\n");
  const imports = new Set<string>();
  const schemas: string[] = [];
  let currentSchema = "";
  let inSchema = false;
  let braceCount = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments when not in a schema
    if (!inSchema && (!trimmedLine || trimmedLine.startsWith("//"))) {
      continue;
    }

    // Detect import statements
    if (trimmedLine.startsWith("import ") && trimmedLine.includes("from")) {
      imports.add(line);
      continue;
    }

    // Detect schema start - any const/export const that uses Zod
    if ((trimmedLine.startsWith("export const ") || trimmedLine.startsWith("const ")) && 
        (trimmedLine.includes(" = z.") || trimmedLine.includes("= z."))) {
      inSchema = true;
      currentSchema = line;
      braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

      // If it's a single-line schema
      if (braceCount === 0 && trimmedLine.endsWith(";")) {
        schemas.push(currentSchema);
        currentSchema = "";
        inSchema = false;
      }
      continue;
    }

    // Continue building current schema
    if (inSchema) {
      currentSchema += "\n" + line;
      braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

      // Schema is complete when braces are balanced and line ends with semicolon
      if (braceCount === 0 && trimmedLine.endsWith(";")) {
        schemas.push(currentSchema);
        currentSchema = "";
        inSchema = false;
      }
    }
  }

  // Handle any remaining unclosed schema
  if (inSchema && currentSchema) {
    schemas.push(currentSchema);
  }

  return { imports, schemas };
}

/**
 * Deduplicates imports by combining them intelligently
 */
function deduplicateImports(imports: Set<string>): string[] {
  const importMap = new Map<string, { items: Set<string>; isType: boolean }>();

  for (const importStatement of imports) {
    try {
      // Parse import statement to extract module and imported items
      // Updated regex to handle type imports
      const match = importStatement.match(
        /import\s+(type\s+)?(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/
      );

      if (match) {
        const [, typeKeyword, namedImports, namespaceImport, defaultImport, modulePath] = match;
        const isType = !!typeKeyword;

        if (modulePath && !importMap.has(modulePath)) {
          importMap.set(modulePath, { items: new Set(), isType: false });
        }

        if (modulePath) {
          const moduleData = importMap.get(modulePath)!;
          // If any import for this module is a type import, mark the whole module as type
          if (isType) {
            moduleData.isType = true;
          }

          if (namedImports) {
            // Handle named imports like { z, something } or type { Something }
            const items = namedImports.split(",").map((item) => item.trim());
            items.forEach((item) => moduleData.items.add(item));
          } else if (namespaceImport) {
            // Handle namespace imports like * as z
            moduleData.items.add(`* as ${namespaceImport}`);
          } else if (defaultImport) {
            // Handle default imports - but these are usually not type imports
            // If it's a type import of a single identifier, treat it as named import
            if (isType) {
              moduleData.items.add(defaultImport);
            } else {
              moduleData.items.add(defaultImport);
            }
          }
        }
      }
    } catch (error) {
      Tracer.log(LogLevel.WARN, `Failed to parse import: ${importStatement}`, "deduplicateImports");
    }
  }

  // Reconstruct deduplicated import statements
  const deduplicatedImports: string[] = [];

  for (const [modulePath, { items, isType }] of importMap) {
    const importArray = Array.from(items).sort();
    const hasNamespace = importArray.some((imp) => imp.startsWith("* as "));

    if (hasNamespace) {
      // If there's a namespace import, use only that
      const namespaceImport = importArray.find((imp) => imp.startsWith("* as "));
      if (namespaceImport) {
        const typePrefix = isType ? "type " : "";
        deduplicatedImports.push(`import ${typePrefix}${namespaceImport} from '${modulePath}';`);
      }
    } else {
      // For type imports or multiple imports, always use curly braces
      // For single non-type imports that don't look like named imports, use default import syntax
      const shouldUseDefaultSyntax =
        !isType &&
        importArray.length === 1 &&
        importArray[0] &&
        !importArray[0].includes("{") &&
        /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(importArray[0]); // Valid identifier

      if (shouldUseDefaultSyntax) {
        // Single default import
        deduplicatedImports.push(`import ${importArray[0]} from '${modulePath}';`);
      } else {
        // Named imports (including type imports)
        const typePrefix = isType ? "type " : "";
        deduplicatedImports.push(`import ${typePrefix}{ ${importArray.join(", ")} } from '${modulePath}';`);
      }
    }
  }

  return deduplicatedImports.sort();
}

/**
 * Formats TypeScript code using ts-morph for proper indentation and spacing
 */
function formatWithTsMorph(content: string): string {
  try {
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 99, // Latest
      },
    });

    const sourceFile = project.createSourceFile("temp.ts", content);

    // Format the source file
    sourceFile.formatText({
      indentSize: 2,
      convertTabsToSpaces: true,
      insertSpaceAfterCommaDelimiter: true,
      insertSpaceAfterFunctionKeywordForAnonymousFunctions: false,
      insertSpaceAfterKeywordsInControlFlowStatements: true,
      insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: false,
      insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: false,
      insertSpaceBeforeAndAfterBinaryOperators: true,
      placeOpenBraceOnNewLineForControlBlocks: false,
      placeOpenBraceOnNewLineForFunctions: false,
    });

    return sourceFile.getFullText();
  } catch (error) {
    Tracer.log(
      LogLevel.WARN,
      `Failed to format with ts-morph: ${error instanceof Error ? error.message : "Unknown error"}`,
      "formatWithTsMorph"
    );
    return content;
  }
}

/**
 * Formats the final output with proper organization and spacing
 */
export function formatFinalOutput(
  fileHeader: string,
  nativeSchemas: string,
  componentSchemas: string
): string {
  Tracer.log(LogLevel.DEBUG, "Starting output formatting", "formatFinalOutput");

  try {
    // Combine all content for analysis
    const allContent = `${fileHeader}\n${nativeSchemas}\n${componentSchemas}`;

    // Analyze the content
    const { imports: extractedImports, schemas } = analyzeGeneratedContent(allContent);

    // Add the header import if not already present
    extractedImports.add("import { z } from 'astro/zod';");

    // Deduplicate and sort imports
    const finalImports = deduplicateImports(extractedImports);

    // Organize schemas with proper spacing
    const organizedSchemas = schemas.map((schema) => schema.trim()).filter(Boolean);

    // Build final content
    const contentParts = ["// Generated by storyblok-to-zod", ...finalImports, ...organizedSchemas];

    const rawContent = contentParts.join("\n\n");

    // Format with ts-morph for consistent style
    const formattedContent = formatWithTsMorph(rawContent);

    Tracer.log(
      LogLevel.DEBUG,
      `Formatted output with ${finalImports.length} imports and ${organizedSchemas.length} schemas`,
      "formatFinalOutput"
    );

    return formattedContent;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    Tracer.log(LogLevel.ERROR, `Error formatting output: ${errorMessage}`, "formatFinalOutput");

    // Fallback to basic concatenation
    return `${fileHeader}\n${nativeSchemas}\n${componentSchemas}`;
  }
}
