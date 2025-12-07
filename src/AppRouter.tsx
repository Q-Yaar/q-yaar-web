import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { JSX } from "react";
import {
  DICE_ROLLER_ROUTE,
  GAME_DETAIL_ROUTE,
  HOME_ROUTE,
  LOGIN_ROUTE,
  MAP_ROUTE,
  ROOT_ROUTE,
  SIGNUP_ROUTE,
} from "./constants/routes";
import Home from "./modules/Home";
import AuthGuard from "./components/AuthGuard";
import BaseLayout from "./Layouts/BaseLayout";
import NotFound from "./components/NotFound";
import Login from "./modules/Auth/Login";
import Map from "./components/Map";
import GameDetail from "./modules/Games/GameDetail";
import DiceRoller from "./modules/DiceRoller";
import SignUp from "./modules/Auth/SignUp";

function ProtectedRoutes(): JSX.Element {
  return (
    <AuthGuard>
      <BaseLayout>
        <Routes>
          <Route path={HOME_ROUTE} element={<Home />} />
          <Route path={GAME_DETAIL_ROUTE} element={<GameDetail />} />
          <Route path={DICE_ROLLER_ROUTE} element={<DiceRoller />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BaseLayout>
    </AuthGuard>
  );
}

export default function AppRouter(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path={ROOT_ROUTE}
          element={<Navigate to={LOGIN_ROUTE} replace />}
        />
        <Route path={LOGIN_ROUTE} element={<Login />} />
        <Route path={SIGNUP_ROUTE} element={<SignUp />} />
        <Route path={MAP_ROUTE} element={<Map />} />
        <Route path="*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
