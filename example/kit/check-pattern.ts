import type { Page } from "@playwright/test";
import { build } from "esbuild";

/**
 * UI SDK's `checkPattern(root, pattern)` (from `@ui-sdk/core/testing`, pinned exact in
 * package.json) run in the page: it drives the element with real keyboard and focus events and
 * throws with a list of every way it departs from the WAI-ARIA pattern. It is `@experimental`
 * (may change in any minor), so it lives in tests only, and a UI SDK upgrade that changes it
 * fails here, never in the shipped kit.
 *
 * It needs the page's own DOM, so the module is bundled once per worker with esbuild and
 * injected as a script; no page or kit file imports it.
 *
 *   expect(await patternProblems(page, '[data-portal-for="orrery-light"]', "dialog")).toBe("");
 */

let bundle: Promise<string> | undefined;
const testingKit = () =>
  (bundle ??= build({
    stdin: {
      contents:
        'import { checkPattern } from "@ui-sdk/core/testing"; window.uiSdkCheckPattern = checkPattern;',
      resolveDir: process.cwd(),
      loader: "ts",
    },
    bundle: true,
    format: "iife",
    write: false,
    logLevel: "silent",
  }).then((out) => out.outputFiles[0].text));

/** Runs checkPattern on the element `rootSelector` finds. "" when it finds no problems, else its message. */
export async function patternProblems(
  page: Page,
  rootSelector: string,
  pattern: string,
) {
  await page.addScriptTag({ content: await testingKit() });
  return page.evaluate(
    async ([sel, p]) => {
      const check = (
        window as unknown as {
          uiSdkCheckPattern: (root: Element, p: string) => Promise<void>;
        }
      ).uiSdkCheckPattern;
      const root = document.querySelector(sel);
      if (!root) return `no element matches ${sel}`;
      try {
        await check(root, p);
        return "";
      } catch (e) {
        return (e as Error).message;
      }
    },
    [rootSelector, pattern] as const,
  );
}

/** Turns every CSS transition off, so a check that looks right after a key press sees the settled DOM. */
export const transitionsOff = (page: Page) =>
  page.addStyleTag({
    content: "*, *::before, *::after { transition: none !important; }",
  });
