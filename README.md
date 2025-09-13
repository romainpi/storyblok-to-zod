# storyblok-to-zod

Generates Zod schemas for your StoryBlok components (_and datasources?_), using Storyblok's API.

## Installation

TODO

## Usage

```shell
pnpm storyblok-to-zod
```

__TODO__

## Why does this exist?

- I required a tool like this for [Astro's Content Collections][astro-collections] and didn't find any simple guide or let alone a tool to help me solve this problem.
- This helps with your
- I wanted to try publishing and maitaning a public npm package and this seemed like a bonafide opportunity.

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
[contentlayer-search]: https://github.com/search?q=org%3Astoryblok+contentLayer&type=code
[abandoned-implementation]: https://github.com/storyblok/storyblok-astro/commit/1a9bfb16e5886b3419607eb77802088f5eb9dfc4