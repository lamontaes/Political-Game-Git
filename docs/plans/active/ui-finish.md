# UI FINISH — playable interface and remaining text

Owner: Claude Code Desktop session `political-game-claude-runtime-proof-3b`
(Opus 5, High, Standard). Authority: CLAUDE COMPLETION packet, section UI
FINISH (revised 2026-09-14), and the accepted owner UI sketch of 2026-09-11.
Receiver: LAND `political-game-claude-runtime-proof-b6`.

## Source

- Base: `codex/modular41-final-repair` 20501132 (runtime d75abfcb), per
  `output/CLAUDE-LANDING.md`, not c2c4686d.
- Base-only commits, not UI FINISH work: TEXT39 7035e60b (here 9a9daff5) and
  Fable WORLD39 500b2d42 (here deaa9aa4). LAND received both directly.
- UI FINISH delta = everything after deaa9aa4.

## What was reproduced on the current source (Alamo, Nevada, age 34)

- Creator: an out-of-range age (1034) passed the character step and was refused
  only at Begin; birthday was two bare number boxes; the Nevada town list showed
  24 entries with no count; no visible name draw; Title Case "Who are you?"
  buttons.
- People: selecting a face collapsed the web to a pair; the "introduction"
  highlight lit the two people of the first shared interaction (interactions are
  always pairs, and no record says anyone introduced anyone); the card named the
  player as themselves; "Friends" counted anyone met; pins wrapped under rows.
- Campaign: the Nevada eligibility reason appeared twice with raw observation
  dates inline; "Put their name inThe committee opens…" ran together; the offer
  read "a Seat in the Assembly or Seat in the Senate"; the plan had its own
  "Approve and carry out" button beside a row of the same three actions (two
  ways to book the same afternoon).
- Light background: first pass (Politics → office → file → Calendar → back)
  did not show it; reviewing the rendered evidence did. After a campaign
  session the life is at "Somebody's street — Alamo, Nevada", which has no
  registered scene. SceneBackdrop then renders no plate
  (`data-has-plate="false"`, zero height), `.life-shell` is transparent, and
  the document's `#e8ece8` page ground fills the window behind the dock and
  every workspace (campaign, Calendar). Contained in the shell (root adapter 2):
  `.life-shell` paints its own navy ground only when the backdrop has no plate.
  Verified live: `rgb(11, 19, 32)` at full window height. The missing street
  scene itself is an art/scene-registry producer gap, not painted over.
- Shell dock at 1024×768 (CIVIC SERVICE finding, reproduced on the campaign
  panel): the bottom-left dock overlays the workspace body, which extends
  beneath it. The campaign panel adds a feature-local bottom inset so its last
  line scrolls clear (verified: last line bottom 598 vs dock top 687); the
  overlap during scrolling remains shared shell layout.
- Debate/grant questionnaire items and the tag "boundary" wording: already
  resolved by TEXT39 (the old items are withdrawn; the live scenes are
  coherent). Retained, not re-authored.
- Calendar month/week grid and the Politics/Personal navigation split: already
  present. Retained.

## Decisions

- One campaign execute control per intent: the "Do this now" row. The plan edits
  geography and the advertising ceiling; an action commits through the plan when
  one exists (same free-slot and funds guards), otherwise the ordinary afternoon.
- A face is the People control; the ring is the one keyboard stop. "How you know
  them" is only the direct record-backed edge between the player and the
  selected person; no chain through third people is inferred.
- Eligibility text is kept word for word; dated/source sentences move under
  "Sources and detail"; repeats show once. An unresolved block is never shown as
  eligible.
- Category keys and serialized appearance keys are unchanged; only labels move.

## Files

Feature-local: CampaignWorkspace.tsx, campaign-workspace.css,
PeopleRelationshipWeb.tsx, people-web.css, PersonCard.tsx, relationship-web.ts,
people-directory.ts (labels), person-dossier.ts (date), world39-news.ts
(officeholder formatter only), character-history.ts (lunch-table record copy),
life-opportunities.ts (agenda notice copy), new CreatorBirthdayFields.tsx,
creator-finish.css, creator-hometown-page.ts, creator-name-preview.ts, unit tests,
and one assertion each in campaign-first-election.spec.ts and
world39-editorial.test.ts.

Root adapter (separate commit, LAND applies or rejects): PlayerGame.tsx creator
mounts, ShellNav.tsx submenu marker, and three birthday e2e specs.

## Peer agreements

