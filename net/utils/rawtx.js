/**
 * Example cardano setup on macos:
 * cardano source at ~/cardano-src/
 * cardano-cli at ~/.local/bin/
 * cardano-node at ~/.local/bin/
 * cardano db at ~/cardano/
 * configured cardano in ~/.bashrc
 *
 * Local folder structure for transactions:
 * ├── burning.raw                    # Raw transaction to burn token
 * ├── burning.signed                 # Signed transaction to burn token
 * ├── matx.raw                       # Raw transaction to mint token
 * ├── matx.signed                    # Signed transaction to mint token
 * ├── metadata.json                  # Metadata to specify NFT attributes
 * ├── payment.addr                   # Address to send / receive 
 * ├── payment.skey                   # Payment signing key
 * ├── payment.vkey                   # Payment verification key
 * ├── policy                         # Folder which holds everything policy-wise
 * │   ├── policy.script              # Script to genereate the policyID
 * │   ├── policy.skey                # Policy signing key
 * │   ├── policy.vkey                # Policy verification key
 * │   └── policyID                   # File which holds the policy ID
 * └── protocol.json                  # Protocol parameters
 * 
 * These utilities can be used to send ADA from a local test address to a wallet address
 * Setup: https://developers.cardano.org/docs/native-tokens/minting#generate-keys-and-address
 * Funded with Testnet faucet (1000 ADA) so these scripts were used to send the ADA to a wallet
 * 
 * NFTs: https://developers.cardano.org/docs/native-tokens/minting-nfts
 * 
 * Assuming you have a wallet address to send to (receiver) you can use sendCoin like:
 *
 * sendCoin(10 * 1e6, receiver);
 */

const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const ROOT = process.cwd();
const SHELL_OPTS = { silent: false };

/**
 * Read contents of local file for cardano-cli
 * @param {string} localPath The path relative to __dirname
 * @returns string Contents of the file
 */
function getFileGuts(localPath) {
  return fs.readFileSync(path.join(ROOT, localPath))
    .toString()
    .replace(/^\n|\n$/g, '');
}

/**
 * Get the wallet address
 * @returns {string} The wallet address
 */
function getAddress() {
  return getFileGuts('payment.addr');
}

/**
 * Get the policy ID
 * @returns {string} The policy ID
 */
function getPolicyID() {
  return getFileGuts('policy/policyID');
}

/**
 * Get the TxHash, TxIx and current wallet Amount
 * Also parses native tokens for the address
 * @returns {object} The wallet/transaction information
 */
function getAddressInfo() {
  const address = getAddress();
  const policyID = getPolicyID();

  const command = shell.exec(`
    cardano-cli query utxo \
      --address ${address} \
      --testnet-magic 1097911063
  `, SHELL_OPTS);

  // Parse from standard out -- 3 columns |TxHash|TxIx|Amount|
  // const pieces = command.stdout.split(/\n/)[2].split(/\s\s+/);

  const parts = command.stdout.split(/\n/);
  const lines = parts.slice(2, parts.length);
  const transactions = lines.filter(line => line !== '').map((line) => {
    try {
      const pieces = line.split(/\s\s+/);
      // Parse tokens from standard out piece
      const tokens = pieces[2].match(/\+\s([0-9].*?)\s(.*?)\s/g).map((str) => {
        str = str.replace(/^\+\s|\s+$/g, '');

        return {
          name: str.split(/\s/).pop().split('.').pop(),
          hash: str.split(/\s/).pop().split('.').shift(),
          amount: Number(str.split(/\s/).shift()),
        };
      });

      return {
        txix: pieces[1],
        funds: Number(pieces[2].split(/\s/).shift()), // First value is Amount
        txhash: pieces[0],
        tokens,
      };
    // Transaction line may not have tokens, a la:
    // 064cb49c82ffafd304d9e94adfde352b192e386e8b4dd3b9632baf975d736cc1     1        2000000 lovelace + TxOutDatumNone
    } catch(error) {
      const pieces = line.split(/\s\s+/);
      return {
        txix: pieces[1],
        funds: Number(pieces[2].split(/\s/).shift()), // First value is Amount
        txhash: pieces[0],
        tokens: [],
      };
    }
  });

  return {
    address,
    policyID,
    transactions,
  };
}

/**
 * Mint an NFT token on the blockchain
 * @param {string} receiver The address to send the token to (can be wallet)
 * @param {string} tokenname The name of the NFT token to mint
 * @param {object} metadata The NFT metadata to mint
 * @returns {Promise} Resolves when UTxO history updates on blockchain
 */
