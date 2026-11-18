import { Button } from "@ui-sdk/react/button";

export default function Bad() {
  return (
    <form>
      <input name="email" />
      <button type="submit">Send</button>
      <Button>Also not the kit</Button>
    </form>
  );
}
