import type { ComponentType } from "react";

/**
 * The contract for one component's specimen block: example/kit/specimens/<name>.specimen.tsx.
 * example/kit/main.tsx finds every such file (import.meta.glob), sorts them by filename and
 * renders each as a block after the six exemplar blocks, once per panel (orrery light, orrery
 * dark, solar). Adding a block means adding the file; no shared file is edited.
 *
 *   export const block = "Switch";                  // block title and baseline name
 *   export const note = "strawman";                 // optional chip beside the title
 *   export const fixedSize = { height: ".orr-switch" }; // optional, see below
 *   export default function SwitchSpecimen({ panel }: SpecimenProps) {
 *     return (
 *       <div className="spec-fields">
 *         <div className="spec-cell" data-cell="rest">
 *           <span className="spec-label" aria-hidden="true">rest</span>
 *           <Switch />
 *         </div>
 *       </div>
 *     );
 *   }
 *
 * Cells. Every element carrying data-cell="<name>" is one cell of the computed-style baseline
 * (example/kit-baseline.spec.ts), keyed "<block>/<name>". The cell element is a wrapper: what is
 * inside it is recorded, not the wrapper itself. Inside a cell, .spec-label subtrees and elements
 * with a spec- class are skipped. Cell names are unique within the block. A cell must record at
 * least one element, and cells must not nest: the baseline gate throws on either.
 *
 * Width and height are NOT recorded on any element that holds text, unless fixedSize lists it:
 * text metrics differ between macOS and Linux. They are recorded automatically only on text-free
 * elements. A Switch rendered with a visible label holds text, so its height is not locked unless
 * the specimen says `fixedSize = { height: ".orr-switch" }`. fixedSize names, as CSS selector
 * lists, the elements whose width or height the kit's CSS declares.
 *
 * Held-open states (an open popup, held open for the picture) render inside the cell in a
 * <HeldOpenFrame> (./held-open-frame.tsx), as the Dialog block's static dialog and Select's open
 * cells do: a same-origin iframe with the panel's brand, theme and style sheets, so a popup stays
 * in its frame whether the library portals it or puts it in the browser's top layer. Never into
 * the panel's live-dialog portal, which the Live block owns. The baseline gate records a frame's
 * document in place of its iframe; kit-test.ts has heldPopupsShown and panelScopes for suites.
 * `panel` is for ids that must be unique on the page. The file may import its own CSS.
 */
export type SpecimenPanel = {
  id: string;
  brand: string;
  theme: "light" | "dark";
};

export type SpecimenProps = { panel: SpecimenPanel };

export type SpecimenModule = {
  /** Block title, and the baseline file's name: example/kit-baseline/<slug>.json. No "/". */
  block: string;
  note?: string;
  /** CSS selector lists: elements inside the cells whose width / height are recorded. */
  fixedSize?: { width?: string; height?: string };
  default: ComponentType<SpecimenProps>;
};

/** The six exemplar blocks in example/kit/main.tsx. A specimen file may not reuse their names. */
export const CORE_BLOCKS = [
  "Live",
  "Button",
  "IconButton",
  "Dense row",
  "Field",
  "Dialog",
] as const;

/** A block's baseline file name: "Dense row" -> "dense-row.json". */
export const fileOf = (block: string) =>
  `${block
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.json`;

/** Throws when two block names would share one baseline file ("Dense Row" and "Dense row"). */
export function assertDistinctFiles(blocks: readonly string[]) {
  const seen = new Map<string, string>();
  for (const b of blocks) {
    const f = fileOf(b);
    const other = seen.get(f);
    if (other !== undefined)
      throw new Error(
        `kit baseline: blocks "${other}" and "${b}" would share example/kit-baseline/${f}; rename one`,
      );
    seen.set(f, b);
  }
}
