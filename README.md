popsiclepropaganda
==================

> Learning Cardano with the Testnet Magics

<img src="./public/assets/Rainbow_PP.png" width="128" />

## Getting started

This is a playground to learn Cardano concepts by practically implementing them. Currently focusing on transactions, wallets and native assets (tokens, NFTs). This all began by from a low-level approach by installing the [cardano-node](https://github.com/input-output-hk/cardano-node) from source and completing the [native assets examples](https://developers.cardano.org/docs/native-tokens/minting) on their developer portal.

### Install

- `yarn`

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
