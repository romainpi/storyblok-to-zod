# storyblok-to-zod

Generate a Zod schema from your Storyblok components. _Datasources soon_.

## Usage

### With installation

Installation:

```sh
# With npm
npm install storyblok-to-zod --save-dev

# With pnpm
pnpm add storyblok-to-zod --dev

# With yarn
yarn add storyblok-to-zod --dev
```

Running:

```sh
# With pnpm
pnpm storyblok-to-zod --space STORYBLOK_ID

# With yarn
yarn storyblok-to-zod --space STORYBLOK_ID
```

### Without installation

```sh
# With npm
npx storyblok-to-zod --space STORYBLOK_ID

# With pnpm
pnpm dlx storyblok-to-zod --space STORYBLOK_ID

# With yarn
yarn dlx storyblok-to-zod --space STORYBLOK_ID
```

## Options

| Option    | Short | Description                               | Default |
| --------- | ----- | ----------------------------------------- | ------- |
| --space   | -s    | (Required) The ID of your Storyblok space | -       |
| --verbose | -v    | Verbose mode                              | false   |
| --help    | -h    | Show command help                         | false   |

## Why does this exist?

- I required a tool like this for [Astro's Content Collections][astro-collections] and didn't find any simple guide or let alone a tool to help me solve this problem.

## Notes

Takes inspirations from:

- [`storyblok types generate`](https://github.com/storyblok/monoblok/tree/main/packages/cli/src/commands/types/generate)
- [`storyblok components pull`](https://github.com/storyblok/monoblok/tree/main/packages/cli/src/commands/components/pull)

### Storyblok were working on an official Astro Content Layer API implementation

September of 2024 there was a post [about an alpha version of a "Storyblok Loader for the Astro Content Layer API"][astro-alpha].

The implementation [can be found here][abandoned-implementation] in the archived repo (the code has since been moved to a monorepo and this development branch has not been carried over). It appears this implementation did not take care of defining a Zod schema for Storyblok's modules.

## TODO (maybe)

- [ ] Add Storyblok datasources as well.
- [ ] Revive old code.

## License

Copyright &copy; 2025 Romain Pironneau

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[astro-collections]: https://docs.astro.build/en/guides/content-collections/
[astro-alpha]: https://www.storyblok.com/mp/announcing-storyblok-loader-astro-content-layer-api
[abandoned-implementation]: https://github.com/storyblok/storyblok-astro/commit/1a9bfb16e5886b3419607eb77802088f5eb9dfc4
