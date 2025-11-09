import { createSlice } from "@reduxjs/toolkit";
import type { GlobalState } from "./store";
import { AUTH_MODULE } from "../constants/modules";

const token: string | null = localStorage.getItem("token");

export interface AuthState {
  token: string | null;
}

const initialState: AuthState = {
  token: token,
};

export const authSlice = createSlice({
  name: AUTH_MODULE,
  initialState,
  reducers: {
    setToken: (state: AuthState, { payload: { token } }) => {
      state.token = token;
    },
    clearToken: (state: AuthState) => {
      state.token = null;
    },
  },
});

export default authSlice.reducer;

export const { setToken } = authSlice.actions;

export const selectAuthState = (state: GlobalState): AuthState =>
  state[AUTH_MODULE];
