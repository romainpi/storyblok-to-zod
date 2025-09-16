import chalk from "chalk";

export enum LogLevel {
  ERROR,
  WARN,
  INFO,
  VERBOSE,
  DEBUG,
}

export class Tracer {
  public static logLevel = LogLevel.INFO;

  public static log(level: LogLevel, message?: string, componentName?: string, spacing: number = 0): void {
    if (level <= this.logLevel) {
      if (message === undefined) {
        console.log();
        return;
      }

      const componentNamePart = componentName ? `${chalk.underline(componentName)}: ` : "";

      const spacingIndent = " ".repeat(spacing);
      const stringToShow = `${spacingIndent}${componentNamePart}${message}`;

      const levelText = () => {
        switch (level) {
          case LogLevel.ERROR:
            return chalk.red("ERROR: ");
          case LogLevel.WARN:
            return chalk.yellow("WARN: ");
          default:
            return "";
        }
      };

      console.log(`${levelText()}${stringToShow}`);
    }
  }
}
