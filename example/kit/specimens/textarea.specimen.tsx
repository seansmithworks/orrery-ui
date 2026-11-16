import { Field, Textarea } from "../../../kit";
import type { SpecimenProps } from "../specimen";

export const block = "Textarea";
export const fixedSize = { height: ".orr-textarea" };

type State = {
  name: string;
  root?: { invalid?: boolean; disabled?: boolean };
  control?: Record<string, unknown>;
  description?: string;
  error?: string;
};
const STATES: State[] = [
  {
    name: "rest",
    control: { placeholder: "What happened?" },
    description: "We read every note.",
  },
  {
    name: "hover",
    control: { placeholder: "What happened?", "data-preview": "hover" },
  },
  {
    name: "focus",
    control: { placeholder: "What happened?", "data-preview": "focus" },
  },
  {
    name: "filled",
    control: { defaultValue: "The export stalls at 80% and never finishes." },
  },
  {
    name: "invalid",
    root: { invalid: true },
    control: { defaultValue: "It broke." },
    error: "Say what you clicked and what you expected.",
  },
  {
    name: "disabled",
    root: { disabled: true },
    control: { defaultValue: "The export stalls at 80% and never finishes." },
  },
  {
    name: "read-only",
    control: {
      defaultValue: "The export stalls at 80% and never finishes.",
      readOnly: true,
    },
    description: "Set by your team.",
  },
];

export default function TextareaSpecimen(_: SpecimenProps) {
  return (
    <div className="spec-fields">
      {STATES.map((s) => (
        <div className="spec-cell" data-cell={s.name} key={s.name}>
          <span className="spec-label" aria-hidden="true">
            {s.name}
          </span>
          <Field.Root {...s.root}>
            <Field.Label>Note</Field.Label>
            <Textarea {...s.control} />
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
