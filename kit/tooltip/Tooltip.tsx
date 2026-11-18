"use client";
import { type ComponentProps } from "react";
import {
  Tooltip as SdkTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui-sdk/react/tooltip";
import { Button, type ButtonProps } from "../button/Button";
import { cx } from "../cx";
import { PopupMount, type PopupContainer } from "../popup-mount";

type WithClass<P> = Omit<P, "className"> & { className?: string };
type ButtonLook = Pick<ButtonProps, "variant" | "size">;
type Content = ComponentProps<typeof TooltipContent>;

/** Holds the open state and the delays; it renders no element of its own. */
function Root(props: Omit<ComponentProps<typeof SdkTooltip>, "container">) {
  return <SdkTooltip {...props} />;
}

/** The element the tooltip names or describes. Renders a kit Button; pass `render` for an IconButton or another element. */
function Trigger({
  variant,
  size,
  render,
  ...props
}: WithClass<ComponentProps<typeof TooltipTrigger>> & ButtonLook) {
  return (
    <TooltipTrigger
      {...props}
      render={render ?? <Button variant={variant} size={size} />}
    />
  );
}

export type TooltipPopupProps = WithClass<
  Omit<
    Content,
    | "container"
    | "render"
    | "children"
    | "side"
    | "align"
    | "sideOffset"
    | "collisionPadding"
  >
> & {
  /** The trigger's side the tooltip opens on. Default: top. */
  side?: Content["side"];
  /** The tooltip's alignment along that side. Default: center. */
  align?: Content["align"];
  /** Extra gap from the trigger in px, added to the kit's offset. */
  sideOffset?: number;
  /** The gap in px the popup keeps from the window's edges, on every side. */
  collisionPadding?: number;
  /** Where the tooltip mounts, an element or a ref to one. Defaults to in place, in the top layer. */
  container?: PopupContainer;
  /** The label: short plain text, never a link or a button. */
  children?: string;
};

/**
 * The label, in the browser's top layer while open. It is in the page from the start, hidden, so
 * it names or describes its trigger before focus reaches it. By default it opens above the trigger,
 * the kit's --orr-tooltip-offset away; sideOffset adds to it.
 */
function Popup({
  container,
  className,
  side,
  align,
  sideOffset,
  collisionPadding = 8,
  children,
  ...props
}: TooltipPopupProps) {
  return (
    <PopupMount
      className="orr-tooltip__positioner"
      offsetProperty="--orr-tooltip-offset"
      container={container}
    >
      {(offset) => (
        <TooltipContent
          {...props}
          side={side}
          align={align}
          sideOffset={offset + (sideOffset ?? 0)}
          collisionPadding={collisionPadding}
          // Component class first, orr-floating second: the kit baseline keys an element by its first orr- class.
          className={cx("orr-tooltip", "orr-floating", className)}
        >
          {children}
        </TooltipContent>
      )}
    </PopupMount>
  );
}

/**
 * Tooltip on UI SDK: a short label that shows when the pointer rests on the trigger or keyboard
 * focus reaches it, and goes on Escape or when the pointer leaves. It names a trigger that has no
 * name of its own (an icon button) and describes any other. Plain text only: it cannot take focus,
 * so use a Popover for anything interactive.
 *
 * ```tsx
 * <Tooltip.Root>
 *   <Tooltip.Trigger render={<IconButton aria-label="Save"><SaveGlyph /></IconButton>} />
 *   <Tooltip.Popup>Save</Tooltip.Popup>
 * </Tooltip.Root>
 * ```
 */
export const Tooltip = { Root, Trigger, Popup };
