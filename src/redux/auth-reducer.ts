import { createSlice } from '@reduxjs/toolkit';
import type { GlobalState } from './store';
import { AUTH_MODULE } from '../constants/modules';
import { LoginResponse } from '../models/Login';

import { storage, STORAGE_KEYS } from '../utils/storage';

const savedAuth = storage.get<LoginResponse>(STORAGE_KEYS.AUTH);

export interface AuthState {
  authData?: LoginResponse;
}

const initialState: AuthState = savedAuth ? { authData: savedAuth } : {};

export const authSlice = createSlice({
  name: AUTH_MODULE,
  initialState,
  reducers: {
    setToken: (state: AuthState, { payload: { authData } }) => {
      state.authData = authData;
      storage.set(STORAGE_KEYS.AUTH, authData);
    },
    clearToken: (state: AuthState) => {
      state.authData = undefined;
      storage.remove(STORAGE_KEYS.AUTH);
    },
  },
});

export default authSlice.reducer;

export const { setToken, clearToken } = authSlice.actions;

export const selectAuthState = (state: GlobalState): AuthState =>
  state[AUTH_MODULE];
