// Bad fixture for the build scorer (bare condition): a type error (a number where a string is required).
import { useState } from "react";

export default function TypeError() {
  const [name, setName] = useState("Ada");
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--page)",
        color: "var(--text)",
      }}
    >
      <button type="button" onClick={() => setName(42)}>
        {name}
      </button>
    </main>
  );
}
