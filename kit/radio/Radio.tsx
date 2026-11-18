"use client";
import type { ComponentProps } from "react";
import {
  Radio as SdkRadio,
  RadioGroup as SdkRadioGroup,
  RadioIndicator as SdkRadioIndicator,
} from "@ui-sdk/react/radio";
import { cx } from "../cx";

type WithClass<P> = Omit<P, "className"> & { className?: string };

/**
 * The group: one value, one tab stop, arrow keys that move and select. Inside Field.Root the field's label names
 * it and its error shows for a required group with nothing chosen.
 */
function Group({
  className,
  ...props
}: WithClass<ComponentProps<typeof SdkRadioGroup>>) {
  return (
    <SdkRadioGroup {...props} className={cx("orr-radio-group", className)} />
  );
}

/**
 * One option: a label that holds the ring and its text, so a press anywhere on the text chooses it. Its children
 * are the text. className goes on the ring.
 */
function Item({
  className,
  children,
  ...props
}: Omit<WithClass<ComponentProps<typeof SdkRadio>>, "children" | "render"> &
  Pick<ComponentProps<"label">, "children">) {
  return (
    // Component classes first: the kit baseline keys each element by its first orr- class.
    <label className="orr-radio-option">
      {/* A <span>, not UI SDK's default <button>: the ring draws from the kit's CSS alone, as Checkbox does. */}
      <SdkRadio
        {...props}
        render={<span />}
        className={cx("orr-radio", "orr-control", className)}
      >
        <SdkRadioIndicator className="orr-radio__indicator" />
      </SdkRadio>
      {children}
    </label>
  );
}

/**
 * Radio on UI SDK: a group of single-choice options, each a ring with a dot and its text. Styles: kit.css
 * (.orr-radio, .orr-control). The group sits in a Field.Root whose label names it; the description and error
 * belong to the group, not to one option:
 *
 * ```tsx
 * <Field.Root invalid={!!error}>
 *   <Field.Label>Order updates</Field.Label>
 *   <Field.Description>Choose how we tell you about your orders.</Field.Description>
 *   <Radio.Group name="updates" required>
 *     <Radio.Item value="email">Email only</Radio.Item>
 *     <Radio.Item value="sms">SMS only</Radio.Item>
 *   </Radio.Group>
 *   <Field.Error match={!!error}>{error}</Field.Error>
 * </Field.Root>
 * ```
 */
export const Radio = { Group, Item };
