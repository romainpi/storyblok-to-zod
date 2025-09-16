import { Command, OptionValues } from "commander";

export default function parseCliOptions(): OptionValues {
  const program = new Command();
  program
    .name("storyblok-to-zod")
    .description("Generates a Zod schema from your Storyblok components")
    .option("-s, --space <storyblokSpaceId>", "Storyblok space ID")
    .option("-v, --verbose", "show verbose information");

  program.parse(process.argv);

  return program.opts();
}
