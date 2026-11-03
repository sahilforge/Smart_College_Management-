import { useEffect, useState } from "react";
import { api } from "../api";
import { Empty, Icon, Loading, Pill, downloadCsv, pc, useLoad, useUi } from "../ui";

export default function Marks({ role }) {
  const [subjects] = useLoad("/subjects/"), { toast, confirm } = useUi(), staff = role !== "student";
  const [sid, setSid] = useState(""), [rows, load, loading] = useLoad(`/marks/?subject=${sid}`);
  const [students, setStudents] = useState([]);
  const blank = { student: "", exam: "", score: "", max_score: 100 };
  const [f, setF] = useState(blank);
  useEffect(() => {
    const s = subjects.find(x => x.id == sid);
    setStudents([]); setF(blank);
    if (staff && s?.department) api(`/students/?department=${s.department}&status=active`).then(setStudents);
  }, [sid, subjects]); // eslint-disable-line
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const add = async e => {
    e.preventDefault();
    try { await api(f.id ? `/marks/${f.id}/` : "/marks/", f.id ? "PATCH" : "POST", { student: f.student, exam: f.exam, score: f.score, max_score: f.max_score, subject: sid });
      toast(f.id ? "Marks updated" : "Marks saved"); setF({ ...f, id: undefined, score: "" }); load(); } catch (x) { toast(x.message, "bad"); }
  };
  const del = async r => { if (await confirm(`Delete ${r.student_name}'s ${r.exam} marks?`, { label: "Delete" })) { await api(`/marks/${r.id}/`, "DELETE"); toast("Deleted"); load(); } };
  return (
    <>
      <div className="toolbar"><select value={sid} onChange={e => setSid(e.target.value)}>
        <option value="">{staff ? "Select subject to add marks" : "All subjects"}</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <span className="sp" /><button className="soft" disabled={!rows.length} onClick={() => downloadCsv("marks.csv", ["Subject", "Roll", "Student", "Exam", "Score", "Max"], rows.map(r => [r.subject_name, r.student_roll, r.student_name, r.exam, r.score, r.max_score]))}><Icon n="Download" size={16} />Export</button></div>
      {staff && sid && (
        <form className="card grid" onSubmit={add}>
          <select required value={f.student} onChange={set("student")}><option value="">Student</option>{students.map(s => <option key={s.id} value={s.id}>{s.roll_number} — {s.first_name}</option>)}</select>
          <input required placeholder="Exam (e.g. Mid 1)" value={f.exam} onChange={set("exam")} />
          <input required type="number" step="any" min="0" placeholder="Score" value={f.score} onChange={set("score")} />
          <input required type="number" min="1" placeholder="Max" value={f.max_score} onChange={set("max_score")} />
          <div className="row"><button>{f.id ? "Update" : "Save"}</button>{f.id && <button type="button" className="soft" onClick={() => setF(blank)}>Cancel</button>}</div>
        </form>)}
      <div className="tw"><table>
        <thead><tr><th>Subject</th><th>Roll</th><th>Student</th><th>Exam</th><th>Score</th>{staff && <th />}</tr></thead>
        <tbody>{loading && !rows.length ? <tr><td colSpan={6}><Loading /></td></tr> : rows.length === 0 ? <Empty n={6} /> : rows.map(r => (
          <tr key={r.id}><td>{r.subject_name}</td><td>{r.student_roll}</td><td>{r.student_name}</td><td>{r.exam}</td>
            <td><Pill kind={pc((100 * r.score) / r.max_score)}>{r.score}/{r.max_score}</Pill></td>
            {staff && <td className="act"><button className="icon-btn" title="Edit" onClick={() => { setSid(String(r.subject)); setF({ id: r.id, student: r.student, exam: r.exam, score: r.score, max_score: r.max_score }); scrollTo({ top: 0, behavior: "smooth" }); }}><Icon n="Edit" /></button>
              <button className="icon-btn bad" title="Delete" onClick={() => del(r)}><Icon n="Trash" /></button></td>}</tr>))}</tbody>
      </table></div>
    </>
  );
}
