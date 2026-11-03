import { useState } from "react";
import { login } from "../api";
import { Field, Icon } from "../ui";

export const Campus = () => (
  <svg className="campus" viewBox="0 0 360 240" aria-hidden="true">
    <circle cx="310" cy="46" r="26" fill="#fde68a" />
    <ellipse cx="180" cy="224" rx="170" ry="11" fill="#0003" />
    <line x1="180" y1="44" x2="180" y2="14" stroke="#fff" strokeWidth="3" /><polygon points="180,14 208,22 180,30" fill="#fbbf24" />
    <polygon points="180,40 56,102 304,102" fill="#f43f5e" /><circle cx="180" cy="82" r="11" fill="#fff" />
    <rect x="56" y="102" width="248" height="14" fill="#fff" />
    {[80, 120, 160, 200, 240].map(x => <rect key={x} x={x} y="116" width="24" height="80" rx="3" fill="#fff" />)}
    <rect x="164" y="150" width="32" height="46" rx="4" fill="#4f46e5" />
    <rect x="46" y="196" width="268" height="12" fill="#e0e7ff" /><rect x="34" y="208" width="292" height="12" fill="#c7d2fe" />
    <rect x="22" y="196" width="5" height="24" fill="#065f46" /><circle cx="24" cy="184" r="22" fill="#34d399" />
    <rect x="334" y="196" width="5" height="24" fill="#065f46" /><circle cx="336" cy="184" r="22" fill="#10b981" />
  </svg>
);

export default function Login({ onLogin }) {
  const [u, setU] = useState(""), [p, setP] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const go = async e => {
    e.preventDefault(); setErr(""); setBusy(true);
    try { onLogin(await login(u, p)); }
    catch (x) { setErr(x.message.startsWith("Cannot reach") ? x.message : "Invalid username or password"); }
    setBusy(false);
  };
  return (
    <div className="auth">
      <section className="auth-art">
        <div className="blob b1" /><div className="blob b2" />
        <div className="brand"><span className="logo"><Icon n="Departments" /></span>Smart College</div>
        <h2>Everything your campus needs, in one place.</h2>
        <p>Manage students, faculty, attendance, marks and assignments with a single secure login.</p>
        <Campus />
        <div className="chips"><span>Attendance</span><span>Marks</span><span>Assignments</span><span>Notices</span></div>
      </section>
      <section className="auth-form">
        <form className="login" onSubmit={go}>
          <div className="av big"><Icon n="Students" /></div>
          <h1>Welcome back</h1><p className="muted">Sign in to continue to your dashboard</p>
          <Field label="Username"><div className="iw"><Icon n="Faculty" />
            <input autoFocus autoComplete="username" placeholder="Enter your username" value={u} onChange={e => setU(e.target.value)} /></div></Field>
          <Field label="Password"><div className="iw"><Icon n="Lock" />
            <input autoComplete="current-password" placeholder="Enter your password" type="password" value={p} onChange={e => setP(e.target.value)} /></div></Field>
          {err && <p className="err">{err}</p>}
          <button disabled={busy || !u || !p}>{busy ? "Signing in…" : "Login"}</button>
          <span className="hint">Admin · Faculty · Student</span>
        </form>
      </section>
    </div>
  );
}
