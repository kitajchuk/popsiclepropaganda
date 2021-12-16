popsiclepropaganda
==================

> Learning Cardano Blockchain Development

<img src="./public/assets/RainbowPopsicle.png" width="128" />

## Getting started

This is a playground to learn Cardano concepts by practically implementing them. Currently focusing on transactions, wallets and native assets (tokens, NFTs). This all began by from a low-level approach by installing the [cardano-node](https://github.com/input-output-hk/cardano-node) from source and completing the [native assets examples](https://developers.cardano.org/docs/native-tokens/minting) on their developer portal.

### Low-level scripts

You can find some low-level scripts at [./net/utils/rawtx.js](./net/utils/rawtx.js) for doing things like sending ADA, minting native tokens and NFTs, burning tokens and sending tokens. These scripts are for personal academic purposes in order to learn how to work with the cardano `UTxO` model.

### NFTs

The first ever Popsicle Propaganda NFTs were minted on the Cardano Testnet with these low-level scripts. They were minted by a testnet `payment.addr` and sent to testnet wallets.

- [PP1](https://testnet.cardanoscan.io/token/6073ac5ca6373410319f896ca88d33094d5da8d37d505ab70848b90b505031)
- [PP2](https://testnet.cardanoscan.io/token/b9f1705170d75f144a4fd0636c2928b2bb39a5ab4db343978a0a1568505032)

### Install

- `yarn`
- For testnet: `echo "NETWORK=testnet" > .env`
- For mainnet: `echo "NETWORK=mainnet" > .env`

### Backend commands

Always start and stop the network with the `yarn` commands such that these actions are graceful using `docker-compose`.

Currently this code operates as a *full-node wallet*, offline as a desktop playground. You can interface with [cardano-wallet](https://github.com/input-output-hk/cardano-wallet) with a `CRUD` API. That is to say you can Create, Read/Recover, Update and Destroy your wallets.

- `yarn start:network`
- `yarn stop:network`
- `yarn start:server`

### Frontend commands

The frontend is currently a [cra](https://create-react-app.dev) app. I'm considering ejecting and using [electron](https://github.com/electron/electron) so this can be Desktop software.

- `yarn start:client`
- `yarn build:client`
- `yarn test:client`
- `yarn eject:client`


### Bin commands

- `node ./bin/generate-nfts.js`
  - Generates `JSON` for `NFT` metadata (rough draft)
