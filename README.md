# storyblok-to-zod

Generates a [Zod schema][zod] from your Storyblok components.

Processes the output of [Storyblok's CLI][storyblok-cli] `components pull` and
`types generate` commands.

Useful for defining Zod schemas for [Astro's Content
Collections][astro-collections].

Converting Storyblok's CLI output to Zod schemas with [`ts-to-zod`] can be
problematic. This tool helps with this process by generating compatible Zod
schemas directly from your Storyblok components.

## Options

| Option              | Short | Description                                            | Default                      |
| ---------           | ----- | ------------------------------------------------------ | ---------------------------- |
| --space             | -s    | (Required) The ID of your Storyblok space              | -                            |
| --output            | -o    | Output to file                                         | -                            |
| --folder            | -f    | Path to the folder containing the Storyblok components | '.storyblok'                 |
| --verbose           | -v    | Verbose mode                                           | false                        |
| --debug             | -d    | Show debug information                                 | false                        |
| --help              | -h    | Show command help                                      | false                        |
| --no-extends-array  |       | Will not automatically convert `StoryblokMultiasset`   | -                            |

## Notes

### `--no-extends-array`

`ts-to-zod` appears to be unable to convert the definition of
`StoryblokMultiasset` because it `extends Array<StoryblokAsset>`. This tool will
bypass `ts-to-zod` and automatically convert `StoryblokMultiasset`. You may
disable this behaviour by specifying `--no-extends-array`.

### `ts-to-zod` version

Using `ts-to-zod` version `^3.15.0` because Astro hasn't updated to Zod v4 yet.

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

## TODO

- [ ] Add Storyblok datasources as well.

[astro-collections]: https://docs.astro.build/en/guides/content-collections/
[`ts-to-zod`]: https://www.npmjs.com/package/ts-to-zod
[storyblok-cli]: https://www.storyblok.com/docs/packages/storyblok-cli
[zod]: https://zod.dev
