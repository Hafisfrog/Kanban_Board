// === src/libs/api.js ===
// API client: supports live (backend) and mock (no-backend) modes + LocalStorage user store
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
const USE_MOCK = (import.meta.env.VITE_API_MOCK === "1") || BASE_URL === "mock";
const TOKEN_KEY = "kanban_token"; // export at bottom

// LocalStorage helpers for mock users
const LSK_USERS = "kanban_mock_users";           // [{id,name,email,password,role}]
const LSK_CURRENT_UID = "kanban_current_user_id"; // number

const lsGet = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// Seed ผู้ใช้หลายคน + role
function ensureSeedUsers() {
  const users = lsGet(LSK_USERS, null);
  if (!users || users.length === 0) {
    const seed = [
      { id: 1, name: "Demo Owner",   email: "owner@example.com", password: "1234", role: "owner"  },
      { id: 2, name: "Alice Member", email: "alice@example.com", password: "1234", role: "member" },
      { id: 3, name: "Bob Member",   email: "bob@example.com",   password: "1234", role: "member" },
      { id: 4, name: "QA Viewer",    email: "qa@example.com",    password: "1234", role: "member" },
    ];
    lsSet(LSK_USERS, seed);
    return seed;
  }
  return users;
}

function createMockApi() {
  let _token = localStorage.getItem(TOKEN_KEY) || "";
  const allUsers = ensureSeedUsers();

  // in-memory board data
  let boards = [{ id: 1, name: "Demo Board" }];

  const columnsByBoard = {
    1: [
      { id: 11, name: "To Do",       position: 0 },
      { id: 12, name: "In Progress", position: 1 },
      { id: 13, name: "Done",        position: 2 },
    ],
  };

  let tasks = [
    { id: 100, title: "Welcome to Kanban", description: "This is a mock task.", column_id: 11, position: 0, assignee_id: 1, tags: [{ name: "demo" }] },
  ];

  // 👇 สมาชิกบอร์ดอ้างอิงจาก seed ผู้ใช้ (ไม่ใช่ demo@example เดิม)
  const membersByBoard = {
    1: allUsers.slice(0, 3).map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role || "member" })),
  };

  let nextId = 1000;
  const ok = (data) => Promise.resolve(structuredClone(data));

  const currentUser = () => {
    const uid = lsGet(LSK_CURRENT_UID, null);
    const users = lsGet(LSK_USERS, []);
    return users.find(u => u.id === uid) || users[0];
  };

  return {
    setToken(t) { _token = t; localStorage.setItem(TOKEN_KEY, t); },

    async get(path) {
      if (path === "/__ping") return ok({ ok: true, mode: "mock" });

      if (path === "/auth/me") {
        if (!_token) throw new Error("Unauthenticated");
        return ok(currentUser());
      }

      if (path === "/boards") return ok(boards);

      const mBoard = path.match(/^\/boards\/(\d+)$/);
      if (mBoard) {
        const bid = Number(mBoard[1]);
        const board = boards.find(b => b.id === bid);
        const cols = columnsByBoard[bid] || [];
        const ts = tasks.filter(t => cols.some(c => c.id === t.column_id));
        const mems = membersByBoard[bid] || [currentUser()];
        return ok({ board, columns: cols, tasks: ts, members: mems });
      }

      const mMembers = path.match(/^\/boards\/(\d+)\/members$/);
      if (mMembers) {
        const bid = Number(mMembers[1]);
        return ok(membersByBoard[bid] || [currentUser()]);
      }

      throw new Error(`Mock GET not implemented for ${path}`);
    },

    async post(path, body) {
      if (path === "/auth/login") {
        const { email, password } = body || {};
        const users = ensureSeedUsers();
        const found = users.find(u => u.email === email && u.password === password);
        if (!found) throw new Error("HTTP_401: invalid credentials");
        lsSet(LSK_CURRENT_UID, found.id);
        this.setToken(`mock-token-${found.id}`);
        return ok({ token: `mock-token-${found.id}` });
      }

      if (path === "/auth/register") {
        const { name, email, password } = body || {};
        const users = lsGet(LSK_USERS, []);
        if (users.some(u => u.email === email)) throw new Error("HTTP_409: email already exists");
        const id = Math.max(0, ...users.map(u => u.id || 0)) + 1;
        const nu = { id, name: name || email.split("@")[0], email, password: password || "", role: "member" };
        lsSet(LSK_USERS, [...users, nu]);
        lsSet(LSK_CURRENT_UID, id);
        this.setToken(`mock-token-${id}`);
        return ok({ token: `mock-token-${id}` });
      }

      if (path === "/boards") {
        const item = { id: ++nextId, name: body.name };
        boards = [...boards, item];
        columnsByBoard[item.id] = [];
        membersByBoard[item.id] = [currentUser()];
        return ok(item);
      }

      const mCols = path.match(/^\/boards\/(\d+)\/columns$/);
      if (mCols) {
        const bid = Number(mCols[1]);
        const item = {
          id: ++nextId,
          name: body.name,
          position: body.position ?? (columnsByBoard[bid]?.length || 0),
        };
        columnsByBoard[bid] = [...(columnsByBoard[bid] || []), item];
        return ok(item);
      }

      const mTasks = path.match(/^\/columns\/(\d+)\/tasks$/);
      if (mTasks) {
        const colId = Number(mTasks[1]);
        const item = {
          id: ++nextId,
          title: body.title,
          description: body.description || "",
          column_id: colId,
          position: body.position ?? 9999,
          assignee_id: currentUser()?.id || null,
          tags: [],
        };
        tasks = [...tasks, item];
        return ok(item);
      }

      const mInvite = path.match(/^\/boards\/(\d+)\/invite$/);
      if (mInvite) {
        const bid = Number(mInvite[1]);
        const newMember = {
          id: ++nextId,
          name: body.email.split("@")[0],
          email: body.email,
          role: body.role || "member",
        };
        membersByBoard[bid] = [...(membersByBoard[bid] || []), newMember];
        return ok({ ok: true });
      }

      throw new Error(`Mock POST not implemented for ${path}`);
    },

    async patch(path, body) {
      const mBoard = path.match(/^\/boards\/(\d+)$/);
      if (mBoard) {
        const id = Number(mBoard[1]);
        boards = boards.map(b => (b.id === id ? { ...b, ...body } : b));
        return ok(boards.find(b => b.id === id));
      }

      const mCol = path.match(/^\/columns\/(\d+)$/);
      if (mCol) {
        const id = Number(mCol[1]);
        for (const bid in columnsByBoard) {
          columnsByBoard[bid] = columnsByBoard[bid].map(c => (c.id === id ? { ...c, ...body } : c));
        }
        return ok({ ok: true });
      }

      const mTask = path.match(/^\/tasks\/(\d+)$/);
      if (mTask) {
        const id = Number(mTask[1]);
        tasks = tasks.map(t => (t.id === id ? { ...t, ...body } : t));
        return ok(tasks.find(t => t.id === id));
      }

      throw new Error(`Mock PATCH not implemented for ${path}`);
    },

    async del(path) {
      const mBoard = path.match(/^\/boards\/(\d+)$/);
      if (mBoard) {
        const id = Number(mBoard[1]);
        boards = boards.filter(b => b.id !== id);
        delete columnsByBoard[id];
        tasks = tasks.filter(t => !(columnsByBoard[id] || []).some(c => c.id === t.column_id));
        return ok({ ok: true });
      }

      const mCol = path.match(/^\/columns\/(\d+)$/);
      if (mCol) {
        const id = Number(mCol[1]);
        for (const bid in columnsByBoard) {
          columnsByBoard[bid] = columnsByBoard[bid].filter(c => c.id !== id);
        }
        tasks = tasks.filter(t => t.column_id !== id);
        return ok({ ok: true });
      }

      const mTask = path.match(/^\/tasks\/(\d+)$/);
      if (mTask) {
        const id = Number(mTask[1]);
        tasks = tasks.filter(t => t.id !== id);
        return ok({ ok: true });
      }

      throw new Error(`Mock DELETE not implemented for ${path}`);
    },
  };
}

const netApi = {
  _token: localStorage.getItem(TOKEN_KEY) || "",
  setToken(t) { this._token = t; localStorage.setItem(TOKEN_KEY, t); },
  async _fetch(path, opts = {}) {
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    if (this._token) headers["Authorization"] = `Bearer ${this._token}`;
    let res;
    try {
      res = await fetch(`${BASE_URL}${path}`, { ...opts, headers });
    } catch (err) {
      const msg = (err && err.message) || "Network error";
      throw new Error(`NETWORK_ERROR: ${msg}. Is your backend running at ${BASE_URL}?`);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "<no body>");
      throw new Error(`HTTP_${res.status}: ${body}`);
    }
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
  },
  get(path) { return this._fetch(path, { method: "GET" }); },
  post(path, body) { return this._fetch(path, { method: "POST", body: JSON.stringify(body) }); },
  patch(path, body) { return this._fetch(path, { method: "PATCH", body: JSON.stringify(body) }); },
  del(path) { return this._fetch(path, { method: "DELETE" }); },
};

const api = USE_MOCK ? createMockApi() : netApi;
export default api;
export { BASE_URL, USE_MOCK, TOKEN_KEY };
