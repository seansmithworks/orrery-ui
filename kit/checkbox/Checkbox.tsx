"use client";
import type { ComponentProps } from "react";
import {
  Checkbox as SdkCheckbox,
  CheckboxIndicator as SdkCheckboxIndicator,
} from "@ui-sdk/react/checkbox";
import { cx } from "../cx";

// checked and defaultChecked stay booleans: a mixed box is the indeterminate prop, not a checked value.
export type CheckboxProps = Omit<
  ComponentProps<typeof SdkCheckbox>,
  "className" | "children" | "render" | "checked" | "defaultChecked"
> &
  Pick<ComponentProps<"input">, "checked" | "defaultChecked"> & {
    /** Shows a dash and announces mixed. It wins over checked. */
    indeterminate?: boolean;
    className?: string;
  };

/**
 * Checkbox on UI SDK: a box with a tick or, when indeterminate, a dash. Styles: kit.css (.orr-checkbox, .orr-control).
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
export function Checkbox({
  indeterminate,
  checked,
  className,
  ...props
}: CheckboxProps) {
  return (
    // Component class first: the kit baseline keys each element by its first orr- class.
    // A <span>, not UI SDK's default <button>: the box draws from the kit's CSS alone, with no
    // button styles from the browser to undo.
    <SdkCheckbox
      {...props}
      checked={indeterminate ? "indeterminate" : checked}
      render={<span />}
      className={cx("orr-checkbox", "orr-control", className)}
    >
      <SdkCheckboxIndicator className="orr-checkbox__indicator">
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
      </SdkCheckboxIndicator>
    </SdkCheckbox>
  );
}