function mintNFT(receiver, tokenname, metadata) {
  const tokenamount = 1;
  const slotnumber = getFutureSlot();
  const policyScript = JSON.parse(getFileGuts('policy/policy.script'));

  let output = 1400000;

  // For NFTs write determined slot number to policy script
  policyScript.scripts[0].slot = slotnumber;
  fs.writeFileSync(path.join(ROOT, 'policy/policy.script'), JSON.stringify(policyScript, null, 2));

  // Now we need to generate the policyID as per policy.script
  genPolicyID();

  const {
    address,
    policyID,
    transactions,
  } = getAddressInfo();

  // Now we need to update the metadata with the policyID
  const metaDataJSON = {
    721: {
      [policyID]: {
        [tokenname]: metadata,
      },
    },
  };

  fs.writeFileSync(path.join(ROOT, 'metadata.json'), JSON.stringify(metaDataJSON, null, 2).replace());

  const {
    tokens,
    txhash,
    txix,
  } = transactions[0];

  const txOutLine = tokens.map((tkn) => `${tkn.amount} ${tkn.hash}.${tkn.name}`).join(' + ');

  let command = shell.exec(`
    cardano-cli transaction build \
      --testnet-magic 1097911063 \
      --alonzo-era \
      --tx-in ${txhash}#${txix} \
      --tx-out ${receiver}+${output}+"${tokenamount} ${policyID}.${tokenname}" \
      --tx-out ${address}+${output}+"${txOutLine}" \
      --change-address ${address} \
      --mint="${tokenamount} ${policyID}.${tokenname}" \
      --minting-script-file ${path.join(ROOT, 'policy/policy.script')} \
      --metadata-json-file ${path.join(ROOT, 'metadata.json')}  \
      --invalid-hereafter ${slotnumber} \
      --witness-override 2 \
      --out-file ${path.join(ROOT, 'matx.raw')}
  `, SHELL_OPTS);

  if (command.code === 1) {
    output = command.stderr.replace(/\n/g, '').match(/[0-9]+$/g);

    if (output) {
      output = Number(output[0]);

      command = shell.exec(`
        cardano-cli transaction build \
          --testnet-magic 1097911063 \
          --alonzo-era \
          --tx-in ${txhash}#${txix} \
          --tx-out ${receiver}+${output}+"${tokenamount} ${policyID}.${tokenname}" \
          --tx-out ${address}+${output}+"${txOutLine}" \
          --change-address ${address} \
          --mint="${tokenamount} ${policyID}.${tokenname}" \
          --minting-script-file ${path.join(ROOT, 'policy/policy.script')} \
          --metadata-json-file ${path.join(ROOT, 'metadata.json')}  \
          --invalid-hereafter ${slotnumber} \
          --witness-override 2 \
          --out-file ${path.join(ROOT, 'matx.raw')}
      `, SHELL_OPTS);
    }
  }

  // Above was successful if output is like:
  // "Estimated transaction fee: Lovelace XXXXXX"

  command = shell.exec(`
    cardano-cli transaction sign  \
      --signing-key-file ${path.join(ROOT, 'payment.skey')}  \
      --signing-key-file ${path.join(ROOT, 'policy/policy.skey')}  \
      --testnet-magic 1097911063 \
      --tx-body-file ${path.join(ROOT, 'matx.raw')} \
      --out-file ${path.join(ROOT, 'matx.signed')}
  `, SHELL_OPTS);

  command = shell.exec(`
    cardano-cli transaction submit \
      --tx-file matx.signed \
      --testnet-magic 1097911063
  `, SHELL_OPTS);

  // Poll for changes on the network...
  let addy = getAddressInfo();
  while (addy.transactions[0].txhash === txhash) {
    console.log('polling for txhash changes...');
    addy = getAddressInfo();
  }

  return Promise.resolve(addy);
}

/**
 * 
 * @param {number} amount The amount of ADA to send
 * @param {string} receiver The address to send to (can be wallet)
 * @returns {Promise} Resolves when UTxO history updates on blockchain
 */
function sendCoin(amount, receiver) {
  const {
    transactions,
    address,
  } = getAddressInfo();

  const {
    tokens,
    txhash,
    funds,
    txix,
  } = transactions[0];

  let fee = 0;
  let output = 0;

  const txOutLine = tokens.map((tkn) => `${tkn.amount} ${tkn.hash}.${tkn.name}`).join(' + ');

  // First build a raw transaction to calculate the fee
  let command = shell.exec(`
    cardano-cli transaction build-raw \
      --fee ${fee} \
      --tx-in ${txhash}#${txix} \
      --tx-out ${receiver}+${amount} \
      --tx-out ${address}+${output}+"${txOutLine}" \
      --out-file ${path.join(ROOT, 'rec_matx.raw')}
  `, SHELL_OPTS);

  fee = calcMinFee('rec_matx.raw');
  output = funds - fee - amount;

  // Re-build the transaction with the correct amounts
  command = shell.exec(`
    cardano-cli transaction build-raw \
      --fee ${fee} \
      --tx-in ${txhash}#${txix} \
      --tx-out ${receiver}+${amount} \
      --tx-out ${address}+${output}+"${txOutLine}" \
      --out-file ${path.join(ROOT, 'rec_matx.raw')}
  `, SHELL_OPTS);

  // Sign it
  command = shell.exec(`
    cardano-cli transaction sign \
      --signing-key-file ${path.join(ROOT, 'payment.skey')} \
      --testnet-magic 1097911063 \
      --tx-body-file ${path.join(ROOT, 'rec_matx.raw')} \
      --out-file ${path.join(ROOT, 'rec_matx.signed')}
  `, SHELL_OPTS);

  // Send it
  command = shell.exec(`
    cardano-cli transaction submit \
      --tx-file ${path.join(ROOT, 'rec_matx.signed')} \
      --testnet-magic 1097911063
  `, SHELL_OPTS);

  // Poll for changes on the network...
  let addy = getAddressInfo();
  while (addy.transactions[0].txhash === txhash) {
    console.log('polling for txhash changes...');
    addy = getAddressInfo();
  }

  return Promise.resolve(addy);
}

