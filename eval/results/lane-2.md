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
| confirm-delete | 0.98 (3) | 0.95 (3) | 0.80 (3) |
| crew-roster (new) | 0.91 (3) | 1.00 (3) | 0.60 (3) |
| crew-tabs | 1.00 (3) | 1.00 (3) | 0.80 (3) |
| onboarding (new) | 0.80 (3) | 1.00 (3) | 0.80 (3) |
| profile-settings | 1.00 (3) | 1.00 (3) | 0.80 (3) |
| workspace-settings (new) | 0.96 (3) | 0.91 (3) | 0.73 (3) |
| lane-1 scenarios | 0.99 (9) | 0.98 (9) | 0.80 (9) |
| new scenarios | 0.89 (9) | 0.97 (9) | 0.71 (9) |
| **all** | **0.94 (18)** | **0.98 (18)** | **0.75 (18)** |

## By scorer, condition by scorer (all scenarios)

Mean score, then runs that passed outright.

| condition | build | axe | keyboard | hit-target | brand | total |
|---|---|---|---|---|---|---|
| orrery | 0.78 (14/18) | 1.00 (18/18) | 0.98 (16/18) | 0.97 (15/18) | 0.99 (17/18) | 0.94 |
| bare | 1.00 (18/18) | 1.00 (18/18) | 1.00 (18/18) | 0.97 (16/18) | 0.92 (12/18) | 0.98 |
| shadcn | 1.00 (18/18) | 0.80 (14/18) | 0.99 (17/18) | 0.00 (0/18) | 0.99 (17/18) | 0.75 |

## Pass rate by scorer, scenario by condition

| scenario | scorer | orrery | bare | shadcn |
|---|---|---|---|---|
| confirm-delete | build | 3/3 | 3/3 | 3/3 |
| confirm-delete | axe | 3/3 | 3/3 | 3/3 |
| confirm-delete | keyboard | 3/3 | 3/3 | 3/3 |
| confirm-delete | hit-target | 3/3 | 3/3 | 0/3 |
| confirm-delete | brand | 2/3 | 0/3 | 3/3 |
| crew-roster | build | 2/3 | 3/3 | 3/3 |
| crew-roster | axe | 3/3 | 3/3 | 0/3 |
| crew-roster | keyboard | 1/3 | 3/3 | 3/3 |
| crew-roster | hit-target | 3/3 | 3/3 | 0/3 |
| crew-roster | brand | 3/3 | 3/3 | 3/3 |
| crew-tabs | build | 3/3 | 3/3 | 3/3 |
| crew-tabs | axe | 3/3 | 3/3 | 3/3 |
| crew-tabs | keyboard | 3/3 | 3/3 | 3/3 |
| crew-tabs | hit-target | 3/3 | 3/3 | 0/3 |
| crew-tabs | brand | 3/3 | 3/3 | 3/3 |
| onboarding | build | 0/3 | 3/3 | 3/3 |
| onboarding | axe | 3/3 | 3/3 | 3/3 |
| onboarding | keyboard | 3/3 | 3/3 | 3/3 |
| onboarding | hit-target | 3/3 | 3/3 | 0/3 |
| onboarding | brand | 3/3 | 3/3 | 3/3 |
| profile-settings | build | 3/3 | 3/3 | 3/3 |
| profile-settings | axe | 3/3 | 3/3 | 3/3 |
| profile-settings | keyboard | 3/3 | 3/3 | 3/3 |
| profile-settings | hit-target | 3/3 | 3/3 | 0/3 |
| profile-settings | brand | 3/3 | 3/3 | 3/3 |
| workspace-settings | build | 3/3 | 3/3 | 3/3 |
| workspace-settings | axe | 3/3 | 3/3 | 2/3 |
| workspace-settings | keyboard | 3/3 | 3/3 | 2/3 |
| workspace-settings | hit-target | 0/3 | 1/3 | 0/3 |
| workspace-settings | brand | 3/3 | 0/3 | 2/3 |

## Effort

| condition | turns | wall s | CLI cost USD (mean) | CLI cost USD (sum) |
|---|---|---|---|---|
| orrery | 10.00 | 28.78 | 0.201 | 3.62 |
| bare | 5.56 | 26.63 | 0.081 | 1.46 |
| shadcn | 6.06 | 18.82 | 0.052 | 0.93 |

Subscription auth: cost is the CLI's own estimate, not a bill.

## Orrery only: lane-1 kit scorers (secondary, not in the total)

