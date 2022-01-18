popsiclepropaganda
==================

> Exploring the Cardano Blockchain

<img src="./public/rainbowpp.png" width="100%" />

## Getting started

This is a playground to learn Cardano concepts by implementing them. Currently focusing on transactions, wallets and native assets (tokens, NFTs). This all began with a low-level approach by installing the [cardano-node](https://github.com/input-output-hk/cardano-node) from source on MacOS and completing the [native assets examples](https://developers.cardano.org/docs/native-tokens/minting) on the [Cardano Developer Portal](https://developers.cardano.org/docs/get-started/).

It's worth noting that the Cardano "Dev Stack" provided by the core of this project is usable to fiddle with any [nodejs](https://nodejs.org/en/) Cardano dev projects. All you need is the [docker-compose](./docker-compose.yml) file and an [app/index.js](./app/index.js) to get started. For development this project is using [nodemon](https://nodemon.io/) to run the app backend so active coding will refresh the nodejs client in the docker container. The [app/package.json](./app/package.json) is a good starting place. The `docker-compose` mounts your host app directory to the container so everything in the app directory is shared with the container, including your `node_modules`.

## Development

#### Install

To install the package dependencies and local `.env` config:

- `yarn`

The default `.env` environment variables are as follows but have multiple values:

- `NETWORK`: Default is `testnet`. Can be `mainnet`.
- `BROWSER`: Default is `none` to disable `cra` default browser.
- `NODE_ENV`: Default is `development`. Can be `production`.

## Backend commands

- `yarn start:app`
- `yarn stop:app`

The [docker-compose](./docker-compose.yml) file is from [cardano-wallet](https://github.com/input-output-hk/cardano-wallet). The [cardano-nodejs](https://hub.docker.com/r/kitajchuk/cardano-nodejs) service has been added which runs a [nodejs](https://nodejs.org/en/) container with [cardano-cli](https://developers.cardano.org/docs/get-started/running-cardano#querying-the-cardano-blockchain). The [CARDANO_NODE_SOCKET_PATH](https://developers.cardano.org/docs/get-started/running-cardano#querying-the-cardano-blockchain) environment variable is set to the shared `node-ipc` volume between the services. This nodejs container can run any nodejs app you want from the `./app` directory which mounts as a shared volume between your host machine and the nodejs container. So everything in the local app directory is available in your running nodejs docker container.

This project has a playground for a client layer of low-level scripts called the `faucet` which act as a sort of `cardano-cli` sandbox for the Testnet. You can find them at [./app/utils/rawtx/index.js](./app/utils/rawtx/index.js). There are exploratory methods for doing things like sending ADA, [minting native tokens](https://developers.cardano.org/docs/native-tokens/minting) and [NFTs](https://developers.cardano.org/docs/native-tokens/minting-nfts), [burning tokens](https://developers.cardano.org/docs/native-tokens/minting#burning-token) and sending tokens. You can fund your `payment.addr` with `tADA` from the [Testnet faucet](https://developers.cardano.org/docs/integrate-cardano/testnet-faucet/).

This project is also using [cardano-wallet-js](https://developers.cardano.org/docs/get-started/cardano-wallet-js) with a `CRUD` API so you can Create, Read/Recover, Update and Destroy your wallets. One main objective is to utlize `cardano-wallet-js` to complete a fully functional wallet application. Another is to complete the `faucet` playground so one can send coin, tokens and NFTs between a local `payment.addr`, and a wallet.

```shell
# the yarn commands use docker-compose
# the project uses env-cmd for your local variables
env-cmd --file .env docker-compose --project-name cardano up
env-cmd --file .env docker-compose --project-name cardano down

# but technically you can also just:
NETWORK=testnet docker-compose up
```

The cardano-nodejs image is built from the [Dockerfile](./Dockerfile) in this project.

```shell
# build from ./Dockerfile
docker build --tag kitajchuk/cardano-nodejs:1.33.0 .

# publish to docker hub
docker push kitajchuk/cardano-nodejs:1.33.0
```

## Frontend commands

- `yarn start:src`

The frontend is currently a [create-react-app](https://create-react-app.dev) frontend loaded via [electron](https://github.com/electron/electron) so this can be desktop software. Currently it is not a very robust electron implementation, however many good concepts can be lifted from [electron-react-boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate) to make it better. The goal is to have minimal boilerplate overhead which is why we're not using a boilerplate like electron-react-boilerplate wholesale.

To build and run the static frontend:

```shell
# Build the frontend static app at ./build
yarn build:src

# Start electron and load the static ./build
yarn electron:dev
```

## NFTs

Example Popsicle Propaganda NFTs were minted on the Cardano Testnet with these low-level scripts. They were minted by a testnet `payment.addr` and sent to testnet wallets.

- [PP1](https://testnet.cardanoscan.io/token/6073ac5ca6373410319f896ca88d33094d5da8d37d505ab70848b90b505031)
- [PP2](https://testnet.cardanoscan.io/token/b9f1705170d75f144a4fd0636c2928b2bb39a5ab4db343978a0a1568505032)