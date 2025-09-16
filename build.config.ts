import { defineBuildConfig } from 'unbuild';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

export default defineBuildConfig({
  declaration: true,
  entries: ['./src/index'],
  failOnWarn: false,
  sourcemap: true,
  replace: {
    __VERSION__: JSON.stringify(packageJson.version),
  },
});
