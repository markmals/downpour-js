# Downpour

Downpour is a TypeScript port of the [Swift library of the same name](https://github.com/Ponyboy47/Downpour).

Downpour can gather the following from a raw video name:

* TV or movie title
* Year of release
* TV season number
* TV episode number

**Note:** None of the fields are guaranteed to be there or even picked up, since it's kind of hard to extract metadata from file names with only a few clever regular expressions. Please open an issue if you know the data is there, but it's not being picked up. Pull requests are welcome, as well. This also means a lot of members are optional, so be sure to check that the property isn't undefined or nullish coalescing operator (`??`) to program safely 😄

## Installation

```sh
# npm
npm install downpour

# yarn
yarn add downpour

# pnpm
pnpm install downpour
```

## Usage

Using Downpour is easy. Just create a new instance and Downpour will do the rest.

```typescript
import Downpour from "downpour"

let metadata = new Downpour("filenameWithoutExtension")

let title = metadata.title
let year = metadata.year

if (metadata.type === "tv") {
    let season = metadata.season
    let episode = metadata.episode
}

let plexName = metadata.basicPlexName
```

## License

Published under the [MIT License](./LICENSE).