- LAND b6: file boundary acknowledged; TEXT39 and Fable received by LAND.
- RULES (-4a): projectCampaignOffices/candidacyEligibility shapes unchanged;
  Nevada fix is data-only.
- NATIONWIDE WORLD/ELECTION (-03): additive currentPublicOfficeholders with a
  nullable start; officeholderSentence already omits "since" for null.
- Title hero (Codex): title41 paths acknowledged in
  `output/title41/CORRECTION-HANDOFF.md`; no overlap.

## LAND full-suite defects received (TEXT39 questionnaire and copy)

1. `the_petition_at_the_door.text39-v1:sign` tripped the adult-only guard in a
   childhood-admissible bank. Non-opener items are deliberately put to the
   player at any character age (Packet 77), so admission was not tightened; the
   two options now state the stance ("Support it as written", "Support it,
   noting you oppose removing the stop"). Same meaning, same versioned key.
2. Fixed-opener tests expected base keys; they now assert the `.text39-v1` keys.
   Answers saved under base keys still resolve through the full authored list.
3. "Lived opening" found 0 items because TEXT39 replaced `source.reference`.
   The original reference is kept first with the revision appended; four
   options over 60 characters were shortened without changing meaning.
4. Acceptance 8 separators asserted under versioned keys.
5. Duplicate labels: "Keep playing" (two scenes), plus the follow-through
   repeats "Offer some of your snack" and "Put the toy away".
6. Household `wordingSha256`: **not fixed here.** It already fails on
   20501132 before TEXT39, and this clone's replay wording is identical to
   20501132's. LAND's composition yields different errand wording with
   byte-identical conversation files, so the explicit leaf accounting has to be
   done on LAND's merged main after rebase, not by copying its fixture here.

## Browser suite classification (1280×860 unless the spec sets its own)

- Passed on this branch: UI FINISH group 1, both birthday specs on the new
  selects, both town-order specs, world39 Kentucky.
- Also fail on the base (deaa9aa4) without UI FINISH, same assertion:
  `people-web.spec.ts` (full dossier after a card connection), playtest34 JSON
  import (waits for `nav-personal-group`), `ui36-successor.spec.ts` (element
  below a 620px viewport). `campaign-first-election.spec.ts` fails in the shared
  `openElsewhere(page, "work")` helper because base nav places that entry in the
  Politics submenu.
- Fixed on this branch: world39 Aurora expected the redundant officeholder
  sentence; the journey spec's own group 2 steps (Begin after questions,
  `shell-pass-day`, deep-label check moved to group 1).

## Final verification (UI FINISH head before this note: 2d5e4c1f)

- Browser, f78f16ba, one worker, clean identity: 10 passed, 1 failed.
  Passed: UI FINISH journey groups 1, 2a, 2b, 2c (Alamo, Nevada, full-window
  screenshots 01–14); world39 Aurora and Kentucky; both playtest34 birthday
  and town-order tests. Failed: playtest34 JSON import (`nav-personal-group`),
  which fails identically on base deaa9aa4.
- Unit, full `vitest run` on f78f16ba: 4986 passed, 117 failed, 6 skipped
  (411 files). The 51 failing files were rerun in isolation on base deaa9aa4
  (97 failed) and on HEAD 2d5e4c1f (94 failed). The one regression the full run
  exposed was UI FINISH's rename of the reviewed 92C "Keep playing" label
  (grounding trace); restored in 2d5e4c1f. The only HEAD-only failure in the
  isolated run is a 5000 ms timeout in `tests/source/substrate.test.ts` A20
  (source domains, untouched). The remaining full-run-only failures are 5000 ms
  timeouts under full-suite load, plus the Playwright shard listing, which
  passes in isolation.
- Typecheck clean; ESLint and Prettier clean on every changed file.

## Remaining, named precisely

- Shell dock over panel bottoms at 1024×768 (reported by CIVIC SERVICE): shared
  shell layout, LAND-owned.
- "Somebody's street" has no registered scene art; root adapter 2 only stops
  the light page showing through.

- The same third-person "They …" knowledge wording remains in five other
  life-opportunities notices (lines around 689, 723, 760, 785, 814, 860); only
  the agenda notice was in scope.
- `npm run corpus:prose -- check` cannot run on this private base: it crashes
  loading `import.meta.glob` in src/presentation/visual-integration.ts under
  Node, a file UI FINISH does not touch. Changed prose sites need anchors minted
  on LAND's ledger.
- Human visual and play acceptance is pending.
