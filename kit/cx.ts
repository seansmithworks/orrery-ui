/** Joins class names, skipping empty ones. */
export const cx = (...names: Array<string | false | null | undefined>) =>
  names.filter(Boolean).join(" ");
