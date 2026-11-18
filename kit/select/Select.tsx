"use client";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ComponentProps,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useFieldControl } from "@ui-sdk/react/field";
import {
  Select as SdkSelect,
  SelectContent as SdkSelectContent,
  SelectGroup as SdkSelectGroup,
  SelectGroupLabel as SdkSelectGroupLabel,
  SelectItem as SdkSelectItem,
  SelectItemIndicator as SdkSelectItemIndicator,
  SelectItemText as SdkSelectItemText,
  SelectList as SdkSelectList,
  SelectSeparator as SdkSelectSeparator,
  SelectTrigger as SdkSelectTrigger,
  SelectValue as SdkSelectValue,
  type ListData,
  type SelectProps as SdkSelectProps,
} from "@ui-sdk/react/select";
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

type SdkRootProps = SdkSelectProps<string>;

// Omit per member: UI SDK's props are a union on `multiple`, which a plain Omit would merge.
type OmitEach<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

export type SelectRootProps = OmitEach<SdkRootProps, "items" | "container"> & {
  /** Each value's label, so the trigger shows the label and not the raw value: a map, or UI SDK's list data. */
  items?: Record<string, string> | ListData<string>;
};

// Whether the select is disabled, by its own prop or its Field: a disabled select never opens.
const DisabledContext = createContext(false);

// The values of the disabled items, which each Item registers. The kit owns an item's disabled
// state, not UI SDK: UI SDK's select skips a disabled item with the arrow keys and the pointer
// (skipDisabled is fixed on), and the kit keeps Base UI's behaviour, where the highlight reaches
// it and no press, key or typeahead ever chooses it.
const DisabledItemsContext = createContext<Set<string> | null>(null);

type Change = { reason: string; cancel: () => void };
// One value, or several with `multiple`.
type Value = string | readonly string[] | null;
const valuesOf = (v: Value): readonly string[] =>
  v === null ? [] : typeof v === "string" ? [v] : v;

/** Holds the value and the open state. It renders no element of its own. */
function Root({
  items,
  itemToLabel,
  onValueChange,
  onOpenChange,
  ...props
}: SelectRootProps) {
  const field = useFieldControl();
  const [disabledItems] = useState(() => new Set<string>());
  // Set when a press on a disabled item was refused, so the close UI SDK runs right after it
  // (choose sets the value, then hides) is refused too.
  const [refused] = useState(() => ({ current: false }));
  // The last value the select took, for an uncontrolled select: a change is refused when it adds
  // a disabled value to it.
  const [accepted] = useState(() => ({
    current: (props.value ?? props.defaultValue ?? null) as Value,
  }));
  // A map gives labels only, as in Base UI: it becomes itemToLabel, never UI SDK's items. Given
  // items data, UI SDK takes each option's state from the data, not from the rendered Select.Item.
  const map = items && !Array.isArray(items) ? items : undefined;
  const root = {
    ...props,
    items: map ? undefined : (items as ListData<string> | undefined),
    itemToLabel:
      itemToLabel ?? (map ? (value: string) => map[value] ?? value : undefined),
    // Every path to a value runs through here: a press, Enter, typing on the closed trigger, a
    // reset, a controller. A change that would add a disabled value is refused, whatever its reason.
    onValueChange: (value: Value, details: Change) => {
      const current =
        props.value !== undefined ? (props.value as Value) : accepted.current;
      const before = new Set(valuesOf(current));
      if (valuesOf(value).some((v) => !before.has(v) && disabledItems.has(v))) {
        // A press on the item also closes the list (choose sets the value, then hides) in single
        // mode; Root refuses that close too. A refused typeahead opens and closes nothing.
        if (details.reason === "item-press" && !props.multiple)
          refused.current = true;
        details.cancel();
        return;
      }
      accepted.current = value;
      (onValueChange as ((v: Value, d: Change) => void) | undefined)?.(
        value,
        details,
      );
    },
    onOpenChange: (open: boolean, details: Change) => {
      const wasRefused = refused.current;
      refused.current = false;
      if (!open && details.reason === "item-press" && wasRefused) {
        details.cancel();
        return;
      }
      (onOpenChange as ((o: boolean, d: Change) => void) | undefined)?.(
        open,
        details,
      );
    },
  } as SdkRootProps;
  return (
    <DisabledContext.Provider value={!!(props.disabled || field?.disabled)}>
      <DisabledItemsContext.Provider value={disabledItems}>
        <SdkSelect {...root} />
      </DisabledItemsContext.Provider>
    </DisabledContext.Provider>
  );
}

export type SelectTriggerProps = WithClass<
  Omit<ComponentProps<typeof SdkSelectTrigger>, "children" | "render">
> & {
  /** Shown in the trigger, muted, while nothing is selected. */
  placeholder?: string;
};

/** The button that opens the list. It shows the selected item's label (or the placeholder) and a chevron. */
function Trigger({ placeholder, className, ...props }: SelectTriggerProps) {
  return (
    <SdkSelectTrigger {...props} className={cx("orr-select", className)}>
      <SdkSelectValue className="orr-select__value" placeholder={placeholder} />
      <span className="orr-select__icon" aria-hidden="true">
        <ChevronGlyph />
      </span>
    </SdkSelectTrigger>
  );
}

