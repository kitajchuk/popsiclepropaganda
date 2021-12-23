import { createSlice } from '@reduxjs/toolkit';

export const initialState = {
  network: null,
  wallets: [],
  query: {},
  error: null,
  seed: null,
  utxo: null,
};

// pp slice for global data store
export const slice = createSlice({
  name: 'pp',
  initialState,
  reducers: {
    update(state, action) {
      const { wallets, utxo, seed, network, query } = action.payload;
      state.network = network || state.network;
      state.wallets = wallets || state.wallets;
      state.seed = seed || state.seed;
      state.utxo = utxo || state.utxo;
      if (query) state.query[query.address] = query;
      state.error = null;
    },
    toast(state, action) {
      const { error, seed } = action.payload;
      if (seed) {
        state.seed = seed;
      }
      state.error = error;
    },
    reset(state) {
      state.error = null;
    },
  },
  extraReducers: {},
});

// Default export is the reducer
const { reducer } = slice;

export default reducer;

// Named exports for actions
export const { update, toast, reset } = slice.actions;
