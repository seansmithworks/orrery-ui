import { Button } from "./kit";

const count: number = "three";

export default function Bad() {
  return <Button variant="primary">{count}</Button>;
}
