import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { JSX } from "react";
import { LOGIN_ROUTE } from "../constants/routes";
import { selectAuthState } from "../redux/auth-reducer";

interface PRProps {
  children: JSX.Element;
}

export default function AuthGuard({ children }: PRProps): JSX.Element | null {
  const auth = useSelector(selectAuthState);
  const playerAccessToken = auth.authData?.profiles['PLAYER']?.access_token;
  if (!playerAccessToken) {
    return <Navigate to={LOGIN_ROUTE} replace />;
  }
  return playerAccessToken ? children : null;
}
