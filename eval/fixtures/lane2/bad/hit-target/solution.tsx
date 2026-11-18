// Bad fixture for the hit-target scorer (bare condition): a 20x20 icon button with no larger hit area.
import "./solution.css";

export default function TinyTarget() {
  return (
    <main className="page">
      <button type="button" className="tiny" aria-label="Close">
        ×
      </button>
    </main>
  );
}
