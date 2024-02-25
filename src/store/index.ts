import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore
} from 'redux-persist';

import buffers from './buffers';
import connection from './connection-info';
import hotlists from './hotlists';
import lines from './lines';
import nicklists from './nicklists';

type AppState = {
  connected: boolean;
  currentBufferId: string | null;
};

export type StoreState = ReturnType<typeof reducer>;

export type AppDispatch = typeof store.dispatch;

const initialState: AppState = {
  connected: false,
  currentBufferId: null
};

const app = (
  state: AppState = initialState,
  action: { type: string; bufferId: string }
): AppState => {
  switch (action.type) {
    case 'DISCONNECT':
      return {
        ...state,
        connected: false
      };
    case 'FETCH_VERSION':
      return {
        ...state,
        connected: true
      };
    case 'CHANGE_CURRENT_BUFFER':
      return {
        ...state,
        currentBufferId: action.bufferId
      };
    case 'UPGRADE': {
      return { ...state, currentBufferId: null };
    }
    default:
      return state;
  }
};

const listenerMiddleware = createListenerMiddleware();

export const reducer = combineReducers({
  app,
  buffers,
  lines,
  connection,
  hotlists,
  nicklists
});

export const store = configureStore({
  reducer: persistReducer(
    { storage: AsyncStorage, key: 'state', whitelist: ['connection'] },
    reducer
  ),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // https://github.com/rt2zz/redux-persist/issues/988
          FLUSH,
          REHYDRATE,
          PAUSE,
          PERSIST,
          PURGE,
          REGISTER
        ]
      }
    }).prepend(listenerMiddleware.middleware)
});

export const persistor = persistStore(store);
