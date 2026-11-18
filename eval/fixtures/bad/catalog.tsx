import { Button, Dialog, Fancy, Tabs } from "./kit";

export default function Bad() {
  return (
    <div>
      <Button variant="loud" glow>
        Go
      </Button>
      <Dialog.Popup>
        <Dialog.Title>No root</Dialog.Title>
      </Dialog.Popup>
      <Tabs.Tab value="a">Tab outside a list</Tabs.Tab>
      <Fancy />
    </div>
  );
}
