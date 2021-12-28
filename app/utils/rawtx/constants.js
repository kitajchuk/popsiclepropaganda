const path = require('path');

// Network either "mainnet" or "testnet"
const { NETWORK } = process.env;

// For handling shelljs stdout to console
const SHELL_OPTS = { silent: true };
const SHELL_OUT = { silent: false };

// Always execute your node-js script from the directory your files are
const ROOT = process.cwd();
const PRIV = path.join(ROOT, 'priv');
const TMP = path.join(ROOT, 'tmp');

// There's some REAL maths for this stuff:
// https://docs.cardano.org/native-tokens/minimum-ada-value-requirement
// But this seems to work as a "dumb" minimum for certain transactions...
const MIN_ADA = 1400000;

// There's some notes about burning tokens
// https://developers.cardano.org/docs/native-tokens/minting#burning-token
// https://github.com/cardano-foundation/developer-portal/pull/283#discussion_r705612888
const BURN_FEE = 300000;

module.exports = {
  TMP,
  ROOT,
  PRIV,
  NETWORK,
  MIN_ADA,
  BURN_FEE,
  SHELL_OUT,
  SHELL_OPTS,
};