/**
 * 
 * @param {string} token The name of the token to burn
 * @param {number} amount The amount of tokens to burn
 * @returns {Promise} Resolves when UTxO history updates on blockchain
 */
function burnToken(token, amount) {
  const {
    transactions,
    policyID,
    address,
  } = getAddressInfo();

  const {
    tokens,
    txhash,
    funds,
    txix,
  } = transactions[0];

  let burnfee = 0;
  let burnoutput = 0;

  const txOutLine = tokens.map((tkn) => {
    if (tkn.name === token.name) {
      return `${tkn.amount - amount} ${tkn.hash}.${tkn.name}`;
    }

    return `${tkn.amount} ${tkn.hash}.${tkn.name}`;
  }).join(' + ');

  // First build a raw transaction to calculate the fee
  let command = shell.exec(`
    cardano-cli transaction build-raw \
      --fee ${burnfee} \
      --tx-in ${txhash}#${txix} \
      --tx-out ${address}+${burnoutput}+"${txOutLine}"  \
      --mint="-${amount} ${policyID}.${token.name}" \
      --minting-script-file ${path.join(ROOT, 'policy/policy.script')} \
      --out-file ${path.join(ROOT, 'burning.raw')}
  `, SHELL_OPTS);

  burnfee = calcMinFee('burning.raw');
  burnoutput = funds - burnfee;

  // Re-build the transaction with the correct amounts
  command = shell.exec(`
    cardano-cli transaction build-raw \
      --fee ${burnfee} \
      --tx-in ${txhash}#${txix} \
      --tx-out ${address}+${burnoutput}+"${txOutLine}"  \
      --mint="-${amount} ${policyID}.${token.name}" \
      --minting-script-file ${path.join(ROOT, 'policy/policy.script')} \
      --out-file ${path.join(ROOT, 'burning.raw')}
  `, SHELL_OPTS);

  // Sign it
  command = shell.exec(`
    cardano-cli transaction sign  \
      --signing-key-file ${path.join(ROOT, 'payment.skey')}  \
      --signing-key-file ${path.join(ROOT, 'policy/policy.skey')}  \
      --tx-body-file ${path.join(ROOT, 'burning.raw')}  \
      --out-file ${path.join(ROOT, 'burning.signed')} \
      --testnet-magic 1097911063
  `, SHELL_OPTS);

  // Send it
  command = shell.exec(`
    cardano-cli transaction submit \
      --tx-file ${path.join(ROOT, 'burning.signed')} \
      --testnet-magic 1097911063
  `, SHELL_OPTS);

  // Poll for changes on the network...
  let addy = getAddressInfo();
  while (addy.transactions[0].txhash === txhash) {
    console.log('polling for txhash changes...');
    addy = getAddressInfo();
  }

  return Promise.resolve(addy);
}

/**
 * Calculate the minimum fee for a transaction
 * @param {string} bodyFile The raw file to calculate tx from (rec_matx.raw, burning.raw)
 * @returns {number} The calculated fee
 */
function calcMinFee(bodyFile) {
  const command = shell.exec(`
    cardano-cli transaction calculate-min-fee \
      --tx-body-file ${path.join(ROOT, bodyFile)} \
      --tx-in-count 1 \
      --tx-out-count 2 \
      --witness-count 1 \
      --testnet-magic 1097911063 \
      --protocol-params-file ${path.join(ROOT, 'protocol.json')} | cut -d " " -f1
  `, SHELL_OPTS);

  return Number(command.stdout);
}

/**
 * Query the current epoch/block at the tip of the node
 * @returns {object} shell { code, stdout, stderr }
 */
function queryTip() {
  return shell.exec(`
    cardano-cli query tip \
      --testnet-magic 1097911063
  `, SHELL_OPTS);
}

/**
 * Get a slot from the future of the blockchain
 * @returns {number} The future slot
 */
function getFutureSlot() {
  const command = shell.exec(`
    expr $(cardano-cli query tip \
        --testnet-magic 1097911063 | jq .slot?) + 10000
  `, SHELL_OPTS);

  return Number(command.stdout);
}

function genPolicyID() {
  shell.exec(`
    cardano-cli transaction policyid \
      --script-file ./policy/policy.script > policy/policyID
  `, SHELL_OPTS);
}

function queryAddressUTxO() {
  const address = getAddress();

  shell.exec(`
    cardano-cli query utxo \
      --address ${address} \
      --testnet-magic 1097911063
  `, SHELL_OPTS);
}

module.exports = {
  mintNFT,
  queryTip,
  sendCoin,
  burnToken,
  calcMinFee,
  getFileGuts,
  getAddressInfo,
  queryAddressUTxO,
};