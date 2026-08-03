import { Navigate, Outlet } from "react-router-dom";

export default function AuthGuard() {
  const isAuth = localStorage.getItem("user_session") === "true";

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
