export function kebabToCamelCase(text: string): string {
  return text.replace(/-\w/g, clearAndUpper);
}

export function kebabToPascalCase(text: string): string {
  return text.replace(/(^\w|-\w)/g, clearAndUpper);
}

function clearAndUpper(text: string): string {
  return text.replace(/-/, "").toUpperCase();
}
