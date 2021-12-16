/**
 * 
 * Folder structure for local dev experiments:
 * ./dev:
 * ├── folder/
 *     ├── index.js                       # Tests with rawtx.js
 *     ├── protocol.json                  # Protocol parameters
 *     ├── burning.raw                    # Raw transaction to burn token
 *     ├── burning.signed                 # Signed transaction to burn token
 *     ├── matx.raw                       # Raw transaction to mint token
 *     ├── matx.signed                    # Signed transaction to mint token
 *     ├── metadata.json                  # Metadata to specify NFT attributes
 *     ├── payment.addr                   # Address to send / receive 
 *     ├── payment.skey                   # Payment signing key
 *     ├── payment.vkey                   # Payment verification key
 *     └── policy/                        # Folder which holds everything policy-wise
 *         ├── policy.script              # Script to genereate the policyID
 *         ├── policy.skey                # Policy signing key
 *         ├── policy.vkey                # Policy verification key
 *         └── policyID                   # File which holds the policy ID
 * 
 * Example cardano setup on macos:
 * ├── cardano source at ~/cardano-src/
 * ├── cardano-cli at ~/.local/bin/
 * ├── cardano-node at ~/.local/bin/
 * ├── cardano db at ~/cardano/
 * ├── CARDANO_NODE_SOCKET_PATH in ~/.bashrc
 * 
 * Example running cardano-node locally as per above setup:
 * cardano-node run \
 *   --config ~/cardano/config/testnet-config.json \
 *   --database-path ~/cardano/db/ \
 *   --socket-path ~/cardano/db/node.socket \
 *   --host-addr 127.0.0.1 \
 *   --port 1337 \
 *   --topology ~/cardano/config/testnet-topology.json
 * 
 * You need to run a local cardano-node and expose CARDANO_NODE_SOCKET_PATH
 * Otherwise the cardano-cli will be unable to function for these scripts.
 * 
 * Scripts assume payment.*,  policy/* files created a la:
 * https://developers.cardano.org/docs/native-tokens/minting#generate-keys-and-address
 * https://developers.cardano.org/docs/native-tokens/minting/#generate-the-policy
 * 
 * Scripts currently only work with latest UTxO, e.g. single --tx-in operations.
 * 
 * You can fund a payment.addr with Testnet faucet (1000 ADA):
 * https://developers.cardano.org/docs/integrate-cardano/testnet-faucet/
 * 
 * Minting NFTs for cardano is complex so mintNFT is still a WIP:
 * https://developers.cardano.org/docs/native-tokens/minting-nfts
 * https://developers.cardano.org/docs/native-tokens/minting-nfts#creating-the-policyid
 * 
 * Example usage of named export function `sendCoin`:
 * Assuming you have a wallet address to send to (receiver) you can use sendCoin like:
 * sendCoin(10 * 1e6, receiver).then(() => {
 *   // ...async things here...
 * });
 * or:
 * let info = await sendCoin(12 * 1e6, receiver)
 * // ...async things here...
 * console.log(info)
 */

/*
 * Example usage of these utils in a node-js script located at ./dev/example/index.js
 $ cd ./dev/example/
 $ node index.js
*/

/*
 * Example of an index.js from ./dev/example/index.js
// You can load `shelljs`, a useful tool used in the rawtx.js
const shell = require('shelljs');

// You can load methods from the rawtx.js exports
const { ... } = require('../../net/utils/rawtx');

// Need some way to poll the cardano-cli to know when the node.socket connection opens
// A polling method with `shelljs` works to bind our blockchain to a cardano-node instance
queryTip().then(async () => {
  // Cleanup working files
  cleanTransients();

  // Generate fresh protocol.json
  genProtocol();

  // Examine the current protocols.json
  console.log('protocol.json', getProtocol());

  let info;

  // Local payment.addr info
  queryAddy();

  // Info about some other wallet address you are testing with
  queryAddy('addr_test420YoukNowhoWThiSgoEs');

  // Transact via local payment.addr and payment.skey
  info = await sendToken('SomeToke', 100, 'addr_test420YoukNowhoWThiSgoEs');

  console.log(info);
});
*/

const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

// For handling shelljs stdout to console
const SHELL_OPTS = { silent: true };
const SHELL_OUT = { silent: false };

// Always execute your node-js script from the directory your files are
const ROOT = process.cwd();

// There's some REAL maths for this stuff:
// https://docs.cardano.org/native-tokens/minimum-ada-value-requirement
// But this seems to work as a "dumb" minimum for certain transactions...
const MIN_ADA = 1400000;

// There's some notes about burning tokens
// https://developers.cardano.org/docs/native-tokens/minting#burning-token
// https://github.com/cardano-foundation/developer-portal/pull/283#discussion_r705612888
const BURN_FEE = 300000;

