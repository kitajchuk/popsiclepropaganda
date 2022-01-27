const fs = require('fs');
const path = require('path');

const {
  TMP,
  PRIV,
  ROOT_TMP,
  ROOT_PRIV,
} = require('../../constants');
const {
  getAddress,
  genPaymentAddr,
  getAddressUtxo,
} = require('../rawtx');

function initFaucet() {
  // Create root `priv` and `tmp` directories
  if (!fs.existsSync(ROOT_PRIV)) {
    fs.mkdirSync(ROOT_PRIV);
  }

  if (!fs.existsSync(ROOT_TMP)) {
    fs.mkdirSync(ROOT_TMP);
  }

  // Creates a new payment address you can fund with Testnet faucet
  // Creates a basic policy that can be used for minting native assets
  // This directory is like `priv/mainnet` or `priv/testnet`
  if (!fs.existsSync(PRIV)) {
    fs.mkdirSync(PRIV);
    fs.mkdirSync(path.join(PRIV, 'tokens'));
    fs.mkdirSync(path.join(PRIV, 'nfts'));

    genPaymentAddr();

    console.log(`Faucet established with ${getAddress()}`);
  } else {
    console.log(`Faucet already established with ${getAddress()}`);
  }

  // This directory is like `tmp/mainnet` or `tmp/testnet`
  if (!fs.existsSync(TMP)) {
    fs.mkdirSync(TMP);
  }
}

function withFaucet(ws) {
  const getResponseFE = async (event, data) => {
    return JSON.stringify({
      ...data,
      event,
    });
  };

  ws.on('message', async (message) => {
    const { event, data } = JSON.parse(message);

    if (event === 'faucet_utxo') {
      let utxo = await getAddressUtxo();

      ws.send(await getResponseFE(event, { utxo }));
    }

    if (event === 'faucet_query') {
      let query = await getAddressUtxo(data.address);

      ws.send(await getResponseFE(event, { query }));
    }
  });
}

module.exports = {
  withFaucet,
  initFaucet,
};