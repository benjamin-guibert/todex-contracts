# <PROJECT>

> <DESCRIPTION>

[![license-shield][]](LICENSE)
[![test-shield][]][test-link]
![last-commit-shield][]

## Development

### Prerequisites

This project require the following dependencies:

- [Node.js](https://nodejs.org)
- [Yarn](https://yarnpkg.com)
- [Truffle](https://trufflesuite.com/truffle)
- [Ganache](https://trufflesuite.com/ganache)
- [ganache-cli](https://github.com/trufflesuite/ganache)

## Setup

Install the dependencies and compile:

```bash
yarn install
yarn compile
```

## Usage

See [`package.json`](package.json) for the list of available scripts.

### Migration

Run Ganache in a separate terminal:

```bash
yarn ganache
```

Execute the migration:

```bash
yarn migrate
```

## Built With

[Node.js](https://nodejs.org) |
[Yarn](https://yarnpkg.com) |
[Truffle](https://trufflesuite.com/truffle) |
[Ganache](https://trufflesuite.com/ganache) |
[ganache-cli](https://github.com/trufflesuite/ganache) |
[TypeScript](https://www.typescriptlang.org) |
[Eslint](https://eslint.org) |
[Prettier](https://prettier.io) |

## Release History

Check the [`CHANGELOG.md`](CHANGELOG.md) file for the release history.

## Versionning

We use [SemVer](http://semver.org/) for versioning. For the versions available,
see the [tags on this repository][tags-link].

## Authors

- **[Benjamin Guibert](https://github.com/benjamin-guibert)**: Creator & main
  contributor

See also the list of [contributors][contributors-link] who participated in this
project.

## License

[![license-shield][]](LICENSE)

This project is licensed under the MIT License. See the [`LICENSE`](LICENSE)
file for details.

[contributors-link]: https://github.com/benjamin-guibert/<REPO>/contributors
[license-shield]: https://img.shields.io/github/license/benjamin-guibert/<REPO>.svg
[test-shield]: https://img.shields.io/github/workflow/status/benjamin-guibert/<REPO>/Test
[test-link]: https://github.com/benjamin-guibert/<REPO>/actions/workflows/test.yml
[last-commit-shield]: https://img.shields.io/github/last-commit/benjamin-guibert/<REPO>
