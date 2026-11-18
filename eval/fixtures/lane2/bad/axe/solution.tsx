// Bad fixture for the axe scorer (bare condition): the status line is --layer-2 on --page, far under 4.5:1.
import "./solution.css";

export default function LowContrast() {
  return (
    <main className="page">
      <h1>Crew</h1>
      <p className="faint">Leads the docking checklist.</p>
    </main>
  );
}