| scenario | kit-only | literals | catalog |
|---|---|---|---|
| confirm-delete | 1.00 | 1.00 | 1.00 |
| crew-roster | 0.97 | 1.00 | 1.00 |
| crew-tabs | 1.00 | 1.00 | 1.00 |
| onboarding | 1.00 | 1.00 | 1.00 |
| profile-settings | 1.00 | 1.00 | 1.00 |
| workspace-settings | 1.00 | 1.00 | 1.00 |

## Failure details

Commonest failure messages per condition and scorer (count = runs showing it).

### orrery

- **build** (4 runs): 2x solution.tsx: error TS2322: Type '(c: boolean) => void' is not assignable to type '(checked: CheckedState, details: ChangeDetails<CheckboxCheckedChangeReason>) => void'.; 1x solution.tsx: error TS2322: Type 'RefObject<HTMLHeadingElement / null>' is not assignable to type 'PopupFocusTarget / undefined'.; 1x solution.tsx: error TS2322: Type 'Dispatch<SetStateAction<string>>' is not assignable to type '(value: string / null, details: ChangeDetails<RadioGroupValueChangeReason>) => void'.; 1x solution.tsx: error TS2322: Type 'Dispatch<SetStateAction<boolean>>' is not assignable to type '(checked: CheckedState, details: ChangeDetails<CheckboxCheckedChangeReason>) => void'.
- **axe**: no failures
- **keyboard** (2 runs): 2x overlay: focus did not return to "Actions for Ada Okafor"
- **hit-target** (3 runs): 3x 1280px page: "Viewer" is 16x16, its hit area is under 44x44; 3x 1280px page: "Editor" is 16x16, its hit area is under 44x44; 3x 375px page: "Viewer" is 16x16, its hit area is under 44x44; 3x 375px page: "Editor" is 16x16, its hit area is under 44x44
- **brand** (1 runs): 1x only 0% of the page changes between orrery dark and solar (needs 30%)

### bare

