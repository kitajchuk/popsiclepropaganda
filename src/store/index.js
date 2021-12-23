import { configureStore } from '@reduxjs/toolkit';

import reducer from './reducers';

const store = configureStore({
  reducer: {
    pp: reducer,
  },
});

export default store;