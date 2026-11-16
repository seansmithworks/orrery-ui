"use client";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cx } from "../cx";

export type SwitchProps = Omit<
  BaseSwitch.Root.Props,
  "className" | "children"
> & {
  className?: string;
};

/**
 * Switch on Base UI: a track with a thumb that slides to on. Styles: kit.css (.orr-switch, .orr-control).
 * Inside Field.Root it takes the field's label, description, error and state. The label wraps the switch
 * and its text, so a click anywhere on the label toggles it:
 *
 * ```tsx
 * <Field.Root>
 *   <Field.Label>
 *     <Switch name="notify" />
 *     Email me when an orbit changes
 *   </Field.Label>
 *   <Field.Description>At most one email a day.</Field.Description>
 * </Field.Root>
 * ```
 */
export function Switch({ className, ...props }: SwitchProps) {
  return (
    // Component class first: the kit baseline keys each element by its first orr- class.
    <BaseSwitch.Root
      {...props}
      className={cx("orr-switch", "orr-control", className)}
    >
      <BaseSwitch.Thumb className="orr-switch__thumb" />
    </BaseSwitch.Root>
  );
}
