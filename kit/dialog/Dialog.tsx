"use client";
import type { ComponentProps, ReactElement } from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Button, IconButton, type ButtonProps } from "../button/Button";
import { cx } from "../cx";

type WithClass<P> = Omit<P, "className"> & { className?: string };
type ButtonLook = Pick<ButtonProps, "variant" | "size">;

/** Opens the dialog. Renders a kit Button. */
function Trigger({
  variant,
  size,
  ...props
}: WithClass<BaseDialog.Trigger.Props> & ButtonLook) {
  return (
    <BaseDialog.Trigger
      {...props}
      render={<Button variant={variant} size={size} />}
    />
  );
}

export type DialogPopupProps = WithClass<BaseDialog.Popup.Props> & {
  /** Where the portal mounts. Defaults to document.body. */
  container?: BaseDialog.Portal.Props["container"];
  /** Fill the nearest positioned ancestor instead of the window. */
  contained?: boolean;
};

/** Backdrop, viewport and popup in one part. Focus is trapped while open and returns to the trigger on close. */
function Popup({
  container,
  contained,
  className,
  ...props
}: DialogPopupProps) {
  const where = contained ? "" : undefined;
  return (
    <BaseDialog.Portal container={container}>
      <BaseDialog.Backdrop
        className="orr-dialog__backdrop"
        data-contained={where}
      />
      <BaseDialog.Viewport
        className="orr-dialog__viewport"
        data-contained={where}
      >
        <BaseDialog.Popup {...props} className={cx("orr-dialog", className)} />
      </BaseDialog.Viewport>
    </BaseDialog.Portal>
  );
}

function Title({ className, ...props }: WithClass<BaseDialog.Title.Props>) {
  return (
    <BaseDialog.Title
      {...props}
      className={cx("orr-dialog__title", className)}
    />
  );
}

function Description({
  className,
  ...props
}: WithClass<BaseDialog.Description.Props>) {
  return (
    <BaseDialog.Description
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
}: WithClass<BaseDialog.Close.Props> & ButtonLook) {
  return (
    <BaseDialog.Close
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
  const button: ReactElement = (
    <IconButton
      variant="quiet"
      size="s"
      aria-label={label}
      className="orr-dialog__close"
    >
      <CloseGlyph />
    </IconButton>
  );
  return <BaseDialog.Close render={button} />;
}

/** Header row (title and the corner close) and the actions row. Layout only. */
function Header({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cx("orr-dialog__header", className)} />;
}
function Actions({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cx("orr-dialog__actions", className)} />;
}

/**
 * Dialog on Base UI: modal, focus trapped, Escape and an outside press close it,
 * focus returns to the trigger.
 *
 * ```tsx
 * <Dialog.Root>
 *   <Dialog.Trigger variant="primary">Rename</Dialog.Trigger>
 *   <Dialog.Popup>
 *     <Dialog.Header><Dialog.Title>Rename orbit</Dialog.Title><Dialog.CloseIcon /></Dialog.Header>
 *     <Dialog.Description>The new name shows on every chart.</Dialog.Description>
 *     <Dialog.Actions><Dialog.Close>Cancel</Dialog.Close></Dialog.Actions>
 *   </Dialog.Popup>
 * </Dialog.Root>
 * ```
 */
export const Dialog = {
  Root: BaseDialog.Root,
  Trigger,
  Popup,
  Header,
  Title,
  Description,
  Actions,
  Close,
  CloseIcon,
};
