"use client";
// SPIKE (branch spike/ui-sdk-dialog, never merged): kit/dialog/Dialog.tsx rebuilt on UI SDK's
// ready-made dialog parts. Same public parts and kit-facing props; same orr- classes and tokens.
import type { ComponentProps, ReactNode } from "react";
import {
  Dialog as SdkDialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  type DialogOpenChangeDetails,
} from "@ui-sdk/react/dialog";
import { Button, IconButton, type ButtonProps } from "../../kit/button/Button";
import { cx } from "../../kit/cx";
import "./dialog.css";

type ButtonLook = Pick<ButtonProps, "variant" | "size">;
type ContentProps = ComponentProps<typeof DialogContent>;

/** The Base UI Root props the kit's callers use, mapped onto UI SDK's names. */
type RootProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: DialogOpenChangeDetails) => void;
  modal?: boolean | "trap-focus";
  /** Base UI's name. UI SDK calls it closeOnOutsidePress, inverted. */
  disablePointerDismissal?: boolean;
  children?: ReactNode;
};

function Root({ disablePointerDismissal, ...props }: RootProps) {
  return (
    <SdkDialog
      {...props}
      closeOnOutsidePress={disablePointerDismissal ? false : undefined}
    />
  );
}

/** Opens the dialog. Renders a kit Button. */
function Trigger({
  variant,
  size,
  ...props
}: Omit<ComponentProps<typeof DialogTrigger>, "className" | "render"> &
  ButtonLook & { className?: string }) {
  return (
    <DialogTrigger
      {...props}
      render={<Button variant={variant} size={size} />}
    />
  );
}

export type DialogPopupProps = Omit<
  ContentProps,
  "className" | "container" | "initialFocus"
> & {
  className?: string;
  /** Where the dialog mounts. Defaults to document.body, as the Base UI kit does. */
  container?: ContentProps["container"];
  /** Base UI's `false` (leave focus alone) is UI SDK's "none". */
  initialFocus?: ContentProps["initialFocus"] | false;
};

/** Backdrop and popup. The popup sits in the browser's top layer; focus is trapped while open and returns to the trigger on close. */
function Popup({
  container,
  className,
  initialFocus,
  ...props
}: DialogPopupProps) {
  const target =
    container ?? (typeof document === "undefined" ? undefined : document.body);
  return (
    <>
      <DialogBackdrop className="orr-dialog__backdrop" />
      <DialogContent
        {...props}
        container={target}
        initialFocus={initialFocus === false ? "none" : initialFocus}
        className={cx("orr-dialog", "orr-dialog--top-layer", className)}
      />
    </>
  );
}

function Title({
  className,
  ...props
}: Omit<ComponentProps<typeof DialogTitle>, "className"> & {
  className?: string;
}) {
  return (
    <DialogTitle {...props} className={cx("orr-dialog__title", className)} />
  );
}

function Description({
  className,
  ...props
}: Omit<ComponentProps<typeof DialogDescription>, "className"> & {
  className?: string;
}) {
  return (
    <DialogDescription
      {...props}
      className={cx("orr-dialog__description", className)}
    />
  );
}

/** Closes the dialog. Renders a kit Button; pass `render` to use another element. */
function Close({
  variant,
  size,
  render,
  ...props
}: Omit<ComponentProps<typeof DialogClose>, "className"> &
  ButtonLook & { className?: string }) {
  return (
    <DialogClose
      {...props}
      render={render ?? <Button variant={variant} size={size} />}
    />
  );
}

function CloseGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

/** The corner close control: a quiet IconButton named "Close" unless `label` says otherwise. */
function CloseIcon({ label = "Close" }: { label?: string }) {
  const button = (
    <IconButton
      variant="quiet"
      size="s"
      aria-label={label}
      className="orr-dialog__close"
    />
  );
  return (
    <DialogClose render={button}>
      <CloseGlyph />
    </DialogClose>
  );
}

/** Header row (title and the corner close) and the actions row. Layout only. */
function Header({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cx("orr-dialog__header", className)} />;
}
function Actions({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cx("orr-dialog__actions", className)} />;
}

export const Dialog = {
  Root,
  Trigger,
  Popup,
  Header,
  Title,
  Description,
  Actions,
  Close,
  CloseIcon,
};
