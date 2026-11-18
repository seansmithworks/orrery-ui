import { Field, Radio } from "../../../kit";
import type { SpecimenProps } from "../specimen";

export const block = "Radio";
export const note = "strawman, selected colour pending";
// The ring's size is declared in radio.css (--space-16); its option row holds text, so it is not locked.
export const fixedSize = { width: ".orr-radio", height: ".orr-radio" };

type RadioState = {
  name: string;
  root?: { invalid?: boolean; disabled?: boolean };
  group?: { defaultValue?: string; required?: boolean };
  /** Properties for the option at an index, on its Radio.Item. */
  items?: Record<number, Record<string, unknown>>;
  description?: string;
  error?: string;
};

const OPTIONS = [
  { value: "instant", label: "Instantly" },
  { value: "daily", label: "Daily digest" },
  { value: "weekly", label: "Weekly digest" },
];

const STATES: RadioState[] = [
  {
    name: "unselected",
    description: "Choose how often we write.",
  },
  { name: "selected", group: { defaultValue: "daily" } },
  { name: "hover", items: { 0: { "data-preview": "hover" } } },
  {
    name: "focus",
    group: { defaultValue: "daily" },
    items: { 1: { "data-preview": "focus" } },
  },
  {
    name: "disabled",
    root: { disabled: true },
    group: { defaultValue: "daily" },
    description: "Set by your organization.",
  },
  {
    name: "disabled item",
    group: { defaultValue: "daily" },
    items: { 0: { disabled: true } },
    description: "Instant emails need the Pro plan.",
  },
  {
    name: "invalid",
    root: { invalid: true },
    group: { required: true },
    error: "Choose how often we write.",
  },
];

export default function RadioSpecimen(_: SpecimenProps) {
  return (
    <div className="spec-fields">
      {STATES.map((s) => (
        <div key={s.name} className="spec-cell" data-cell={s.name}>
          <span className="spec-label" aria-hidden="true">
            {s.name}
          </span>
          <Field.Root {...s.root}>
            <Field.Label>Email notifications</Field.Label>
            {s.description && (
              <Field.Description>{s.description}</Field.Description>
            )}
            <Radio.Group {...s.group}>
              {OPTIONS.map((o, i) => (
                <Radio.Item key={o.value} value={o.value} {...s.items?.[i]}>
                  {o.label}
                </Radio.Item>
              ))}
            </Radio.Group>
            {s.error && <Field.Error match>{s.error}</Field.Error>}
          </Field.Root>
        </div>
      ))}
    </div>
  );
}
