import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import * as UI from "../styles/ui";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <div style={UI.authWrap}>
      <h2>เข้าสู่ระบบ</h2>
      {err && <p style={{ color: "#dc2626" }}>{err}</p>}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try { await login(form.email, form.password); nav("/"); }
          catch (e) { setErr("อีเมลหรือรหัสผ่านไม่ถูกต้อง"); }
        }}
        style={UI.formBox}
      >
        <input name="email" placeholder="Email" value={form.email} onChange={onChange} style={UI.input} />
        <input type="password" name="password" placeholder="Password" value={form.password} onChange={onChange} style={UI.input} />
        <button style={UI.btnPrimary}>เข้าสู่ระบบ</button>
      </form>
      <p>ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link></p>
      {/* <p style={{fontSize:12,color:'#64748b'}}>ทดลอง: demo@example.com / 1234</p> */}
    </div>
  );
}
