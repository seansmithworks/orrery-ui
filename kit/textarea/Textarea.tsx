"use client";
import type { ComponentProps } from "react";
import { Textarea as SdkTextarea } from "@ui-sdk/react/textarea";
import { cx } from "../cx";

export type TextareaProps = Omit<
  ComponentProps<typeof SdkTextarea>,
  "className" | "render"
> & {
  className?: string;
  /** Visible lines before the text scrolls. */
  rows?: number;
};

/**
 * Multi-line text on UI SDK: a native `<textarea>`. Inside Field.Root it takes the field's
 * label, description, error and state.
 */
export function Textarea({ className, rows = 3, ...props }: TextareaProps) {
  return (
    <SdkTextarea
      {...props}
      rows={rows}
      className={cx("orr-textarea", className)}
    />
  );
}
