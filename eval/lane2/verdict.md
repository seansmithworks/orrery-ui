## Verdict

n = 18 runs per condition (6 scenarios x 3 reps), Sonnet, one prompt for all three. Totals: orrery 0.94, bare 0.98, shadcn 0.94 (0.97 if axe's `aria-hidden-focus` rule is left out, see below).

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
