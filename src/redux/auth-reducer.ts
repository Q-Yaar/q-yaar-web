import { createSlice } from '@reduxjs/toolkit';
import type { GlobalState } from './store';
import { AUTH_MODULE } from '../constants/modules';
import { LoginResponse } from '../models/Login';

const savedAuth = localStorage.getItem('auth');

export interface AuthState {
  authData?: LoginResponse;
}

const initialState: AuthState = savedAuth
  ? { authData: JSON.parse(savedAuth) }
  : {};

export const authSlice = createSlice({
  name: AUTH_MODULE,
  initialState,
  reducers: {
    setToken: (state: AuthState, { payload: { authData } }) => {
      state.authData = authData;
      localStorage.setItem('auth', JSON.stringify(authData));
    },
    clearToken: (state: AuthState) => {
      state.authData = undefined;
      localStorage.removeItem('auth');
    },
  },
});

export default authSlice.reducer;

export const { setToken, clearToken } = authSlice.actions;

export const selectAuthState = (state: GlobalState): AuthState =>
  state[AUTH_MODULE];
