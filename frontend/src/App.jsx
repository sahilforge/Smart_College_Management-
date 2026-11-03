import { useEffect, useState } from "react";
import { session } from "./api";
import { Avatar, Icon, UiProvider } from "./ui";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import People from "./pages/People";
import Catalog from "./pages/Catalog";
import Attendance from "./pages/Attendance";
import Marks from "./pages/Marks";
import Assignments from "./pages/Assignments";
import Notices from "./pages/Notices";

const SUB = { Dashboard: "Your campus at a glance", Students: "Enrol, filter, edit and monitor every student", Faculty: "Manage teaching staff and their subjects",
  Subjects: "Courses and who teaches them", Departments: "Academic departments", Attendance: "Mark, correct and review attendance",
  Marks: "Exam scores and results", Assignments: "Tasks, submissions and grades", Notices: "Announcements for the campus" };
const NAV = {
  admin: [["Overview", ["Dashboard"]], ["People", ["Students", "Faculty"]], ["Academics", ["Departments", "Subjects", "Attendance", "Marks", "Assignments"]], ["Communication", ["Notices"]]],
  faculty: [["Teaching", ["Dashboard", "Attendance", "Marks", "Assignments", "Notices"]]],
  student: [["My campus", ["Dashboard", "Attendance","Marks", "Assignments", "Notices"]]],
};

const theme = () => { try { return localStorage.getItem("theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); } catch { return "light"; } };

export default function App() {
  const [s, setS] = useState(session()), [tab, setTab] = useState("Dashboard"), [intent, setIntent] = useState(null);
  const [open, setOpen] = useState(false), [dark, setDark] = useState(theme() === "dark");
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch {} }, [dark]);
  const go = (t, i = null) => { setTab(t); setIntent(i); setOpen(false); scrollTo({ top: 0 }); };
  const logout = () => { localStorage.removeItem("session"); setS(null); setTab("Dashboard"); };

  if (!s) return <Login onLogin={x => { setS(x); setTab("Dashboard"); }} />;
  const role = s.role;
  const pages = {
    Dashboard: <Dashboard role={role} user={s.username} go={go} />,
    Attendance: <Attendance role={role} />, Marks: <Marks role={role} />, Assignments: <Assignments role={role} />, Notices: <Notices role={role} />,
    Students: <People ep="students" intent={intent} />, Faculty: <People ep="faculty" intent={intent} />,
    Subjects: <Catalog ep="subjects" />, Departments: <Catalog ep="departments" />,
  };
  return (
    <UiProvider>
      <div className="app">
        <div className={`scrim ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
        <nav className={open ? "open" : ""}>
          <div className="brand"><span className="logo"><Icon n="Departments" /></span>Smart College</div>
          {NAV[role].map(([group, items]) => (
            <div key={group} className="nav-group"><small>{group}</small>
              {items.map(n => <button key={n} className={n === tab ? "on" : ""} onClick={() => go(n)}><Icon n={n} />{n}</button>)}</div>))}
          <div className="sp" />
          <button className="out" onClick={logout}><Icon n="Logout" />Logout</button>
        </nav>
        <main>
          <header className="top">
            <button className="icon-btn menu" onClick={() => setOpen(true)} aria-label="Menu"><Icon n="Menu" /></button>
            <div className="grow"><h1>{tab}</h1><p>{SUB[tab]}</p></div>
            <button className="icon-btn round" onClick={() => setDark(!dark)} title="Toggle dark mode" aria-label="Toggle theme"><Icon n={dark ? "Sun" : "Moon"} /></button>
            <div className="chip"><Avatar name={s.username} /><div><b>{s.username}</b><small>{role}</small></div></div>
          </header>
          <div key={tab} className="page">{pages[tab]}</div>
        </main>
      </div>
    </UiProvider>
  );
}
