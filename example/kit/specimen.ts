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
 * with a spec- class are skipped. Cell names are unique within the block; cells do not nest.
 *
 * Width and height are recorded only on elements with no text (the label text of a component
 * would make them platform-dependent). fixedSize names, as CSS selector lists, the elements whose
 * width or height the kit's CSS declares, so they are recorded even when they hold text.
 *
 * Open states render inside the cell (portal into a frame in the cell, as the Dialog block's
 * static dialog does), never into the panel's live-dialog portal, which the Live block owns.
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
