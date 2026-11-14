## 1. WRONG

**F1. V3 and T8 are false. There is one brand gate, not two.** `artifact/check/check.mjs:29` reads "With a brand file, both come from head.py --brand, so a validation failure surfaces as head.py's own error line", and `:33` calls head.py through `execFileSync('python3', [... 'head.py' ...])`. `core.js:280-286` only checks where brand colors appear on the rendered page. It does not validate the brand file. V3 repeats `ORCHESTRATOR.md:28` instead of the code. **If it ships:** step 1.7 ("its duplicate validation is removed") takes away the only brand validator. `check.mjs --brand` then loses its exit-2 contract (`check/README.md` "Brand:"), and `check/test.mjs` fixtures `kitchen-sink-branded.html` and `brand-accent-misplaced.html` break.

**F2. Phase 0.1 replaces a file whose shape other tools depend on.** `tokens.json` is "Artifact contract shape" (`head.py:1`). Four things consume that shape, and the plan only gates CSS output in 0.4:
- `check.mjs:45` reads it directly as the baseline.
- `--tokens` accepts "a Tuner export" in the same shape (`check/README.md`).
- `head.py --print-tokens` emits it.
- The installed skill's Refresh step overwrites `snapshot/tokens.json` from a claude.ai system Artifact (`~/.claude/skills/artifact-house-style/SKILL.md:58-60`, URL in `snapshot/VERSION` "system:").

**If it ships:** the DTCG source either has to emit the contract shape back out, which 0.1 doesn't say, or the checker, Tuner and Refresh all break.

**F3. Step 1.4 treats a doctrine conflict as a choice between two neutrals.** Artifact's rules are "elevation is fill plus hairline, not shadow", one shadow per page, and none in dark (`tokens.json` layer-1 usage and shadow note). Iris has a dialled trigger shadow and sheet shadow, plus "a white glow" in dark (`DESIGN.md:40,107-108`). Iris's `#fafafa` is the trigger surface and `#ffffff` is the elevated sheet (`DESIGN.md:91-92`). Neither one is a page neutral. If brand `orrery` adopts Artifact values, the sheet sits white on white with shadows the house rules ban. The real call is whether elevation is a brand-owned temperament. D1 lists elevation as a shared house scale, so as written D1 forbids Iris's own look.

**F4. T6 reverses a recorded decision without saying so.** `ORCHESTRATOR.md:6` says "No npm workspaces (by design)" and lockstep versioning is guarded by `src/umbrella.test.ts:17-22`. The umbrella pins iris exactly, and T6 would make it pin three packages. Every publish then becomes a three-package lockstep under 2FA in Ghostty, in the order tokens, kit, iris, umbrella. `reference-npm-publish.md` only covers the two-package order. A3 says "can be added" without opening `prepare: npm run build:lib` in root `package.json`, which runs on every workspace install.

**F5. A5 is already known to be false, and V9 overstates Swift support.** `@terrazzo/plugin-swift` is 0.3.4 (npm), not on the 2.x line, and its README says it generates only a `Tokens.xcassets` catalog. That covers color and nothing else: no spacing, type or springs. T7's "`Animation.spring` on Swift" and Phase 6 both need a custom template from day one. That makes Swift the deciding test in the Phase 0 spike, not a footnote.

**F6. V11 undercounts Ghostties.** It has about 32 `Color(...)`/`NSColor(...)` constructors, 26 hex-like literals under `macos/Sources/Features/Ghostties/`, and a private `extension Color` at `ComposerWitness.swift:684`. It also has about 103 uses of system semantic colors (`.secondary`, `Color.primary`). Ghostties leans on HIG system colors. An identity brand that overrides those drops macOS appearance behavior. The terminal typeface reset happens in Ghostty config, not in Swift tokens.

## 2. MISSING

**F7. Two brand consumers are left out.** `BACKLOG.md:146` hands agent-kit the job of making `BRAND.md` emit the brand-tier DTCG file that `head.py --brand` reads. `~/Code/agent-kit/skills/orrery-brand/` already ships a separate brand checker (`check.cjs`). The `tint`/`identity` split and the move of validation into the build change that contract, and neither step says so. The plan also ignores `BACKLOG.md:145` ("watch the two brand videos before locking item 1's tier names") while proposing tier names.

