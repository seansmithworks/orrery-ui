"use client";
import { Field as BaseField } from "@base-ui/react/field";
import { cx } from "../cx";

export type TextareaProps = Omit<
  BaseField.Control.Props,
  "className" | "render"
> & {
  className?: string;
  /** Visible lines before the text scrolls. */
  rows?: number;
};

/**
 * Multi-line text. Base UI has no textarea primitive, so this is Field.Control rendered as a
 * `<textarea>`: inside Field.Root it takes the field's label, description, error and state.
 */
export function Textarea({ className, rows = 3, ...props }: TextareaProps) {
  return (
    <BaseField.Control
      {...props}
      render={<textarea rows={rows} />}
      className={cx("orr-textarea", className)}
    />
  );
}
