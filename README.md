popsiclepropaganda
==================

> Exploring Cardano blockchain development.

<img src="./public/rainbowpp.png" width="100%" />

## About

This is a repository to explore Cardano blockchain development for self-paced academic purposes only!

## Future project goals

The longer term goals of this repository are to learn [haskell](http://learnyouahaskell.com/) programming and ultimately [plutus](https://developers.cardano.org/docs/smart-contracts/plutus) smart contract development. Combining all the concepts I intend to create an independent Popsicle Propaganda NFT marketplace to mint and house my personal artworks. This is purely for personal interest in learning this tech stack and building a DApp. Some reference links that will be useful when we get there:

- [lucid-cardano](https://github.com/Berry-Pool/lucid)
- [cardano-serialization-lib](https://github.com/Emurgo/cardano-serialization-lib)
- [message-signing](https://github.com/Emurgo/message-signing)
- [cips.cardano.org](https://cips.cardano.org/)
- [CIP-0025](https://github.com/cardano-foundation/CIPs/blob/master/CIP-0025/CIP-0025.md)
- [CIP-0030](https://github.com/cardano-foundation/CIPs/tree/master/CIP-0030)
- [CIP-0008](https://github.com/cardano-foundation/CIPs/blob/master/CIP-0008/README.md)
- [nami-wallet](https://github.com/Berry-Pool/nami-wallet)
- [cardano-wallet-connector](https://github.com/dynamicstrategies/cardano-wallet-connector)
- [cardano-wallet-interface](https://github.com/HarmonicPool/cardano-wallet-interface)

## Current project state

Currently this repository houses some rudimentary low-level scripts (I call it the faucet) for wrapping the [cardano-cli](https://github.com/input-output-hk/cardano-cli) as well as a basic full-node wallet developed on top of [cardano-wallet-js](https://github.com/tango-crypto/cardano-wallet-js) as a Websocket server backend and a React+Websocket frontend.

The local wallet stack requires running a [cardano-node](https://github.com/input-output-hk/cardano-node/releases/tag/1.34.1) and [cardano-wallet](https://github.com/input-output-hk/cardano-wallet/releases/tag/v2022-01-18) server. This can be done with included `docker-compose` (easy) or the equivalent installed from release binaries (intermediate) or built from source (advanced).

I set up my local Cardano stack with release binaries and created some functions in my `.bashrc` for working with the service layers. Check the included [.bashrc.example](./.bashrc.example) as a reference to see what my local stack configuration looks like.

### Faucet scripts

As stated these are [rudimentary low-level scripts](./app/utils/rawtx/index.js) for wrapping the `cardano-cli`. While they were a great fun exercise in learning about Cardano transactions from the lowest level of the system, they are obsolete since the [cardano-serialization-lib](https://github.com/Emurgo/cardano-serialization-lib) is the preferred tool for working with all facets of Cardano moving forward.

Example Popsicle Propaganda NFTs were minted on the Cardano Testnet with these low-level scripts. They were minted by a testnet `payment.addr` and sent to a testnet wallet created with the local full node wallet here.

- [PP1](https://testnet.cardanoscan.io/token/6073ac5ca6373410319f896ca88d33094d5da8d37d505ab70848b90b505031)
- [PP2](https://testnet.cardanoscan.io/token/b9f1705170d75f144a4fd0636c2928b2bb39a5ab4db343978a0a1568505032)

### Local wallet

This is a functional Cardano full-node wallet but should not be used! It's brittle and not for "production". I built this out of self interest in learning about some Cardano concepts.

#### Install

To install the package dependencies and local `.env` config:

- `yarn`

The default `.env` environment variables are as follows but have multiple values:

- `NETWORK`: Default is `testnet`. Can be `mainnet`.
- `BROWSER`: Default is `none` to disable `cra` default browser.
- `NODE_ENV`: Default is `development`. Can be `production`.
- `DEV_STACK`: Default is `source`. Can be `docker`.

#### Without docker

When running from source make sure your `cardano-wallet` server is using port `8090`. Run your `cardano-node` and `cardano-wallet`. Then you can start the nodejs app.

- `yarn app`

#### With docker

- `yarn dc:up`
- `yarn dc:down`

The [docker-compose](./docker-compose.yml) file is from [cardano-wallet](https://github.com/input-output-hk/cardano-wallet). The [cardano-nodejs](https://hub.docker.com/r/kitajchuk/cardano-nodejs) service has been added which runs a [nodejs](https://nodejs.org/en/) container with [cardano-cli](https://developers.cardano.org/docs/get-started/running-cardano#querying-the-cardano-blockchain). The [CARDANO_NODE_SOCKET_PATH](https://developers.cardano.org/docs/get-started/running-cardano#querying-the-cardano-blockchain) environment variable is set to the shared `node-ipc` volume between the services. This nodejs container mounts the [app](./app) directory as a shared volume between the host machine and the nodejs container so everything in the local `app` directory is available in the running nodejs docker container. The `cardano-nodejs` image is built from the [Dockerfile](./docker/Dockerfile) in this repository.

```shell
# build from ./docker/Dockerfile
docker build --file ./docker/Dockerfile --tag kitajchuk/cardano-nodejs:1.33.0 .

# publish to docker hub
docker push kitajchuk/cardano-nodejs:1.33.0
```

#### Frontend

- `yarn cra:start`
- `yarn electron:dev`

The wallet frontend is currently a [create-react-app](https://create-react-app.dev) frontend. It can be loaded via [electron](https://github.com/electron/electron) so this can be desktop software. Currently it is not a very robust electron implementation, however many good concepts can be lifted from [electron-react-boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate) to make it better.
