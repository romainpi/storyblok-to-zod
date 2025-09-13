import chalk from 'chalk';

const version = process.env.npm_package_version;

// Extract package version:

console.log(`Hello, world! (v${version})`);

console.log(chalk.green(`storyblok-to-zod (v${version})`));

console.log(chalk.green('Hello, world!'));