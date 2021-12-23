// Select helpers for extracting punxy data units
export const selectWallets = (state) => state.pp.wallets;
export const selectEvent = (state) => state.pp.event;
export const selectError = (state) => state.pp.error;
export const selectSeed = (state) => state.pp.seed;
export const selectUtxo = (state) => state.pp.utxo;
export const selectNetwork = (state) => state.pp.network;
export const selectQuery = (state) => state.pp.query;
export const selectReady = (state) => state.pp.network && state.pp.network.sync_progress.status === 'ready';
