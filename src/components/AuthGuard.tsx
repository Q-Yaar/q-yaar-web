import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { JSX } from "react";
import { HOME_ROUTE, LOGIN_ROUTE } from "../constants/routes";
import { selectAuthState } from "../redux/auth-reducer";

interface PRProps {
  children: JSX.Element;
  requireAuth?: boolean;
}

export default function AuthGuard({ children, requireAuth = true }: PRProps): JSX.Element | null {
  const auth = useSelector(selectAuthState);
  const playerAccessToken = auth.authData?.profiles['PLAYER']?.access_token;

  if (requireAuth) {
    if (!playerAccessToken) {
      return <Navigate to={LOGIN_ROUTE} replace />;
    }
    return children;
  }

  // If requireAuth is false, we want to prevent authenticated users from accessing this route
  if (playerAccessToken) {
    return <Navigate to={HOME_ROUTE} replace />;
  }

  return children;
}
