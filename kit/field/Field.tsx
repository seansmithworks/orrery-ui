"use client";
import { Field as BaseField } from "@base-ui/react/field";
import { Input as BaseInput } from "@base-ui/react/input";
import { cx } from "../cx";

type WithClass<P> = Omit<P, "className"> & { className?: string };

function Root({ className, ...props }: WithClass<BaseField.Root.Props>) {
  return <BaseField.Root {...props} className={cx("orr-field", className)} />;
}

function Label({ className, ...props }: WithClass<BaseField.Label.Props>) {
  return (
    <BaseField.Label {...props} className={cx("orr-field__label", className)} />
  );
}

function Description({
  className,
  ...props
}: WithClass<BaseField.Description.Props>) {
  return (
    <BaseField.Description
      {...props}
      className={cx("orr-field__description", className)}
    />
  );
}

function ErrorMessage({ className, ...props }: WithClass<BaseField.Error.Props>) {
  return (
    <BaseField.Error {...props} className={cx("orr-field__error", className)} />
  );
}

/**
 * Field on Base UI: the label, description and error are wired to the control
 * (label `for`, `aria-describedby`, `aria-invalid`) by Base UI.
 *
 * ```tsx
 * <Field.Root invalid={!!error}>
 *   <Field.Label>Email</Field.Label>
 *   <Input type="email" />
 *   <Field.Description>We reply within a day.</Field.Description>
 *   <Field.Error match={!!error}>{error}</Field.Error>
 * </Field.Root>
 * ```
 */
export const Field = { Root, Label, Description, Error: ErrorMessage };

export type InputProps = WithClass<BaseInput.Props>;

/** Text input. Inside Field.Root it takes the field's label, description, error and state. */
export function Input({ className, ...props }: InputProps) {
  return <BaseInput {...props} className={cx("orr-input", className)} />;
}
