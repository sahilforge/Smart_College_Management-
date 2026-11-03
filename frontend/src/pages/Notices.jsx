import { useState } from "react";
import { api } from "../api";
import { Card, Field, Icon, Modal, Pill, useLoad, useUi } from "../ui";

export default function Notices({ role }) {
  const [rows, load] = useLoad("/notices/"), { toast, confirm } = useUi();
  const [f, setF] = useState(null);
  const admin = role === "admin";
  const save = async e => {
    e.preventDefault();
    try { await api(f.id ? `/notices/${f.id}/` : "/notices/", f.id ? "PATCH" : "POST", { title: f.title, body: f.body, audience: f.audience }); toast("Notice saved"); setF(null); load(); }
    catch (x) { toast(x.message, "bad"); }
  };
  const del = async n => { if (await confirm(`Delete "${n.title}"?`, { label: "Delete" })) { await api(`/notices/${n.id}/`, "DELETE"); toast("Deleted"); load(); } };
  return (
    <>
      {admin && <div className="toolbar"><span className="sp" /><button onClick={() => setF({ title: "", body: "", audience: "all" })}><Icon n="Plus" size={16} />New notice</button></div>}
      {rows.length === 0 && <Card><p className="muted center">No notices yet.</p></Card>}
      <div className="notice-grid">{rows.map(n => (
        <Card key={n.id} className="notice">
          <div className="card-hd"><h3>{n.title}</h3><Pill kind="info">{n.audience === "all" ? "Everyone" : n.audience === "faculty" ? "Faculty" : "Students"}</Pill></div>
          <p>{n.body || <span className="muted">No details.</span>}</p>
          <div className="notice-ft"><small className="muted">{new Date(n.created_at).toLocaleString()}{n.created_by_name && ` · ${n.created_by_name}`}</small>
            {admin && <span><button className="icon-btn" onClick={() => setF(n)} title="Edit"><Icon n="Edit" /></button><button className="icon-btn bad" onClick={() => del(n)} title="Delete"><Icon n="Trash" /></button></span>}</div>
        </Card>))}</div>
      {f && (
        <Modal small title={f.id ? "Edit notice" : "New notice"} onClose={() => setF(null)}>
          <form className="stack" onSubmit={save}>
            <Field label="Title"><input required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field>
            <Field label="Details"><textarea rows={4} value={f.body} onChange={e => setF({ ...f, body: e.target.value })} /></Field>
            <Field label="Visible to"><select value={f.audience} onChange={e => setF({ ...f, audience: e.target.value })}>
              <option value="all">Everyone</option><option value="faculty">Faculty only</option><option value="student">Students only</option></select></Field>
            <div className="modal-ft"><button type="button" className="soft" onClick={() => setF(null)}>Cancel</button><button>Publish</button></div>
          </form>
        </Modal>)}
    </>
  );
}
