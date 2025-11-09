import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { JSX } from "react";
import {
  HOME_ROUTE,
  LOGIN_ROUTE,
  MAP_ROUTE,
  ROOT_ROUTE,
} from "./constants/routes";
import Home from "./modules/Home";
import AuthGuard from "./components/AuthGuard";
import BaseLayout from "./Layouts/BaseLayout";
import NotFound from "./components/NotFound";
import Login from "./modules/Auth/Login";
import Map from "./components/Map";

function ProtectedRoutes(): JSX.Element {
  return (
    <AuthGuard>
      <BaseLayout>
        <Routes>
          <Route path={HOME_ROUTE} element={<Home />} />
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
        <Route path={MAP_ROUTE} element={<Map />} />
        <Route path="*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
