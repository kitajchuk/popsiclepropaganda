/**
 * Exploring wallet cryptography
 * 
 * https://docs.cardano.org/cardano-components/cardano-serialization-lib
 * https://developers.cardano.org/docs/get-started/cardano-serialization-lib/generating-keys/
 * https://github.com/Emurgo/cardano-serialization-lib/blob/master/doc/getting-started/generating-keys.md
 * https://github.com/Emurgo/cardano-serialization-lib/blob/6746918cf4d046f73148aec30aba4f26bb2d8829/rust/src/emip3.rs
 * 
 * Without cardano-wallet-js:
 * https://cardano.stackexchange.com/questions/6779/how-to-import-root-private-key-or-account-private-key-to-cardano-wallet
 * 
 */

const { Seed } = require('cardano-wallet-js');
const {
  Bip32PrivateKey,
  encrypt_with_password,
  decrypt_with_password,
} = require('@emurgo/cardano-serialization-lib-nodejs');

import('crypto-random-string').then(({ default: cryptoRandomString }) => {
  const {
    WALLET_PHRASE,
    WALLET_PASSWORD,
  } = process.env;
  
  // Purpose derivation (See BIP43), see CIP 1852
  const Purpose = {
    CIP1852: 1852,
  };
  
  // Cardano coin type (SLIP 44)
  const CoinTypes = {
    CARDANO: 1815,
  };
  
  const ChainDerivation = {
    EXTERNAL: 0, // from BIP44
    INTERNAL: 1, // from BIP44
    CHIMERIC: 2, // from CIP1852
  };
  
  const privKey = Seed.deriveRootKey(WALLET_PHRASE).to_bech32();
  const rootKey = Bip32PrivateKey.from_bech32(privKey);
  const accountKey = rootKey
    .derive(Seed.harden(Purpose.CIP1852))
    .derive(Seed.harden(CoinTypes.CARDANO))
    .derive(Seed.harden(0)); // Account #0
  const publicKey = accountKey
    .derive(ChainDerivation.EXTERNAL)
    .derive(ChainDerivation.EXTERNAL)
    .to_public();
  
  const password = Buffer.from(WALLET_PASSWORD);
  const salt = Buffer.from(cryptoRandomString({ length: 2 * 32 }), 'hex');
  const nonce = Buffer.from(cryptoRandomString({ length: 2 * 12 }), 'hex');
  
  // I think Yoroi uses root key...
  // https://github.com/Emurgo/yoroi-frontend/blob/aea5c9d69bfa091dfc3957dfefa0e9beccb5331c/packages/yoroi-extension/app/api/ada/lib/storage/bridge/walletBuilder/shelley.js#L166-L169
  const data = Buffer.from(rootKey.to_bech32());
  
  const encryptedData = encrypt_with_password(
    password.toString('hex'),
    salt.toString('hex'),
    nonce.toString('hex'),
    data.toString('hex')
  );
  
  console.log('encryptedData', encryptedData);
  
  const decryptedData = decrypt_with_password(
    password.toString('hex'),
    encryptedData
  );
  
  console.log('decryptedData', decryptedData);
  
  // Decrypted data is the correct data...
  console.log(Buffer.from(decryptedData, 'hex').toString() === data.toString());
});
