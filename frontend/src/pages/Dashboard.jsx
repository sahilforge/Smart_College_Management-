import { Avatar, Card, Icon, Pill, Progress, Ring, fmtDate, pc, useLoad } from "../ui";
import { Campus } from "./Login";

const STAT = { "My Subjects": "Subjects", "Total Students": "Students", "Pending Grading": "Assignments", "Attendance %": "Attendance",
  "Average Marks %": "Marks", "Assignments Submitted": "Assignments", "Overall Attendance %": "Attendance", Submissions: "Assignments" };
const LINK = { Students: "Students", Faculty: "Faculty", Subjects: "Subjects", Departments: "Departments", "Overall Attendance %": "Attendance",
  Assignments: "Assignments", Submissions: "Assignments", "Average Marks %": "Marks" };

function Trend({ data }) {
  const W = 600, H = 200, L = 34, R = 12, T = 14, B = 28, n = data.length;
  const x = i => L + (i * (W - L - R)) / Math.max(1, n - 1), y = v => T + (1 - v / 100) * (H - T - B);
  const pts = data.map((d, i) => d.percent == null ? null : [x(i), y(d.percent), d]).filter(Boolean);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ");
  const area = pts.length ? `${line} L${pts.at(-1)[0]} ${y(0)} L${pts[0][0]} ${y(0)} Z` : "";
  return (
    <svg className="trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Attendance trend, last 14 days">
      <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--p)" stopOpacity=".28" /><stop offset="1" stopColor="var(--p)" stopOpacity="0" /></linearGradient></defs>
      {[0, 25, 50, 75, 100].map(v => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid-l" /><text x={L - 8} y={y(v) + 4} textAnchor="end" className="axis">{v}</text></g>)}
      {data.map((d, i) => i % 2 === 0 && <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" className="axis">{d.date.slice(8)}/{d.date.slice(5, 7)}</text>)}
      <path d={area} fill="url(#tg)" /><path d={line} className="trend-line" />
      {pts.map(([cx, cy, d]) => <circle key={d.date} cx={cx} cy={cy} r="4" className="trend-dot"><title>{fmtDate(d.date)}: {d.percent}% ({d.total} records)</title></circle>)}
    </svg>
  );
}

const BarRow = ({ label, value, max = 100, text, kind }) => (
  <div className="barrow"><span className="bl" title={label}>{label}</span>
    <div className="prog"><i className={kind || pc(value)} style={{ width: Math.min(100, (100 * (value || 0)) / max) + "%" }} /></div><b>{text ?? value + "%"}</b></div>
);

function AdminDash({ go }) {
  const [a] = useLoad("/analytics/", null);
  if (!a) return null;
  const maxStu = Math.max(1, ...a.departments.map(d => d.students));
  const attn = [];
  if (a.unassigned_subjects) attn.push([`${a.unassigned_subjects} subject${a.unassigned_subjects > 1 ? "s" : ""} without a faculty`, "Subjects"]);
  if (a.inactive.students) attn.push([`${a.inactive.students} inactive student account${a.inactive.students > 1 ? "s" : ""}`, "Students"]);
  if (a.inactive.faculty) attn.push([`${a.inactive.faculty} inactive faculty account${a.inactive.faculty > 1 ? "s" : ""}`, "Faculty"]);
  if (a.low_attendance.length) attn.push([`${a.low_attendance.length}+ student${a.low_attendance.length > 1 ? "s" : ""} below 75% attendance`, "Attendance"]);
  return (
    <div className="dash-grid">
      <Card title="Attendance — last 14 days" className="span2"
        action={<button className="soft sm" onClick={() => go("Attendance")}>Open attendance</button>}><Trend data={a.trend} /></Card>
      <Card title="Needs attention">
        {attn.length === 0 ? <p className="muted">All clear — nothing needs your attention.</p> :
          <ul className="attn">{attn.map(([t, tab]) => <li key={t} onClick={() => go(tab)}><Icon n="Alert" />{t}<Icon n="Right" size={16} /></li>)}</ul>}
      </Card>
      <Card title="Departments">
        {a.departments.map(d => <BarRow key={d.name} label={d.name} value={d.students} max={maxStu} kind="info" text={`${d.students} stu · ${d.faculty} fac`} />)}
      </Card>
      <Card title="Attendance by subject">
        {a.by_subject.length ? a.by_subject.map(s => <BarRow key={s.subject} label={s.subject} value={s.percent} />) : <p className="muted">No attendance recorded yet.</p>}
      </Card>
      <Card title="Faculty workload">
        {a.workload.map(w => <BarRow key={w.name} label={w.name} value={w.subjects} max={Math.max(3, ...a.workload.map(x => x.subjects))} kind="info" text={`${w.subjects} subject${w.subjects === 1 ? "" : "s"}`} />)}
      </Card>
      <Card title="Low attendance watch-list" className="span2" action={<Pill kind="bad">under 75%</Pill>}>
        {a.low_attendance.length === 0 ? <p className="muted">Everyone is above 75%.</p> :
          <div className="watch">{a.low_attendance.map(s => (
            <div key={s.student} className="watch-i"><Avatar name={s.name} /><div><b>{s.name}</b><small>{s.roll}</small></div><Pill kind={pc(s.percent)}>{s.percent}%</Pill></div>))}</div>}
      </Card>
      <Card title="Latest notices" action={<button className="soft sm" onClick={() => go("Notices")}>Manage</button>}><NoticeList items={a.notices} /></Card>
    </div>
  );
}

export const NoticeList = ({ items }) => items?.length ? (
  <ul className="notices">{items.map(n => (
    <li key={n.id}><div><b>{n.title}</b><Pill kind="info">{n.audience === "all" ? "Everyone" : n.audience}</Pill></div>
      {n.body && <p>{n.body}</p>}<small>{new Date(n.created_at).toLocaleDateString()}</small></li>))}</ul>
) : <p className="muted">No notices posted.</p>;

function OtherDash({ role }) {
  const [n] = useLoad("/notices/");
  const [s] = useLoad(role === "student" ? "/attendance/summary/" : null, {});
  return (
    <div className="dash-grid">
      {role === "student" && <Card title="Attendance by subject" className="span2"><div className="ring-row"><Ring value={s.overall} size={120} label="overall" />
        <div className="grow">{(s.subjects || []).map(x => <BarRow key={x.subject} label={x.subject} value={x.percent} />)}</div></div></Card>}
      <Card title="Notices" className={role === "student" ? "" : "span3"}><NoticeList items={n.slice(0, 5)} /></Card>
    </div>
  );
}

export default function Dashboard({ role, user, go }) {
  const [d] = useLoad(`/dashboard/${role}/`, {});
  return (
    <>
      <div className="hero">
        <div><h2>Welcome back, {user}!</h2><p>Here's what's happening on campus today.</p>
          {role !== "student" && <div className="hero-actions">
            <button className="light" onClick={() => go("Attendance")}><Icon n="Attendance" size={16} />Mark attendance</button>
            {role === "admin" && <><button className="ghost" onClick={() => go("Students", "add")}><Icon n="Plus" size={16} />Add student</button>
              <button className="ghost" onClick={() => go("Faculty", "add")}><Icon n="Plus" size={16} />Add faculty</button></>}
          </div>}
        </div>
        <Campus />
      </div>
      <div className="stats">{Object.entries(d).map(([k, v], i) => (
        <button className="card stat" key={k} onClick={() => LINK[k] && go(LINK[k])}>
          <span className={`tile c${i % 4}`}><Icon n={STAT[k] || k} /></span><div><b>{v}</b><span>{k}</span></div></button>
      ))}</div>
      {role === "admin" ? <AdminDash go={go} /> : <OtherDash role={role} />}
    </>
  );
}
