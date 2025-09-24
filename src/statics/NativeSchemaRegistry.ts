/** A static registry to manage native schema dependencies */
export class NativeSchemaRegistry {
  private static nativeSchemas = new Map<string, string>();
  private static usedNativeSchemas = new Map<string, string>();

  public static getAll(): Map<string, string> {
    return new Map(this.nativeSchemas);
  }

  public static getAllValues(): string[] {
    return Array.from(this.nativeSchemas.values());
  }

  public static getUsed(): Map<string, string> {
    return new Map(this.usedNativeSchemas);
  }

  public static markAsUsed(interfaceName: string): void {
    const schemaContent = this.nativeSchemas.get(interfaceName);
    if (schemaContent) {
      this.usedNativeSchemas.set(interfaceName, schemaContent);
    }
  }

  public static isUsed(interfaceName: string): boolean {
    return this.usedNativeSchemas.has(interfaceName);
  }

  public static has(interfaceName: string): boolean {
    return this.nativeSchemas.has(interfaceName);
  }

  public static get(interfaceName: string): string | undefined {
    return this.nativeSchemas.get(interfaceName);
  }

  public static set(interfaceName: string, schemaContent: string): void {
    this.nativeSchemas.set(interfaceName, schemaContent);
  }

  public static clear(): void {
    this.nativeSchemas.clear();
    this.usedNativeSchemas.clear();
  }

  public static getUsageStats(): { total: number; used: number; unused: number } {
    const total = this.nativeSchemas.size;
    const used = this.usedNativeSchemas.size;
    return { total, used, unused: total - used };
  }
}
