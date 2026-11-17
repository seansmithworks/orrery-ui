"use client";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { cx } from "../cx";

export type CheckboxProps = Omit<
  BaseCheckbox.Root.Props,
  "className" | "children"
> & {
  className?: string;
};

/**
 * Checkbox on Base UI: a box with a tick or, when indeterminate, a dash. Styles: kit.css (.orr-checkbox).
 * Inside Field.Root it takes the field's label, description, error and state. The label wraps the box
 * and its text, so a click anywhere on the label toggles it:
 *
 * ```tsx
 * <Field.Root invalid={!!error}>
 *   <Field.Label>
 *     <Checkbox name="terms" />
 *     I agree to the terms
 *   </Field.Label>
 *   <Field.Description>You can read them at any time in Settings.</Field.Description>
 *   <Field.Error match={!!error}>{error}</Field.Error>
 * </Field.Root>
 * ```
 */
export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <BaseCheckbox.Root {...props} className={cx("orr-checkbox", className)}>
      <BaseCheckbox.Indicator className="orr-checkbox__indicator">
        <svg
          className="orr-checkbox__tick"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 8.5l2.5 2.5L12 5.5" />
        </svg>
        <svg
          className="orr-checkbox__dash"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4.5 8h7" />
        </svg>
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
