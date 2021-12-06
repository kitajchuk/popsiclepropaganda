import { createSlice } from '@reduxjs/toolkit';

// pp slice for global data store
export const slice = createSlice({
  name: 'pp',
  initialState: {
    wallets: [],
    error: null,
    seed: null,
    token: null,
  },
  reducers: {
    update(state, action) {
      const { wallets, seed, token } = action.payload;
      state.wallets = wallets;
      state.seed = seed;
      state.token = token;
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
