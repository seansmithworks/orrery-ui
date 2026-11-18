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
