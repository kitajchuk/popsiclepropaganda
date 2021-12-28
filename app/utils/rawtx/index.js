/**
 * 
 * The `app` backend dir is linked as a volume to the cardano-nodejs docker container
 * It mounts to /app within the docker container:
 * ./app:/app
 * tmp/
 *     ├── burning.raw                    # Raw transaction to burn token
 *     ├── burning.signed                 # Signed transaction to burn token
 *     ├── matx.raw                       # Raw transaction to mint token
 *     ├── matx.signed                    # Signed transaction to mint token
 *     ├── rec_matx.raw                   # Raw transaction to send coin/token
 *     ├── rec_matx.signed                # Signed transaction to send coin/token
 * priv/
 *     ├── protocol.json                  # Protocol parameters
 *     ├── payment.addr                   # Address to send / receive 
 *     ├── payment.skey                   # Payment signing key
 *     ├── payment.vkey                   # Payment verification key
 *     └── [nfts|tokens]/
 *         └── [name]/
 *                 ├── metadata.json      # Metadata to specify NFT attributes
 *                 ├── policy.script      # Script to genereate the policyID
 *                 ├── policy.skey        # Policy signing key
 *                 ├── policy.vkey        # Policy verification key
 *                 └── policyID           # File which holds the policy ID
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

const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

const {
  TMP,
  PRIV,
  ROOT,
  NETWORK,
  MIN_ADA,
  BURN_FEE,
  SHELL_OUT,
  SHELL_OPTS,
} = require('./constants');

const FLAGS = (NETWORK === 'mainnet')
  ? '--mainnet'
  : '--testnet-magic 1097911063';

/**
 * Read contents of local file for cardano-cli
 * @param {string} localPath The path relative to ${process.cwd()}/priv/...
 * @returns string Contents of the file
 */
