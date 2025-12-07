import { createSlice } from "@reduxjs/toolkit";
import type { GlobalState } from "./store";
import { AUTH_MODULE } from "../constants/modules";
import { LoginResponse } from "../models/Login";

const token: string | null = localStorage.getItem("token");

export interface AuthState {
  authData?: LoginResponse;
}

const initialState: AuthState = {
};

export const authSlice = createSlice({
  name: AUTH_MODULE,
  initialState,
  reducers: {
    setToken: (state: AuthState, { payload: { authData } }) => {
      state.authData = authData;
    },
    clearToken: (state: AuthState) => {
      state.authData = undefined;
    },
  },
});

export default authSlice.reducer;

export const { setToken } = authSlice.actions;

export const selectAuthState = (state: GlobalState): AuthState =>
  state[AUTH_MODULE];
