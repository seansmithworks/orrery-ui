"use client";
import {
  useCallback,
  useLayoutEffect,
  useState,
  type ComponentProps,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  Menu as SdkMenu,
  MenuCheckboxItem as SdkMenuCheckboxItem,
  MenuContent as SdkMenuContent,
  MenuGroup as SdkMenuGroup,
  MenuGroupLabel as SdkMenuGroupLabel,
  MenuItem as SdkMenuItem,
  MenuItemIndicator as SdkMenuItemIndicator,
  MenuRadioGroup as SdkMenuRadioGroup,
  MenuRadioItem as SdkMenuRadioItem,
  MenuSeparator as SdkMenuSeparator,
  MenuSub as SdkMenuSub,
  MenuSubContent as SdkMenuSubContent,
  MenuSubTrigger as SdkMenuSubTrigger,
  MenuTrigger as SdkMenuTrigger,
} from "@ui-sdk/react/menu";
import { Button, type ButtonProps } from "../button/Button";
import { cx } from "../cx";

type WithClass<P> = Omit<P, "className"> & { className?: string };
type ButtonLook = Pick<ButtonProps, "variant" | "size">;
type Children = Pick<ComponentProps<"div">, "children">;

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

function DotGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <circle cx="10" cy="10" r="3" />
    </svg>
  );
}

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
      <path d="M8 6l4 4-4 4" />
    </svg>
  );
}

export type MenuRootProps = Omit<ComponentProps<typeof SdkMenu>, "container">;

/** Holds the open state and runs the actions. It renders no element of its own. */
function Root(props: MenuRootProps) {
  return <SdkMenu {...props} />;
}

export type MenuTriggerProps = WithClass<
  Omit<ComponentProps<typeof SdkMenuTrigger>, "render">
> &
  ButtonLook;

/** The button that opens the menu. Renders a kit Button. */
function Trigger({ variant, size, ...props }: MenuTriggerProps) {
  return (
    <SdkMenuTrigger
      {...props}
      render={<Button variant={variant} size={size} />}
    />
  );
}

type Content = ComponentProps<typeof SdkMenuContent>;

export type MenuPopupProps = WithClass<
  Omit<Content, "container" | "render" | "children" | "sideOffset">
> & {
  /** Extra gap from the trigger in px, added to the kit's offset. */
  sideOffset?: number;
  /** Where the popup mounts, an element or a ref to one. Defaults to in place, in the top layer. */
  container?: HTMLElement | null | RefObject<HTMLElement | null>;
} & Children;

/**
 * Popup in the kit's positioner element, which holds the kit's offset. UI SDK opens the popup in the
 * browser's top layer, wherever it sits in the DOM. By default it opens below the trigger, aligned
 * to its start, and keeps an 8px gutter from the window edge (the Dialog's and Select's gutter). The
 * gap to the trigger is the kit's --orr-menu-offset; sideOffset adds to it.
 */
function Popup({
  container,
  className,
  children,
  sideOffset,
  collisionPadding = 8,
  ...props
}: MenuPopupProps) {
  // UI SDK places the popup's border box itself and writes margin: 0 inline, so the kit's offset
  // cannot be a CSS margin. It is read from --orr-menu-offset on the positioner and passed on,
  // before the popup first renders: a popup open from the start is placed once, with it.
  const [offset, setOffset] = useState<number | null>(null);
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const v = parseFloat(
      el.ownerDocument
        .defaultView!.getComputedStyle(el)
        .getPropertyValue("--orr-menu-offset"),
    );
    setOffset(Number.isFinite(v) ? v : 0);
  }, []);
  // A portal mounts after the container's own content, so a held-open popup never lands ahead of
  // the trigger it belongs to in the same container.
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => setMounted(true), []);
  const positioner = (
    <div className="orr-menu__positioner" ref={measure}>
      {offset !== null && (
        <SdkMenuContent
          {...props}
          sideOffset={offset + (sideOffset ?? 0)}
          collisionPadding={collisionPadding}
          // Component class first, orr-floating second: the kit baseline keys an element by its first orr- class.
          className={cx("orr-menu__popup", "orr-floating", className)}
        >
          {children}
        </SdkMenuContent>
      )}
    </div>
  );
  const target =
    container && "current" in container ? container.current : container;
  if (!target) return positioner;
  return mounted ? createPortal(positioner, target) : null;
}

export type MenuItemProps = WithClass<
  Omit<
    ComponentProps<typeof SdkMenuItem>,
    "render" | "destructive" | "children"
  >
> &
  Children;

/** An action. Pressing it runs onSelect, then the menu's onAction, and closes the menu. A `shortcut` shows its keys at the end. */
function Item({ className, children, ...props }: MenuItemProps) {
  return (
    <SdkMenuItem {...props} className={cx("orr-menu__item", className)}>
      <span className="orr-menu__item-text">{children}</span>
    </SdkMenuItem>
  );
}

