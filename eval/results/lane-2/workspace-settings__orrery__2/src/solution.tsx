import { useState, type FormEvent } from "react";
import { Button, Dialog, Field, Input, Radio, Switch, Tabs } from "./kit";

const stack = (gap: string) =>
  ({ display: "flex", flexDirection: "column", gap }) as const;

export default function WorkspaceSettings() {
  const [saved, setSaved] = useState(false);
  const [deleted, setDeleted] = useState(false);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(true);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        boxSizing: "border-box",
        padding: "var(--space-32)",
        background: "var(--page)",
        color: "var(--text)",
      }}
    >
      <div
        style={{
          ...stack("var(--space-24)"),
          maxWidth: "var(--layout-measure)",
          margin: "0 auto",
        }}
      >
        <h1 id="settings-title" style={{ margin: 0 }}>
          Workspace settings
        </h1>
        <Tabs.Root defaultValue="general">
          <Tabs.List aria-labelledby="settings-title">
            <Tabs.Tab value="general">General</Tabs.Tab>
            <Tabs.Tab value="notifications">Notifications</Tabs.Tab>
            <Tabs.Tab value="danger">Danger zone</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="general">
            <form
              onSubmit={save}
              style={{ ...stack("var(--space-20)"), paddingTop: "var(--space-20)" }}
            >
              <Field.Root name="workspaceName">
                <Field.Label>Workspace name</Field.Label>
                <Input
                  defaultValue="Orbit Lab"
                  onChange={() => setSaved(false)}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Default role for new members</Field.Label>
                <Radio.Group
                  name="defaultRole"
                  defaultValue="editor"
                  onValueChange={() => setSaved(false)}
                >
                  <Radio.Item value="viewer">Viewer</Radio.Item>
                  <Radio.Item value="editor">Editor</Radio.Item>
                  <Radio.Item value="admin">Admin</Radio.Item>
                </Radio.Group>
              </Field.Root>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-12)",
                }}
              >
                <Button variant="primary" type="submit">
                  Save changes
                </Button>
                <span role="status">{saved ? "Settings saved." : ""}</span>
              </div>
            </form>
          </Tabs.Panel>

          <Tabs.Panel value="notifications">
            <div
              style={{ ...stack("var(--space-20)"), paddingTop: "var(--space-20)" }}
            >
              <Field.Root>
                <Field.Label>
                  <Switch name="weeklySummary" defaultChecked />
                  Weekly summary email
                </Field.Label>
              </Field.Root>
              <Field.Root>
                <Field.Label>
                  <Switch name="mentions" />
                  Mentions
                </Field.Label>
              </Field.Root>
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="danger">
            <div
              style={{ ...stack("var(--space-16)"), paddingTop: "var(--space-20)" }}
            >
              <p style={{ margin: 0 }}>
                Deleting this workspace is permanent and cannot be reversed.
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-12)",
                }}
              >
                <Dialog.Root>
                  <Dialog.Trigger variant="secondary">
                    Delete workspace
                  </Dialog.Trigger>
                  <Dialog.Popup>
                    <Dialog.Header>
                      <Dialog.Title>Delete Orbit Lab?</Dialog.Title>
                      <Dialog.CloseIcon />
                    </Dialog.Header>
                    <Dialog.Description>
                      This removes all projects and members. It cannot be
                      undone.
                    </Dialog.Description>
                    <Dialog.Actions>
                      <Dialog.Close variant="secondary">Cancel</Dialog.Close>
                      <Dialog.Close
                        variant="primary"
                        onClick={() => setDeleted(true)}
                      >
                        Delete workspace
                      </Dialog.Close>
                    </Dialog.Actions>
                  </Dialog.Popup>
                </Dialog.Root>
                <span role="status">{deleted ? "Workspace deleted." : ""}</span>
              </div>
            </div>
          </Tabs.Panel>
        </Tabs.Root>
      </div>
    </main>
  );
}
