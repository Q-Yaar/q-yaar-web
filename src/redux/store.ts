import { combineReducers, configureStore } from "@reduxjs/toolkit";
import type { UnknownAction } from "@reduxjs/toolkit";
import { api } from "../apis/api";
import { AUTH_MODULE, SERVER_MODULE } from "../constants/modules";
import authReducer, { AuthState } from "./auth-reducer";

export type GlobalState = {
  [AUTH_MODULE]: AuthState;
  [SERVER_MODULE]: ReturnType<typeof api.reducer>;
};

export const store = configureStore<GlobalState, UnknownAction>({
  reducer: combineReducers({
    [AUTH_MODULE]: authReducer,
    [SERVER_MODULE]: api.reducer,
  }),
  middleware: (getDefaultMiddleware: any) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
