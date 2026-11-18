"use client";
import { type ComponentProps } from "react";
import {
  Popover as SdkPopover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@ui-sdk/react/popover";
import { Button, type ButtonProps } from "../button/Button";
import { cx } from "../cx";
import { PopupMount, type PopupContainer } from "../popup-mount";

type WithClass<P> = Omit<P, "className"> & { className?: string };
type ButtonLook = Pick<ButtonProps, "variant" | "size">;
type Content = ComponentProps<typeof PopoverContent>;

/** Holds the open state; it renders no element of its own. */
function Root(props: Omit<ComponentProps<typeof SdkPopover>, "container">) {
  return <SdkPopover {...props} />;
}

/** Opens the popover. Renders a kit Button. */
function Trigger({
  variant,
  size,
  ...props
}: WithClass<Omit<ComponentProps<typeof PopoverTrigger>, "render">> &
  ButtonLook) {
  return (
    <PopoverTrigger
      {...props}
      render={<Button variant={variant} size={size} />}
    />
  );
}

export type PopoverPopupProps = WithClass<
  Omit<
    Content,
    | "container"
    | "render"
    | "side"
    | "align"
    | "sideOffset"
    | "collisionPadding"
  >
> & {
  /** The trigger's side the popover opens on. Default: bottom. */
  side?: Content["side"];
  /** The popover's alignment along that side. Default: center. */
  align?: Content["align"];
  /** Extra gap from the trigger in px, added to the kit's offset. */
  sideOffset?: number;
  /** The gap in px the popup keeps from the window's edges, on every side. */
  collisionPadding?: number;
  /** Where the popover mounts, an element or a ref to one. Defaults to in place, in the top layer. */
  container?: PopupContainer;
};

/**
 * The panel, in the browser's top layer while open. By default it opens below the trigger and
 * keeps the kit's 8px gutter from the window edge. The gap to the trigger is the kit's
 * --orr-popover-offset; sideOffset adds to it.
 */
function Popup({
  container,
  className,
  side,
  align,
  sideOffset,
  collisionPadding = 8,
  ...props
}: PopoverPopupProps) {
  return (
    <PopupMount
      className="orr-popover__positioner"
      offsetProperty="--orr-popover-offset"
      container={container}
    >
      {(offset) => (
        <PopoverContent
          {...props}
          side={side}
          align={align}
          sideOffset={offset + (sideOffset ?? 0)}
          collisionPadding={collisionPadding}
          // Component class first, orr-floating second: the kit baseline keys an element by its first orr- class.
          className={cx("orr-popover", "orr-floating", className)}
        />
      )}
    </PopupMount>
  );
}

function Title({
  className,
  ...props
}: WithClass<ComponentProps<typeof PopoverTitle>>) {
  return (
    <PopoverTitle {...props} className={cx("orr-popover__title", className)} />
  );
}

function Description({
  className,
  ...props
}: WithClass<ComponentProps<typeof PopoverDescription>>) {
  return (
    <PopoverDescription
      {...props}
      className={cx("orr-popover__description", className)}
    />
  );
}

/** Closes the popover. Renders a kit Button; pass `render` to use another element. */
function Close({
  variant,
  size,
  render,
  ...props
}: WithClass<ComponentProps<typeof PopoverClose>> & ButtonLook) {
  return (
    <PopoverClose
      {...props}
      render={render ?? <Button variant={variant} size={size} />}
    />
  );
}

/**
 * Popover on UI SDK: a small panel beside its trigger for a short task. Not modal: the page stays
 * usable, Escape and an outside press close it, focus moves in on open and returns to the trigger.
 *
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger>Share</Popover.Trigger>
 *   <Popover.Popup>
 *     <Popover.Title>Share this chart</Popover.Title>
 *     <Popover.Description>Anyone with the link can view it.</Popover.Description>
 *     <Popover.Close>Done</Popover.Close>
 *   </Popover.Popup>
 * </Popover.Root>
 * ```
 */
export const Popover = { Root, Trigger, Popup, Title, Description, Close };
