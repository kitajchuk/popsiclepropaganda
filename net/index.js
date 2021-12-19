const shell = require('shelljs');
const { WebSocketServer } = require('ws');
const { Seed, WalletServer } = require('cardano-wallet-js');
const {
  PORT_LOCAL,
  PORT_NETWORK,
} = require('./constants');

// The cardano-wallet host is exposed via docker-compose networks
const walletServer = WalletServer.init(`http://cardano-wallet:${PORT_NETWORK}/v2`);
const webSocketServer = new WebSocketServer({ port: PORT_LOCAL });

webSocketServer.on('listening', () => {
  console.log('wss listening', webSocketServer.address());
});

webSocketServer.on('connection', (ws) => {
  const getResponseFE = async (event, wallets) => {
    return JSON.stringify({
      seed: Seed.generateRecoveryPhrase(),
      event,
      wallets: await Promise.all(wallets.map(async (wallet) => {
        return {
          id: wallet.id,
          name: wallet.name,
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
    });
  };

  const getErrorFE = (error) => {
    return JSON.stringify({
      event: 'error',
      error: error.response.data,
      seed: Seed.generateRecoveryPhrase(),
    });
  };

  ws.on('message', async (message) => {
    const { event, data } = JSON.parse(message);

    if (event === 'connect') {
      let wallets = await walletServer.wallets();

      ws.send(await getResponseFE('connected', wallets));
    }

    if (event === 'create' || event === 'recover') {
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

      ws.send(await getResponseFE(`${event}ed`, wallets));
    }

    if (event === 'update') {
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

      ws.send(await getResponseFE('updated', wallets));
    }

    if (event === 'destroy') {
      let wallet = await walletServer.getShelleyWallet(data.id);

      await wallet.delete();

      let wallets = await walletServer.wallets();

      ws.send(await getResponseFE('deleted', wallets));
    }
  });
});
