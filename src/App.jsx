import { Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import * as UI from "./styles/ui";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Boards from "./pages/Boards";
import Board from "./pages/Board";
import SelfTest from "./pages/SelfTest";
import { USE_MOCK, BASE_URL } from "./libs/api";

export default function App() {
  return (
    <AuthProvider>
      <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
        <Header />
        <div style={{ padding: 16 }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<RequireAuth><Boards /></RequireAuth>} />
            <Route path="/boards/:id" element={<RequireAuth><Board /></RequireAuth>} />
            <Route path="/__selftest" element={<SelfTest />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}

function Header() {
  const { user, logout } = useAuth();
  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link to="/" style={{ textDecoration: "none", color: "#111827", fontWeight: 700 }}>Kanban</Link>
        <span style={{ fontSize: 12, color: "#64748b" }}>API: {USE_MOCK ? "mock" : BASE_URL}</span>
        {USE_MOCK && <span style={{ fontSize: 12, color: "#16a34a", border: "1px solid #16a34a", borderRadius: 6, padding: "2px 6px" }}>MOCK</span>}
      </div>
      {user ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: "#334155" }}>สวัสดี, {user?.name || user?.email}</span>
          <button onClick={logout} style={UI.btnGhost}>ออกจากระบบ</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/login" style={UI.btnGhost}>เข้าสู่ระบบ</Link>
          <Link to="/register" style={UI.btnPrimary}>สมัครสมาชิก</Link>
        </div>
      )}
    </header>
  );
}

function RequireAuth({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
