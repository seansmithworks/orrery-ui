# Moving a kit component from Base UI to UI SDK

The recipe each M1 lane follows. Pinned: `@ui-sdk/react` and `@ui-sdk/core` at `0.1.0-beta.7`, exact. Button is the worked example (M0). M0 found two blockers, below. The Field one is resolved: Field, Input, Textarea, Checkbox, Switch and Select moved together in one lane.

## Two blockers found in M0

- **Field moves with every control inside it, in one lane (resolved).** Base UI controls read Base UI's field context; a UI SDK `Field` does not provide it. Measured with Field on UI SDK and the controls on Base UI (`wip/ui-sdk-m0-field-dialog`): label and description still reach the control, but `Field.Root disabled` leaves Checkbox and Switch enabled (all three panels), a `valueMissing` error never shows for Select or Checkbox on submit, and Textarea loses `data-filled`. A UI SDK control inside a Base UI Field is the same mix the other way round (inferred, not run).
- **UI SDK dialogs always open in the browser's top layer.** No `container` or CSS `contain` holds them (`bindLayer` and `popup.attach` call `showPopover()`; only the sheet presentation renders inline). Measured on the specimen: the three static open-state dialogs (`example/kit/main.tsx`, `StaticDialog`) leave their frames for the viewport centre, each backdrop covers the whole window, and a press on the Live trigger lands on a backdrop. The specimen needs another way to show an open dialog before Dialog can move (done in #41: each held-open popup renders in its own iframe, `example/kit/held-open-frame.tsx`). The Dialog and Live baseline cells also change shape: no viewport or portal wrapper, and the popup is `position: fixed`.

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
| `data-popup-open` (Select trigger) | `data-open` | the trigger of an open popup |
| `data-checked`, `data-unchecked`, `data-indeterminate` | same | Checkbox, Switch and their indicator, thumb |
| `data-starting-style`, `data-ending-style` | same | popup transitions |
| `data-nested` | `data-nested` | dialog |
| `data-active` | `data-selected` | the selected tab; tabs.css selects on it |
| `data-base-ui-focus-guard` | none | UI SDK traps focus without guard spans |
| `data-base-ui-portal` | none | UI SDK renders in place in the top layer |
| (none) | `data-slot="<part>"` | extra, not styled by the kit |

## Prop renames met so far

- **Dialog `disablePointerDismissal`** is UI SDK's `closeOnOutsidePress`, inverted.
- **`initialFocus={false}`** is `"none"`; UI SDK takes an element or a function, not a ref.
- **Field.Error `match`** has no `"valid"` key in UI SDK's `ValidityKey`.
- **Button `onClick`** gets `(event, { source })`; a returned Promise makes it pending (`data-pending`).
- **Tabs `activateOnFocus`** (Base UI, on the List, off by default) is UI SDK's `activation` on the root, `"automatic"` by default. The kit keeps `activateOnFocus` on `Tabs.List`, reports it to `Tabs.Root` through a context, and passes `"manual"` unless it is set.
- **Tabs `value`** is a string in UI SDK (any value in Base UI); the catalog lists it as `"type": "string"`.
- **`useRender`** is `renderElement(tag, props, render)` from `@ui-sdk/react/primitive`, typed with its `PartProps<"div">`; the same `render` element or function works. Card's passthrough is `@ui-sdk/react/primitive#PartProps<"div">`.
- **Checkbox `indeterminate`** is `checked="indeterminate"`. The kit keeps the boolean prop and maps it.
- **Switch `uncheckedValue`** has no UI SDK equivalent. The kit renders its own hidden input while off.
- **Select `items` as a map** (labels only) is UI SDK's `itemToLabel`, not its `items`. The kit's Root converts a map that way; see the disabled-options gotcha for why not to list data.
- **Select `Popup` `finalFocus`** has no equivalent on `SelectContent`; focus returns to the trigger. Dropped from the catalog.
- **Base UI `Form`** has no UI SDK part. Use a plain `<form noValidate>` whose submit handler calls `reportValidity()` first: the `invalid` events it fires are what UI SDK's Field listens for, and the submit event still fires, as with Base UI's Form.

## Behaviour changes

What a user of the kit sees differently after a move, for the release notes.

- **Select: Enter on a disabled option clears the highlight.** Base UI kept the highlight on the option; UI SDK clears it. The option is still never chosen and the list stays open.

## Gotchas

