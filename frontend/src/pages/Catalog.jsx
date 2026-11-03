import { useState } from "react";
import { api } from "../api";
import { Empty, Field, Icon, Loading, Modal, Pill, Search, useDebounced, useLoad, useUi } from "../ui";

const CFG = {
  departments: {
    one: "department", cols: ["Department", "Students", "Faculty", "Subjects"],
    blank: { name: "" }, fields: [["name", "Department name"]],
    cells: r => [<b>{r.name}</b>, r.student_count, r.faculty_count, r.subject_count],
    warn: r => `Delete the ${r.name} department? Its subjects (${r.subject_count}) and their attendance, marks and assignments are deleted too. Students and faculty stay but lose their department.`,
  },
  subjects: {
    one: "subject", cols: ["Code", "Subject", "Department", "Faculty", "Students"],
    blank: { name: "", code: "", department: "", faculty: "" },
    fields: [["name", "Subject name"], ["code", "Code"], ["department", "Department", "dept"], ["faculty", "Faculty", "faculty"]],
    cells: r => [<Pill>{r.code}</Pill>, <b>{r.name}</b>, r.department_name, r.faculty_name || <Pill kind="warn">Unassigned</Pill>, r.student_count],
    warn: r => `Delete ${r.name}? Its attendance, marks and assignments are deleted with it.`,
  },
};

function Form({ ep, row, onClose, onSaved }) {
  const C = CFG[ep], { toast } = useUi();
  const [f, setF] = useState(row ? { ...C.blank, ...row, faculty: row.faculty ?? "" } : C.blank), [err, setErr] = useState("");
  const [depts] = useLoad("/departments/"), [facs] = useLoad("/faculty/?status=active");
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async e => {
    e.preventDefault(); setErr("");
    const body = Object.fromEntries(C.fields.map(([k]) => [k, f[k] === "" ? null : f[k]]).filter(([k, v]) => v !== null || k === "faculty"));
    try { await api(row ? `/${ep}/${row.id}/` : `/${ep}/`, row ? "PATCH" : "POST", body); toast("Saved"); onSaved(); }
    catch (x) { setErr(x.message); }
  };
  return (
    <Modal small title={row ? `Edit ${C.one}` : `Add ${C.one}`} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        {C.fields.map(([k, label, t]) => (
          <Field key={k} label={label}>
            {t === "dept" ? <select required value={f[k] ?? ""} onChange={set(k)}><option value="">— Select —</option>{depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
              : t === "faculty" ? <select value={f[k] ?? ""} onChange={set(k)}><option value="">Unassigned</option>{facs.map(d => <option key={d.id} value={d.id}>{d.first_name} ({d.department_name || "—"})</option>)}</select>
              : <input required value={f[k] ?? ""} onChange={set(k)} />}
          </Field>))}
        {err && <p className="err">{err}</p>}
        <div className="modal-ft"><button type="button" className="soft" onClick={onClose}>Cancel</button><button>Save</button></div>
      </form>
    </Modal>
  );
}

export default function Catalog({ ep }) {
  const C = CFG[ep], { toast, confirm } = useUi();
  const [q, setQ] = useState(""), [modal, setModal] = useState(null), dq = useDebounced(q);
  const [rows, load, loading] = useLoad(`/${ep}/?search=${encodeURIComponent(dq)}`);
  const del = async r => {
    if (!(await confirm(C.warn(r), { title: `Delete ${C.one}`, label: "Delete" }))) return;
    try { await api(`/${ep}/${r.id}/`, "DELETE"); toast("Deleted"); load(); } catch (x) { toast(x.message, "bad"); }
  };
  return (
    <>
      <div className="toolbar"><Search value={q} onChange={setQ} /><Pill>{rows.length} total</Pill><span className="sp" />
        <button onClick={() => setModal({})}><Icon n="Plus" size={16} />Add {C.one}</button></div>
      <div className="tw"><table>
        <thead><tr>{C.cols.map(c => <th key={c}>{c}</th>)}<th /></tr></thead>
        <tbody>{loading && !rows.length ? <tr><td colSpan={C.cols.length + 1}><Loading /></td></tr>
          : rows.length === 0 ? <Empty n={C.cols.length + 1} /> : rows.map(r => (
          <tr key={r.id}>{C.cells(r).map((c, i) => <td key={i}>{c}</td>)}
            <td className="act"><button className="icon-btn" title="Edit" onClick={() => setModal({ row: r })}><Icon n="Edit" /></button>
              <button className="icon-btn bad" title="Delete" onClick={() => del(r)}><Icon n="Trash" /></button></td></tr>))}</tbody>
      </table></div>
      {modal && <Form ep={ep} row={modal.row} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </>
  );
}
