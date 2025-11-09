import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { JSX } from "react";
import { LOGIN_ROUTE } from "../constants/routes";
import { selectAuthState } from "../redux/auth-reducer";

interface PRProps {
  children: JSX.Element;
}

export default function AuthGuard({ children }: PRProps): JSX.Element | null {
  const { token } = useSelector(selectAuthState);
  if (!token) {
    return <Navigate to={LOGIN_ROUTE} replace />;
  }
  return token ? children : null;
}
