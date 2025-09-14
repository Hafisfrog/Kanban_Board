import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import * as UI from "../styles/ui";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <div style={UI.authWrap}>
      <h2>สมัครสมาชิก</h2>
      {err && <p style={{ color: "#dc2626" }}>{err}</p>}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try { await register(form.name, form.email, form.password); nav("/"); }
          catch (e) { setErr("สมัครสมาชิกไม่สำเร็จ"); }
        }}
        style={UI.formBox}
      >
        <input name="name" placeholder="ชื่อ" value={form.name} onChange={onChange} style={UI.input} />
        <input name="email" placeholder="Email" value={form.email} onChange={onChange} style={UI.input} />
        <input type="password" name="password" placeholder="Password" value={form.password} onChange={onChange} style={UI.input} />
        <button style={UI.btnPrimary}>สมัครสมาชิก</button>
      </form>
      <p>มีบัญชีแล้ว? <Link to="/login">เข้าสู่ระบบ</Link></p>
    </div>
  );
}
