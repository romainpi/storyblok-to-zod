# storyblok-to-zod

Generates a Zod schema from your Storyblok components.

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
pnpm storyblok-to-zod --space STORYBLOK_SPACE_ID

# With yarn
yarn storyblok-to-zod --space STORYBLOK_SPACE_ID
```

### Without installation

```sh
# With npm
npx storyblok-to-zod --space STORYBLOK_SPACE_ID

# With pnpm
pnpm dlx storyblok-to-zod --space STORYBLOK_SPACE_ID

# With yarn
yarn dlx storyblok-to-zod --space STORYBLOK_SPACE_ID
```

## Options

| Option    | Short | Description                               | Default |
| --------- | ----- | ----------------------------------------- | ------- |
| --space   | -s    | (Required) The ID of your Storyblok space | -       |
| --verbose | -v    | Verbose mode                              | false   |
| --help    | -h    | Show command help                         | false   |

## Notes

Currently using [`ts-to-zod`] version `^3.1.5` because Astro hasn't updated to Zod v4 yet.

## TODO

- [ ] Add Storyblok datasources as well.

[astro-collections]: https://docs.astro.build/en/guides/content-collections/
[`ts-to-zod`]:https://www.npmjs.com/package/ts-to-zod
