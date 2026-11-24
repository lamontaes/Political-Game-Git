# UI36 — Scene-first interface

Status: **Active. Implemented on `fable/ui36-scene-first-interface`; A integrates.**

## Authorization and baseline

- Owner dispatch: UI36 in DELIVERY28; accepted sketch (Drive
  `1O3GVybsfFEj7VkEkcPYAi_gh_F9iOOlP`) and its confirmed answers; D33-14,
  D34-03/04/05/12/13/14.
- Base: C `#245` tip `559b1c043a45205bdaa66ea25daa6cc9643da99c` (contains
  `3fd67a03`), which sits on public main `f22fd314`. A's private material,
  pack and LIFE nets are not in public source and are not recreated here.
- Workspace: an isolated clone in the session scratchpad; the
  `Political-Game-Claude-Runtime-Proof` worktree's parent `.git` is missing.

## Outline

1. Shell reducer: one person card (`open-quick-dossier` from every source),
   no anchored action menu, `ask-leave`/`cancel-leave`, `set-interruption`;
   `ShellSection` gains `office` and `jobs`; navigation levels
   `personal` and `politics`.
2. Navigation: hidden-until-opened list in the accepted order — Calendar,
   People, Politics, News, Journal, Personal, Travel, Options, Save, Quit.
   Politics holds the office/campaign half of Work, Local government and
   Budget; Personal holds identity, money, and the jobs/study half of Work.
   Travel is the places surface. Patch notes live under Options. Quit asks
   before leaving an unsaved life. Day and Week controls sit beside the
   cluster and run `simulateCalendarDays` with the interruption preferences.
3. Person card: right side at desktop, portrait/name/role/relationship,
   presence from the room projection, qualitative facts with attribution,
   connected people with portraits, Talk / Travel to / Meet / Contact / Full
   record. Travel uses the existing neighborhood walk when it reaches where
   the person was last recorded; Contact and Meet name the missing producer.
4. Conversation: portrait strip with active-speaker glow and addressee ring,
   volume chips top-right, italic narration, one line, responses below; no
   timing rules in dialogue; the exchange survives browsing with a compact
   reminder that quotes the pending line; focus returns into the box.
5. Calendar: Today and upcoming (with the former Today view embedded),
   History, Interruptions. `interruption-policy.ts` wraps the campaign
   registry so "stop for work shifts" makes routine windows blocking and
   gates Simulate; `passOrdinaryDays` gains `stopForTentativeHolds`.
   Preferences persist in the shell store with the other interface state.
6. Presentation: `:root` tokens (type, spacing, glass, edge), no scrim behind
   the wordmark, creator budgeted to the content viewport with a still
   backdrop, HUD outcome note, tabs and checklist styles.
7. Government page: plainer wording for missing links, people and sessions;
   source review stays in its details block.

## Checks

- Build/type, changed-file lint and format; focused vitest files.
- CHECK 1 and CHECK 2 as recorded in the delivery report.
