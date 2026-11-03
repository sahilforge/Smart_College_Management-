import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { Avatar, Card, Empty, Field, Icon, Loading, Modal, Pill, Progress, Ring, Search, Segmented, Tabs, daysAgo, downloadCsv, fmtDate, pc, today, useLoad, useUi } from "../ui";

/* ---------- Mark / edit a whole class for one day ---------- */
function Sheet({ preset }) {
  const [subjects] = useLoad("/subjects/"), { toast, confirm } = useUi();
  const [sid, setSid] = useState(preset?.subject || ""), [date, setDate] = useState(preset?.date || today());
  const [rows, setRows] = useState([]), [marked, setMarked] = useState(false), [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(false), [q, setQ] = useState("");

  useEffect(() => {
    if (!sid || !date) { setRows([]); return; }
    let live = true; setLoading(true);
    api(`/attendance/sheet/?subject=${sid}&date=${date}`)
      .then(d => { if (live) { setMarked(d.marked); setRows(d.students.map(s => ({ ...s, fresh: s.present == null, present: s.present ?? true }))); setDirty(false); } })
      .catch(e => toast(e.message, "bad")).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [sid, date]); // eslint-disable-line

  const guard = async fn => { if (!dirty || (await confirm("You have unsaved changes. Discard them?", { title: "Unsaved changes", label: "Discard" }))) fn(); };
  const shift = n => guard(() => { const d = new Date(date + "T00:00:00"); d.setDate(d.getDate() + n); const v = d.toISOString().slice(0, 10); if (v <= today()) setDate(v); });
  const patch = (id, o) => { setRows(rows.map(r => r.student === id ? { ...r, ...o } : r)); setDirty(true); };
  const setAll = v => { setRows(rows.map(r => ({ ...r, present: v }))); setDirty(true); };
  const present = rows.filter(r => r.present).length, pct = rows.length ? Math.round((100 * present) / rows.length) : null;
  const shown = rows.filter(r => (r.name + r.roll).toLowerCase().includes(q.toLowerCase()));

  const save = async () => {
    setBusy(true);
    try {
      await api("/attendance/bulk/", "POST", { subject: sid, date, records: rows.map(r => ({ student: r.student, present: r.present, remark: r.remark || "" })) });
      toast(marked ? "Attendance updated" : "Attendance saved"); setMarked(true); setDirty(false);
      setRows(rows.map(r => ({ ...r, fresh: false })));
    } catch (x) { toast(x.message, "bad"); }
    setBusy(false);
  };

  return (
    <Card>
      <div className="toolbar tight">
        <select value={sid} onChange={e => guard(() => setSid(e.target.value))}><option value="">Select subject…</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}</select>
        <div className="datenav">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous day"><Icon n="Left" /></button>
          <input type="date" value={date} max={today()} onChange={e => e.target.value && guard(() => setDate(e.target.value))} />
          <button className="icon-btn" onClick={() => shift(1)} disabled={date >= today()} aria-label="Next day"><Icon n="Right" /></button>
        </div>
        {rows.length > 0 && <Search value={q} onChange={setQ} placeholder="Find student…" />}
      </div>

      {!sid ? <p className="muted center pad">Choose a subject and date to mark or correct attendance.</p>
        : loading ? <Loading /> : rows.length === 0 ? <p className="muted center pad">No active students in this subject's department.</p> : (
        <>
          <div className={`banner ${marked ? "edit" : "new"}`}>
            <Icon n={marked ? "Edit" : "Plus"} />
            <span>{marked ? <>Attendance for <b>{fmtDate(date)}</b> is already saved — you are <b>editing</b> it.</> : <>Attendance for <b>{fmtDate(date)}</b> is not marked yet. Everyone starts as present.</>}</span>
          </div>
          <div className="sheet-sum">
            <Ring value={pct} size={72} />
            <div><b>{present}</b><span>Present</span></div><div><b className="neg">{rows.length - present}</b><span>Absent</span></div><div><b className="tot">{rows.length}</b><span>Total</span></div>
            <span className="sp" />
            <button className="soft" onClick={() => setAll(true)}>All present</button><button className="soft" onClick={() => setAll(false)}>All absent</button>
          </div>
          <div className="roster">{shown.map(r => (
            <div key={r.student} className={`rrow ${r.present ? "" : "abs"}`}>
              <Avatar name={r.name} size="sm" />
              <div className="grow"><b>{r.name}</b><small>{r.roll}{r.section && ` · Sec ${r.section}`}{r.fresh && marked && " · new"}{r.updated_by && ` · last edit by ${r.updated_by}`}</small></div>
              <input className="remark" placeholder="Remark (optional)" maxLength={120} value={r.remark || ""} onChange={e => patch(r.student, { remark: e.target.value })} />
              <Segmented value={r.present} onChange={v => patch(r.student, { present: v })} />
            </div>))}</div>
          <div className="savebar"><span className="muted">{dirty ? "Unsaved changes" : marked ? "All changes saved" : ""}</span>
            <button disabled={busy || (marked && !dirty)} onClick={save}><Icon n="Check" size={16} />{marked ? "Update attendance" : "Save attendance"}</button></div>
        </>)}
    </Card>
  );
}

