# Packet 06 — overnight read-only audit evidence

Browser evidence captured 2026-09-02 for the packet-06 overnight synthesis.
**Evidence artifacts only. No source, test, config or documentation file outside
this directory was changed by that pass** — the packet is a read-only repository
task.

## Heads captured

| Target                                             | Head                                       | Served on        |
| -------------------------------------------------- | ------------------------------------------ | ---------------- |
| `main`                                             | `514a6f979247f7162aeca26b26f1392535e32443` | :5173            |
| PR #53 `claude/legislative-gameplay-core`          | `a9275bb9656b579bdd07330c6979872bc650b1b1` | :5174 (worktree) |
| PR #48 `claude/real-modular-character-integration` | `6dbb236cf3b176982a9873b4ae4ba60803d20e63` | :5175 (worktree) |

Viewport 1440x900 at devicePixelRatio 1, Chromium build 1194, Playwright 1.62.1
driver, Vite 8.2.2. `localStorage` cleared before each PR-head capture, then the
route reloaded; `networkidle` plus a 500 ms settle before each shutter.

No screenshot was retouched or cropped to flatter. The three `crop-*` files are
magnified regions of unaltered captures, taken to make a specific defect legible.

## Reports

The analysis lives in Drive, in
`2026-09-02_PR53_LEGISLATION_AND_ASSET_HANDOFF`:

- `06A_CLAUDE_OVERNIGHT_COMPLETE_GAME_ROADMAP_AND_ARCHITECTURE_REPORT`
- `06B_CLAUDE_OVERNIGHT_VISUAL_RUNTIME_AND_ASSET_CONTRACT`
- `06C_CLAUDE_OVERNIGHT_VISUAL_EVIDENCE_INDEX` — per-artifact index: route, head,
  what each proves and what it does **not** prove
- `06D_CLAUDE_OVERNIGHT_TEXT_CONTENT_AND_AI_SLOT_CONTRACT`

## The captures that carry findings

- `main/crop-desk-person-legs.png` — the seat-contact defect. The character
  declares a `seatedContact` block naming the `seat-plane-at-pelvis` convention
  with a root at `{0.68, 0.54}`; the scene anchor declares only `xPercent 80.5`,
  `yPercent 63.5` and `scale 0.95`. The scene never declares where the chair's
  seat plane is, so the named convention has no seat plane to be at and
  alignment is hand-tuned per sprite.
- `main/crop-guest-feet.png` — the control case. Reads correctly only because it
  was hand-tuned for that one sprite.
- `pr48/48-01-character-proof-real.png` — gray mannequin limbs under full-colour
  heads, a blazer over a knee skirt with bare legs, no footwear on any figure,
  and hair rendered at a higher fidelity than the bodies.
- `main/01-boot-default.png` and `main/17-after-reload.png` are **byte-identical**
  (`md5 bc42b8dafa671a24aea1cad3130f4641`). That is the proof of the persistence
  gap: the world is rebuilt from `createRunDLiteFixture` on every mount.
- `pr53/53-31-ne-noamend.png` — Nebraska reaching enactment in 14 steps with no
  second chamber and three floor votes separated by `await-next-legislative-day`,
  i.e. the unicameral three-reading rule emerging from the rule pack.

## Known duplicate hashes

Four sets of captures are byte-identical. Explained in full in 06C and in the
Drive evidence manifest; summarised here so the duplicates are not mistaken for
capture errors:

| md5         | Files                              | Why                                                                                               |
| ----------- | ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| `bc42b8da…` | `main/01`, `main/17`, `pr53/53-06` | persistence gap (see above); PR #53 does not regress the office scene                             |
| `1a77f36b…` | `main/04`, `main/16`               | the "perform activity" step never fired — the control label did not match the selector            |
| `437a9e9d…` | `pr53/53-01`, `53-02`, `53-03`     | first driver used step keys that did not match `MeasureStepKey`; superseded by the `53-3x` series |
| `b11a6fe5…` | `pr53/53-22`, `53-32`              | Alaska's default scenario offers no floor amendment, so both drivers took the same 16-step path   |

## Reproducing

Chromium must be launched with
`executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`. The
repository pins Playwright 1.62.1, which expects browser build 1234, while build
1194 is what these containers ship; `npx playwright install` is unavailable. This
is an environment note, not a repository defect, but it will bite the next agent
that runs `npm run test:e2e` in a comparable container.
