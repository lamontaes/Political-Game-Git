# Session 8 progress

## P6 / BG-52 — running-for-office guidance

- Checked out `codex/session8-bg45` at main base `e591ffc637d1f6db84d2ff920e8662ce123202ed`; no BG-52 source edits yet.
- The assigned state executive candidacy pack deliberately leaves age, residency, term, and filing rules unknown for all covered state executives, DC, and territories. The player-facing rules reader is `src/simulation/candidacy-packs.ts`; the minimum-age estimate path is already in `src/simulation/candidacy.ts`.
- Executive election timing already exists through `state-executive-turnover-calendar.ts` and `state-executive-term-rules.ts`, with a distinction between verified law and disclosed game-profile dates.
- `CampaignWorkspace.tsx` is in Session 27's active campaign path, so it was left untouched. No filing rules or dates were invented.
- Posted owner question on #2424 comment 6016611720 asking whether BG-52 is a plain-language fallback correction or should coordinate a narrow consumer seam with Session 27 to expose existing date/source basis.
- BG-45 is separately verified fixed on main: `living-scene-facts.test.ts` passed 19/19 at this head; merged PR #2315 supplies canonical publication before correction.
- Resume: take the owner ruling on BG-52 scope, keep campaign UI ownership disjoint, then add a source-backed regression and exact one-item PR if the approved surface has a supported correction. No player/browser proof claimed for BG-52.
