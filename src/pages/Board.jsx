import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../libs/api";
import * as UI from "../styles/ui";

export default function Board() {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState({});
  const [members, setMembers] = useState([]);
  const [newCol, setNewCol] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const data = await api.get(`/boards/${id}`);
      setBoard(data.board || data);
      setColumns(data.columns || []);
      const t = (data.tasks || []).reduce((acc, it) => (acc[it.id] = it, acc), {});
      setTasks(t);
      setMembers(data.members || []);
    } catch (e) { setError(e.message || String(e)); }
  }
  useEffect(() => { load(); }, [id]);

  async function createColumn() {
    if (!newCol.trim()) return;
    try {
      const res = await api.post(`/boards/${id}/columns`, { name: newCol, position: columns.length });
      setColumns((prev) => [...prev, res?.data || res]);
      setNewCol("");
    } catch (e) { setError(e.message || String(e)); }
  }
  async function renameColumn(colId) {
    const name = prompt("ชื่อคอลัมน์ใหม่:");
    if (!name) return;
    try {
      const res = await api.patch(`/columns/${colId}`, { name });
      setColumns((prev) => prev.map((c) => c.id === colId ? { ...c, name: res?.data?.name || name } : c));
    } catch (e) { setError(e.message || String(e)); }
  }
  async function deleteColumn(colId) {
    if (!confirm("ลบคอลัมน์และงานทั้งหมด?")) return;
    try {
      await api.del(`/columns/${colId}`);
      setColumns((prev) => prev.filter((c) => c.id !== colId));
      setTasks((prev) => { const copy = { ...prev }; Object.values(copy).forEach((t)=>{ if(t.column_id===colId) delete copy[t.id]; }); return copy; });
    } catch (e) { setError(e.message || String(e)); }
  }

  async function addTask(colId, title) {
    try {
      const res = await api.post(`/columns/${colId}/tasks`, { title, position: 9999 });
      const created = res?.data || res;
      setTasks((prev) => ({ ...prev, [created.id]: created }));
    } catch (e) { setError(e.message || String(e)); }
  }
  async function updateTask(id, patch) {
    try {
      const res = await api.patch(`/tasks/${id}`, patch);
      setTasks((prev) => ({ ...prev, [id]: { ...prev[id], ...(res?.data || patch) } }));
    } catch (e) { setError(e.message || String(e)); }
  }
  async function deleteTask(id) {
    if (!confirm("ลบงานนี้?")) return;
    try {
      await api.del(`/tasks/${id}`);
      setTasks((prev) => { const c = { ...prev }; delete c[id]; return c; });
    } catch (e) { setError(e.message || String(e)); }
  }

  function onDragStart(e, taskId) {
    e.dataTransfer.setData("text/taskId", taskId);
    e.dataTransfer.effectAllowed = "move";
  }
  async function onDrop(e, toColId) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/taskId");
    if (!taskId) return;
    const t = tasks[taskId];
    if (!t || t.column_id === toColId) return;
    await updateTask(taskId, { column_id: toColId });
  }

  if (!board) return <div>กำลังโหลดบอร์ด...</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: 10, borderRadius: 8 }}>{error}</div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{board.name}</h2>
        <button style={UI.btnGhost} onClick={() => setInviteOpen(true)}>Invite สมาชิก</button>
      </div>

      <div style={{ display: "flex", gap: 10, overflowX: "auto" }}>
        {columns.map((col) => (
          <div key={col.id} style={UI.columnBox} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, col.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{col.name}</strong>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={UI.iconBtn} onClick={() => renameColumn(col.id)}>✎</button>
                <button style={UI.iconBtn} onClick={() => deleteColumn(col.id)}>🗑️</button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {Object.values(tasks).filter((t) => t.column_id === col.id).sort((a,b)=>a.position-b.position).map((t) => (
                <TaskCard key={t.id} task={t} onDragStart={onDragStart} onUpdate={updateTask} onDelete={deleteTask} members={members} />
              ))}
              <AddTask onAdd={(title) => addTask(col.id, title)} />
            </div>
          </div>
        ))}

        <div style={UI.columnBox}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newCol} onChange={(e) => setNewCol(e.target.value)} placeholder="ชื่อคอลัมน์" style={UI.input} />
            <button onClick={createColumn} style={UI.btnPrimary}>+ เพิ่มคอลัมน์</button>
          </div>
        </div>
      </div>

      {inviteOpen && (
        <InviteModal boardId={id} onClose={() => setInviteOpen(false)} onChanged={(m)=> setMembers(m)} />
      )}
    </div>
  );
}

