# storyblok-to-zod

Generates a [Zod schema][zod] from your Storyblok components.

Processes the output of [Storyblok's CLI][storyblok-cli] `components pull` and
`types generate` commands.

Useful for defining Zod schemas for [Astro's Content
Collections][astro-collections].

Converting Storyblok's CLI output to Zod schemas with [`ts-to-zod`] can be
problematic. This tool helps with this process by generating compatible Zod
schemas directly from your Storyblok components.

## Usage

### Without installation

```sh
# With npm
npx storyblok-to-zod --space STORYBLOK_SPACE_ID
```

<details>
<summary>With pnpm</summary>
```sh
# With pnpm
pnpm dlx storyblok-to-zod --space STORYBLOK_SPACE_ID
```
</details>

<details>
<summary>With yarn</summary>
```sh
# With yarn
yarn dlx storyblok-to-zod --space STORYBLOK_SPACE_ID
```
</details>

### With installation

<details>
<summary>Installing</summary>

```sh
# With npm
npm install storyblok-to-zod --save-dev

# With pnpm
pnpm add storyblok-to-zod --dev

# With yarn
yarn add storyblok-to-zod --dev
```

</details>

Running:

```sh
# With pnpm
pnpm storyblok-to-zod --space STORYBLOK_SPACE_ID

# With yarn
yarn storyblok-to-zod --space STORYBLOK_SPACE_ID
```

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

- __`--no-extends-array`:__  
  `ts-to-zod` appears to be unable to convert the definition of
`StoryblokMultiasset` because it `extends Array<StoryblokAsset>`. This tool will
bypass `ts-to-zod` and automatically convert `StoryblokMultiasset`. You may
disable this behaviour by specifying `--no-extends-array`.

- __`ts-to-zod` version:__  
  Using `ts-to-zod` version `^3.15.0` because Astro hasn't updated to Zod v4 yet.

## TODO

- [ ] Add Storyblok datasources as well.

[astro-collections]: https://docs.astro.build/en/guides/content-collections/
[`ts-to-zod`]: https://www.npmjs.com/package/ts-to-zod
[storyblok-cli]: https://www.storyblok.com/docs/packages/storyblok-cli
[zod]: https://zod.dev
