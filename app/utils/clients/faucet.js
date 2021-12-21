const fs = require('fs');
const path = require('path');

const {
  TMP,
  PRIV,
  getAddress,
  genPaymentAddr,
  getAddressInfo,
} = require('../rawtx');

function initFaucet() {
  // Creates a new payment address you can fund with Testnet faucet
  // Creates a basic policy that can be used for minting native assets
  if (!fs.existsSync(PRIV)) {
    fs.mkdirSync(PRIV);
    fs.mkdirSync(path.join(PRIV, 'tokens'));
    fs.mkdirSync(path.join(PRIV, 'nfts'));

    genPaymentAddr();

    console.log(`Faucet established with ${getAddress()}`);
  } else {
    console.log(`Faucet already established with ${getAddress()}`);
  }

  if (!fs.existsSync(TMP)) {
    fs.mkdirSync(TMP);
  }
}

function withFaucet(ws) {
  const getResponseFE = async (event, info) => {
    return JSON.stringify({
      utxo: info,
      event,
    });
  };

  ws.on('message', async (message) => {
    const { event, data } = JSON.parse(message);

    if (event === 'connect') {
      let info = await getAddressInfo();

      ws.send(await getResponseFE('connected', info));
    }
  });
}

module.exports = {
  withFaucet,
  initFaucet,
};