import { createSlice } from '@reduxjs/toolkit';

export const initialState = {
  message: null,
  network: null,
  wallets: [],
  query: {},
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
    },

    toast(state, action) {
      const { error, success, seed } = action.payload;
      if (seed) state.seed = seed;
      if (error) state.message = { error: { ...error } };
      if (success) state.message = { success };
    },

    reset(state) {
      state.message = null;
    },
  },
  extraReducers: {},
});

// Default export is the reducer
const { reducer } = slice;

export default reducer;

// Named exports for actions
export const { update, toast, reset } = slice.actions;