function TaskCard({ task, onDragStart, onUpdate, onDelete, members }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const member = members?.find((m) => m.id === task.assignee_id);

  return (
    <div style={UI.card} draggable onDragStart={(e) => onDragStart(e, task.id)} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <strong>{task.title}</strong>
          {hover && task.description && (
            <p style={{ margin: "6px 0 0", color: "#475569", whiteSpace: "pre-wrap" }}>{task.description}</p>
          )}
          {task.tags?.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {task.tags.map((tg, i) => (
                <span key={i} style={{ border: "1px solid #cbd5e1", borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>{tg.name || tg}</span>
              ))}
            </div>
          )}
          {member && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>ผู้รับผิดชอบ: {member.name || member.email}</div>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={UI.iconBtn} onClick={() => setOpen(true)}>✎</button>
          <button style={UI.iconBtn} onClick={() => onDelete(task.id)}>🗑️</button>
        </div>
      </div>

      {open && (
        <TaskEditor task={task} members={members} onClose={() => setOpen(false)} onSave={(patch) => { onUpdate(task.id, patch); setOpen(false); }} />
      )}
    </div>
  );
}

function TaskEditor({ task, onClose, onSave, members }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [assignee_id, setAssignee] = useState(task.assignee_id || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState(task.tags || []);

  function addTag(){ if(!tagInput.trim()) return; setTags((t)=>[...t,{name:tagInput.trim()}]); setTagInput(""); }

  return (
    <div style={UI.modalOverlay}>
      <div style={UI.modalBox}>
        <h3>แก้ไขงาน</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <input value={title} onChange={(e)=>setTitle(e.target.value)} style={UI.input} />
          <textarea value={description} onChange={(e)=>setDescription(e.target.value)} rows={4} style={{ ...UI.input, resize: "vertical" }} placeholder="รายละเอียด" />
          <select value={assignee_id} onChange={(e)=>setAssignee(e.target.value)} style={UI.input}>
            <option value="">— Assign ให้สมาชิก —</option>
            {members.map((m)=> <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={tagInput} onChange={(e)=>setTagInput(e.target.value)} placeholder="เพิ่ม Tag" style={UI.input} />
            <button onClick={addTag} style={UI.btnGhost}>+ Tag</button>
          </div>
          {tags.length>0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {tags.map((tg,idx)=> (
                <span key={idx} style={{ border: "1px solid #cbd5e1", borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                  {tg.name || tg}
                </span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={onClose} style={UI.btnGhost}>ยกเลิก</button>
            <button onClick={()=> onSave({ title, description, assignee_id, tags })} style={UI.btnPrimary}>บันทึก</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddTask({ onAdd }) {
  const [value, setValue] = useState("");
  return (
    <form onSubmit={(e)=>{ e.preventDefault(); if(!value.trim()) return; onAdd(value.trim()); setValue(""); }} style={{ display: "flex", gap: 8 }}>
      <input value={value} onChange={(e)=>setValue(e.target.value)} placeholder="เพิ่มงานใหม่..." style={UI.input} />
      <button style={UI.btnPrimary}>เพิ่ม</button>
    </form>
  );
}

function InviteModal({ boardId, onClose, onChanged }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadMembers(){
    const data = await api.get(`/boards/${boardId}/members`);
    setList(data?.data || data || []);
    onChanged && onChanged(data?.data || data || []);
  }
  useEffect(()=>{ loadMembers(); },[boardId]);

  async function invite(){
    if(!email.trim()) return;
    setLoading(true);
    await api.post(`/boards/${boardId}/invite`, { email, role });
    setEmail("");
    await loadMembers();
    setLoading(false);
  }

  return (
    <div style={UI.modalOverlay}>
      <div style={UI.modalBox}>
        <h3>ชวนสมาชิกเข้าบอร์ด</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="อีเมลสมาชิก" style={UI.input} />
          <select value={role} onChange={(e)=>setRole(e.target.value)} style={UI.input}>
            <option value="member">Member</option>
            <option value="owner">Owner</option>
          </select>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={onClose} style={UI.btnGhost}>ปิด</button>
            <button onClick={invite} style={UI.btnPrimary} disabled={loading}>เชิญ</button>
          </div>
        </div>

        <hr />
        <h4>สมาชิกปัจจุบัน</h4>
        <ul>
          {list.map((m)=> <li key={m.id}>{m.name || m.email} — {m.role || "member"}</li>)}
        </ul>
      </div>
    </div>
  );
}
