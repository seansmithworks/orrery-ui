import { Field, Switch } from "../../../kit";
import type { SpecimenProps } from "../specimen";

export const block = "Switch";
export const note = "strawman, selected colour pending";
// The track's size is declared in switch.css (an UN-DIALLED width, --space-20 high); its label row holds text, so
// it is not locked.
export const fixedSize = { width: ".orr-switch", height: ".orr-switch" };

type SwitchState = {
  name: string;
  root?: { invalid?: boolean; disabled?: boolean };
  control?: Record<string, unknown>;
  label: string;
  description?: string;
  error?: string;
};

const STATES: SwitchState[] = [
  {
    name: "off",
    label: "Email me when an orbit changes",
    description: "At most one email a day.",
  },
  { name: "on", control: { defaultChecked: true }, label: "Show grid lines" },
  {
    name: "hover off",
    control: { "data-preview": "hover" },
    label: "Show grid lines",
  },
  {
    name: "hover on",
    control: { defaultChecked: true, "data-preview": "hover" },
    label: "Show grid lines",
  },
  {
    name: "pressed",
    control: { "data-preview": "active" },
    label: "Show grid lines",
  },
  {
    name: "focus",
    control: { "data-preview": "focus" },
    label: "Show grid lines",
  },
  {
    name: "disabled off",
    root: { disabled: true },
    label: "Sync to the team library",
  },
  {
    name: "disabled on",
    root: { disabled: true },
    control: { defaultChecked: true },
    label: "Sync to the team library",
  },
  {
    name: "invalid",
    root: { invalid: true },
    control: { required: true },
    label: "Share usage data",
    error: "Turn this on to continue.",
  },
];

export default function SwitchSpecimen(_: SpecimenProps) {
  return (
    <div className="spec-fields">
      {STATES.map((s) => (
        <div key={s.name} className="spec-cell" data-cell={s.name}>
          <span className="spec-label" aria-hidden="true">
            {s.name}
          </span>
          <Field.Root {...s.root}>
            <Field.Label>
              <Switch {...s.control} />
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