- **build**: no failures
- **axe**: no failures
- **keyboard**: no failures
- **hit-target** (2 runs): 2x 1280px page: "Viewer" is 18x18, its hit area is under 44x44; 2x 1280px page: "Editor" is 18x18, its hit area is under 44x44; 2x 1280px page: "Admin" is 18x18, its hit area is under 44x44; 2x 375px page: "Viewer" is 18x18, its hit area is under 44x44
- **brand** (6 runs): 6x solution.css colour function with literal channels: rgba(0

### shadcn

- **build**: no failures
- **axe** (4 runs): 3x orrery-light: after steps: axe aria-hidden-focus (serious): …, e.g. #root; 3x orrery-dark: after steps: axe aria-hidden-focus (serious): …, e.g. #root; 3x solar: after steps: axe aria-hidden-focus (serious): …, e.g. #root; 1x orrery-dark: after steps: axe color-contrast (serious): …, e.g. .text-white
- **keyboard** (1 runs): 1x overlay: focus did not return to "Delete workspace"
- **hit-target** (18 runs): 6x 1280px page: "Save changes" is 123x36, its hit area is under 44x44; 3x 1280px page: "Delete project" is 125x36, its hit area is under 44x44; 3x 1280px overlay: "Keep project" is 118x36, its hit area is under 44x44; 3x 1280px overlay: "Delete" is 75x36, its hit area is under 44x44
- **brand** (1 runs): 1x solution.tsx named colour: text-white

## Every run

| run | build | axe | keyboard | hit-target | brand | total | turns | wall s | cost USD |
|---|---|---|---|---|---|---|---|---|---|
| confirm-delete__bare__1 | 1.00 | 1.00 | 1.00 | 1.00 | 0.75 | 0.95 | 5 | 21 | 0.060 |
| confirm-delete__bare__2 | 1.00 | 1.00 | 1.00 | 1.00 | 0.75 | 0.95 | 5 | 18 | 0.056 |
| confirm-delete__bare__3 | 1.00 | 1.00 | 1.00 | 1.00 | 0.75 | 0.95 | 5 | 19 | 0.058 |
| confirm-delete__orrery__1 | 1.00 | 1.00 | 1.00 | 1.00 | 0.75 | 0.95 | 5 | 14 | 0.151 |
| confirm-delete__orrery__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 15 | 0.157 |
| confirm-delete__orrery__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 15 | 0.157 |
| confirm-delete__shadcn__1 | 1.00 | 1.00 | 1.00 | 0.00 | 1.00 | 0.80 | 5 | 15 | 0.039 |
| confirm-delete__shadcn__2 | 1.00 | 1.00 | 1.00 | 0.00 | 1.00 | 0.80 | 5 | 13 | 0.040 |
| confirm-delete__shadcn__3 | 1.00 | 1.00 | 1.00 | 0.00 | 1.00 | 0.80 | 6 | 16 | 0.043 |
| crew-roster__bare__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 5 | 28 | 0.087 |
| crew-roster__bare__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 30 | 0.095 |
| crew-roster__bare__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 5 | 28 | 0.089 |
| crew-roster__orrery__1 | 0.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.80 | 8 | 27 | 0.191 |
| crew-roster__orrery__2 | 1.00 | 1.00 | 0.80 | 1.00 | 1.00 | 0.96 | 18 | 57 | 0.304 |
| crew-roster__orrery__3 | 1.00 | 1.00 | 0.80 | 1.00 | 1.00 | 0.96 | 6 | 22 | 0.176 |
| crew-roster__shadcn__1 | 1.00 | 0.00 | 1.00 | 0.00 | 1.00 | 0.60 | 6 | 21 | 0.052 |
| crew-roster__shadcn__2 | 1.00 | 0.00 | 1.00 | 0.00 | 1.00 | 0.60 | 5 | 16 | 0.040 |
| crew-roster__shadcn__3 | 1.00 | 0.00 | 1.00 | 0.00 | 1.00 | 0.60 | 5 | 18 | 0.046 |
| crew-tabs__bare__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 24 | 0.067 |
| crew-tabs__bare__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 20 | 0.063 |
| crew-tabs__bare__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 21 | 0.067 |
| crew-tabs__orrery__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 8 | 19 | 0.176 |
| crew-tabs__orrery__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 9 | 21 | 0.177 |
| crew-tabs__orrery__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 8 | 18 | 0.175 |
| crew-tabs__shadcn__1 | 1.00 | 1.00 | 1.00 | 0.00 | 1.00 | 0.80 | 6 | 15 | 0.040 |
| crew-tabs__shadcn__2 | 1.00 | 1.00 | 1.00 | 0.00 | 1.00 | 0.80 | 7 | 18 | 0.047 |
| crew-tabs__shadcn__3 | 1.00 | 1.00 | 1.00 | 0.00 | 1.00 | 0.80 | 7 | 17 | 0.047 |
| onboarding__bare__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 5 | 30 | 0.094 |
| onboarding__bare__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 5 | 31 | 0.093 |
| onboarding__bare__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 31 | 0.094 |
| onboarding__orrery__1 | 0.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.80 | 14 | 44 | 0.252 |
| onboarding__orrery__2 | 0.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.80 | 11 | 34 | 0.221 |
| onboarding__orrery__3 | 0.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.80 | 11 | 34 | 0.221 |
| onboarding__shadcn__1 | 1.00 | 1.00 | 1.00 | 0.00 | 1.00 | 0.80 | 4 | 19 | 0.045 |
| onboarding__shadcn__2 | 1.00 | 1.00 | 1.00 | 0.00 | 1.00 | 0.80 | 3 | 19 | 0.045 |
| onboarding__shadcn__3 | 1.00 | 1.00 | 1.00 | 0.00 | 1.00 | 0.80 | 3 | 18 | 0.042 |
| profile-settings__bare__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 23 | 0.071 |
| profile-settings__bare__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 5 | 21 | 0.064 |
| profile-settings__bare__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 6 | 23 | 0.069 |
| profile-settings__orrery__1 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 11 | 29 | 0.200 |
| profile-settings__orrery__2 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 11 | 28 | 0.199 |
| profile-settings__orrery__3 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 10 | 27 | 0.192 |
| profile-settings__shadcn__1 | 1.00 | 1.00 | 1.00 | 0.00 | 1.00 | 0.80 | 6 | 18 | 0.054 |
| profile-settings__shadcn__2 | 1.00 | 1.00 | 1.00 | 0.00 | 1.00 | 0.80 | 6 | 17 | 0.053 |
| profile-settings__shadcn__3 | 1.00 | 1.00 | 1.00 | 0.00 | 1.00 | 0.80 | 6 | 18 | 0.056 |
| workspace-settings__bare__1 | 1.00 | 1.00 | 1.00 | 0.70 | 0.75 | 0.89 | 6 | 39 | 0.115 |
| workspace-settings__bare__2 | 1.00 | 1.00 | 1.00 | 1.00 | 0.75 | 0.95 | 6 | 35 | 0.105 |
| workspace-settings__bare__3 | 1.00 | 1.00 | 1.00 | 0.70 | 0.75 | 0.89 | 6 | 38 | 0.112 |
| workspace-settings__orrery__1 | 1.00 | 1.00 | 1.00 | 0.80 | 1.00 | 0.96 | 14 | 41 | 0.233 |
| workspace-settings__orrery__2 | 1.00 | 1.00 | 1.00 | 0.82 | 1.00 | 0.96 | 12 | 38 | 0.222 |
| workspace-settings__orrery__3 | 1.00 | 1.00 | 1.00 | 0.82 | 1.00 | 0.96 | 12 | 35 | 0.220 |
| workspace-settings__shadcn__1 | 1.00 | 0.33 | 0.80 | 0.00 | 0.75 | 0.58 | 9 | 27 | 0.077 |
| workspace-settings__shadcn__2 | 1.00 | 1.00 | 1.00 | 0.00 | 1.00 | 0.80 | 10 | 26 | 0.084 |
| workspace-settings__shadcn__3 | 1.00 | 1.00 | 1.00 | 0.00 | 1.00 | 0.80 | 10 | 26 | 0.083 |

Each run keeps its source (`lane-2/<run>/src/`), scores (`scores.json`), run metadata (`meta.json`) and thumbnails (`shots/`). Blind side-by-side: `lane-2/compare.html`.

## Verdict

n = 18 runs per condition (6 scenarios x 3 reps), Sonnet, one prompt for all three.

**Against plain React + CSS (bare), Orrery showed no improvement on these checks.** bare 0.98, orrery 0.94.

- **Orrery was worse on build.** 4 of 18 Orrery runs failed the type check against the kit's typed callbacks: Checkbox `onCheckedChange` and Radio `onValueChange` given a plain setter, and Menu `finalFocus` given a ref. All 4 are in the new scenarios (onboarding 3 of 3, crew-roster 1 of 3). bare: 0 of 18.
- **Orrery was worse on keyboard in crew-roster.** 2 of 3 runs pointed the Menu's `finalFocus` at the page heading, so Escape does not return focus to the trigger. bare: 18 of 18.
- **Orrery helped on brand fidelity.** 17 of 18 vs 12 of 18. All 6 bare misses are hard-coded `rgba()` scrims and shadows (confirm-delete and workspace-settings, 3 of 3 each).
- **No difference on axe** (18 of 18 each), on hit target (15 vs 16 of 18), or on the three lane-1 scenarios that have a golden example in the kit (0.99 vs 0.98). Orrery's 3 hit-target misses are the kit's own Radio: each option has a 44px hit area, but options sit about 33px apart, so neighbouring areas overlap. bare's 2 misses are 18px native radios.
- **Orrery cost more.** 10.0 turns vs 5.6 per run, and about 2.5 times the CLI cost estimate (0.20 vs 0.08 USD), mostly the agent reading kit source and the catalog.

**Against shadcn/ui, Orrery was better**: 0.94 vs 0.75. Almost all of the gap is two scorers:

- **Hit target:** shadcn passed 0 of 18. Its stock 36px buttons and inputs and 32px icon buttons fall under the 44px floor.
- **axe:** shadcn failed 4 of 18. In 3 runs, Radix's modal dropdown menu sets `aria-hidden` on the app root while that root's buttons stay focusable. The fourth is one agent's own `text-white`.

On build, keyboard and brand, shadcn matched or beat Orrery.

**What this does not measure.** These scorers check floors: accessibility, keyboard use, touch size and brand variables. They do not measure how good the page looks, how consistent it is, or whether it feels like Orrery, which is where a design system should matter most. Judge that by eye in `lane-2/compare.html`, where labels are hidden. With n = 3 per scenario and condition, a one-run difference is noise. The 44px floor is Orrery's own token, so shadcn is held to a bar its defaults do not aim for.

## Harness notes

- Corrected before final scoring, after the first scoring pass:
  - The hit test sampled corners 1px inside the 44px square, which failed any rounded 44px control. Corners now sit 7px in.
  - The keyboard scorer counted tablist and radiogroup containers as controls. It now counts only control roles.
  - The shadcn theme mapped `destructive` to the accent while the stock destructive button keeps `text-white`, which fails contrast wherever the accent is light. The fixture's destructive button and badge now use `text-primary-foreground`. The agents saw the stock `text-white` version.
  - All 54 runs were rescored after these fixes, with the same code for every condition.
- The grid's repo-unchanged check tripped: it reported `eval/lane2/browse.mjs`, `compare.mjs` and `report.mjs`. Those were harness edits made in this session while the grid ran, not agent writes. Agents ran in temp workspaces outside the repo, with `--restricted` and file tools only.