**F8. The plan pre-empts the parts audit.** `BACKLOG.md:51` parks naming "until a full audit of existing parts decides what ships first". Choosing tokens and kit as the next packages is that decision. Decision 1 still recommends names. The sibling parts (`~/Code/device-frame`, `~/Code/surface-fx`, Tuner) and the system-wide naming direction in `feedback-naming.md` ("packages named for orrery/bench parts") are missing.

**F9. Motion seed values aren't settled.** Step 1.1 seeds motion from `src/motion.ts`, but `BACKLOG.md:65` (L291) says snappy and gentle are "un-dialled strawmen". `motion.ts:123-137` also uses `duration` plus `bounce` springs, not stiffness/damping/mass, so T7's storage format needs a conversion rule.

**F10. Phase 1.6 doesn't handle the skill's own Refresh step or the system Artifact.** The installed `head.py` (2.6K, no `--brand`) is older than the repo version (9.3K). Before the skill can become an "install from the repo", someone has to decide what upstream is: the repo, or the claude.ai system Artifact.

## 3. OVERVALUED / GOLD-PLATED

**F11. T10 builds outputs nobody uses.** It generates flat JSON for Blender, TS for three.js and Android outputs with zero consumers (two adapters rule). Cut them until a product asks, as T10 itself argues.

**F12. The agent layer is four surfaces for one consumer.** Phase 4 adds `catalog.json`, per-brand `DESIGN.md`, a skill, a checker CLI and a stress script. The sole consumer today is Sean's agents. Keep the skill plus checker and generated token values. Cut `catalog.json` (deletion test: the kit's own types already say it) and the 4.5 stress script.

**F13. `tint` vs `identity` doesn't need two tiers.** `tint` is `identity` with paths locked, so make it one schema with a lock list.

**F14. T2's Resolver branch can't be built in Phase 0.** Making it conditional on the tool means two code paths to spec. Pick folder merge now.

**F15. Waves B and C are premature.** That is about 26 components while the only product in the proof order, the site, has no Base UI or Radix dependency (V10, confirmed in `package.json`). Sean chose the full kit, so keep Wave A and gate B and C on first site adoption. Otherwise Phase 3 alone hits the "traction outranks net-new" rule.

## 4. EVIDENCE

**F16.** V3 was copied from `ORCHESTRATOR.md:28`, a summary, not from `check.mjs`. This is the plan's own named risk ("stale source") in action.

**F17.** V9 checked package versions but not what the Swift plugin can do. A version number can't show what a package emits.

**F18.** V11's count of 14 literals came from one regex that misses `Color(red:)` and `NSColor(...)`.

**F19.** V10's "four `[data-palette]` blocks" holds: there are four distinct values (21 matching lines). The 3,032 lines and eleven themes are confirmed. "Second-hand" items (site motion values, DTCG Resolver status) feed straight into step 1.1 seeds and T2.

**F20.** V5's 25 holds for `var()` reads. The file names 30, and 18 are written from TS.

**F21.** No V-claim opened `snapshot/VERSION` or the installed `SKILL.md` Refresh section. Those are where F2 and F10 live.

## 5. WEAKEST ASSUMPTION

The unstated one: that this repo's `artifact/snapshot/tokens.json` is the upstream and can simply become DTCG. In fact it is a snapshot of a claude.ai system Artifact, its shape is consumed by the checker, the Tuner, `--print-tokens` and the skill Refresh, and agent-kit builds against its brand format.

If that assumption is false, Phase 0 doesn't fail visibly. It produces a second source of truth that drifts from the system Artifact and the agent-kit brand path, which is the exact drift problem the plan exists to remove.

VERDICT: revise. Most important change: before Phase 0, declare the token upstream (repo DTCG, with the contract-shape `tokens.json` generated as an output and the skill Refresh retired) and keep head.py as the single brand gate called by the build, not removed.

Key paths: `/Users/seansmith/Code/orrery-ui/artifact/check/check.mjs`, `/Users/seansmith/Code/orrery-ui/artifact/head.py`, `/Users/seansmith/Code/orrery-ui/artifact/snapshot/VERSION`, `/Users/seansmith/.claude/skills/artifact-house-style/SKILL.md`, `/Users/seansmith/Code/orrery-ui/DESIGN.md`, `/Users/seansmith/Code/orrery-ui/BACKLOG.md`, `/Users/seansmith/.claude/projects/-Users-seansmith-Code-orrery-ui/memory/ORCHESTRATOR.md`, `/Users/seansmith/Code/agent-kit/skills/orrery-brand/SKILL.md`.