/** An item that checks and unchecks an option; a check marks it while it is on. Stays open. */
function CheckboxItem({
  className,
  children,
  ...props
}: WithClass<
  Omit<ComponentProps<typeof SdkMenuCheckboxItem>, "render" | "children">
> &
  Children) {
  return (
    <SdkMenuCheckboxItem
      {...props}
      className={cx("orr-menu__item", "orr-menu__item--choice", className)}
    >
      <SdkMenuItemIndicator className="orr-menu__indicator" keepMounted>
        <CheckGlyph />
      </SdkMenuItemIndicator>
      <span className="orr-menu__item-text">{children}</span>
    </SdkMenuCheckboxItem>
  );
}

/** Radio items that share one value. Name it with a GroupLabel. */
function RadioGroup<T extends string = string>({
  className,
  ...props
}: WithClass<Omit<ComponentProps<typeof SdkMenuRadioGroup<T>>, "render">>) {
  return (
    <SdkMenuRadioGroup<T>
      {...props}
      className={cx("orr-menu__group", className)}
    />
  );
}

/** One choice in a RadioGroup; a dot marks it while it is the chosen one. Stays open. */
function RadioItem({
  className,
  children,
  ...props
}: WithClass<
  Omit<ComponentProps<typeof SdkMenuRadioItem>, "render" | "children">
> &
  Children) {
  return (
    <SdkMenuRadioItem
      {...props}
      className={cx("orr-menu__item", "orr-menu__item--choice", className)}
    >
      <SdkMenuItemIndicator className="orr-menu__indicator" keepMounted>
        <DotGlyph />
      </SdkMenuItemIndicator>
      <span className="orr-menu__item-text">{children}</span>
    </SdkMenuRadioItem>
  );
}

function Group({
  className,
  ...props
}: WithClass<ComponentProps<typeof SdkMenuGroup>>) {
  return (
    <SdkMenuGroup {...props} className={cx("orr-menu__group", className)} />
  );
}

function GroupLabel({
  className,
  ...props
}: WithClass<ComponentProps<typeof SdkMenuGroupLabel>>) {
  return (
    <SdkMenuGroupLabel
      {...props}
      className={cx("orr-menu__group-label", className)}
    />
  );
}

function Separator({
  className,
  ...props
}: WithClass<ComponentProps<typeof SdkMenuSeparator>>) {
  return (
    <SdkMenuSeparator
      {...props}
      className={cx("orr-menu__separator", className)}
    />
  );
}

/** A submenu. Put its SubTrigger and SubPopup inside, in a Popup. It renders no element of its own. */
function Sub(props: ComponentProps<typeof SdkMenuSub>) {
  return <SdkMenuSub {...props} />;
}

/** The item that opens its submenu; a chevron at the end points toward it. */
function SubTrigger({
  className,
  children,
  ...props
}: WithClass<
  Omit<ComponentProps<typeof SdkMenuSubTrigger>, "render" | "children">
> &
  Children) {
  return (
    <SdkMenuSubTrigger
      {...props}
      className={cx("orr-menu__item", "orr-menu__sub-trigger", className)}
    >
      <span className="orr-menu__item-text">{children}</span>
      <span className="orr-menu__chevron" aria-hidden="true">
        <ChevronGlyph />
      </span>
    </SdkMenuSubTrigger>
  );
}

/** The submenu's popup, beside its SubTrigger. It stays inside its parent popup. */
function SubPopup({
  className,
  collisionPadding = 8,
  ...props
}: WithClass<
  Omit<ComponentProps<typeof SdkMenuSubContent>, "container" | "render">
>) {
  return (
    <SdkMenuSubContent
      {...props}
      collisionPadding={collisionPadding}
      className={cx("orr-menu__popup", "orr-floating", className)}
    />
  );
}

/**
 * Menu on UI SDK: a button that opens a list of actions and options. Arrow keys, Home, End and
 * typing move the highlight, Enter or a click runs the item, Escape and an outside press close, and
 * focus returns to the trigger. A disabled item stays focusable and never runs.
 *
 * ```tsx
 * <Menu.Root onAction={(value) => run(value)}>
 *   <Menu.Trigger>Actions</Menu.Trigger>
 *   <Menu.Popup>
 *     <Menu.Item value="rename">Rename</Menu.Item>
 *     <Menu.Item value="duplicate">Duplicate</Menu.Item>
 *   </Menu.Popup>
 * </Menu.Root>
 * ```
 */
export const Menu = {
  Root,
  Trigger,
  Popup,
  Item,
  CheckboxItem,
  RadioGroup,
  RadioItem,
  Group,
  GroupLabel,
  Separator,
  Sub,
  SubTrigger,
  SubPopup,
};