/* ---------- Edit one record ---------- */
function EditRecord({ rec, onClose, onSaved }) {
  const [f, setF] = useState({ present: rec.present, remark: rec.remark || "" }), { toast } = useUi();
  const save = async e => {
    e.preventDefault();
    try { await api(`/attendance/${rec.id}/`, "PATCH", f); toast("Record updated"); onSaved(); } catch (x) { toast(x.message, "bad"); }
  };
  return (
    <Modal small title="Edit attendance record" onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <p className="muted"><b>{rec.student_name}</b> ({rec.student_roll}) · {rec.subject_name} · {fmtDate(rec.date)}</p>
        <Field label="Status"><Segmented value={f.present} onChange={v => setF({ ...f, present: v })} /></Field>
        <Field label="Remark"><input value={f.remark} maxLength={120} placeholder="e.g. medical leave" onChange={e => setF({ ...f, remark: e.target.value })} /></Field>
        <div className="modal-ft"><button type="button" className="soft" onClick={onClose}>Cancel</button><button>Save</button></div>
      </form>
    </Modal>
  );
}

/* ---------- Searchable history, with fixes ---------- */
function Records({ readOnly }) {
  const [subjects] = useLoad("/subjects/"), { toast, confirm } = useUi();
  const [sid, setSid] = useState(""), [from, setFrom] = useState(daysAgo(7)), [to, setTo] = useState(today()), [st, setSt] = useState(""), [q, setQ] = useState("");
  const [rows, load, loading] = useLoad(`/attendance/?subject=${sid}&date_from=${from}&date_to=${to}&present=${st}`);
  const [edit, setEdit] = useState(null);
  const shown = useMemo(() => rows.filter(r => (r.student_name + r.student_roll).toLowerCase().includes(q.toLowerCase())), [rows, q]);
  const flip = async r => { try { await api(`/attendance/${r.id}/`, "PATCH", { present: !r.present }); load(); } catch (x) { toast(x.message, "bad"); } };
  const del = async r => { if (await confirm(`Delete ${r.student_name}'s record for ${fmtDate(r.date)}?`, { label: "Delete" })) { await api(`/attendance/${r.id}/`, "DELETE"); toast("Record deleted"); load(); } };
  return (
    <>
      <div className="toolbar">
        {!readOnly && <Search value={q} onChange={setQ} placeholder="Student name or roll…" />}
        <select value={sid} onChange={e => setSid(e.target.value)}><option value="">All subjects</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="From" /><input type="date" value={to} onChange={e => setTo(e.target.value)} aria-label="To" />
        <select value={st} onChange={e => setSt(e.target.value)}><option value="">Any status</option><option value="1">Present</option><option value="0">Absent</option></select>
        <span className="sp" />
        <button className="soft" disabled={!shown.length} onClick={() => downloadCsv("attendance.csv", ["Date", "Roll", "Student", "Subject", "Status", "Remark"],
          shown.map(r => [r.date, r.student_roll, r.student_name, r.subject_name, r.present ? "Present" : "Absent", r.remark]))}><Icon n="Download" size={16} />Export</button>
      </div>
      <div className="tw"><table>
        <thead><tr><th>Date</th>{!readOnly && <><th>Roll</th><th>Student</th></>}<th>Subject</th><th>Status</th><th>Remark</th>{!readOnly && <><th>Last edited</th><th /></>}</tr></thead>
        <tbody>{loading && !rows.length ? <tr><td colSpan={8}><Loading /></td></tr> : shown.length === 0 ? <Empty n={8} text="No records in this range" /> : shown.slice(0, 200).map(r => (
          <tr key={r.id}><td>{fmtDate(r.date)}</td>{!readOnly && <><td>{r.student_roll}</td><td>{r.student_name}</td></>}<td>{r.subject_name}</td>
            <td>{readOnly ? <Pill kind={r.present ? "ok" : "bad"}>{r.present ? "Present" : "Absent"}</Pill>
              : <button className={`pill ${r.present ? "ok" : "bad"} click`} title="Click to flip" onClick={() => flip(r)}>{r.present ? "Present" : "Absent"}</button>}</td>
            <td className="muted">{r.remark || "—"}</td>
            {!readOnly && <><td className="muted">{r.updated_by_name || "—"}</td><td className="act">
              <button className="icon-btn" title="Edit" onClick={() => setEdit(r)}><Icon n="Edit" /></button>
              <button className="icon-btn bad" title="Delete" onClick={() => del(r)}><Icon n="Trash" /></button></td></>}</tr>))}</tbody>
      </table>{shown.length > 200 && <p className="muted center pad">Showing the first 200 of {shown.length} records — narrow the filters or export the full list.</p>}</div>
      {edit && <EditRecord rec={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </>
  );
}

/* ---------- Subject-wise overview (all roles) ---------- */
function Overview() {
  const [d, , loading] = useLoad("/attendance/summary/", {}), rows = d.subjects || [];
  return (
    <div className="tw"><table>
      <thead><tr><th>Subject</th><th>Present</th><th>Total</th><th>Progress</th><th>%</th></tr></thead>
      <tbody>{loading && !rows.length ? <tr><td colSpan={5}><Loading /></td></tr> : rows.length === 0 ? <Empty n={5} /> : rows.map(r => (
        <tr key={r.subject}><td><b>{r.subject}</b></td><td>{r.present}</td><td>{r.total}</td><td><Progress value={r.percent} /></td><td><Pill kind={pc(r.percent)}>{r.percent}%</Pill></td></tr>))}</tbody>
      <tfoot><tr><th colSpan="4">Overall</th><th><Pill kind={pc(d.overall)}>{d.overall ?? 0}%</Pill></th></tr></tfoot>
    </table></div>
  );
}

/* ---------- Shortage list ---------- */
function Low({ onFix }) {
  const [th, setTh] = useState(75), [rows, , loading] = useLoad(`/attendance/low/?threshold=${th}`);
  return (
    <>
      <div className="toolbar"><Field label="Show students below"><div className="inline"><input type="number" min="1" max="100" value={th} onChange={e => setTh(e.target.value || 75)} className="narrow" /><span>%</span></div></Field>
        <span className="sp" /><button className="soft" disabled={!rows.length} onClick={() => downloadCsv("low-attendance.csv", ["Roll", "Student", "Department", "Present", "Total", "%"], rows.map(r => [r.roll, r.name, r.department, r.present, r.total, r.percent]))}><Icon n="Download" size={16} />Export</button></div>
      <div className="tw"><table>
        <thead><tr><th>Student</th><th>Roll</th><th>Department</th><th>Present / Total</th><th>%</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={5}><Loading /></td></tr> : rows.length === 0 ? <Empty n={5} text={`No one is below ${th}% 🎉`} /> : rows.map(r => (
          <tr key={r.student}><td><div className="who"><Avatar name={r.name} size="sm" /><b>{r.name}</b></div></td><td>{r.roll}</td><td>{r.department}</td><td>{r.present} / {r.total}</td>
            <td><Pill kind={pc(r.percent)}>{r.percent}%</Pill></td></tr>))}</tbody>
      </table></div>
    </>
  );
}

export default function Attendance({ role }) {
  const [tab, setTab] = useState(role === "student" ? "overview" : "mark");
  if (role === "student") return (<><Tabs value={tab} onChange={setTab} tabs={[["overview", "Overview", "Dashboard"], ["records", "My records", "Attendance"]]} />{tab === "overview" ? <Overview /> : <Records readOnly />}</>);
  return (
    <>
      <Tabs value={tab} onChange={setTab} tabs={[["mark", "Mark / Edit", "Edit"], ["records", "Records", "Attendance"], ["overview", "Overview", "Dashboard"], ["low", "Low attendance", "Alert"]]} />
      {tab === "mark" && <Sheet />}{tab === "records" && <Records />}{tab === "overview" && <Overview />}{tab === "low" && <Low />}
    </>
  );
}
