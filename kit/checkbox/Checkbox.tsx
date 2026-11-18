"use client";
import type { ComponentProps } from "react";
import {
  Checkbox as SdkCheckbox,
  CheckboxIndicator as SdkCheckboxIndicator,
} from "@ui-sdk/react/checkbox";
import { cx } from "../cx";

type SdkCheckboxProps = ComponentProps<typeof SdkCheckbox>;
type CheckedChangeDetails = Parameters<
  NonNullable<SdkCheckboxProps["onCheckedChange"]>
>[1];

// checked, defaultChecked and onCheckedChange stay booleans: a mixed box is the indeterminate prop, not a checked
// value. So a plain `setChecked` from useState(false) is a valid onCheckedChange.
export type CheckboxProps = Omit<
  SdkCheckboxProps,
  | "className"
  | "children"
  | "render"
  | "checked"
  | "defaultChecked"
  | "onCheckedChange"
> &
  Pick<ComponentProps<"input">, "checked" | "defaultChecked"> & {
    /** Shows a dash and announces mixed. It wins over checked. */
    indeterminate?: boolean;
    /** Called with the next checked state, true or false; the details argument is optional to take. */
    onCheckedChange?: (checked: boolean, details: CheckedChangeDetails) => void;
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
  onCheckedChange,
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
      // A press always reports true or false. Only a form reset or restore to a mixed start can report
      // "indeterminate"; that box is not checked, as a native input's checked is false while it shows mixed.
      onCheckedChange={
        onCheckedChange &&
        ((next, details) => onCheckedChange(next === true, details))
      }
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
