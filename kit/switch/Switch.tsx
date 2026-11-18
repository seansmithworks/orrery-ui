"use client";
import { useState, type ComponentProps } from "react";
import { useFieldControl } from "@ui-sdk/react/field";
import {
  Switch as SdkSwitch,
  SwitchThumb as SdkSwitchThumb,
} from "@ui-sdk/react/switch";
import { cx } from "../cx";

export type SwitchProps = Omit<
  ComponentProps<typeof SdkSwitch>,
  "className" | "children" | "render"
> & {
  /** The value submitted while off. Without it, an off switch submits nothing, as a native checkbox. */
  uncheckedValue?: string;
  className?: string;
};

/**
 * Switch on UI SDK: a track with a thumb that slides to on. Styles: kit.css (.orr-switch, .orr-control).
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
export function Switch({
  uncheckedValue,
  checked,
  defaultChecked,
  onCheckedChange,
  onKeyDownCapture,
  className,
  ...props
}: SwitchProps) {
  const field = useFieldControl();
  // Only read for uncheckedValue: UI SDK has none, so the kit submits it itself while off.
  const [own, setOwn] = useState(defaultChecked ?? false);
  const on = checked ?? own;
  const name = props.name ?? field?.name;
  return (
    <>
      {/* Component class first: the kit baseline keys each element by its first orr- class.
          A <span>, not UI SDK's default <button>: the track draws from the kit's CSS alone. */}
      <SdkSwitch
        {...props}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={(next, details) => {
          setOwn(next);
          onCheckedChange?.(next, details);
        }}
        // Enter toggles, as Space does, and does not submit the form: the kit keeps Base UI's
        // switch keyboard. UI SDK's own Enter submits the form, so it is stopped before it runs.
        onKeyDownCapture={(event) => {
          onKeyDownCapture?.(event);
          if (event.key !== "Enter" || event.defaultPrevented) return;
          event.preventDefault();
          event.stopPropagation();
          if (!event.repeat) event.currentTarget.click();
        }}
        render={<span />}
        className={cx("orr-switch", "orr-control", className)}
      >
        <SdkSwitchThumb className="orr-switch__thumb" />
      </SdkSwitch>
      {uncheckedValue !== undefined && name && !on && (
        <input
          type="hidden"
          name={name}
          value={uncheckedValue}
          form={props.form}
          disabled={props.disabled || field?.disabled}
        />
      )}
    </>
  );
}
