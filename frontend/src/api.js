const BASE = import.meta.env.VITE_API || "http://localhost:8000/api";
export const session = () => { try { return JSON.parse(localStorage.getItem("session") || "null"); } catch { return null; } };

// Turn DRF error payloads ({"roll_number": ["already exists"]}) into one readable sentence.
const nice = o => {
  if (typeof o === "string") return o;
  if (Array.isArray(o)) return o.map(nice).join(" ");
  if (o && typeof o === "object")
    return Object.entries(o).map(([k, v]) => (["detail", "non_field_errors"].includes(k) ? "" : k.replace(/_/g, " ") + ": ") + nice(v)).join(" · ");
  return String(o ?? "");
};

export async function api(path, method = "GET", body) {
  const s = session();
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json", ...(s && { Authorization: "Bearer " + s.access }) },
      body: body && JSON.stringify(body),
    });
  } catch { throw new Error("Cannot reach the server. Is the backend running on port 8000?"); }
  if (res.status === 401 && !path.startsWith("/auth/login")) { localStorage.removeItem("session"); location.reload(); }
  if (!res.ok) throw new Error(nice(await res.json().catch(() => ({}))) || `Request failed (${res.status})`);
  return res.status === 204 ? null : res.json();
}

export async function login(username, password) {
  const d = await api("/auth/login/", "POST", { username, password });
  localStorage.setItem("session", JSON.stringify(d));
  return d;
}
