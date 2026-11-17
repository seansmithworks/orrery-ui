"use client";
import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactElement,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  Dialog as SdkDialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@ui-sdk/react/dialog";
import { Button, IconButton, type ButtonProps } from "../button/Button";
import { cx } from "../cx";

type WithClass<P> = Omit<P, "className"> & { className?: string };
type ButtonLook = Pick<ButtonProps, "variant" | "size">;
type ContentProps = ComponentProps<typeof DialogContent>;
type Mount = HTMLElement | ShadowRoot | null;
/** Where focus goes: true for the default, false to leave it, an element or a ref to one, or a function returning one. */
type FocusTarget =
  | boolean
  | HTMLElement
  | RefObject<HTMLElement | null>
  | (() => HTMLElement | null | undefined);

/** Holds the open state; it renders no element of its own. */
function Root({
  disablePointerDismissal,
  ...props
}: Omit<
  ComponentProps<typeof SdkDialog>,
  "closeOnOutsidePress" | "container"
> & {
  /** When true, a press outside the dialog does not close it. */
  disablePointerDismissal?: boolean;
}) {
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
}: WithClass<Omit<ComponentProps<typeof DialogTrigger>, "render">> &
  ButtonLook) {
  return (
    <DialogTrigger
      {...props}
      render={<Button variant={variant} size={size} />}
    />
  );
}

// The mount of the open dialog around this one, so a nested dialog mounts beside its parent.
const MountContext = createContext<Mount | undefined>(undefined);

const focusTarget = (t: FocusTarget | undefined) =>
  t === false
    ? "none"
    : t === true || t === undefined
      ? undefined
      : typeof t === "function"
        ? () => t() ?? undefined
        : "current" in t
          ? () => t.current ?? undefined
          : t;

export type DialogPopupProps = WithClass<
  Omit<ContentProps, "container" | "initialFocus" | "finalFocus">
> & {
  /** Where the dialog mounts, an element or a ref to one. Defaults to its parent dialog's, else document.body. */
  container?: Mount | RefObject<Mount>;
  /** What takes focus on open. Default: the first tabbable element. */
  initialFocus?: FocusTarget;
  /** What takes focus on close. Default: the trigger. */
  finalFocus?: FocusTarget;
};

/**
 * Backdrop and popup in one part, mounted in `container` (default: the parent dialog's, else
 * document.body). While open both sit in the browser's top layer, above every z-index. Focus is
 * trapped while open and returns to the trigger on close.
 */
function Popup({
  container,
  className,
  initialFocus,
  finalFocus,
  ...props
}: DialogPopupProps) {
  const inherited = useContext(MountContext);
  const own =
    container && "current" in container ? container.current : container;
  const target =
    own ??
    inherited ??
    (typeof document === "undefined" ? null : document.body);
  const parts = (
    <MountContext.Provider value={target}>
      <DialogBackdrop className="orr-dialog__backdrop" />
      <DialogContent
        {...props}
        initialFocus={focusTarget(initialFocus)}
        finalFocus={focusTarget(finalFocus)}
        // Component class first, orr-floating second: the kit baseline keys an element by its first orr- class.
        className={cx("orr-dialog", "orr-floating", className)}
      />
    </MountContext.Provider>
  );
  return target ? createPortal(parts, target) : parts;
}

function Title({
  className,
  ...props
}: WithClass<ComponentProps<typeof DialogTitle>>) {
  return (
    <DialogTitle {...props} className={cx("orr-dialog__title", className)} />
  );
}

function Description({
  className,
  ...props
}: WithClass<ComponentProps<typeof DialogDescription>>) {
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
}: WithClass<ComponentProps<typeof DialogClose>> & ButtonLook) {
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
  const button: ReactElement<Record<string, unknown>> = (
    <IconButton
      variant="quiet"
      size="s"
      aria-label={label}
      className="orr-dialog__close"
    >
      <CloseGlyph />
    </IconButton>
  );
  return <DialogClose render={button} />;
}

/** Header row (title and the corner close) and the actions row. Layout only. */
function Header({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cx("orr-dialog__header", className)} />;
}
function Actions({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cx("orr-dialog__actions", className)} />;
}

/**
 * Dialog on UI SDK: modal (`aria-modal`, the page behind inert, scroll locked), focus trapped,
 * Escape and an outside press close it, focus returns to the trigger.
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
