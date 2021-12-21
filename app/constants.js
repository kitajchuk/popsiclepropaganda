const PORT_LOCAL = 8888;
const PORT_NETWORK = 8090;

// For handling shelljs stdout to console
const SHELL_OPTS = { silent: true };
const SHELL_OUT = { silent: false };

// Always execute your node-js script from the directory your files are
const ROOT = process.cwd();

// There's some REAL maths for this stuff:
// https://docs.cardano.org/native-tokens/minimum-ada-value-requirement
// But this seems to work as a "dumb" minimum for certain transactions...
const MIN_ADA = 1.4 * 1e6;

// There's some notes about burning tokens
// https://developers.cardano.org/docs/native-tokens/minting#burning-token
// https://github.com/cardano-foundation/developer-portal/pull/283#discussion_r705612888
const BURN_FEE = 300000;

// https://developers.cardano.org/docs/integrate-cardano/testnet-faucet/
const TESTNET_RETURN_ADDR = 'addr_test1qqr585tvlc7ylnqvz8pyqwauzrdu0mxag3m7q56grgmgu7sxu2hyfhlkwuxupa9d5085eunq2qywy7hvmvej456flknswgndm3';

module.exports = {
  PORT_LOCAL,
  PORT_NETWORK,
  SHELL_OUT,
  SHELL_OPTS,
  ROOT,
  MIN_ADA,
  BURN_FEE,
  TESTNET_RETURN_ADDR,
};