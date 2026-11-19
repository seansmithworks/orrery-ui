# Eval lane 2: with Orrery vs without

54 scored runs: 6 scenarios x 3 conditions x 3 reps, Sonnet via `claude -p` on the subscription, the same prompt for every condition. Scores are 0..1; a cell is the mean over its runs (n in brackets). Total = mean of the five headline scorers, which are the same for every condition.

- **orrery**: lane 1 `full` (kit, catalog, golden examples, DESIGN.md, rules registry, token CSS).
- **bare**: React + TypeScript + plain CSS, and `brand.css` (the same brand variables).
- **shadcn**: shadcn/ui (Radix + Tailwind v4) preinstalled, `brand.css` wired as the Tailwind theme.

Headline scorers: **build** (tsc, repo options), **axe** (no serious or critical violation in orrery-light, orrery-dark and solar, before and after the scenario steps), **keyboard** (every control reached by Tab, focus visibly changes it, and where the scenario has an overlay: Enter opens it, Escape closes it, focus returns to the trigger), **hit-target** (the 44px square from `--hit-target-min` centred on each control lands on that control, at 1280 and 375), **brand** (half: no hard-coded colour in the agent's files; half: at least 50% of the viewport changes from orrery light to dark and 30% from orrery dark to solar).

Scenarios with a golden-example twin in the kit (lane 1): confirm-delete, crew-tabs, profile-settings. New, with no twin, composed from several components: crew-roster, onboarding, workspace-settings.

## Total, scenario by condition

| scenario | orrery | bare | shadcn |
|---|---|---|---|
| confirm-delete | 1.00 (3) | 0.95 (3) | 1.00 (3) |
| crew-roster (new) | 0.93 (3) | 1.00 (3) | 0.80 (3) |
| crew-tabs | 1.00 (3) | 1.00 (3) | 0.96 (3) |
| onboarding (new) | 0.98 (3) | 1.00 (3) | 1.00 (3) |
| profile-settings | 0.94 (3) | 1.00 (3) | 0.93 (3) |
| workspace-settings (new) | 1.00 (3) | 0.91 (3) | 0.93 (3) |
| lane-1 scenarios | 0.98 (9) | 0.98 (9) | 0.96 (9) |
| new scenarios | 0.97 (9) | 0.97 (9) | 0.91 (9) |
| **all** | **0.97 (18)** | **0.98 (18)** | **0.94 (18)** |

## By scorer, condition by scorer (all scenarios)

Mean score, then runs that passed outright.

| condition | build | axe | keyboard | hit-target | brand | total |
|---|---|---|---|---|---|---|
| orrery | 1.00 (18/18) | 0.93 (16/18) | 0.99 (17/18) | 1.00 (18/18) | 0.96 (15/18) | 0.97 |
| bare | 1.00 (18/18) | 1.00 (18/18) | 1.00 (18/18) | 0.97 (16/18) | 0.92 (12/18) | 0.98 |
| shadcn | 1.00 (18/18) | 0.83 (15/18) | 0.99 (17/18) | 0.86 (11/18) | 1.00 (18/18) | 0.94 |

## axe with and without `aria-hidden-focus`

Radix's modal dropdown menu sets `aria-hidden` on the app root while its buttons stay focusable; axe flags that as serious. Radix traps focus in the menu, so it may not affect users (unverified).

| condition | axe (all rules) | axe without aria-hidden-focus | total (all rules) | total without aria-hidden-focus |
|---|---|---|---|---|
| orrery | 0.93 (16/18) | 0.93 (16/18) | 0.97 | 0.97 |
| bare | 1.00 (18/18) | 1.00 (18/18) | 0.98 | 0.98 |
| shadcn | 0.83 (15/18) | 1.00 (18/18) | 0.94 | 0.97 |

## Pass rate by scorer, scenario by condition

| scenario | scorer | orrery | bare | shadcn |
|---|---|---|---|---|
| confirm-delete | build | 3/3 | 3/3 | 3/3 |
| confirm-delete | axe | 3/3 | 3/3 | 3/3 |
| confirm-delete | keyboard | 3/3 | 3/3 | 3/3 |
| confirm-delete | hit-target | 3/3 | 3/3 | 3/3 |
| confirm-delete | brand | 3/3 | 0/3 | 3/3 |
| crew-roster | build | 3/3 | 3/3 | 3/3 |
| crew-roster | axe | 2/3 | 3/3 | 0/3 |
| crew-roster | keyboard | 2/3 | 3/3 | 3/3 |
| crew-roster | hit-target | 3/3 | 3/3 | 3/3 |
| crew-roster | brand | 2/3 | 3/3 | 3/3 |
| crew-tabs | build | 3/3 | 3/3 | 3/3 |
| crew-tabs | axe | 3/3 | 3/3 | 3/3 |
| crew-tabs | keyboard | 3/3 | 3/3 | 3/3 |
| crew-tabs | hit-target | 3/3 | 3/3 | 2/3 |
| crew-tabs | brand | 3/3 | 3/3 | 3/3 |
| onboarding | build | 3/3 | 3/3 | 3/3 |
| onboarding | axe | 3/3 | 3/3 | 3/3 |
| onboarding | keyboard | 3/3 | 3/3 | 3/3 |
| onboarding | hit-target | 3/3 | 3/3 | 3/3 |
| onboarding | brand | 2/3 | 3/3 | 3/3 |
| profile-settings | build | 3/3 | 3/3 | 3/3 |
| profile-settings | axe | 2/3 | 3/3 | 3/3 |
| profile-settings | keyboard | 3/3 | 3/3 | 3/3 |
| profile-settings | hit-target | 3/3 | 3/3 | 0/3 |
| profile-settings | brand | 2/3 | 3/3 | 3/3 |
| workspace-settings | build | 3/3 | 3/3 | 3/3 |
| workspace-settings | axe | 3/3 | 3/3 | 3/3 |
| workspace-settings | keyboard | 3/3 | 3/3 | 2/3 |
| workspace-settings | hit-target | 3/3 | 1/3 | 0/3 |
| workspace-settings | brand | 3/3 | 0/3 | 3/3 |

## Effort

| condition | turns | wall s | CLI cost USD (mean) | CLI cost USD (sum) |
|---|---|---|---|---|
| orrery | 9.50 | 26.53 | 0.185 | 3.34 |
| bare | 5.56 | 26.63 | 0.081 | 1.46 |
| shadcn | 8.06 | 22.95 | 0.080 | 1.44 |

Subscription auth: cost is the CLI's own estimate, not a bill.

## Orrery only: lane-1 kit scorers (secondary, not in the total)

| scenario | kit-only | literals | catalog |
|---|---|---|---|
| confirm-delete | 1.00 | 1.00 | 1.00 |
| crew-roster | 0.97 | 1.00 | 1.00 |
| crew-tabs | 1.00 | 1.00 | 1.00 |
| onboarding | 0.99 | 1.00 | 1.00 |
| profile-settings | 0.98 | 1.00 | 1.00 |
| workspace-settings | 1.00 | 1.00 | 1.00 |

## Failure details

Commonest failure messages per condition and scorer (count = runs showing it).

### orrery

- **build**: no failures
- **axe** (2 runs): 1x orrery-dark: axe color-contrast (serious): …, e.g. h1; 1x orrery-dark: after steps: axe color-contrast (serious): …, e.g. h1; 1x solar: axe color-contrast (serious): …, e.g. h1; 1x solar: after steps: axe color-contrast (serious): …, e.g. h1
- **keyboard** (1 runs): 1x overlay: focus did not return to "Actions for Ada Okafor"
- **hit-target**: no failures
- **brand** (3 runs): 1x only 24% of the page changes between orrery dark and solar (needs 30%); 1x only 22% of the page changes between orrery dark and solar (needs 30%); 1x only 5% of the page changes between orrery dark and solar (needs 30%)

### bare

- **build**: no failures
- **axe**: no failures
- **keyboard**: no failures
- **hit-target** (2 runs): 2x 1280px page: "Viewer" is 18x18, its hit area is under 44x44; 2x 1280px page: "Editor" is 18x18, its hit area is under 44x44; 2x 1280px page: "Admin" is 18x18, its hit area is under 44x44; 2x 375px page: "Viewer" is 18x18, its hit area is under 44x44
- **brand** (6 runs): 6x solution.css colour function with literal channels: rgba(0

### shadcn

- **build**: no failures
- **axe** (3 runs): 3x orrery-light: after steps: axe aria-hidden-focus (serious): …, e.g. #root; 3x orrery-dark: after steps: axe aria-hidden-focus (serious): …, e.g. #root; 3x solar: after steps: axe aria-hidden-focus (serious): …, e.g. #root
- **keyboard** (1 runs): 1x overlay: focus did not return to "Delete workspace"
- **hit-target** (7 runs): 2x 1280px page: "Email me about new orbits" is 32x18, its hit area is under 44x44; 2x 375px page: "Email me about new orbits" is 32x18, its hit area is under 44x44; 2x 1280px page: "Viewer" is 20x20, its hit area is under 44x44; 2x 1280px page: "Editor" is 20x20, its hit area is under 44x44
- **brand**: no failures

## Every run

| run | build | axe | keyboard | hit-target | brand | total | turns | wall s | cost USD |
|---|---|---|---|---|---|---|---|---|---|
| confirm-delete__bare__1 | 1.00 | 1.00 | 1.00 | 1.00 | 0.75 | 0.95 | 5 | 21 | 0.060 |
| confirm-delete__bare__2 | 1.00 | 1.00 | 1.00 | 1.00 | 0.75 | 0.95 | 5 | 18 | 0.056 |
| confirm-delete__bare__3 | 1.00 | 1.00 | 1.00 | 1.00 | 0.75 | 0.95 | 5 | 19 | 0.058 |
| confirm-delete__orrery__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 23 | 0.156 |
| confirm-delete__orrery__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 7 | 18 | 0.161 |
| confirm-delete__orrery__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 15 | 0.152 |
| confirm-delete__shadcn__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 7 | 18 | 0.074 |
| confirm-delete__shadcn__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 7 | 17 | 0.070 |
| confirm-delete__shadcn__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 7 | 17 | 0.068 |
| crew-roster__bare__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 5 | 28 | 0.087 |
| crew-roster__bare__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 30 | 0.095 |
| crew-roster__bare__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 5 | 28 | 0.089 |
| crew-roster__orrery__1 | 1.00 | 0.33 | 1.00 | 1.00 | 0.75 | 0.82 | 7 | 34 | 0.186 |
| crew-roster__orrery__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 24 | 0.171 |
| crew-roster__orrery__3 | 1.00 | 1.00 | 0.80 | 1.00 | 1.00 | 0.96 | 9 | 26 | 0.191 |
| crew-roster__shadcn__1 | 1.00 | 0.00 | 1.00 | 1.00 | 1.00 | 0.80 | 8 | 23 | 0.081 |
| crew-roster__shadcn__2 | 1.00 | 0.00 | 1.00 | 1.00 | 1.00 | 0.80 | 6 | 19 | 0.081 |
| crew-roster__shadcn__3 | 1.00 | 0.00 | 1.00 | 1.00 | 1.00 | 0.80 | 5 | 18 | 0.044 |
| crew-tabs__bare__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 24 | 0.067 |
| crew-tabs__bare__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 20 | 0.063 |
| crew-tabs__bare__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 21 | 0.067 |
| crew-tabs__orrery__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 8 | 22 | 0.173 |
| crew-tabs__orrery__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 8 | 18 | 0.171 |
| crew-tabs__orrery__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 8 | 21 | 0.168 |
| crew-tabs__shadcn__1 | 1.00 | 1.00 | 1.00 | 0.40 | 1.00 | 0.88 | 9 | 22 | 0.079 |
| crew-tabs__shadcn__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 8 | 20 | 0.071 |
| crew-tabs__shadcn__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 8 | 19 | 0.071 |
| onboarding__bare__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 5 | 30 | 0.094 |
| onboarding__bare__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 5 | 31 | 0.093 |
| onboarding__bare__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 31 | 0.094 |
| onboarding__orrery__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 11 | 34 | 0.222 |
| onboarding__orrery__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 13 | 39 | 0.233 |
| onboarding__orrery__3 | 1.00 | 1.00 | 1.00 | 1.00 | 0.75 | 0.95 | 9 | 27 | 0.199 |
| onboarding__shadcn__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 8 | 28 | 0.079 |
| onboarding__shadcn__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 23 | 0.059 |
| onboarding__shadcn__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 7 | 24 | 0.063 |
| profile-settings__bare__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 23 | 0.071 |
| profile-settings__bare__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 5 | 21 | 0.064 |
| profile-settings__bare__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 23 | 0.069 |
| profile-settings__orrery__1 | 1.00 | 0.33 | 1.00 | 1.00 | 0.75 | 0.82 | 9 | 24 | 0.184 |
| profile-settings__orrery__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 13 | 29 | 0.208 |
| profile-settings__orrery__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 10 | 25 | 0.189 |
| profile-settings__shadcn__1 | 1.00 | 1.00 | 1.00 | 0.75 | 1.00 | 0.95 | 10 | 25 | 0.091 |
| profile-settings__shadcn__2 | 1.00 | 1.00 | 1.00 | 0.75 | 1.00 | 0.95 | 6 | 19 | 0.072 |
| profile-settings__shadcn__3 | 1.00 | 1.00 | 1.00 | 0.50 | 1.00 | 0.90 | 10 | 25 | 0.091 |
| workspace-settings__bare__1 | 1.00 | 1.00 | 1.00 | 0.70 | 0.75 | 0.89 | 6 | 39 | 0.115 |
| workspace-settings__bare__2 | 1.00 | 1.00 | 1.00 | 1.00 | 0.75 | 0.95 | 6 | 35 | 0.105 |
| workspace-settings__bare__3 | 1.00 | 1.00 | 1.00 | 0.70 | 0.75 | 0.89 | 6 | 38 | 0.112 |
| workspace-settings__orrery__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 11 | 31 | 0.205 |
| workspace-settings__orrery__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 14 | 38 | 0.229 |
| workspace-settings__orrery__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 16 | 31 | 0.137 |
| workspace-settings__shadcn__1 | 1.00 | 1.00 | 1.00 | 0.70 | 1.00 | 0.94 | 11 | 32 | 0.114 |
| workspace-settings__shadcn__2 | 1.00 | 1.00 | 0.80 | 0.70 | 1.00 | 0.90 | 11 | 33 | 0.117 |
| workspace-settings__shadcn__3 | 1.00 | 1.00 | 1.00 | 0.70 | 1.00 | 0.94 | 11 | 31 | 0.113 |

Each run keeps its source (`lane-2/<run>/src/`), scores (`scores.json`), run metadata (`meta.json`) and thumbnails (`shots/`). Blind side-by-side: `lane-2/compare.html`.

## Verdict

n = 18 runs per condition (6 scenarios x 3 reps), Sonnet, one prompt for all three. Totals: orrery 0.97 (0.94 before the kit fixes below), bare 0.98, shadcn 0.94 (0.97 if axe's `aria-hidden-focus` rule is left out, see below).

### After the kit fixes (orrery rerun)

The first orrery grid exposed three kit problems, fixed on `fix/kit-agent-ergonomics`: callback and focus prop types that rejected a plain `useState` setter or a ref, a Dialog golden example that taught `finalFocus={heading}` for every close, and Radio options 33px apart with 44px hit areas. All 18 orrery cells were rerun against the fixed kit with the same harness, prompt and model. The first grid is kept in `lane-2/superseded/orrery-v1/`.

| orrery | build | axe | keyboard | hit-target | brand | total | turns | CLI cost USD (mean) |
|---|---|---|---|---|---|---|---|---|
| before fixes | 0.78 (14/18) | 1.00 (18/18) | 0.98 (16/18) | 0.97 (15/18) | 0.99 (17/18) | 0.94 | 10.0 | 0.201 |
| after fixes | 1.00 (18/18) | 0.93 (16/18) | 0.99 (17/18) | 1.00 (18/18) | 0.96 (15/18) | 0.97 | 9.5 | 0.185 |

- **The three targeted failures are gone or reduced.** Build 14 to 18 of 18: every agent's setter and ref now type-checks. Hit target 15 to 18 of 18: workspace-settings went from 0 to 3 of 3. Keyboard in crew-roster 1 to 2 of 3: one run copied the new example's pattern (override `finalFocus` only when Remove deletes the row); the other still pointed `finalFocus` at the search input on every close, so Escape did not return to the trigger.
- **New misses, not from the fixed parts.** axe 2 runs and brand 3 runs (crew-roster 1, profile-settings 1, onboarding 3). The axe failures are colour contrast on the page heading in orrery dark and solar only; the brand failures are dark to solar changing 5 to 24% of the page. Inferred cause: those pages put their heading and text straight on the host page, which paints no background, so the dark brands draw light text on white. The first grid had one such brand miss.
- **Total: orrery 0.97 vs bare 0.98 and shadcn 0.94**, inside the noise for n = 3 per cell. The first-grid points below are kept as written; they describe the kit before the fixes.

### First grid (kit before the fixes)

**On these checks, Orrery showed no improvement over plain React + CSS or over shadcn/ui.** It tied shadcn and scored slightly under bare.

- **Orrery was worse on build: 14 of 18 vs 18 of 18 for both others.**
  - All 4 failures are type errors against the kit's strict callback types: Checkbox `onCheckedChange` and Radio `onValueChange` given a plain state setter, and Menu `finalFocus` given a ref. None is a runtime failure; every one of those pages rendered and passed axe.
  - The agents cannot run `tsc` (file tools only), so they never saw the errors.
  - shadcn agents wrote comparable callbacks (`onCheckedChange`, `onValueChange`) and passed build 18 of 18, because Radix types those callbacks loosely.
  - All 4 are in the new scenarios: onboarding 3 of 3, crew-roster 1 of 3.
- **Orrery was worse on keyboard in crew-roster: 1 of 3 vs 3 of 3 for both others.** Two runs pointed the Menu's `finalFocus` at the page heading, so Escape does not return focus to the trigger. The kit's Dialog golden example (`kit/dialog/Dialog.example.tsx`) teaches `finalFocus={heading}`, for a trigger that can unmount, and the agents copied it onto Menu. That is a catalog finding: the example teaches a pattern that is wrong when copied to Menu.
- **Orrery helped on brand against bare: 17 of 18 vs 12 of 18.** bare's misses are one pattern, hard-coded `rgba()` scrims and shadows, repeated across 6 runs (confirm-delete and workspace-settings, 3 of 3 each). They are not six independent findings. shadcn: 18 of 18.
- **Hit target: no clear difference.** orrery 15, bare 16, shadcn 11 of 18.
  - This scorer is stricter than WCAG 2.5.8: it asks for a 44px square that lands only on the control, with no spacing exemption.
  - All 3 Orrery misses are the kit's own Radio: each option has a 44px hit area, but options sit about 33px apart, so neighbouring areas overlap.
  - bare misses 18px native radios; shadcn misses the stock 18px-tall switch and 20px radios.
- **axe: no difference once one rule is set aside.** orrery 18, bare 18, shadcn 15 of 18. All 3 shadcn failures are `aria-hidden-focus` on `#root`, from Radix's modal dropdown menu in crew-roster. axe flags it as serious. Radix traps focus in the open menu, so it may not affect users; that is unverified here. Without that rule, shadcn passes axe 18 of 18 and totals 0.97.
- **Cost: Orrery took more.** 10.0 turns vs 5.6 for bare and 8.1 for shadcn; about 0.20 USD in CLI estimate vs 0.08 for each of the others. Most of it is the agent reading kit source and the catalog.

**What this does not measure.** These scorers check floors: accessibility, keyboard use, touch size and brand variables. They do not measure how good the page looks, how consistent it is, or whether it feels like Orrery, which is where a design system should matter most. Judge that by eye in `lane-2/compare.html`, where labels are hidden. With n = 3 per scenario and condition, a one-run difference is noise.

## Harness notes

1. **Prompt symmetry, corrected after review.** The first shadcn WORKSPACE.md described `brand.css` without the clause the other two conditions had ("colours, spacing, radii, type sizes, the minimum touch target"). All three now describe the brand variables with the same words. All 18 shadcn cells were rerun and rescored.
   - The first 18 runs are kept in `lane-2/superseded/shadcn-v1/`: total 0.75, hit target 0 of 18.
   - That one clause moved shadcn's hit target from 0 to 11 of 18 and its total from 0.75 to 0.94. Telling agents the touch-target variable exists matters more than the library.
2. **The shadcn fixture is the same for agents and scoring.** Scoring copies `components/`, `lib/` and `app.css` from the current fixture. The fixture's destructive button and badge pair `bg-destructive` (the accent; the brands have no danger hue) with `text-primary-foreground`, not stock `text-white`, which fails contrast wherever the accent is light. The rerun agents saw exactly this version.
3. **Two scorer fixes before final scoring, applied to every condition.**
   - Hit-test corners are sampled 7px inside the 44px square, not 1px, so rounded 44px controls pass.
   - The keyboard scorer counts control roles only, not tablist or radiogroup containers.
4. **The first grid's repo-unchanged check tripped.** It flagged `eval/lane2/browse.mjs`, `compare.mjs` and `report.mjs`, harness edits made in this session while it ran, not agent writes. The shadcn rerun finished with "repo unchanged". Agents run in temp workspaces outside the repo, with `--restricted` and file tools only.
5. **The orrery rerun** used the same harness, prompt, model, concurrency and scorers as the first grid; only the kit changed. It finished with "repo unchanged". The bare and shadcn cells were not rerun.
