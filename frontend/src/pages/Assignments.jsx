import { useState } from "react";
import { api } from "../api";
import { Card, Empty, Field, Icon, Modal, Pill, fmtDate, useLoad, useUi } from "../ui";

export default function Assignments({ role }) {
  const blank = { subject: "", title: "", description: "", due_date: "" }, staff = role !== "student", { toast, confirm } = useUi();
  const [subjects] = useLoad("/subjects/"), [rows, load] = useLoad("/assignments/"), [subs, loadSubs] = useLoad("/submissions/");
  const [f, setF] = useState(blank), [ans, setAns] = useState({}), [g, setG] = useState(null);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const wrap = async (fn, ok) => { try { await fn(); toast(ok); } catch (x) { toast(x.message, "bad"); } };
  const add = e => { e.preventDefault(); wrap(async () => { await api("/assignments/", "POST", f); setF(blank); load(); }, "Assignment posted"); };
  const submit = a => wrap(async () => { await api("/submissions/", "POST", { assignment: a.id, answer: ans[a.id] || "" }); loadSubs(); }, "Submitted");
  const grade = e => { e.preventDefault(); wrap(async () => { await api(`/submissions/${g.id}/`, "PATCH", { grade: g.grade }); setG(null); loadSubs(); }, "Grade saved"); };
  const del = async a => { if (await confirm(`Delete "${a.title}" and its submissions?`, { label: "Delete" })) wrap(async () => { await api(`/assignments/${a.id}/`, "DELETE"); load(); loadSubs(); }, "Deleted"); };
  const mine = id => subs.find(s => s.assignment === id);
  return (
    <>
      {staff && (
        <form className="card grid" onSubmit={add}>
          <Field label="Subject"><select required value={f.subject} onChange={set("subject")}><option value="">Select…</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Title"><input required value={f.title} onChange={set("title")} /></Field>
          <Field label="Description"><input value={f.description} onChange={set("description")} /></Field>
          <Field label="Due date"><input required type="date" value={f.due_date} onChange={set("due_date")} /></Field>
          <button><Icon n="Plus" size={16} />Post</button>
        </form>)}
      {rows.length === 0 && <Card><p className="muted center">No assignments yet.</p></Card>}
      <div className="assign-grid">{rows.map(a => {
        const s = mine(a.id);
        return (
          <Card key={a.id} className="as">
            <div className="card-hd"><h3>{a.title}</h3>{staff && <button className="icon-btn bad" title="Delete" onClick={() => del(a)}><Icon n="Trash" /></button>}</div>
            <div className="tags"><Pill>{a.subject_name}</Pill><Pill kind="warn">Due {fmtDate(a.due_date)}</Pill></div>
            <p>{a.description || <span className="muted">No description.</span>}</p>
            {role === "student" && (s
              ? <Pill kind={s.grade != null ? "ok" : "info"}>{s.grade != null ? `Graded: ${s.grade}` : "Submitted — awaiting grade"}</Pill>
              : <div className="row"><input placeholder="Your answer" value={ans[a.id] || ""} onChange={e => setAns({ ...ans, [a.id]: e.target.value })} /><button onClick={() => submit(a)}>Submit</button></div>)}
          </Card>);
      })}</div>
      {staff && (
        <>
          <h3 className="section-t">Submissions</h3>
          <div className="tw"><table>
            <thead><tr><th>Assignment</th><th>Roll</th><th>Answer</th><th>Grade</th><th /></tr></thead>
            <tbody>{subs.length === 0 ? <Empty n={5} /> : subs.map(s => <tr key={s.id}><td>{s.assignment_title}</td><td>{s.student_roll}</td><td>{s.answer}</td>
              <td><Pill kind={s.grade != null ? "ok" : "warn"}>{s.grade ?? "Pending"}</Pill></td>
              <td className="act"><button className="soft sm" onClick={() => setG({ ...s, grade: s.grade ?? "" })}>Grade</button></td></tr>)}</tbody>
          </table></div>
        </>)}
      {g && (
        <Modal small title="Grade submission" onClose={() => setG(null)}>
          <form className="stack" onSubmit={grade}>
            <p className="muted"><b>{g.student_roll}</b> · {g.assignment_title}</p><p className="quote">{g.answer || "(no answer text)"}</p>
            <Field label="Grade"><input autoFocus required type="number" step="any" value={g.grade} onChange={e => setG({ ...g, grade: e.target.value })} /></Field>
            <div className="modal-ft"><button type="button" className="soft" onClick={() => setG(null)}>Cancel</button><button>Save grade</button></div>
          </form>
        </Modal>)}
    </>
  );
}