function getFileGuts(localPath) {
  return fs.readFileSync(path.join(PRIV, localPath))
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
 * @param {string} addy Optional to pass in a different address to query
 * @returns {object} The wallet/transaction information
 */
function getAddressUtxo(addy) {
  const address = addy || getAddress();

  const command = shell.exec(`
    cardano-cli query utxo \
      ${FLAGS} \
      --address ${address}
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
    transactions,
  };
}

/**
 * Poll for UTxO changes to appear on the blockchain
 * @param {string} txhash The current txhash used
 * @param {function} resolve The Promise resolve method
 */
function resolveWithNewUtxo(txhash, resolve) {
  let info = getAddressUtxo();

  while (info.transactions[0].txhash === txhash) {
    info = getAddressUtxo();

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
    const nftPrivDir = path.join(PRIV, 'nfts', tokenname);

    const {
      address,
      transactions,
    } = getAddressUtxo();

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

    if (!fs.existsSync(nftPrivDir)) {
      fs.mkdirSync(nftPrivDir);
      console.log(`Creating NFT priv folder: ${nftPrivDir}`);
    }

    // Create the policy keys for this NFT
    let command = shell.exec(`
      cardano-cli address key-gen \
        --verification-key-file ${path.join(nftPrivDir, 'policy.vkey')} \
        --signing-key-file ${path.join(nftPrivDir, 'policy.skey')}
    `, SHELL_OPTS);

    const keyHash = shell.exec(`
      cardano-cli address key-hash \
        --payment-verification-key-file ${path.join(nftPrivDir, 'policy.vkey')}
    `, SHELL_OPTS);

    // Create they policy.script for this NFT
    const json = {
      type: 'all',
      scripts: [
        {
          type: 'before',
          slot: slotnumber
        },
        {
          type: 'sig',
          keyHash,
        }
      ]
    };

    fs.writeFileSync(path.join(nftPrivDir, 'policy.script'), JSON.stringify(json, null, 2));

    // Create the policyID for this NFT
    command = shell.exec(`
      cardano-cli transaction policyid \
        --script-file ${path.join(nftPrivDir, 'policy.script')} > ${path.join(nftPrivDir, 'policyID')}
    `, SHELL_OPTS);

    const policyID = getFileGuts(`nfts/${tokenname}/policyID`);

    // Create the metadata for this NFT
    const metaDataJSON = {
      721: {
        [policyID]: {
          [tokenname]: metadata,
        },
      },
    };

    fs.writeFileSync(path.join(nftPrivDir, 'metadata.json'), JSON.stringify(metaDataJSON, null, 2));

    let output = MIN_ADA;

    // Test the tx build...
    // If it fails we get this min req UTxO error and can adjust accordingly
    /*
      Command failed: transaction build  Error: Minimum UTxO threshold not met for tx output: ...info here...
      Minimum required UTxO: Lovelace XXXXXXX <- Some dynamic value calculated at time of build
    */
    command = shell.exec(`
      cardano-cli transaction build \
        --testnet-magic 1097911063 \
        --alonzo-era \
        --tx-in ${txhash}#${txix} \
        --tx-out ${receiver}+${output}+"${tokenamount} ${policyID}.${tokenname}" \
        --change-address ${address} \
        --mint="${tokenamount} ${policyID}.${tokenname}" \
        --minting-script-file ${path.join(nftPrivDir, 'policy.script')} \
        --metadata-json-file ${path.join(nftPrivDir, 'metadata.json')}  \
        --invalid-hereafter ${slotnumber} \
        --witness-override 2 \
        --out-file ${path.join(TMP, 'matx.raw')}
    `, SHELL_OUT);

    // This condition will run if we failed with specific min req error
    if (command.code === 1 && /Minimum required UTxO/.test(command.stderr)) {
      // Parse the min req UTxO from the message to update the next build...
      output = command.stderr.replace(/\n/g, '').match(/[0-9]+$/g);

      if (output) {
        output = Number(output[0]);

        command = shell.exec(`
          cardano-cli transaction build \
            ${FLAGS} \
            --alonzo-era \
            --tx-in ${txhash}#${txix} \
            --tx-out ${receiver}+${output}+"${tokenamount} ${policyID}.${tokenname}" \
            --change-address ${address} \
            --mint="${tokenamount} ${policyID}.${tokenname}" \
            --minting-script-file ${path.join(nftPrivDir, 'policy.script')} \
            --metadata-json-file ${path.join(nftPrivDir, 'metadata.json')}  \
            --invalid-hereafter ${slotnumber} \
            --witness-override 2 \
            --out-file ${path.join(TMP, 'matx.raw')}
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
          ${FLAGS} \
          --signing-key-file ${path.join(PRIV, 'payment.skey')}  \
          --signing-key-file ${path.join(nftPrivDir, 'policy.skey')}  \
          --tx-body-file ${path.join(TMP, 'matx.raw')} \
          --out-file ${path.join(TMP, 'matx.signed')}
      `, SHELL_OUT);

      command = shell.exec(`
        cardano-cli transaction submit \
          ${FLAGS} \
          --tx-file ${path.join(TMP, 'matx.signed')}
      `, SHELL_OUT);

      resolveWithNewUtxo(txhash, resolve);
    
    // Fallback to log and reject on whatever error we got...
    } else {
      console.log(command.stderr);
      reject(command.stderr);
    }
  });
}

/**
 * 
 * @param {string} token The name for the token
 * @param {number} amount The amount of token to mint
 * @returns {Promise} Resolves when UTxO history updates on blockchain
 */
function mintToken(token, amount) {
  return new Promise((resolve, reject) => {
    const tknPrivDir = path.join(PRIV, 'tokens', tokenname);
    const {
      transactions,
      address,
    } = getAddressUtxo();
  
    const {
      tokens,
      txhash,
      funds,
      txix,
    } = transactions[0];

    if (!fs.existsSync(tknPrivDir)) {
      fs.mkdirSync(tknPrivDir);
      console.log(`Creating Token priv folder: ${tknPrivDir}`);
    }

    // Create the policy keys for this Token
    let command = shell.exec(`
      cardano-cli address key-gen \
        --verification-key-file ${path.join(tknPrivDir, 'policy.vkey')} \
        --signing-key-file ${path.join(tknPrivDir, 'policy.skey')}
    `, SHELL_OPTS);

    const keyHash = shell.exec(`
      cardano-cli address key-hash \
        --payment-verification-key-file ${path.join(tknPrivDir, 'policy.vkey')}
    `, SHELL_OPTS);

    const json = {
      type: 'sig',
      keyHash,
    };

    fs.writeFileSync(path.join(tknPrivDir, 'policy.script'), JSON.stringify(json, null, 2));

    // Create the policyID for this Token
    command = shell.exec(`
      cardano-cli transaction policyid \
        --script-file ${path.join(tknPrivDir, 'policy.script')} > ${path.join(tknPrivDir, 'policyID')}
    `, SHELL_OPTS);

    const policyID = getFileGuts(`tokens/${tokenname}/policyID`);

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
    command = shell.exec(`
      cardano-cli transaction build-raw \
        --fee ${fee} \
        --tx-in ${txhash}#${txix} \
        --tx-out ${address}+${output}+"${txOutLine}${amount} ${policyID}.${token}" \
        --mint="${amount} ${policyID}.${token}" \
        --minting-script-file ${path.join(tknPrivDir, 'policy.script')} \
        --out-file ${path.join(TMP, 'matx.raw')}
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
        --minting-script-file ${path.join(tknPrivDir, 'policy.script')} \
        --out-file ${path.join(TMP, 'matx.raw')}
    `, SHELL_OPTS);

    // Sign it
    command = shell.exec(`
      cardano-cli transaction sign  \
        ${FLAGS} \
        --signing-key-file ${path.join(PRIV, 'payment.skey')}  \
        --signing-key-file ${path.join(tknPrivDir, 'policy.skey')}  \
        --tx-body-file ${path.join(TMP, 'matx.raw')}  \
        --out-file ${path.join(TMP, 'matx.signed')}
    `, SHELL_OPTS);

    // Submit it
    command = shell.exec(`
      cardano-cli transaction submit \
        ${FLAGS} \
        --tx-file ${path.join(TMP, 'matx.signed')}
    `, SHELL_OPTS);

    resolveWithNewUtxo(txhash, resolve);
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
    } = getAddressUtxo();
  
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
        --out-file ${path.join(TMP, 'rec_matx.raw')}
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
        --out-file ${path.join(TMP, 'rec_matx.raw')}
    `, SHELL_OPTS);
  
    // Sign it
    command = shell.exec(`
      cardano-cli transaction sign \
      ${FLAGS} \
        --signing-key-file ${path.join(PRIV, 'payment.skey')} \
        --tx-body-file ${path.join(TMP, 'rec_matx.raw')} \
        --out-file ${path.join(TMP, 'rec_matx.signed')}
    `, SHELL_OPTS);
  
    // Send it
    command = shell.exec(`
      cardano-cli transaction submit \
        ${FLAGS} \
        --tx-file ${path.join(TMP, 'rec_matx.signed')}
    `, SHELL_OPTS);

    resolveWithNewUtxo(txhash, resolve);
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
      address,
    } = getAddressUtxo();
  
    const {
      tokens,
      txhash,
      funds,
      txix,
    } = transactions[0];

    let fee = 0;
    let receiveroutput = MIN_ADA;
    let output = funds - receiveroutput;
    let tokenPolicy = null;

    const txOutLine = tokens.map((tkn) => {
      if (tkn.name === token) {
        tokenPolicy = tkn.hash;
        return `${tkn.amount - amount} ${tkn.hash}.${tkn.name}`;
      }
  
      return `${tkn.amount} ${tkn.hash}.${tkn.name}`;
    }).join(' + ');

    // First build a raw transaction to calculate the fee
    let command = shell.exec(`
      cardano-cli transaction build-raw \
        --fee ${fee} \
        --tx-in ${txhash}#${txix} \
        --tx-out ${receiver}+${receiveroutput}+"${amount} ${tokenPolicy}.${token}" \
        --tx-out ${address}+${output}+"${txOutLine}" \
        --out-file ${path.join(TMP, 'rec_matx.raw')}
    `, SHELL_OPTS);

    fee = calcMinFee('rec_matx.raw');
    output = funds - receiveroutput - fee;

    // Re-build the transaction with the correct amounts
    command = shell.exec(`
      cardano-cli transaction build-raw \
        --fee ${fee} \
        --tx-in ${txhash}#${txix} \
        --tx-out ${receiver}+${receiveroutput}+"${amount} ${tokenPolicy}.${token}" \
        --tx-out ${address}+${output}+"${txOutLine}" \
        --out-file ${path.join(TMP, 'rec_matx.raw')}
    `, SHELL_OPTS);

    // Sign it
    command = shell.exec(`
      cardano-cli transaction sign  \
        ${FLAGS} \
        --signing-key-file ${path.join(PRIV, 'payment.skey')}  \
        --tx-body-file ${path.join(TMP, 'rec_matx.raw')}  \
        --out-file ${path.join(TMP, 'rec_matx.signed')}
    `, SHELL_OPTS);
  
    // Send it
    command = shell.exec(`
      cardano-cli transaction submit \
        ${FLAGS} \
        --tx-file ${path.join(TMP, 'rec_matx.signed')}
    `, SHELL_OPTS);

    resolveWithNewUtxo(txhash, resolve);
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
      address,
    } = getAddressUtxo();
  
    const {
      tokens,
      txhash,
      funds,
      txix,
    } = transactions[0];
  
    let burnfee = 0;
    let burnoutput = 0;
    let tokenPolicy = null;
  
    const txOutLine = tokens.map((tkn) => {
      if (tkn.name === token) {
        tokenPolicy = tkn.hash;
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
        --mint="-${amount} ${tokenPolicy}.${token}" \
        --minting-script-file ${path.join(PRIV, 'policy/policy.script')} \
        --out-file ${path.join(TMP, 'burning.raw')}
    `, SHELL_OPTS);
  
    burnfee = calcMinFee('burning.raw');
    burnoutput = funds - burnfee;
  
    // Re-build the transaction with the correct amounts
    command = shell.exec(`
      cardano-cli transaction build-raw \
        --fee ${burnfee} \
        --tx-in ${txhash}#${txix} \
        --tx-out ${address}+${burnoutput}+"${txOutLine}"  \
        --mint="-${amount} ${tokenPolicy}.${token}" \
        --minting-script-file ${path.join(PRIV, 'policy/policy.script')} \
        --out-file ${path.join(TMP, 'burning.raw')}
    `, SHELL_OPTS);
  
    // Sign it
    command = shell.exec(`
      cardano-cli transaction sign  \
        ${FLAGS} \
        --signing-key-file ${path.join(PRIV, 'payment.skey')}  \
        --signing-key-file ${path.join(PRIV, 'policy/policy.skey')}  \
        --tx-body-file ${path.join(TMP, 'burning.raw')}  \
        --out-file ${path.join(TMP, 'burning.signed')}
    `, SHELL_OPTS);
  
    // Send it
    command = shell.exec(`
      cardano-cli transaction submit \
        ${FLAGS} \
        --tx-file ${path.join(TMP, 'burning.signed')}
    `, SHELL_OPTS);

    resolveWithNewUtxo(txhash, resolve);
  });
}

/**
 * Calculate the minimum fee for a transaction
 * @param {string} bodyFile The raw file to calculate tx from (matx.raw, rec_matx.raw, burning.raw)
 * @returns {number} The calculated fee
 */
function calcMinFee(bodyFile) {
  // Generate latest protocol.json
  genProtocol();

  const command = shell.exec(`
    cardano-cli transaction calculate-min-fee \
      ${FLAGS} \
      --tx-body-file ${path.join(TMP, bodyFile)} \
      --tx-in-count 1 \
      --tx-out-count 2 \
      --witness-count 1 \
      --protocol-params-file ${path.join(PRIV, 'protocol.json')} | cut -d " " -f1
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
        ${FLAGS}
    `, SHELL_OPTS);

    while (command.code === 1) {
      command = shell.exec(`
        cardano-cli query tip \
          ${FLAGS}
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
      ${FLAGS} \
      --address ${address}
  `, SHELL_OUT);
}

/**
 * Get a slot from the future of the blockchain
 * @param {number} slots The amount of slots -- default is 10k
 * @returns {number} The future slot
 */
function getFutureSlot(slots = 10000) {
  const command = shell.exec(`
    cardano-cli query tip \
      ${FLAGS}
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
      ${FLAGS} \
      --out-file ${path.join(PRIV, 'protocol.json')}
  `, SHELL_OPTS);
}

/**
 * Generate a payment address and keys for UTxO transactions
 */
function genPaymentAddr() {
  if (!fs.existsSync(PRIV)) {
    throw Error('You must first mkdir `priv` to build address');
  }

  shell.exec(`
    cardano-cli address key-gen \
      --verification-key-file ${path.join(PRIV, 'payment.vkey')} \
      --signing-key-file ${path.join(PRIV, 'payment.skey')}
  `, SHELL_OPTS);

  shell.exec(`
    cardano-cli address build \
      ${FLAGS} \
      --payment-verification-key-file ${path.join(PRIV, 'payment.vkey')} \
      --out-file ${path.join(PRIV, 'payment.addr')}
  `, SHELL_OPTS);
}

/**
 * Destructive clean-up of the transient working files with cardano-cli
 */
function cleanTransients() {
  shell.exec(`rm -rf ${TMP}/*`, SHELL_OPTS);
}

module.exports = {
  // Methods
  mintNFT,
  queryTip,
  sendCoin,
  burnToken,
  mintToken,
  sendToken,
  queryAddy,
  calcMinFee,
  getAddress,
  getPolicyID,
  getFileGuts,
  getProtocol,
  genProtocol,
  getFutureSlot,
  getAddressUtxo,
  genPaymentAddr,
  cleanTransients,
  resolveWithNewUtxo,

  // Constants
  TMP,
  ROOT,
  PRIV,
  MIN_ADA,
  BURN_FEE,
  SHELL_OUT,
  SHELL_OPTS,
};
