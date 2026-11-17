# Moving a kit component from Base UI to UI SDK

The recipe each M1 lane follows. Pinned: `@ui-sdk/react` and `@ui-sdk/core` at `0.1.0-beta.7`, exact. Button is the worked example (M0); Field and Dialog have two blockers, below, that decide the order of what follows.

## Two blockers found in M0

- **Field moves with every control inside it, in one lane.** Base UI controls read Base UI's field context; a UI SDK `Field` does not provide it. Measured with Field on UI SDK and the controls on Base UI (`wip/ui-sdk-m0-field-dialog`): label and description still reach the control, but `Field.Root disabled` leaves Checkbox and Switch enabled (all three panels), a `valueMissing` error never shows for Select or Checkbox on submit, and Textarea loses `data-filled`. A UI SDK control inside a Base UI Field is the same mix the other way round (inferred, not run).
- **UI SDK dialogs always open in the browser's top layer.** No `container` or CSS `contain` holds them (`bindLayer` and `popup.attach` call `showPopover()`; only the sheet presentation renders inline). Measured on the specimen: the three static open-state dialogs (`example/kit/main.tsx`, `StaticDialog`) leave their frames for the viewport centre, each backdrop covers the whole window, and a press on the Live trigger lands on a backdrop. The specimen needs another way to show an open dialog before Dialog can move. The Dialog and Live baseline cells also change shape: no viewport or portal wrapper, and the popup is `position: fixed`.

## Recipe, per component

1. **Imports.** Replace `@base-ui/react/<x>` with `@ui-sdk/react/<x>`. UI SDK exports flat parts, not a namespace: `Field.Label` is `FieldLabel`, `Dialog.Popup` is `DialogContent`.
2. **Props types.** UI SDK does not export each part's props by name. Type a part as `ComponentProps<typeof SdkPart>`, with `Omit<..., "className"> & { className?: string }` as before: UI SDK's `className`, `style` and `children` may be functions of state, which the kit does not promise.
3. **State attributes.** Adapt in the component, not in tokens. See the table.
4. **Catalog.** Set `passthrough` to `@ui-sdk/react/<x>#<Part>` (the component, not a props type; `kit/catalog/check.mjs` reads its first parameter). Mark listed passthrough props `"x-from": "ui-sdk"`. Change "on Base UI" in descriptions. Then `npm run catalog:build` and `npm run kit-preview:build`.
5. **Baseline.** Expect no change to the component's block. A diff is a visual change until proven otherwise; list every key that moves.
6. **checkPattern.** Where the component has a WAI-ARIA pattern, add `patternProblems(page, root, "<pattern>")` from `example/kit/check-pattern.ts`, with `transitionsOff(page)` first.

## Attribute mapping, Base UI to UI SDK

| Base UI | UI SDK | Note |
| --- | --- | --- |
| `data-disabled` | `data-disabled` | Button, Field parts, Input |
| `data-invalid` | `data-invalid` | on every Field part and the control |
| `data-filled` | `data-filled` | Input |
| `[readonly]` | `[readonly]`, plus `data-readonly` | kit CSS keeps the native attribute |
| `data-open`, `data-closed` | `data-open`, `data-closed` | popups |
| `data-starting-style`, `data-ending-style` | same | popup transitions |
| `data-nested` | `data-nested` | dialog |
| `data-base-ui-focus-guard` | none | UI SDK traps focus without guard spans |
| `data-base-ui-portal` | none | UI SDK renders in place in the top layer |
| (none) | `data-slot="<part>"` | extra, not styled by the kit |

## Prop renames met so far

- **Dialog `disablePointerDismissal`** is UI SDK's `closeOnOutsidePress`, inverted.
- **`initialFocus={false}`** is `"none"`; UI SDK takes an element or a function, not a ref.
- **Field.Error `match`** has no `"valid"` key in UI SDK's `ValidityKey`.
- **Button `onClick`** gets `(event, { source })`; a returned Promise makes it pending (`data-pending`).

## Gotchas

- **Cascade layers.** UI SDK writes a popover reset (padding, border, background to zero) in `@layer ui-sdk` through an adopted stylesheet, which comes after the page's sheets and so would outrank `@layer orrery.kit`. Declare `@layer ui-sdk, orrery.kit;` first in `kit/kit.css` before any popup moves. Read from UI SDK's source; the kit was not run without the line.
- **Field.Error `match` meaning.** In Base UI, `match` true renders the error even on a disabled field. UI SDK's `invalid={true}` on the Field shows errors at once; check the catalog's `invalid` and `match` descriptions against the new behaviour when Field moves.
- **Centring in the top layer.** `inset: 0; margin: auto` makes the recorded margins text-derived, which breaks the platform-stable baseline. Centre with `top: 50%; left: 50%; translate: -50% -50%`.
- **npm tags.** `latest` lags `beta`; always install the exact version.
