import type { ComponentPropsWithRef } from "react";
import { useRender } from "@base-ui/react/use-render";
import { cx } from "../cx";

export type CardProps = Omit<useRender.ComponentProps<"div">, "className"> & {
  className?: string;
};

type SlotProps = Omit<ComponentPropsWithRef<"div">, "className"> & {
  className?: string;
};

/** The card surface: a plain in-flow container. `render` swaps the element (section, article, li). */
function Root({ className, render, ...props }: CardProps) {
  return useRender({
    defaultTagName: "div",
    render,
    props: { ...props, className: cx("orr-card", className) },
  });
}

function Header({ className, ...props }: SlotProps) {
  return <div {...props} className={cx("orr-card__header", className)} />;
}

function Body({ className, ...props }: SlotProps) {
  return <div {...props} className={cx("orr-card__body", className)} />;
}

function Footer({ className, ...props }: SlotProps) {
  return <div {...props} className={cx("orr-card__footer", className)} />;
}

/**
 * Card: an in-flow surface at elevation level 1. It has no role, no tab stop and no state of its own.
 *
 * ```tsx
 * <Card.Root render={<article />} aria-labelledby="t">
 *   <Card.Header><h3 id="t">Orbit 7</h3></Card.Header>
 *   <Card.Body>...</Card.Body>
 *   <Card.Footer><Button>Open</Button></Card.Footer>
 * </Card.Root>
 * ```
 */
export const Card = { Root, Header, Body, Footer };
