import path from "path";
import { InterfaceDeclaration, Project, SourceFile, ts } from "ts-morph";
import { LogLevel, Tracer } from "../statics/Tracer";
import extractSbInterfaceToZod from "./extractSbInterfaceToZod";
import { CLIOptions, FileOperationError, ValidationError } from "../validation";

/**
 * Process Storyblok interface definitions
 */
export async function processStoryblokInterfaces(
  pathToSbInterfaceFile: string,
  options: CLIOptions
): Promise<Map<string, string>> {
  const schemaRegistry = new Map<string, string>();

  try {
    Tracer.log(LogLevel.DEBUG, `Processing Storyblok interfaces from: ${pathToSbInterfaceFile}`);

    // Use ts-morph to analyze the file
    const storyblokTypesDefinitionFile = new Project().addSourceFileAtPath(pathToSbInterfaceFile);
    const interfaces = storyblokTypesDefinitionFile.getInterfaces();

    if (interfaces.length === 0) {
      Tracer.log(LogLevel.WARN, "No interfaces found in Storyblok types file");
      return schemaRegistry;
    }

    const importDeclarations = storyblokTypesDefinitionFile.getImportDeclarations();

    // Resolve the import declarations in order to extract the definitions of the imported types
    for (const importDecl of importDeclarations) {
      console.log("Processing import declaration:", importDecl.getText());

      // Get the path of the module being imported
      const sourceFile = importDecl.getModuleSpecifierSourceFile();
      console.log("Source file:", sourceFile?.getFilePath());

      if (!sourceFile) {
        console.warn("Warning: Could not resolve source file for import declaration:", importDecl.getText());
        continue;
      }

      // Get the module specifier (the path of the imported file)
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      console.log("Module specifier:", moduleSpecifier);

      // Get the named imports (the specific types being imported)
      const namedImports = importDecl.getNamedImports().map((ni) => ni.getName());
      console.log("Named imports:", namedImports);

      // Resolve the full path of the imported file
      const resolvedPath = path.join(process.cwd(), "src/types/", moduleSpecifier);
      console.log("Resolved path:", resolvedPath);

      for (const typeName of namedImports) {
        extractInterfaceDataFromFile(typeName, sourceFile.getFilePath());
      }
    }

    /*
    const sbJsClientPath = resolveWithTS('storyblok-js-client');
    if (!sbJsClientPath) {
      throw new Error("Could not resolve 'storyblok-js-client' package. Is it installed?");
    }
    */

    for (const currentInterface of interfaces) {
      const interfaceName = currentInterface.getName();

      try {
        const schema = extractSbInterfaceToZod(currentInterface, options);
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

function extractInterfaceDataFromFile(interfaceName: string, sourcePath: string) {
  console.log(`Extracting ${interfaceName} from :`, sourcePath);

  const file: SourceFile = new Project().addSourceFileAtPath(sourcePath);

  // const isbStoryDataDefinition = file.getInterface(interfaceName);
  // console.log(`Interface definition for '${interfaceName}':`, isbStoryDataDefinition?.getText() || 'Not found');

  // const ixxx = file.getImportDeclarations();
  // console.log(`Import declarations in ${sourcePath}:`, ixxx.map((imp) => imp.getText()));

  const isbStoryDataDefinition = extractInterfaceDefinition(file, interfaceName);

  const typeParameters = isbStoryDataDefinition?.getTypeParameters().map((tp) => tp.getName()) || [];
  console.log(`Type parameters for '${interfaceName}':`, typeParameters);

  const nonPrimitiveTypes = extractNonPrimitiveTypes(isbStoryDataDefinition);
  console.log(`Found non-primitive types in '${interfaceName}':`, nonPrimitiveTypes);
}

function extractInterfaceDefinition(file: SourceFile, interfaceName: string): InterfaceDeclaration | undefined {
  const isbStoryDataDefinition = file.getInterface(interfaceName);
  console.log(`Interface definition for '${interfaceName}':`, isbStoryDataDefinition?.getText() || "Not found");

  const filename = file.getBaseName();

  const ixxx = file.getImportDeclarations();
  console.log(
    `Import declarations in ${filename}:`,
    ixxx.map((imp) => imp.getText())
  );

  return isbStoryDataDefinition;
}

function resolveWithTS(pkgName: string) {
  const compilerOptions: ts.CompilerOptions = {
    moduleResolution: ts.ModuleResolutionKind.Node16,
    target: ts.ScriptTarget.ES2020,
  };

  const res = ts.resolveModuleName(pkgName, "index.d.ts", compilerOptions, ts.sys);
  return res.resolvedModule?.resolvedFileName ?? null;
}

/**
 * Extracts non-primitive TypeScript types used in an interface definition
 *
 * @param interfaceDeclaration - The TypeScript interface declaration from ts-morph
 * @returns An array of non-primitive type names found in the interface
 */
function extractNonPrimitiveTypes(interfaceDeclaration: any): string[] {
  const nonPrimitiveTypes = new Set<string>();

  // Get all properties from the interface
  const properties = interfaceDeclaration.getProperties();

  for (const prop of properties) {
    const propType = prop.getType();
    const typeText = propType.getText(undefined, ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);

    // Extract types from the type text
    const extractedTypes = extractTypesFromTypeText(typeText);
    extractedTypes.forEach((type) => nonPrimitiveTypes.add(type));
  }

  return Array.from(nonPrimitiveTypes);
}

/**
 * Extracts type names from a TypeScript type text string
 *
 * @param typeText - The string representation of a TypeScript type
 * @returns An array of non-primitive type names
 */
function extractTypesFromTypeText(typeText: string): string[] {
  const types = new Set<string>();

  // Remove array brackets, optional markers, and whitespace
  const cleanTypeText = typeText
    .replace(/\[\]/g, "") // Remove array brackets
    .replace(/\?/g, "") // Remove optional markers
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  // Handle union types (e.g., "string | number | CustomType")
  if (cleanTypeText.includes("|")) {
    const unionTypes = cleanTypeText.split("|").map((t) => t.trim());
    unionTypes.forEach((unionType) => {
      const extracted = extractSingleType(unionType);
      if (extracted) types.add(extracted);
    });
  }
  // Handle intersection types (e.g., "BaseType & CustomType")
  else if (cleanTypeText.includes("&")) {
    const intersectionTypes = cleanTypeText.split("&").map((t) => t.trim());
    intersectionTypes.forEach((intersectionType) => {
      const extracted = extractSingleType(intersectionType);
      if (extracted) types.add(extracted);
    });
  }
  // Handle generic types (e.g., "Array<CustomType>", "Promise<CustomType>")
  else if (cleanTypeText.includes("<")) {
    // Extract the main type before the generic
    const mainType = cleanTypeText.split("<")[0]?.trim();
    if (mainType) {
      const extracted = extractSingleType(mainType);
      if (extracted) types.add(extracted);
    }

    // Extract types from within the generics
    const genericMatch = cleanTypeText.match(/<(.+)>/);
    if (genericMatch && genericMatch[1]) {
      const genericContent = genericMatch[1];
      const nestedTypes = extractTypesFromTypeText(genericContent);
      nestedTypes.forEach((type) => types.add(type));
    }
  }
  // Handle simple types
  else {
    const extracted = extractSingleType(cleanTypeText);
    if (extracted) types.add(extracted);
  }

  return Array.from(types);
}

/**
 * Extracts a single type name if it's not a primitive type
 *
 * @param typeText - A single type string
 * @returns The type name if non-primitive, null otherwise
 */
function extractSingleType(typeText: string): string | null {
  const cleanType = typeText.trim();

  // Skip primitive types
  /*
  if (TS_PRIMITIVE_TYPES.includes(cleanType)) {
    return null;
  }
  */

  // Skip built-in utility types and common generic types
  const builtInTypes = [
    "Date",
    "RegExp",
    "Error",
    "Map",
    "Set",
    "WeakMap",
    "WeakSet",
    "Array",
    "Promise",
    "Partial",
    "Required",
    "Readonly",
    "Record",
    "Pick",
    "Omit",
    "Exclude",
    "Extract",
    "NonNullable",
    "Parameters",
    "ConstructorParameters",
    "ReturnType",
    "InstanceType",
    "ThisParameterType",
    "OmitThisParameter",
    "ThisType",
    "object",
    "unknown",
    "never",
    "void",
    "null",
    "undefined",
  ];

  if (builtInTypes.includes(cleanType)) {
    return null;
  }

  // Return the type if it looks like a custom type (starts with uppercase or is not empty)
  if (cleanType && /^[A-Z]/.test(cleanType)) {
    return cleanType;
  }

  return null;
}
