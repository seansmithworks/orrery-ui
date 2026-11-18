import { Button } from "./kit";

export default function Bad() {
  return (
    <div
      style={{
        color: "#ff3b30",
        padding: "13px",
        background: "linear-gradient(red, blue)",
      }}
    >
      <Button variant="primary">Go</Button>
    </div>
  );
}
