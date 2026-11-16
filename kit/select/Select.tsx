"use client";
import { Select as BaseSelect } from "@base-ui/react/select";
import { cx } from "../cx";

type WithClass<P> = Omit<P, "className"> & { className?: string };

function ChevronGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8l4 4 4-4" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 10.5l3.5 3.5L15 7" />
    </svg>
  );
}

export type SelectTriggerProps = WithClass<
  Omit<BaseSelect.Trigger.Props, "children">
> & {
  /** Shown in the trigger, muted, while nothing is selected. */
  placeholder?: BaseSelect.Value.Props["placeholder"];
};

/** The button that opens the list. It shows the selected item's label (or the placeholder) and a chevron. */
function Trigger({ placeholder, className, ...props }: SelectTriggerProps) {
  return (
    <BaseSelect.Trigger {...props} className={cx("orr-select", className)}>
      <BaseSelect.Value
        className="orr-select__value"
        placeholder={placeholder}
      />
      <BaseSelect.Icon className="orr-select__icon">
        <ChevronGlyph />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

export type SelectPopupProps = WithClass<BaseSelect.Popup.Props> & {
  /** Where the portal mounts. Defaults to document.body. */
  container?: BaseSelect.Portal.Props["container"];
};

/** Portal, positioner, popup and list in one part. It opens below the trigger, at least as wide as it. */
function Popup({ container, className, children, ...props }: SelectPopupProps) {
  return (
    <BaseSelect.Portal container={container}>
      <BaseSelect.Positioner
        className="orr-select__positioner"
        alignItemWithTrigger={false}
      >
        <BaseSelect.Popup
          {...props}
          className={cx("orr-select__popup", className)}
        >
          <BaseSelect.List className="orr-select__list">
            {children}
          </BaseSelect.List>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

/** One option. Its text is the label; a check marks it while it is the selected one. */
function Item({
  className,
  children,
  ...props
}: WithClass<BaseSelect.Item.Props>) {
  return (
    <BaseSelect.Item {...props} className={cx("orr-select__item", className)}>
      <BaseSelect.ItemText className="orr-select__item-text">
        {children}
      </BaseSelect.ItemText>
      <BaseSelect.ItemIndicator className="orr-select__check">
        <CheckGlyph />
      </BaseSelect.ItemIndicator>
    </BaseSelect.Item>
  );
}

function Group({ className, ...props }: WithClass<BaseSelect.Group.Props>) {
  return (
    <BaseSelect.Group
      {...props}
      className={cx("orr-select__group", className)}
    />
  );
}

function GroupLabel({
  className,
  ...props
}: WithClass<BaseSelect.GroupLabel.Props>) {
  return (
    <BaseSelect.GroupLabel
      {...props}
      className={cx("orr-select__group-label", className)}
    />
  );
}

function Separator({
  className,
  ...props
}: WithClass<BaseSelect.Separator.Props>) {
  return (
    <BaseSelect.Separator
      {...props}
      className={cx("orr-select__separator", className)}
    />
  );
}

/**
 * Select on Base UI: a button that opens a list of options. Arrow keys and typing move the
 * highlight, Enter or a click picks, Escape and an outside press close, and focus returns to the
 * trigger. Inside Field.Root it takes the field's label, description, error and state.
 *
 * ```tsx
 * <Field.Root>
 *   <Field.Label>Orbit</Field.Label>
 *   <Select.Root items={{ kepler: "Kepler", vesta: "Vesta" }} defaultValue="kepler">
 *     <Select.Trigger />
 *     <Select.Popup>
 *       <Select.Item value="kepler">Kepler</Select.Item>
 *       <Select.Item value="vesta">Vesta</Select.Item>
 *     </Select.Popup>
 *   </Select.Root>
 * </Field.Root>
 * ```
 */
export const Select = {
  Root: BaseSelect.Root,
  Trigger,
  Popup,
  Item,
  Group,
  GroupLabel,
  Separator,
};
