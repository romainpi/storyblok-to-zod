import { build } from 'esbuild';

const config = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/index.js',
  sourcemap: true,
  external: [
    '@storyblok/management-api-client',
    'chalk',
    'commander',
    'ts-morph',
    'ts-to-zod'
  ]
};

// If this file is run directly, execute the build
if (import.meta.url === `file://${process.argv[1]}`) {
  build(config).catch(() => process.exit(1));
}

export default config;