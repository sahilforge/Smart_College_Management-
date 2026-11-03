import { useEffect, useState } from "react";
import { api } from "../api";
import { Avatar, Field, Icon, Loading, Modal, Pill, Progress, Ring, Empty, Search, downloadCsv, fmtDate, pc, useDebounced, useLoad, useUi } from "../ui";

const KINDS = {
  students: {
    one: "student", cols: 9,
    form: [["first_name", "Full name"], ["username", "Username"], ["email", "Email", "email"], ["password", "Password", "password"],
      ["roll_number", "Roll number"], ["phone", "Phone"], ["department", "Department", "dept"], ["year", "Year", "number"], ["section", "Section"]],
    blank: { first_name: "", username: "", email: "", password: "", roll_number: "", phone: "", department: "", year: 1, section: "", is_active: true },
  },
  faculty: {
    one: "faculty member", cols: 7,
    form: [["first_name", "Full name"], ["username", "Username"], ["email", "Email", "email"], ["password", "Password", "password"],
      ["phone", "Phone"], ["designation", "Designation"], ["department", "Department", "dept"]],
    blank: { first_name: "", username: "", email: "", password: "", phone: "", designation: "", department: "", is_active: true },
  },
};

/* ---------- add / edit form ---------- */
function PersonForm({ ep, row, depts, onClose, onSaved }) {
  const K = KINDS[ep], { toast } = useUi();
  const [f, setF] = useState(row ? { ...K.blank, ...row, password: "" } : K.blank), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async e => {
    e.preventDefault(); setErr(""); setBusy(true);
    const keys = [...K.form.map(x => x[0]), "is_active"];
    const body = Object.fromEntries(keys.filter(k => f[k] !== "" && f[k] != null).map(k => [k, f[k]]));
    try {
      await api(row ? `/${ep}/${row.id}/` : `/${ep}/`, row ? "PATCH" : "POST", body);
      toast(row ? "Changes saved" : `${K.one[0].toUpperCase() + K.one.slice(1)} added`);
      onSaved();
    } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <Modal title={row ? `Edit ${K.one}` : `Add ${K.one}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="grid">
          {K.form.map(([k, label, t]) => (
            <Field key={k} label={label} hint={k === "password" ? (row ? "Leave blank to keep the current password" : "Leave blank to use changeme123") : undefined}>
              {t === "dept"
                ? <select value={f[k] ?? ""} onChange={set(k)}><option value="">— Select —</option>{depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                : <input type={t || "text"} value={f[k] ?? ""} onChange={set(k)} required={["first_name", "username"].includes(k) || k === "roll_number"} min={t === "number" ? 1 : undefined} max={t === "number" ? 6 : undefined} />}
            </Field>))}
          <Field label="Account status"><select value={f.is_active ? "1" : "0"} onChange={e => setF({ ...f, is_active: e.target.value === "1" })}>
            <option value="1">Active — can log in</option><option value="0">Inactive — login blocked</option></select></Field>
        </div>
        {err && <p className="err">{err}</p>}
        <div className="modal-ft"><button type="button" className="soft" onClick={onClose}>Cancel</button><button disabled={busy}>{row ? "Save changes" : "Add"}</button></div>
      </form>
    </Modal>
  );
}

/* ---------- student 360° drawer, includes attendance fixes ---------- */
function StudentDrawer({ id, onClose, onChanged }) {
  const [r, load, loading] = useLoad(`/students/${id}/report/`, null);
  const { toast } = useUi();
  const flip = async a => {
    try { await api(`/attendance/${a.id}/`, "PATCH", { present: !a.present }); toast("Attendance updated"); await load(); onChanged(); }
    catch (x) { toast(x.message, "bad"); }
  };
  const s = r?.student;
  return (
    <Modal drawer title="Student profile" onClose={onClose}>
      {loading && !r ? <Loading /> : !s ? <p className="muted">Could not load profile.</p> : (
        <>
          <div className="profile-hd"><Avatar name={s.first_name} size="lg" />
            <div><h2>{s.first_name}</h2><p className="muted">{s.roll_number} · {s.department_name || "No department"} · Year {s.year}{s.section && ` · Sec ${s.section}`}</p>
              <Pill kind={s.is_active ? "ok" : "bad"}>{s.is_active ? "Active" : "Inactive"}</Pill></div>
            <Ring value={r.overall} label="attendance" /></div>
          <dl className="kv"><dt>Username</dt><dd>{s.username}</dd><dt>Email</dt><dd>{s.email || "—"}</dd><dt>Phone</dt><dd>{s.phone || "—"}</dd></dl>
          <h4>Attendance by subject</h4>
          {r.subjects.length === 0 ? <p className="muted">No attendance recorded.</p> : r.subjects.map(x => (
            <div className="barrow" key={x.subject}><span className="bl">{x.subject}</span><Progress value={x.percent} /><b>{x.present}/{x.total}</b></div>))}
          <h4>Recent attendance <small className="muted">— click a status to correct it</small></h4>
          <div className="mini-list">{r.recent.map(a => (
            <div key={a.id}><span>{fmtDate(a.date)}</span><span className="grow">{a.subject}</span>
              <button className={`pill ${a.present ? "ok" : "bad"} click`} onClick={() => flip(a)} title="Toggle present / absent">{a.present ? "Present" : "Absent"}</button></div>))}</div>
          <h4>Marks</h4>
          {r.marks.length === 0 ? <p className="muted">No marks entered.</p> : (
            <div className="mini-list">{r.marks.map(m => (
              <div key={m.id}><span className="grow">{m.subject} · {m.exam}</span><Pill kind={pc((100 * m.score) / m.max_score)}>{m.score}/{m.max_score}</Pill></div>))}</div>)}
        </>
      )}
    </Modal>
  );
}

/* ---------- assign subjects to a faculty member ---------- */
function AssignSubjects({ fac, onClose, onSaved }) {
  const [subs] = useLoad("/subjects/"), { toast } = useUi();
  const [sel, setSel] = useState(null), [busy, setBusy] = useState(false);
  useEffect(() => { if (sel === null && subs.length) setSel(new Set(subs.filter(s => s.faculty === fac.id).map(s => s.id))); }, [subs]); // eslint-disable-line
  const toggle = id => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const save = async () => {
    setBusy(true);
    try {
      await Promise.all(subs.flatMap(s => {
        const want = sel.has(s.id), was = s.faculty === fac.id;
        return want !== was ? [api(`/subjects/${s.id}/`, "PATCH", { faculty: want ? fac.id : null })] : [];
      }));
      toast("Subjects updated"); onSaved();
    } catch (x) { toast(x.message, "bad"); setBusy(false); }
  };
  return (
    <Modal title={`Subjects for ${fac.first_name}`} onClose={onClose}>
      <p className="muted">Tick the subjects this faculty member teaches. Ticking one that belongs to someone else moves it over.</p>
      <div className="pick">{(sel ? subs : []).map(s => (
        <label key={s.id} className={`check ${sel.has(s.id) ? "on" : ""}`}>
          <input type="checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} />
          <span className="grow"><b>{s.code}</b> — {s.name}<small>{s.department_name}{s.faculty && s.faculty !== fac.id ? ` · currently ${s.faculty_name}` : ""}</small></span>
        </label>))}</div>
      <div className="modal-ft"><button className="soft" onClick={onClose}>Cancel</button><button disabled={busy || !sel} onClick={save}>Save assignments</button></div>
    </Modal>
  );
}

/* ---------- the page ---------- */
export default function People({ ep, intent }) {
  const K = KINDS[ep], isS = ep === "students", { toast, confirm } = useUi();
  const [q, setQ] = useState(""), [dept, setDept] = useState(""), [year, setYear] = useState(""), [sec, setSec] = useState(""), [status, setStatus] = useState("");
  const dq = useDebounced(q);
  const qs = `?search=${encodeURIComponent(dq)}&department=${dept}&status=${status}` + (isS ? `&year=${year}&section=${sec}` : "");
  const [rows, load, loading] = useLoad(`/${ep}/${qs}`);
  const [depts] = useLoad("/departments/");
  const [modal, setModal] = useState(intent === "add" ? { add: true } : null), [sel, setSel] = useState(new Set());
  useEffect(() => setSel(new Set()), [qs]);

  const total = rows.length, active = rows.filter(r => r.is_active).length;
  const low = isS ? rows.filter(r => r.attendance_percent != null && r.attendance_percent < 75).length : 0;
  const allSel = rows.length > 0 && sel.size === rows.length;
  const toggleSel = id => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const closeReload = () => { setModal(null); load(); };

  const run = async (fn, ok) => { try { await fn(); toast(ok); load(); } catch (x) { toast(x.message, "bad"); } };
  const toggle = r => run(() => api(`/${ep}/${r.id}/toggle_active/`, "POST"), r.is_active ? `${r.first_name} deactivated` : `${r.first_name} activated`);
  const del = async r => {
    if (await confirm(`Delete ${r.first_name}? This also removes their login${isS ? ", attendance and marks" : ""}. Consider deactivating instead.`, { title: `Delete ${K.one}`, label: "Delete" }))
      run(() => api(`/${ep}/${r.id}/`, "DELETE"), "Deleted");
  };
  const reset = async r => {
    if (await confirm(`Reset ${r.first_name}'s password to "changeme123"?`, { title: "Reset password", danger: false, label: "Reset" }))
      run(() => api(`/${ep}/${r.id}/reset_password/`, "POST", {}), "Password reset to changeme123");
  };
  const bulk = async kind => {
    const ids = [...sel];
    if (kind === "delete" && !(await confirm(`Delete ${ids.length} selected record(s)? This cannot be undone.`, { title: "Bulk delete", label: "Delete all" }))) return;
    run(() => Promise.all(ids.map(id => kind === "delete" ? api(`/${ep}/${id}/`, "DELETE") : api(`/${ep}/${id}/`, "PATCH", { is_active: kind === "on" }))),
      kind === "delete" ? "Deleted" : kind === "on" ? "Activated" : "Deactivated");
    setSel(new Set());
  };
  const exportCsv = () => isS
    ? downloadCsv("students.csv", ["Roll", "Name", "Username", "Email", "Phone", "Department", "Year", "Section", "Attendance %", "Status"],
        rows.map(r => [r.roll_number, r.first_name, r.username, r.email, r.phone, r.department_name, r.year, r.section, r.attendance_percent ?? "", r.is_active ? "Active" : "Inactive"]))
    : downloadCsv("faculty.csv", ["Name", "Username", "Email", "Phone", "Designation", "Department", "Subjects", "Status"],
        rows.map(r => [r.first_name, r.username, r.email, r.phone, r.designation, r.department_name, r.subjects.map(s => s.code).join(" "), r.is_active ? "Active" : "Inactive"]));

  return (
    <>
      <div className="mini-stats">
        <div><b>{total}</b><span>Showing</span></div><div><b>{active}</b><span>Active</span></div><div><b>{total - active}</b><span>Inactive</span></div>
        {isS ? <div className={low ? "alert" : ""}><b>{low}</b><span>Below 75%</span></div>
          : <div><b>{rows.reduce((a, r) => a + r.subject_count, 0)}</b><span>Subjects assigned</span></div>}
      </div>

      <div className="toolbar">
        <Search value={q} onChange={setQ} placeholder={isS ? "Search name, roll or username…" : "Search name or username…"} />
        <select value={dept} onChange={e => setDept(e.target.value)}><option value="">All departments</option>{depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        {isS && <>
          <select value={year} onChange={e => setYear(e.target.value)}><option value="">All years</option>{[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}</select>
          <input className="narrow" placeholder="Section" value={sec} onChange={e => setSec(e.target.value.toUpperCase())} maxLength={3} /></>}
        <select value={status} onChange={e => setStatus(e.target.value)}><option value="">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <span className="sp" />
        <button className="soft" onClick={exportCsv} disabled={!rows.length}><Icon n="Download" size={16} />Export</button>
        <button onClick={() => setModal({ add: true })}><Icon n="Plus" size={16} />Add {K.one}</button>
      </div>

      {sel.size > 0 && (
        <div className="bulkbar"><b>{sel.size} selected</b><span className="sp" />
          <button className="soft" onClick={() => bulk("on")}>Activate</button><button className="soft" onClick={() => bulk("off")}>Deactivate</button>
          <button className="danger" onClick={() => bulk("delete")}>Delete</button><button className="ghost-d" onClick={() => setSel(new Set())}>Clear</button></div>)}

      <div className="tw"><table>
        <thead><tr>
          <th className="chk"><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(rows.map(r => r.id)))} aria-label="Select all" /></th>
          {isS ? <><th>Student</th><th>Roll</th><th>Department</th><th>Year / Sec</th><th>Attendance</th></>
            : <><th>Faculty</th><th>Designation</th><th>Department</th><th>Subjects</th></>}
          <th>Status</th><th /></tr></thead>
        <tbody>{loading && !rows.length ? <tr><td colSpan={K.cols}><Loading /></td></tr>
          : rows.length === 0 ? <Empty n={K.cols} text={`No ${ep} match these filters`} /> : rows.map(r => (
          <tr key={r.id} className={`${sel.has(r.id) ? "sel" : ""} ${r.is_active ? "" : "dim"}`}>
            <td className="chk"><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggleSel(r.id)} aria-label={`Select ${r.first_name}`} /></td>
            <td><div className="who"><Avatar name={r.first_name} size="sm" /><div><b>{r.first_name}</b><small>{r.username}{r.email && ` · ${r.email}`}</small></div></div></td>
            {isS ? <>
              <td>{r.roll_number}</td><td>{r.department_name || "—"}</td><td>{r.year}{r.section && ` / ${r.section}`}</td>
              <td>{r.attendance_percent == null ? <span className="muted">No data</span> : <div className="att-cell"><Progress value={r.attendance_percent} /><Pill kind={pc(r.attendance_percent)}>{r.attendance_percent}%</Pill></div>}</td></> : <>
              <td>{r.designation || "—"}</td><td>{r.department_name || "—"}</td>
              <td>{r.subjects.length ? <div className="tags">{r.subjects.map(s => <Pill key={s.id}>{s.code}</Pill>)}</div> : <span className="muted">None</span>}</td></>}
            <td><Pill kind={r.is_active ? "ok" : "bad"}>{r.is_active ? "Active" : "Inactive"}</Pill></td>
            <td className="act">
              {isS ? <button className="icon-btn" title="View profile" onClick={() => setModal({ view: r.id })}><Icon n="Eye" /></button>
                : <button className="icon-btn" title="Assign subjects" onClick={() => setModal({ assign: r })}><Icon n="Subjects" /></button>}
              <button className="icon-btn" title="Edit" onClick={() => setModal({ edit: r })}><Icon n="Edit" /></button>
              <button className="icon-btn" title="Reset password" onClick={() => reset(r)}><Icon n="Key" /></button>
              <button className="icon-btn" title={r.is_active ? "Deactivate" : "Activate"} onClick={() => toggle(r)}><Icon n="Power" /></button>
              <button className="icon-btn bad" title="Delete" onClick={() => del(r)}><Icon n="Trash" /></button></td></tr>))}</tbody>
      </table></div>

      {(modal?.add || modal?.edit) && <PersonForm ep={ep} row={modal.edit} depts={depts} onClose={() => setModal(null)} onSaved={closeReload} />}
      {modal?.view && <StudentDrawer id={modal.view} onClose={() => setModal(null)} onChanged={load} />}
      {modal?.assign && <AssignSubjects fac={modal.assign} onClose={() => setModal(null)} onSaved={closeReload} />}
    </>
  );
}
