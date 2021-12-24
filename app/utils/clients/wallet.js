const { Seed, WalletServer } = require('cardano-wallet-js');
const { PORT_NETWORK } = require('../../constants');

/**
 * The `cardano-wallet` host is exposed via docker-compose networks
 * Running this script on your host machine would be localhost:
 * http://localhost:${PORT_NETWORK}/v2
 */
const walletServer = WalletServer.init(`http://cardano-wallet:${PORT_NETWORK}/v2`);

function withWallet(ws) {
  const getResponseFE = async (event, wallets) => {
    return JSON.stringify({
      seed: Seed.generateRecoveryPhrase(),
      event,
      wallets: await Promise.all(wallets.map(async (wallet) => {
        return {
          id: wallet.id,
          name: wallet.name,
          assets: wallet.assets,
          statistics: await wallet.getUtxoStatistics(),
          usedAddresses: await wallet.getUsedAddresses(),
          unusedAddresses: await wallet.getUnusedAddresses(),
          availableBalance: wallet.getAvailableBalance(),
          rewardBalance: wallet.getRewardBalance(),
          totalBalance: wallet.getTotalBalance(),
          delegation: wallet.getDelegation(),
          transactions: await wallet.getTransactions(new Date(2021, 0, 1), new Date(Date.now())),
        };
      })),
      network: await walletServer.getNetworkInformation(),
    });
  };

  const getErrorFE = (error) => {
    return JSON.stringify({
      event: 'error',
      error: error.response.data,
      seed: Seed.generateRecoveryPhrase(),
    });
  };

  // This even is to initialize network polling for the frontend on connection
  // The frontend will emit `wallet_network` pings until network is ready
  ws.send(JSON.stringify({
    event: 'wallet_connected',
    network: null,
  }));

  ws.on('message', async (message) => {
    const { event, data } = JSON.parse(message);

    // This event is meant for polling network readyness
    // The frontend will emit this on a polling interval
    // It will poll this event on said interval until network is ready again
    if (event === 'wallet_network') {
      let network = await walletServer.getNetworkInformation();

      ws.send(JSON.stringify({
        event,
        network,
      }));
    }

    if (event === 'wallet_list') {
      let wallets = await walletServer.wallets();

      ws.send(await getResponseFE(event, wallets));
    }

    if (event === 'wallet_create' || event === 'wallet_recover') {
      let wallet;

      try {
        wallet = await walletServer.createOrRestoreShelleyWallet(
          data.name,
          Seed.toMnemonicList(data.seed),
          data.passphrase
        );
      } catch (error) {
        ws.send(getErrorFE(error));
        return;
      }
    
      let wallets = await walletServer.wallets();

      ws.send(await getResponseFE(event, wallets));
    }

    if (event === 'wallet_update') {
      let wallet = await walletServer.getShelleyWallet(data.id);

      if (data.name && (data.name !== wallet.name)) {
        wallet = await wallet.rename(data.name);
      }
      
      if ((data.newPassphrase && data.oldPassphrase) && (data.newPassphrase !== data.oldPassphrase)) {
        try {
          wallet = await wallet.updatePassphrase(
            data.oldPassphrase,
            data.newPassphrase
          );
        } catch (error) {
          ws.send(getErrorFE(error));
          return;
        }
      }

      let wallets = await walletServer.wallets();

      ws.send(await getResponseFE(event, wallets));
    }

    if (event === 'wallet_destroy') {
      let wallet = await walletServer.getShelleyWallet(data.id);

      await wallet.delete();

      let wallets = await walletServer.wallets();

      ws.send(await getResponseFE(event, wallets));
    }
  });
}

module.exports = {
  withWallet,
  walletServer,
};