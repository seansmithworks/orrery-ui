"use client";
import {
  useCallback,
  useLayoutEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

/** Where a popup mounts: an element or a ref to one. Unset, the popup renders in place, in the top layer. */
export type PopupContainer = HTMLElement | null | RefObject<HTMLElement | null>;

/**
 * The positioner Popover and Tooltip share (Select's pattern): a `display: contents` element that
 * holds the component's kit-local properties, reads its offset property, and mounts the popup
 * once it has. UI SDK places a popup's border box itself and writes `margin: 0` inline, so the
 * kit's gap to the trigger cannot be a CSS margin: it is read here and passed on as `sideOffset`.
 * A popup open from the first render is placed once, so it waits for the read.
 */
export function PopupMount({
  className,
  offsetProperty,
  container,
  children,
}: {
  className: string;
  /** The custom property on the positioner that holds the gap, such as --orr-popover-offset. */
  offsetProperty: string;
  container?: PopupContainer;
  children: (offset: number) => ReactNode;
}) {
  const [offset, setOffset] = useState<number | null>(null);
  const measure = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      const v = parseFloat(
        el.ownerDocument
          .defaultView!.getComputedStyle(el)
          .getPropertyValue(offsetProperty),
      );
      setOffset(Number.isFinite(v) ? v : 0);
    },
    [offsetProperty],
  );
  // A portal mounts after the container's own content, so a held-open popup never lands ahead of
  // the trigger it belongs to in the same container.
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => setMounted(true), []);
  const positioner = (
    <div className={className} ref={measure}>
      {offset !== null && children(offset)}
    </div>
  );
  const target =
    container && "current" in container ? container.current : container;
  if (!target) return positioner;
  return mounted ? createPortal(positioner, target) : null;
}