/**
 * Read contents of local file for cardano-cli
 * @param {string} localPath The path relative to process.cwd()
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
 * Get the protocols JSON
 * @returns {object} The protocol.json as object
 */
 function getProtocol() {
  return JSON.parse(getFileGuts('protocol.json'));
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
 * Poll for UTxO changes to appear on the blockchain
 * @param {string} txhash The current txhash used
 * @param {function} resolve The Promise resolve method
 */
 function resolveWithNewUTxO(txhash, resolve) {
  let info = getAddressInfo();

  while (info.transactions[0].txhash === txhash) {
    info = getAddressInfo();

    if (Date.now() % 2 === 1) {
      console.log('polling for new UTxO on the blockchain...');
    }
  }

  resolve(info);
}

/**
 * Mint an NFT token on the blockchain
 * This script creates a new policyID each time as it gets a new slot each time
 * @param {string} receiver The address to send the token to (can be wallet)
 * @param {string} tokenname The name of the NFT token to mint
 * @param {object} metadata The NFT metadata to mint
 * @returns {Promise} Resolves when UTxO history updates on blockchain
 */
function mintNFT(receiver, tokenname, metadata) {
  return new Promise((resolve, reject) => {
    const tokenamount = 1;
    const slotnumber = getFutureSlot();
    const policyScript = JSON.parse(getFileGuts('policy/policy.script'));

    // For NFTs write determined slot number to policy script
    policyScript.scripts[0].slot = slotnumber;
    fs.writeFileSync(path.join(ROOT, 'policy/policy.script'), JSON.stringify(policyScript, null, 2));

    // Now we need to generate the policyID from udpated policy.script
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

    // Need correct tx-out line for {address} with cardano-cli transaction build below...
    // Sending {output} back to {address} creates two UTxOs with the same TxHash
    // Want to figure out how to balance the transaction to ZERO and send remainder to {address}
    // const txOutLine = tokens.map((tkn) => `${tkn.amount} ${tkn.hash}.${tkn.name}`).join(' + ');
    
    // ^ This is tough so for now this script will have to work only with ADA...
    if (tokens.length) {
      console.log('Cannot mint NFT to receiver when sender has non-ADA assets to balance...');
      reject('Cannot mint NFT to receiver when sender has non-ADA assets to balance...');
      return;
    }

    let output = MIN_ADA;

    // Test the tx build...
    // If it fails we get this min req UTxO error and can adjust accordingly
    /*
      Command failed: transaction build  Error: Minimum UTxO threshold not met for tx output: ...info here...
      Minimum required UTxO: Lovelace XXXXXXX <- Some dynamic value calculated at time of build
    */
    let command = shell.exec(`
      cardano-cli transaction build \
        --testnet-magic 1097911063 \
        --alonzo-era \
        --tx-in ${txhash}#${txix} \
        --tx-out ${receiver}+${output}+"${tokenamount} ${policyID}.${tokenname}" \
        --change-address ${address} \
        --mint="${tokenamount} ${policyID}.${tokenname}" \
        --minting-script-file ${path.join(ROOT, 'policy/policy.script')} \
        --metadata-json-file ${path.join(ROOT, 'metadata.json')}  \
        --invalid-hereafter ${slotnumber} \
        --witness-override 2 \
        --out-file ${path.join(ROOT, 'matx.raw')}
    `, SHELL_OUT);

    // This condition will run if we failed with specific min req error
    if (command.code === 1 && /Minimum required UTxO/.test(command.stderr)) {
      // Parse the min req UTxO from the message to update the next build...
      output = command.stderr.replace(/\n/g, '').match(/[0-9]+$/g);

      if (output) {
        output = Number(output[0]);

        command = shell.exec(`
          cardano-cli transaction build \
            --testnet-magic 1097911063 \
            --alonzo-era \
            --tx-in ${txhash}#${txix} \
            --tx-out ${receiver}+${output}+"${tokenamount} ${policyID}.${tokenname}" \
            --change-address ${address} \
            --mint="${tokenamount} ${policyID}.${tokenname}" \
            --minting-script-file ${path.join(ROOT, 'policy/policy.script')} \
            --metadata-json-file ${path.join(ROOT, 'metadata.json')}  \
            --invalid-hereafter ${slotnumber} \
            --witness-override 2 \
            --out-file ${path.join(ROOT, 'matx.raw')}
        `, SHELL_OUT);
      } else {
        console.log(`Bad parse of Minimum Required UTxO: ${output}`);
        reject(`Bad parse of Minimum Required UTxO: ${output}`);
        return;
      }
    }

    // Above was successful if output is like:
    // "Estimated transaction fee: Lovelace XXXXXX"
    if (command.code === 0 && /Estimated transaction fee/.test(command.stdout)) {
      command = shell.exec(`
        cardano-cli transaction sign  \
          --signing-key-file ${path.join(ROOT, 'payment.skey')}  \
          --signing-key-file ${path.join(ROOT, 'policy/policy.skey')}  \
          --testnet-magic 1097911063 \
          --tx-body-file ${path.join(ROOT, 'matx.raw')} \
          --out-file ${path.join(ROOT, 'matx.signed')}
      `, SHELL_OUT);

      command = shell.exec(`
        cardano-cli transaction submit \
          --tx-file ${path.join(ROOT, 'matx.signed')} \
          --testnet-magic 1097911063
      `, SHELL_OUT);

      resolveWithNewUTxO(txhash, resolve);
    
    // Fallback to log and reject on whatever error we got...
    } else {
      console.log(command.stderr);
      reject(command.stderr);
    }
  });
}

function mintToken(token, amount) {
  return new Promise((resolve, reject) => {
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

    // If address already has tokens we need to account for them
    // Otherwise we'll get errors about unbalanced non-ADA assets...
    // If address has no tokens yet, this will produce an empty string ""
    let txOutLine = tokens.map((tkn) => `${tkn.amount} ${tkn.hash}.${tkn.name}`).join(' + ');

    if (txOutLine) {
      txOutLine = `${txOutLine} + `;
    }
  
    let fee = BURN_FEE;
    let output = 0;

    // First build a raw transaction to calculate the fee
    let command = shell.exec(`
      cardano-cli transaction build-raw \
        --fee ${fee} \
        --tx-in ${txhash}#${txix} \
        --tx-out ${address}+${output}+"${txOutLine}${amount} ${policyID}.${token}" \
        --mint="${amount} ${policyID}.${token}" \
        --minting-script-file ${path.join(ROOT, 'policy/policy.script')} \
        --out-file ${path.join(ROOT, 'matx.raw')}
    `, SHELL_OPTS);

    fee = calcMinFee('matx.raw');
    output = funds - fee;

    // Re-build the transaction with the correct amounts
    command = shell.exec(`
      cardano-cli transaction build-raw \
        --fee ${fee} \
        --tx-in ${txhash}#${txix} \
        --tx-out ${address}+${output}+"${txOutLine}${amount} ${policyID}.${token}" \
        --mint="${amount} ${policyID}.${token}" \
        --minting-script-file ${path.join(ROOT, 'policy/policy.script')} \
        --out-file ${path.join(ROOT, 'matx.raw')}
    `, SHELL_OPTS);

    // Sign it
    command = shell.exec(`
      cardano-cli transaction sign  \
        --signing-key-file ${path.join(ROOT, 'payment.skey')}  \
        --signing-key-file ${path.join(ROOT, 'policy/policy.skey')}  \
        --testnet-magic 1097911063 \
        --tx-body-file ${path.join(ROOT, 'matx.raw')}  \
        --out-file ${path.join(ROOT, 'matx.signed')}
    `, SHELL_OPTS);

    // Submit it
    command = shell.exec(`
      cardano-cli transaction submit \
        --tx-file ${path.join(ROOT, 'matx.signed')} \
        --testnet-magic 1097911063
    `, SHELL_OPTS);

    resolveWithNewUTxO(txhash, resolve);
  });
}

/**
 * Send ADA to an address or wallet
 * @param {number} amount The amount of ADA to send
 * @param {string} receiver The address to send to (can be wallet)
 * @returns {Promise} Resolves when UTxO history updates on blockchain
 */
function sendCoin(amount, receiver) {
  return new Promise((resolve, reject) => {
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

    resolveWithNewUTxO(txhash, resolve);
  });
}

/**
 * Send tokens to an address or wallet, requires 1e6 ADA
 * @param {string} token The name of the token to send
 * @param {number} amount The amount of ADA to send
 * @param {string} receiver The address to send to (can be wallet)
 * @returns {Promise} Resolves when UTxO history updates on blockchain
 */
function sendToken(token, amount, receiver) {
  return new Promise((resolve, reject) => {
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

    let fee = 0;
    let receiveroutput = MIN_ADA;
    let output = funds - receiveroutput;

    const txOutLine = tokens.map((tkn) => {
      if (tkn.name === token) {
        return `${tkn.amount - amount} ${tkn.hash}.${tkn.name}`;
      }
  
      return `${tkn.amount} ${tkn.hash}.${tkn.name}`;
    }).join(' + ');

    // First build a raw transaction to calculate the fee
    let command = shell.exec(`
      cardano-cli transaction build-raw \
        --fee ${fee} \
        --tx-in ${txhash}#${txix} \
        --tx-out ${receiver}+${receiveroutput}+"${amount} ${policyID}.${token}" \
        --tx-out ${address}+${output}+"${txOutLine}" \
        --out-file ${path.join(ROOT, 'rec_matx.raw')}
    `, SHELL_OPTS);

    fee = calcMinFee('rec_matx.raw');
    output = funds - receiveroutput - fee;

    // Re-build the transaction with the correct amounts
    command = shell.exec(`
      cardano-cli transaction build-raw \
        --fee ${fee} \
        --tx-in ${txhash}#${txix} \
        --tx-out ${receiver}+${receiveroutput}+"${amount} ${policyID}.${token}" \
        --tx-out ${address}+${output}+"${txOutLine}" \
        --out-file ${path.join(ROOT, 'rec_matx.raw')}
    `, SHELL_OPTS);

    // Sign it
    command = shell.exec(`
      cardano-cli transaction sign  \
        --signing-key-file ${path.join(ROOT, 'payment.skey')}  \
        --tx-body-file ${path.join(ROOT, 'rec_matx.raw')}  \
        --out-file ${path.join(ROOT, 'rec_matx.signed')} \
        --testnet-magic 1097911063
    `, SHELL_OPTS);
  
    // Send it
    command = shell.exec(`
      cardano-cli transaction submit \
        --tx-file ${path.join(ROOT, 'rec_matx.signed')} \
        --testnet-magic 1097911063
    `, SHELL_OPTS);

    resolveWithNewUTxO(txhash, resolve);
  });
}

/**
 * 
 * @param {string} token The name of the token to burn
 * @param {number} amount The amount of tokens to burn
 * @returns {Promise} Resolves when UTxO history updates on blockchain
 */
function burnToken(token, amount) {
  return new Promise((resolve, reject) => {
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
      if (tkn.name === token) {
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
        --mint="-${amount} ${policyID}.${token}" \
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
        --mint="-${amount} ${policyID}.${token}" \
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

    resolveWithNewUTxO(txhash, resolve);
  });
}

/**
 * Calculate the minimum fee for a transaction
 * @param {string} bodyFile The raw file to calculate tx from (matx.raw, rec_matx.raw, burning.raw)
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
 * @returns {Promise} Will resolve when node is online
 */
function queryTip() {
  return new Promise((resolve) => {
    let command = shell.exec(`
      cardano-cli query tip \
        --testnet-magic 1097911063
    `, SHELL_OPTS);

    while (command.code === 1) {
      command = shell.exec(`
        cardano-cli query tip \
          --testnet-magic 1097911063
      `, SHELL_OPTS);

      if (Date.now() % 2 === 1) {
        console.log('polling for cardano-node...');
      }
    }

    console.log('cardano-node online.');
    console.log('current tip:', JSON.parse(command.stdout));

    resolve();
  });
}

/**
 * Query the UTxO info for an address
 * This is intentionally a "loud" usage of the CLI to expose the UTxO output
 * @param {string} addy Optional to pass in a different address to query
 */
 function queryAddy(addy) {
  const address = addy || getAddress();

  shell.exec(`
    cardano-cli query utxo \
      --address ${address} \
      --testnet-magic 1097911063
  `, SHELL_OUT);
}

/**
 * Get a slot from the future of the blockchain
 * @param {number} slots The amount of slots -- default is 10k
 * @returns {number} The future slot
 */
function getFutureSlot(slots = 10000) {
  const command = shell.exec(`
    cardano-cli query tip --testnet-magic 1097911063
  `, SHELL_OPTS);
  const json = JSON.parse(command.stdout);

  return json.slot + slots;
}

/**
 * Generates the latest protocol.json file
 */
function genProtocol() {
  shell.exec(`
    cardano-cli query protocol-parameters \
      --testnet-magic 1097911063 \
      --out-file ${path.join(ROOT, 'protocol.json')}
  `, SHELL_OPTS);
}

/**
 * Generate a policyID based on updated policy.script (NFTs)
 */
function genPolicyID() {
  shell.exec(`
    cardano-cli transaction policyid \
      --script-file ${path.join(ROOT, 'policy/policy.script')} > ${path.join(ROOT, 'policy/policyID')}
  `, SHELL_OPTS);
}

/**
 * Destructive clean-up of the transient working files with cardano-cli
 */
function cleanTransients() {
  shell.exec(`
    rm -rf matx*
    rm -rf rec_matx*
    rm -rf burning*
  `, SHELL_OPTS);
}

module.exports = {
  mintNFT,
  queryTip,
  sendCoin,
  burnToken,
  mintToken,
  sendToken,
  queryAddy,
  calcMinFee,
  getFileGuts,
  getProtocol,
  genProtocol,
  getFutureSlot,
  getAddressInfo,
  cleanTransients,
};