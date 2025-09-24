/** A static dictionary to track which components have been converted */
export class ConvertedComponents {
  private static convertedComponents = new Map<string, string>();

  public static add(componentName: string, zodSchema: string): void {
    this.convertedComponents.set(componentName, zodSchema);
  }

  public static has(componentName: string): boolean {
    return this.convertedComponents.has(componentName);
  }

  public static getAll(): [string, string][] {
    return Array.from(this.convertedComponents.entries());
  }

  public static getAllValues(): string[] {
    return Array.from(this.convertedComponents.values());
  }
}
