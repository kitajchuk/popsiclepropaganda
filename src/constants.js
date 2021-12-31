const PORT_LOCAL = 8888;

// Network can be either "mainnet" or "testnet"
const { NETWORK } = process.env;
const EXPLORER_URL = (NETWORK === 'mainnet')
  ? 'https://explorer.cardano.org'
  : 'https://explorer.cardano-testnet.iohkdev.io';
const SCANNER_URL = (NETWORK === 'mainnet')
  ? 'https://cardanoscan.io'
  : 'https://testnet.cardanoscan.io';

export {
  NETWORK,
  PORT_LOCAL,
  SCANNER_URL,
  EXPLORER_URL,
};