import { Checkbox, Field } from "../../../kit";
import type { SpecimenProps } from "../specimen";

export const block = "Checkbox";
export const note = "strawman, selected colour pending";
// The box's size is declared in checkbox.css (--space-16); its label row holds text, so it is not locked.
export const fixedSize = { width: ".orr-checkbox", height: ".orr-checkbox" };

type CheckboxState = {
  name: string;
  root?: { invalid?: boolean; disabled?: boolean };
  box?: Record<string, unknown>;
  label: string;
  description?: string;
  error?: string;
};

const STATES: CheckboxState[] = [
  {
    name: "unchecked",
    label: "Email me when an orbit changes",
    description: "At most one email a day.",
  },
  { name: "checked", box: { defaultChecked: true }, label: "Show grid lines" },
  {
    name: "indeterminate",
    box: { indeterminate: true },
    label: "All orbits",
  },
  { name: "hover", box: { "data-preview": "hover" }, label: "Show grid lines" },
  { name: "focus", box: { "data-preview": "focus" }, label: "Show grid lines" },
  {
    name: "disabled",
    root: { disabled: true },
    label: "Sync to the team library",
  },
  {
    name: "disabled checked",
    root: { disabled: true },
    box: { defaultChecked: true },
    label: "Sync to the team library",
  },
  {
    name: "invalid",
    root: { invalid: true },
    box: { required: true },
    label: "I understand this cannot be undone",
    error: "Tick this box to confirm.",
  },
];

export default function CheckboxSpecimen(_: SpecimenProps) {
  return (
    <div className="spec-fields">
      {STATES.map((s) => (
        <div key={s.name} className="spec-cell" data-cell={s.name}>
          <span className="spec-label" aria-hidden="true">
            {s.name}
          </span>
          <Field.Root {...s.root}>
            <Field.Label>
              <Checkbox {...s.box} />
              {s.label}
            </Field.Label>
            {s.description && (
              <Field.Description>{s.description}</Field.Description>
            )}
            {s.error && <Field.Error match>{s.error}</Field.Error>}
          </Field.Root>
        </div>
      ))}
    </div>
  );
}
