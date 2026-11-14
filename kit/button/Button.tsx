"use client";
import { Button as BaseButton } from "@base-ui/react/button";
import { cx } from "../cx";

export type ButtonVariant = "primary" | "secondary" | "quiet";
export type ButtonSize = "s" | "m";

export type ButtonProps = Omit<BaseButton.Props, "className"> & {
  /** primary: accent fill. secondary: layer fill plus hairline. quiet: text only. */
  variant?: ButtonVariant;
  /** m is the hit target (44px); s draws 32px and keeps a 44px hit area. */
  size?: ButtonSize;
  /** Disabled for input, still focusable, announced as busy. */
  loading?: boolean;
  className?: string;
};

/** Button on Base UI. Styles: kit.css (.orr-button). */
export function Button({
  variant = "secondary",
  size = "m",
  loading = false,
  disabled,
  focusableWhenDisabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  // While loading, the label stays in place (and in the accessible name) but is not painted;
  // the spinner sits over it, so the button keeps its width.
  return (
    <BaseButton
      {...rest}
      disabled={disabled || loading}
      focusableWhenDisabled={loading || focusableWhenDisabled}
      aria-busy={loading || undefined}
      data-variant={variant}
      data-size={size}
      data-loading={loading ? "" : undefined}
      className={cx("orr-button", className)}
    >
      <span className="orr-button__label">{children}</span>
      {loading && <span className="orr-button__spinner" aria-hidden="true" />}
    </BaseButton>
  );
}

type Named =
  | { "aria-label": string; "aria-labelledby"?: string }
  | { "aria-labelledby": string; "aria-label"?: string };

export type IconButtonProps = Omit<
  ButtonProps,
  "aria-label" | "aria-labelledby"
> &
  Named;

/** A square Button holding one icon. It has no visible text, so it requires an accessible name. */
export function IconButton(props: IconButtonProps) {
  return <Button {...props} data-icon="" />;
}
