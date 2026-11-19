# orrery-v1: the first 18 orrery runs

Run against the kit at `fc8e542` (PR #53). They exposed three kit problems, fixed on `fix/kit-agent-ergonomics`:

1. **Types.** Checkbox `onCheckedChange`, Radio.Group `onValueChange` and Menu.Popup `finalFocus` rejected a plain
   `useState` setter or a ref. Build failed in 4 runs (onboarding 3 of 3, crew-roster 1 of 3).
2. **Golden example.** `kit/dialog/Dialog.example.tsx` passed `finalFocus={heading}` on every close; two crew-roster
   agents copied it onto Menu, so Escape did not return focus to the trigger (keyboard 1 of 3).
3. **Radio spacing.** Options sat 33px apart with 44px hit areas, so neighbours overlapped (workspace-settings hit
   target 0 of 3).

Scores here: total 0.94; build 14/18, axe 18/18, keyboard 16/18, hit target 15/18, brand 17/18. All 18 orrery cells
were rerun against the fixed kit with the same harness, prompt and model; the reruns are the ones in `lane-2/`.
These are kept so the change is visible. Their `scores.json` were scored against the kit at `fc8e542`; rescoring
them now would build against the fixed kit.
