# Kit catalog

`kit/catalog.json` is the allowed list for the kit: every component, its props, its parts, when to use it and what the caller must do for accessibility, with one golden example each. Coding agents read it today. A runtime generator can validate model output against it later (json-render style). `npm run catalog:check` fails whenever it stops matching the real components.

Brands differ through token values only. No entry has a brand, theme or style variant prop, and none may gain one.

## Adding a component: the checklist

Do these in order. `npm run catalog:check` tells you what is missing at each step.

1. **Export it** from `kit/index.ts`. Coverage fails until it has an entry.
2. **Write `kit/<folder>/<folder>.catalog.json`**, or add to the folder's existing one: `{ "example": "<Name>.example.tsx", "components": { "<ExportName>": Entry } }`. An entry goes in the folder where the component is declared.
3. **Describe it** in one sentence, 140 characters at most. Say what the component does for you here (focus trap, busy state, label wiring).
4. **List its props.** Every prop declared under `kit/` must be listed: `{ "type": "string" | "boolean" | "number", "enum"?, "default"?, "description" }`. `enum` must equal the literal union exactly. `default` must equal the initializer in the component's destructuring, and every initializer must be stated. A prop JSON cannot carry uses `"x-type"`: `node`, `element`, `function` or `object`. Never list `className`; if the component takes none, say `"className": false`.
5. **Name the passthrough** when the component forwards props it does not own: `"passthrough": "<module>#<type>"`, for example `@base-ui/react/button#Button.Props`. You may also list a forwarded prop worth knowing, marked `"x-from": "base-ui"`.
6. **State optionality.** `required` lists the props the type requires. If the props type is a union whose members require different props (IconButton: `aria-label` or `aria-labelledby`), state it as `anyOf: [{ "required": [...] }, ...]`.
7. **Compound components** (an object of parts, like `Dialog`) have no top-level `props`. List every member under `parts`, each with its own props, an `inside` naming the part it sits in, and `requiredParts` at the top.
8. **Write `useWhen`, `avoidWhen` and `a11y`**: four items each at most, 120 characters each. An `avoidWhen` item may be `{ "text", "instead" }`, where `instead` is another entry (`Button`, `Dialog.Close`) or a native tag (`a`). `a11y` holds only duties the caller must meet.
9. **Write the golden example**, `kit/<folder>/<Name>.example.tsx`: a real small task with real copy, not a props dump. It default-exports a component, imports the kit only from `"../index"`, uses every component in the folder and every required part, meets every `a11y` line, and uses token variables for spacing. It must pass `npm run rules:check -- kit`.
10. **Build and commit** `kit/catalog.json` with `npm run catalog:build`.
11. **Run** `npm run catalog:check`, `node kit/catalog/test.mjs` and `npx playwright test -c example/playwright.config.ts kit.spec.ts --project=chromium -g "golden examples"`. The last mounts every example on `example/fixtures/kit-examples.html` and runs axe.

## The checks

`check.mjs` builds one TypeScript program rooted at `kit/index.ts` and reads props with the type checker, so `Pick`, `Omit`, intersections and aliases resolve as the compiler sees them. A prop is kit-owned when its declaration lives under `kit/`.

1. Coverage: one entry per value export, in its own folder; a catalog file in every component folder.
2. Props: kit-owned props listed; listed props exist; type, enum and optionality match; the passthrough resolves and covers every prop the kit does not own.
3. Defaults: stated defaults equal the initializers.
4. Parts: parts equal the compound object's members; `inside` and `requiredParts` name real parts.
5. Example: exists, default-exports, imports from `"../index"`, uses every component and required part.
6. Prose: limits, `instead` resolves, and the repo's em-dash rule over the JSON text.
7. Aggregate: the committed `kit/catalog.json` equals a fresh build.

`test.mjs` seeds a failure for each and proves it is caught. The registry rules are `catalog-matches-kit` and `golden-example-valid` in `tokens/rules/rules.json`.
