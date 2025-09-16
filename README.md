# storyblok-to-zod

Generate a Zod schema from your Storyblok components. _Datasources soon_.

Useful for defining Zod schemas for [Astro's Content Collections][astro-collections].

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

[astro-collections]: https://docs.astro.build/en/guides/content-collections/
[astro-alpha]: https://www.storyblok.com/mp/announcing-storyblok-loader-astro-content-layer-api
[abandoned-implementation]: https://github.com/storyblok/storyblok-astro/commit/1a9bfb16e5886b3419607eb77802088f5eb9dfc4
