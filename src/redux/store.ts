import { combineReducers, configureStore } from "@reduxjs/toolkit";
import type { UnknownAction } from "@reduxjs/toolkit";
import { api } from "../apis/api";
import { AUTH_MODULE, SERVER_MODULE } from "../constants/modules";
import authReducer, { AuthState, clearToken } from "./auth-reducer";
import { storage, STORAGE_KEYS } from "../utils/storage";

export type GlobalState = {
  [AUTH_MODULE]: AuthState;
  [SERVER_MODULE]: ReturnType<typeof api.reducer>;
};

const appReducer = combineReducers({
  [AUTH_MODULE]: authReducer,
  [SERVER_MODULE]: api.reducer,
});

const rootReducer = (state: GlobalState | undefined, action: UnknownAction) => {
  if (clearToken.match(action)) {
    storage.remove(STORAGE_KEYS.AUTH);
    // Passing undefined resets all reducers (including RTK Query api.reducer) to fresh initial state
    state = undefined;
  }
  return appReducer(state, action);
};

export const store = configureStore<GlobalState, UnknownAction>({
  reducer: rootReducer as any,
  middleware: (getDefaultMiddleware: any) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
