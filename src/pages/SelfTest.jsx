import * as UI from "../styles/ui";
import api, { BASE_URL, USE_MOCK } from "../libs/api";

export default function SelfTest(){
  const checks = [
    { name: "UI.authWrap", pass: typeof UI.authWrap === "object" },
    { name: "UI.input", pass: typeof UI.input === "object" },
    { name: "UI.btnPrimary", pass: typeof UI.btnPrimary === "object" },
    { name: "BASE_URL", pass: typeof BASE_URL === "string" && BASE_URL.length > 0 },
    { name: "USE_MOCK", pass: typeof USE_MOCK === "boolean" },
  ];

  async function ping(){
    try { const res = await api.get("/__ping"); alert("Ping ok: " + JSON.stringify(res)); }
    catch(e){ alert("Ping failed: " + e.message); }
  }

  return (
    <div style={{ maxWidth: 640, margin: "24px auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
      <h2>Self Test</h2>
      <ul>
        {checks.map((c) => (
          <li key={c.name} style={{ color: c.pass ? "#16a34a" : "#dc2626" }}>
            {c.pass ? "✔" : "✖"} {c.name}
          </li>
        ))}
      </ul>
      <p>Mode: <b>{USE_MOCK? 'mock':'live'}</b> | BASE_URL: <code>{BASE_URL}</code></p>
      <button style={UI.btnGhost} onClick={ping}>Ping API</button>
      <p style={{ marginTop: 10, color: "#64748b" }}>ตั้งค่า <code>VITE_API_MOCK=1</code> ในไฟล์ <code>.env</code> เพื่อใช้โหมด mock โดยไม่ต้องมี backend</p>
    </div>
  );
}