- **Cascade layers.** UI SDK writes a popover reset (padding, border, background to zero) in `@layer ui-sdk` through an adopted stylesheet, which comes after the page's sheets and so would outrank `@layer orrery.kit`. Declare `@layer ui-sdk, orrery.kit;` first in `kit/kit.css` before any popup moves. Read from UI SDK's source; the kit was not run without the line.
- **Field.Error `match` meaning.** In Base UI, `match` true renders the error even on a disabled field. UI SDK's `invalid={true}` on the Field shows errors at once; check the catalog's `invalid` and `match` descriptions against the new behaviour when Field moves.
- **Centring in the top layer.** `inset: 0; margin: auto` makes the recorded margins text-derived, which breaks the platform-stable baseline. Centre with `top: 50%; left: 50%; translate: -50% -50%`. Set `bottom: 50%` and `height: fit-content` too: an `auto` bottom on a fixed box resolves to a used value (window height minus top minus the popup's text-derived height); over-constrained, bottom is ignored and records as a plain length.
- **Dialog's backdrop ignores the content's `container`.** `DialogBackdrop` mounts in the Root's `container` or in place, never in `DialogContent`'s. The kit's `Dialog.Popup` portals both itself (its `container`, else the parent dialog's mount, else `document.body`) and passes UI SDK no container.
- **Dialog baseline shape (measured).** Gone: Base UI's portal wrapper `div`, its modal internal backdrop (a transparent fixed `div`), its non-modal focus-guard `span`, and the kit's viewport. The popup is `position: fixed` with resolved insets; `min-width` and `min-height` read `0px`, not `auto`, with no grid parent; the 8px gutter moves from the viewport's padding to the popup's `max-height`. Width, padding, border, fill, radius, shadow and type are unchanged.
- **Dialog focus props.** The kit keeps Base UI's shapes for `initialFocus` and `finalFocus` (true, false, an element, a ref, a function) and maps them: `false` is `"none"`, a ref is read on open. A function no longer receives the interaction type.
- **Trigger gone at close.** UI SDK's default `finalFocus` falls back to the nearest tabbable where the trigger was (`neighbour()` in `@ui-sdk/core` `popups/popup.js`); Base UI dropped focus on `<body>`. The `kit.spec.ts` edge case that asserts `BODY` records Base UI's behaviour and needs a gate change.
- **npm tags.** `latest` lags `beta`; always install the exact version.
- **Tabs indicator.** `TabsIndicator` writes the same `--active-tab-left`, `-right`, `-width` (and top, bottom, height) as Base UI, measured against the list's scroll area, and re-measures on selection and on a resize of the list or any tab; the kit measures nothing. Unlike Base UI it is not hidden before the first measure: the properties are unset, so tabs.css's `width: calc(...)` is invalid and the bar is zero wide until then.
- **Hidden form inputs move in the baseline.** Checkbox, Switch and Select render a hidden native input with UI SDK's inline style (`position: absolute`, `margin: -1px`, `opacity: 0`, `pointer-events: none`); Base UI's sat at `position: fixed`, top left. Every cell holding one moves its `input#0` keys.
- **Checkbox and Switch render a `<span>`.** UI SDK's root is a `<button>`, whose browser styles change the recorded font and colours. `render={<span />}` keeps Base UI's element.
- **The popover reset does not reach other documents.** UI SDK adds its `@layer ui-sdk` sheet to the main document only, so a popup in a held-open iframe keeps the browser's `[popover]` padding (0.25em) and `overflow: auto`. A popup's own CSS sets `padding` and `overflow`.
- **The kit outranks UI SDK's `[hidden]`.** UI SDK keeps some closed popups in the page with `hidden`; a kit `display` on the popup beats both the browser's rule and `@layer ui-sdk`. Add `.<popup>[hidden] { display: none }`.
- **A popup's offset is `sideOffset`, never a margin.** UI SDK writes `margin: 0` inline and places the popup's border box. Select reads `--orr-select-offset` from its positioner and passes it; a popup open from the first render waits for that read, as UI SDK places it once.
- **UI SDK mounts a closed popup on hover**, hidden, to open fast, even when the control is disabled. Select renders no content while disabled.
- **Disabled options: data wins, and disabled is skipped.** Measured. Given `items` data on the root, UI SDK builds its options from the data and ignores a rendered `SelectItem`'s `disabled` (`dataEntries` in `listbox-engine.js`): a disabled item then stays reachable and Enter or a press selects it, while it still draws as disabled. A truly disabled item is skipped by the arrows and the pointer (`skipDisabled: true`, fixed in `select-api.js`, no option), where Base UI's highlight landed on it and refused the pick. The kit keeps Base UI's behaviour: Root passes a map as `itemToLabel`, Item marks itself `aria-disabled` and `data-disabled` without telling UI SDK, and Root refuses any value change that would add a disabled value, whatever its reason: a press, Enter, typing on the closed trigger (UI SDK's trigger typeahead sets the value with reason `list-navigation`), a reset or a controller, and in multiple mode a disabled value is never added. Only a refused press also cancels the close that follows it; a refused typeahead opens and closes nothing. Upstream asks: a rendered item's `disabled` should count with `items` data, and a reachable-but-disabled mode (the engine's `blocked`) should be a Select option.
- **Select is a listbox to `checkPattern`.** The trigger is a combobox, but focus moves into the list (`aria-activedescendant` is only for a search field), so `"combobox"` fails and the open list passes `"listbox"`.
- **Switch Enter submits the form in UI SDK.** Base UI's toggled; the kit keeps that, stopping UI SDK's Enter in the capture phase.
- **A portal into a shared container mounts after its siblings.** React places a child portal's content before its parent's in the same container; the kit defers Select's portal one layout effect, as Base UI's did.
- **`Field.Error` `match` and `invalid`.** `match={true}` shows the error even on a disabled field, as before. Unlike Base UI, `invalid` alone shows an error part that has no `match`.
