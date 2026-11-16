import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

/**
 * The files behind example/kit-baseline.spec.ts: one per specimen block,
 * example/kit-baseline/<slug>.json, holding that block's cells for every panel. A block's
 * name is the part of its cell keys before the first "/" ("Button/rest/primary" is block
 * "Button"). Pure Node, no browser, so the split and the comparison can be run on their own.
 */

export type Props = Record<string, string>;
export type Cell = Record<string, Props>; // element key -> prop -> value
export type PanelData = Record<string, Cell>; // cell key -> element
export interface BlockFile {
  block: string;
  panels: Record<string, PanelData>; // panel id -> cells
}

export const blockOf = (cellKey: string) => {
  const i = cellKey.indexOf("/");
  if (i <= 0)
    throw new Error(`kit baseline: cell key "${cellKey}" has no block`);
  return cellKey.slice(0, i);
};

/** "Dense row" -> "dense-row.json". */
export const fileOf = (block: string) =>
  `${block
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.json`;

/** One panel's cells, grouped by block. */
export function splitByBlock(data: PanelData): Record<string, PanelData> {
  const out: Record<string, PanelData> = {};
  for (const [cell, els] of Object.entries(data))
    (out[blockOf(cell)] ??= {})[cell] = els;
  return out;
}

function flatten(data: PanelData): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [cell, els] of Object.entries(data))
    for (const [el, vals] of Object.entries(els))
      for (const [prop, v] of Object.entries(vals))
        flat[`${cell} | ${el} | ${prop}`] = v;
  return flat;
}

/** Every difference as one line naming cell, element and property. */
export function diff(expected: PanelData, actual: PanelData): string[] {
  const a = flatten(expected);
  const b = flatten(actual);
  const lines: string[] = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (a[k] !== b[k])
      lines.push(
        `${k}: baseline ${a[k] === undefined ? "(absent)" : JSON.stringify(a[k])} != actual ${b[k] === undefined ? "(absent)" : JSON.stringify(b[k])}`,
      );
  }
  return lines.sort();
}

const sorted = <T>(o: Record<string, T>) =>
  Object.keys(o)
    .sort()
    .map((k) => [k, o[k]] as const);

/** One line per property, so a baseline diff names the property that changed. */
export function serialize(b: BlockFile): string {
  const lines: string[] = [
    "{",
    `  "block": ${JSON.stringify(b.block)},`,
    '  "panels": {',
  ];
  const panels = sorted(b.panels);
  panels.forEach(([panel, cells], pi) => {
    lines.push(`    ${JSON.stringify(panel)}: {`);
    const cs = sorted(cells);
    cs.forEach(([cell, els], ci) => {
      lines.push(`      ${JSON.stringify(cell)}: {`);
      const es = sorted(els);
      es.forEach(([el, vals], ei) => {
        lines.push(`        ${JSON.stringify(el)}: {`);
        const ps = sorted(vals);
        ps.forEach(([prop, v], pi2) =>
          lines.push(
            `          ${JSON.stringify(prop)}: ${JSON.stringify(v)}${pi2 < ps.length - 1 ? "," : ""}`,
          ),
        );
        lines.push(`        }${ei < es.length - 1 ? "," : ""}`);
      });
      lines.push(`      }${ci < cs.length - 1 ? "," : ""}`);
    });
    lines.push(`    }${pi < panels.length - 1 ? "," : ""}`);
  });
  lines.push("  }", "}", "");
  return lines.join("\n");
}

/** Every block file in dir, by block name. A file whose name is not its block's slug is an error. */
export function readBlocks(dir: string): Record<string, BlockFile> {
  const out: Record<string, BlockFile> = {};
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()) {
    const b = JSON.parse(readFileSync(join(dir, f), "utf8")) as BlockFile;
    if (fileOf(b.block) !== f)
      throw new Error(
        `kit baseline: ${f} holds block "${b.block}", which belongs in ${fileOf(b.block)}`,
      );
    out[b.block] = b;
  }
  return out;
}

/** Writes one panel of one block, keeping the file's other panels. */
export function writeBlockPanel(
  dir: string,
  block: string,
  panel: string,
  data: PanelData,
) {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, fileOf(block));
  const file: BlockFile = existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf8")) as BlockFile)
    : { block, panels: {} };
  file.panels[panel] = data;
  writeFileSync(path, serialize(file));
}

/**
 * Compares one panel's recorded cells with the stored block files.
 * update: UPDATE_KIT_BASELINE=1. only: the KIT_BASELINE_BLOCKS names, or null for every block.
 * Returns the blocks to write (update mode, named) and one error line per failure; every
 * line names its block and panel. Blocks not written are always compared.
 */
export function compareBlocks(
  panel: string,
  actual: Record<string, PanelData>,
  stored: Record<string, BlockFile>,
  update: boolean,
  only: string[] | null,
): { write: string[]; errors: string[] } {
  const write: string[] = [];
  const errors: string[] = [];
  if (only && !update)
    errors.push("KIT_BASELINE_BLOCKS is set without UPDATE_KIT_BASELINE=1");
  for (const name of only ?? [])
    if (!(name in actual))
      errors.push(
        `KIT_BASELINE_BLOCKS names block "${name}", which is not on the page (blocks: ${Object.keys(actual).sort().join(", ")})`,
      );
  for (const [block, data] of sorted(actual)) {
    if (update && (!only || only.includes(block))) {
      write.push(block);
      continue;
    }
    const expected = stored[block]?.panels[panel];
    if (!expected) {
      errors.push(
        `no baseline for block ${block} in panel ${panel} (example/kit-baseline/${fileOf(block)}); record it with UPDATE_KIT_BASELINE=1 KIT_BASELINE_BLOCKS="${block}" npm run test:kit-baseline`,
      );
      continue;
    }
    for (const line of diff(expected, data))
      errors.push(`block ${block}, panel ${panel}: ${line}`);
  }
  for (const [block, file] of sorted(stored))
    if (!(block in actual) && file.panels[panel])
      errors.push(
        `block ${block} has a baseline (example/kit-baseline/${fileOf(block)}) but is not on the page in panel ${panel}`,
      );
  return { write, errors };
}
