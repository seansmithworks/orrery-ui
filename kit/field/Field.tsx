"use client";
import type { ComponentProps } from "react";
import {
  Field as SdkField,
  FieldDescription as SdkFieldDescription,
  FieldError as SdkFieldError,
  FieldLabel as SdkFieldLabel,
} from "@ui-sdk/react/field";
import { Input as SdkInput } from "@ui-sdk/react/input";
import { cx } from "../cx";

type WithClass<P> = Omit<P, "className"> & { className?: string };

function Root({
  className,
  ...props
}: WithClass<ComponentProps<typeof SdkField>>) {
  return <SdkField {...props} className={cx("orr-field", className)} />;
}

function Label({
  className,
  ...props
}: WithClass<ComponentProps<typeof SdkFieldLabel>>) {
  return (
    <SdkFieldLabel {...props} className={cx("orr-field__label", className)} />
  );
}

function Description({
  className,
  ...props
}: WithClass<ComponentProps<typeof SdkFieldDescription>>) {
  return (
    <SdkFieldDescription
      {...props}
      className={cx("orr-field__description", className)}
    />
  );
}

function ErrorMessage({
  className,
  ...props
}: WithClass<ComponentProps<typeof SdkFieldError>>) {
  return (
    <SdkFieldError {...props} className={cx("orr-field__error", className)} />
  );
}

/**
 * Field on UI SDK: the label, description and error are wired to the control
 * (label `for`, `aria-describedby`, `aria-invalid`) by UI SDK.
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

export type InputProps = WithClass<ComponentProps<typeof SdkInput>>;

/** Text input. Inside Field.Root it takes the field's label, description, error and state. */
export function Input({ className, ...props }: InputProps) {
  return <SdkInput {...props} className={cx("orr-input", className)} />;
}
