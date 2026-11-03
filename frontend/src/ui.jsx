import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "./api";

export const ICON = {
  Dashboard: "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
  Students: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  Faculty: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  Subjects: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5",
  Departments: "M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4",
  Attendance: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  Marks: "M18 20V10M12 20V4M6 20v-6",
  Assignments: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8",
  Notices: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  Logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  Lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  Search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",
  Plus: "M12 5v14M5 12h14",
  Edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z",
  Trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",
  Key: "M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3",
  Close: "M18 6L6 18M6 6l12 12",
  Download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  Eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  Power: "M18.4 6.6a9 9 0 1 1-12.8 0M12 2v10",
  Check: "M20 6L9 17l-5-5",
  Alert: "M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01",
  Sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  Moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  Menu: "M3 12h18M3 6h18M3 18h18",
  Left: "M15 18l-6-6 6-6",
  Right: "M9 18l6-6-6-6",
  Link: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
};
export const Icon = ({ n, size }) => (
  <svg className="ico" viewBox="0 0 24 24" style={size ? { width: size, height: size } : undefined}><path d={ICON[n] || ICON.Dashboard} /></svg>
);

export const ini = s => (s || "?").trim()[0]?.toUpperCase();
export const pc = p => (p == null ? "info" : p >= 75 ? "ok" : p >= 60 ? "warn" : "bad");
export const today = () => new Date().toISOString().slice(0, 10);
export const daysAgo = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
export const fmtDate = d => new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export function downloadCsv(name, headers, rows) {
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map(r => r.map(esc).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function useDebounced(v, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

// Loads `path`; returns [data, reload, loading]. Ignores out-of-order responses.
export function useLoad(path, init = []) {
  const [d, setD] = useState(init), [loading, setL] = useState(true), seq = useRef(0);
  const load = useCallback(() => {
    if (path == null) { setD(init); setL(false); return Promise.resolve(); }
    const n = ++seq.current;
    setL(true);
    return api(path).then(r => n === seq.current && setD(r)).catch(() => n === seq.current && setD(init))
      .finally(() => n === seq.current && setL(false));
  }, [path]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);
  return [d, load, loading];
}

/* ---------- toasts + confirm dialog ---------- */
const Ctx = createContext(null);
export const useUi = () => useContext(Ctx);

export function UiProvider({ children }) {
  const [toasts, setT] = useState([]), [dlg, setDlg] = useState(null);
  const toast = useCallback((msg, type = "ok") => {
    const id = Math.random();
    setT(t => [...t, { id, msg, type }]);
    setTimeout(() => setT(t => t.filter(x => x.id !== id)), 3600);
  }, []);
  const confirm = useCallback((message, o = {}) => new Promise(res => setDlg({ message, title: "Are you sure?", danger: true, label: "Confirm", ...o, res })), []);
  const done = v => { dlg.res(v); setDlg(null); };
  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts">{toasts.map(t => <div key={t.id} className={`toast ${t.type}`}><Icon n={t.type === "ok" ? "Check" : "Alert"} />{t.msg}</div>)}</div>
      {dlg && (
        <Modal small title={dlg.title} onClose={() => done(false)}>
          <p className="muted">{dlg.message}</p>
          <div className="modal-ft">
            <button className="soft" onClick={() => done(false)}>Cancel</button>
            <button className={dlg.danger ? "danger-solid" : ""} onClick={() => done(true)}>{dlg.label}</button>
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  );
}

export function Modal({ title, onClose, children, small, drawer }) {
  useEffect(() => {
    const k = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className={`overlay ${drawer ? "drawer-wrap" : ""}`} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${small ? "small" : ""} ${drawer ? "drawer" : ""}`} role="dialog" aria-modal="true">
        <div className="modal-hd"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon n="Close" /></button></div>
        <div className="modal-bd">{children}</div>
      </div>
    </div>
  );
}

/* ---------- small building blocks ---------- */
export const Field = ({ label, children, hint }) => <label className="f"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
export const Avatar = ({ name, size }) => <span className={`av ${size || ""}`}>{ini(name)}</span>;
export const Pill = ({ kind = "info", children }) => <span className={`pill ${kind}`}>{children}</span>;
export const Progress = ({ value }) => <div className="prog"><i className={pc(value)} style={{ width: (value || 0) + "%" }} /></div>;
export const Empty = ({ n, text = "Nothing to show yet" }) => <tr><td className="empty" colSpan={n}>{text}</td></tr>;
export const Loading = () => <div className="loading"><i /><i /><i /></div>;
export const Card = ({ title, action, children, className = "" }) => (
  <section className={`card ${className}`}>
    {(title || action) && <div className="card-hd"><h3>{title}</h3>{action}</div>}
    {children}
  </section>
);
export function Tabs({ tabs, value, onChange }) {
  return <div className="tabs">{tabs.map(([k, l, icon]) => <button key={k} className={k === value ? "on" : ""} onClick={() => onChange(k)}>{icon && <Icon n={icon} size={16} />}{l}</button>)}</div>;
}
export const Search = ({ value, onChange, placeholder = "Search…" }) => (
  <div className="iw search"><Icon n="Search" /><input placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} /></div>
);
export function Ring({ value, size = 96, label }) {
  const r = 40, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r={r} className="ring-bg" />
        <circle cx="50" cy="50" r={r} className={`ring-fg ${pc(value)}`} strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 50 50)" /></svg>
      <b>{value == null ? "–" : value + "%"}</b>{label && <small>{label}</small>}
    </div>
  );
}
export const Segmented = ({ value, onChange, disabled }) => (
  <div className={`seg ${disabled ? "off" : ""}`}>
    <button type="button" className={value === true ? "p" : ""} onClick={() => onChange(true)}>Present</button>
    <button type="button" className={value === false ? "a" : ""} onClick={() => onChange(false)}>Absent</button>
  </div>
);
