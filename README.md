# Token Decentralised Exchange

> Token decentralised exchange where you can deposit & withdraw tokens, make
> orders and trades (smart contracts).

[![license-shield][]](LICENSE)
[![test-shield][]][test-link]
![last-commit-shield][]

## Smart Contracts

- [`Token.sol`](contracts/Token.sol): `ToDEX` token used by the exchange.
- [`Exchange.sol`](contracts/Exchange.sol): Exchange.

## Development

See [`package.json`](package.json) for the list of available scripts.

### Prerequisites

This project require the following dependencies:

- [Node.js](https://nodejs.org)
- [Yarn](https://yarnpkg.com)

### Setup

Install the dependencies, the `.env` file and compile:

```bash
cp .env.sample .env
yarn install
yarn compile
```

JSON contracts (to be used by front-end projects) are deployed into the
`artifacts/contracts` directory.

### Usage

#### Deployment

Run a local server on a dedicated terminal:

```bash
yarn server
```

Execute the deployment script:

```bash
yarn deploy:local
```

A development environment can also be seeded for demo purposes:

```bash
yarn seed:local
```

### Contributing

This project is not currently open to contributions.

## Built With

[Node.js](https://nodejs.org)
, [Yarn](https://yarnpkg.com)
, [TypeScript](https://www.typescriptlang.org)
, [Eslint](https://eslint.org)
, [Prettier](https://prettier.io)
, [Mocha](https://mochajs.org)
, [dotenv](https://github.com/motdotla/dotenv)
, [update-dotenv](https://github.com/bkeepers/update-dotenv)
, [Hardhat](https://hardhat.org)
, [Ethers](https://docs.ethers.io/)

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

[contributors-link]: https://github.com/benjamin-guibert/todex-contracts/contributors
[license-shield]: https://img.shields.io/github/license/benjamin-guibert/todex-contracts.svg
[test-shield]: https://img.shields.io/github/workflow/status/benjamin-guibert/todex-contracts/Test
[test-link]: https://github.com/benjamin-guibert/todex-contracts/actions/workflows/test.yml
[last-commit-shield]: https://img.shields.io/github/last-commit/benjamin-guibert/todex-contracts
