import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../libs/api";
import * as UI from "../styles/ui";

export default function Boards() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function fetchBoards() {
    setLoading(true);
    setError("");
    try { const res = await api.get("/boards"); setBoards(res?.data || res || []); }
    catch (e) { setError(e.message || String(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { fetchBoards(); }, []);

  async function createBoard() {
    if (!name.trim()) return;
    try {
      const res = await api.post("/boards", { name });
      setBoards((b) => [...b, res?.data || res]);
      setName("");
    } catch (e) { setError(e.message || String(e)); }
  }

  async function renameBoard(id) {
    const title = prompt("ชื่อบอร์ดใหม่:");
    if (!title) return;
    try {
      const res = await api.patch(`/boards/${id}`, { name: title });
      setBoards((list) => list.map((b) => (b.id === id ? { ...b, name: res?.data?.name || title } : b)));
    } catch (e) { setError(e.message || String(e)); }
  }

  async function deleteBoard(id) {
    if (!confirm("ลบบอร์ดนี้?")) return;
    try {
      await api.del(`/boards/${id}`);
      setBoards((list) => list.filter((b) => b.id !== id));
    } catch (e) { setError(e.message || String(e)); }
  }

  if (loading) return <div>กำลังโหลดบอร์ด...</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: 10, borderRadius: 8 }}>{error}</div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อบอร์ดใหม่" style={UI.input} />
        <button onClick={createBoard} style={UI.btnPrimary}>+ สร้างบอร์ด</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
        {boards.map((b) => (
          <div key={b.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>{b.name}</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <Link to={`/boards/${b.id}`} style={UI.btnPrimary}>เปิด</Link>
              <button onClick={() => renameBoard(b.id)} style={UI.btnGhost}>แก้ชื่อ</button>
              <button onClick={() => deleteBoard(b.id)} style={UI.btnGhost}>ลบ</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
