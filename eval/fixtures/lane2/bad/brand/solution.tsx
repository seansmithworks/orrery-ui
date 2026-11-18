// Bad fixture for the brand scorer (bare condition): hard-coded colours, so the page looks the same in every brand.
export default function HardCoded() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 32,
        background: "#ffffff",
        color: "#1d1d1f",
        fontFamily: "system-ui",
      }}
    >
      <h1>Crew</h1>
      <p style={{ color: "rgb(80, 80, 80)" }}>Leads the docking checklist.</p>
    </main>
  );
}