type Content = ComponentProps<typeof SdkSelectContent>;
/** The popup's placement. */
type PlacementProps = {
  /** The trigger's side the popup opens on. Default: bottom. */
  side?: Content["side"];
  /** The popup's alignment along that side. Default: center. */
  align?: Content["align"];
  /** Extra gap from the trigger in px, added to the kit's offset. */
  sideOffset?: number;
  /** The gap in px the popup keeps from the window's edges, on every side. */
  collisionPadding?: number;
  /** Lay the popup over the trigger, the selected item on the value (mouse input only). */
  alignItemWithTrigger?: boolean;
};

export type SelectPopupProps = WithClass<
  Omit<
    Content,
    | "container"
    | "render"
    | "children"
    | "side"
    | "align"
    | "sideOffset"
    | "collisionPadding"
    | "alignItemWithTrigger"
  >
> &
  PlacementProps & {
    /** Where the popup mounts, an element or a ref to one. Defaults to in place, in the top layer. */
    container?: HTMLElement | null | RefObject<HTMLElement | null>;
  } & Pick<ComponentProps<"div">, "children">;

/**
 * Popup and list in one part, inside the kit's positioner element, which holds the kit's offset and
 * max height. UI SDK opens the popup in the browser's top layer, wherever it sits in the DOM. By
 * default it opens below the trigger, at least as wide as it, never laid over it, and keeps the
 * kit's 8px gutter from the window edge (the same gutter as the Dialog's viewport). The gap to the
 * trigger is the kit's --orr-select-offset; sideOffset adds to it.
 */
function Popup({
  container,
  className,
  children,
  side,
  align,
  sideOffset,
  collisionPadding = 8,
  alignItemWithTrigger = false,
  ...props
}: SelectPopupProps) {
  // UI SDK places the popup's border box itself and writes margin: 0 inline, so the kit's offset
  // cannot be a CSS margin. It is read from --orr-select-offset on the positioner and passed on,
  // before the popup first renders: a popup open from the start is placed once, with it.
  const [offset, setOffset] = useState<number | null>(null);
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const v = parseFloat(
      el.ownerDocument
        .defaultView!.getComputedStyle(el)
        .getPropertyValue("--orr-select-offset"),
    );
    setOffset(Number.isFinite(v) ? v : 0);
  }, []);
  // A portal mounts after the container's own content, as Base UI's did, so a held-open popup
  // never lands ahead of the trigger it belongs to in the same container.
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => setMounted(true), []);
  // UI SDK mounts a closed popup, hidden, when the pointer reaches the trigger, so it opens fast.
  // A disabled select never opens, so it renders none.
  const disabled = useContext(DisabledContext);
  const positioner = (
    <div className="orr-select__positioner" ref={measure}>
      {offset !== null && !disabled && (
        <SdkSelectContent
          {...props}
          side={side}
          align={align}
          sideOffset={(offset ?? 0) + (sideOffset ?? 0)}
          collisionPadding={collisionPadding}
          alignItemWithTrigger={alignItemWithTrigger}
          // Component class first, orr-floating second: the kit baseline keys an element by its first orr- class.
          className={cx("orr-select__popup", "orr-floating", className)}
        >
          <SdkSelectList className="orr-select__list">{children}</SdkSelectList>
        </SdkSelectContent>
      )}
    </div>
  );
  const target =
    container && "current" in container ? container.current : container;
  if (!target) return positioner;
  return mounted ? createPortal(positioner, target) : null;
}

/** One option. Its text is the label; a check marks it while it is the selected one. */
function Item({
  className,
  children,
  disabled,
  ...props
}: WithClass<
  Omit<ComponentProps<typeof SdkSelectItem<string>>, "children" | "render">
> &
  Pick<ComponentProps<"div">, "children">) {
  // Disabled for the kit, enabled for UI SDK (see DisabledItemsContext): announced and drawn as
  // disabled, reachable by the highlight, refused by Root when pressed.
  const disabledItems = useContext(DisabledItemsContext);
  const value = props.value;
  useLayoutEffect(() => {
    if (!disabled || !disabledItems) return;
    disabledItems.add(value);
    return () => {
      disabledItems.delete(value);
    };
  }, [disabled, disabledItems, value]);
  return (
    <SdkSelectItem
      {...props}
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? "" : undefined}
      className={cx("orr-select__item", className)}
    >
      <SdkSelectItemText className="orr-select__item-text" render={<div />}>
        {children}
      </SdkSelectItemText>
      <SdkSelectItemIndicator className="orr-select__check">
        <CheckGlyph />
      </SdkSelectItemIndicator>
    </SdkSelectItem>
  );
}

function Group({
  className,
  ...props
}: WithClass<ComponentProps<typeof SdkSelectGroup>>) {
  return (
    <SdkSelectGroup {...props} className={cx("orr-select__group", className)} />
  );
}

function GroupLabel({
  className,
  ...props
}: WithClass<ComponentProps<typeof SdkSelectGroupLabel>>) {
  return (
    <SdkSelectGroupLabel
      {...props}
      className={cx("orr-select__group-label", className)}
    />
  );
}

function Separator({
  className,
  ...props
}: WithClass<ComponentProps<typeof SdkSelectSeparator>>) {
  return (
    <SdkSelectSeparator
      {...props}
      className={cx("orr-select__separator", className)}
    />
  );
}

/**
 * Select on UI SDK: a button that opens a list of options. Arrow keys and typing move the
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
  Root,
  Trigger,
  Popup,
  Item,
  Group,
  GroupLabel,
  Separator,
};
