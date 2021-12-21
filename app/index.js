const { WebSocketServer } = require('ws');
const { withWallet } = require('./utils/clients');
const { withFaucet, initFaucet } = require('./utils/clients');
const { PORT_LOCAL } = require('./constants');

const webSocketServer = new WebSocketServer({ port: PORT_LOCAL });

webSocketServer.on('listening', () => {
  console.log('wss listening', webSocketServer.address());
});

webSocketServer.on('connection', (ws) => {
  withWallet(ws);
  withFaucet(ws);
});

initFaucet();
