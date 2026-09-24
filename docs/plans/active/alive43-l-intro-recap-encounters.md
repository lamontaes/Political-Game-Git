# ALIVE43 L — world introduction, recap and lived encounters

Owner: Claude Code Desktop session `political-game-claude-runtime-proof-c9`
(Opus 5, High, Standard). Authority: ALIVE43 EXECUTION packet, ROLE L
(Drive 1JNF0N31QdWNwb1RTjoBX6czoNY3S6WlHFf5RHdwSh7g), accepted director choices
2 and 4 in ALIVE43 research section 12.

Receiver: LAND (Codex integration owner). Handshake: Drive
`ALIVE43 ROLE L — Intro/Recap/Encounters handshake — 2026-09-15`.
World contract: ROLE W session `political-game-claude-runtime-proof-77`,
`src/simulation/living-world/`, version `alive43-world/v1`.

## Source

- Base: main `70d76fb940c8b4a81ebdd1ec5834f96b8cb288bd` (#261 merge).
- Branch: `claude/alive43-l-intro-recap-encounters`.

## Owned

- `src/presentation/world-orientation*.ts`: pure reader over W's projection.
- `src/presentation/world-recap*.ts`: meaningful-change selection since the
  recorded presentation frontier.
- Additive event subjects in `src/presentation/conversation-subjects.ts`.
- Additive pin kinds, label resolver and old-ref compatibility in
  `shell-navigation.ts`, `browser-shell-state.ts` and `ShellPinRail.tsx`.
- New `src/player/WorldOrientation*`, `WorldRecap*` and encounter components.

## Excluded

`PlayerGame.tsx` root mount (LAND gets a separate patch), W producers, B
legislation binding, A art tooling, D-held people files, shared generated
prose union.

## Increments

1. L1: four-step orientation (executive, Congress, home state, locality).
   It can be skipped, stepped back and reopened. Reads the saved date. It never
   writes, advances time or materializes people.
2. L2: recap since the frontier after time advance. Preview is pure;
   acknowledge records consumption once. Event-aware conversation subjects
   have informed and uninformed controls.
3. L3: party chapter contact and follow-up via W2. Pinned organization,
   venue or activity reopens context; Visit, Attend and Act invoke existing
   writers explicitly.

## Status

- Handshakes: W acknowledged and published `alive43-world/v1`; its W1 files
  are not yet committed. The LAND handshake and the increment 1 handoff are
  Drive documents in the ALIVE43 folder (Codex LAND is not reachable by direct
  message from this session). No LAND acknowledgment yet.
- Increment 1 (pushed): recap reader and HUD panel, shell record v4 interface
  progress, "Mention the news" in ordinary talk, and the orientation reader
  and panel against a field-for-field mirror of W's contract. The orientation
  panel is not mounted until W1 is committed. The PlayerGame recap mount is a
  separate commit for LAND.
- Checks: tsc, eslint and prettier are clean. Focused Vitest passes, including
  new recap, orientation, matter and shell-progress tests, and on a scratch
  merge with main `003b45ff`. Negative controls failed as intended:
  - Dropping the player-only knowledge filter breaks the privacy test.
  - Treating every counterpart as informed breaks the uninformed test.
- `corpus:prose -- check`: only this work's new unanchored sites in
  `life-conversation.ts`. Anchors and inventory are left to LAND's union
  regeneration.
- Browser (identified dev server, branch head, clean, public checkout without
  the private pack, so people render as fallback silhouettes):
  - Setup: an ordinary creator life (Lexington, Kentucky, age 34), then four
    pointer-activated Week skips from January 5 to February 2, 2026.
  - Result: no recap and no console errors. News showed no published stories,
    and only opening-day items that predate the frontier.
  - A quiet recap is correct here. Nothing on the ordinary route yet produces
    new public or known developments during a civilian skip. That is W3's
    producer scope, and W was told.
- Browser correction: the conversation's "Bring up: At home" button is the base
  scene-conversation subject switcher (household week), not the matter
  choice. The matter label was renamed to "Mention the news:" so the two
  cannot be confused.

- W1 consumed (branch `claude/alive43-l-on-w1` on W `0fcd4688`): the
  contract mirror became re-exports of W's types; a new unsaved life sees the
  four-panel introduction until it is finished or skipped, and News carries
  "Who holds office" to reopen it.
- L3 on W2 (branch `claude/alive43-l3-chapters` on W `7537cea5`): one new pin
  kind, `organization`, for a local party chapter. Meetings stay pinned as the
  existing `commitment` kind. "Local party chapters" under Politics and the
  chapter pin open a chapter surface: organizer (their ordinary card), the
  community room, this player's invitations with state, and explicit Accept,
  Decline, Go to the meeting, Join and Leave routed to W's writers. Opening a
  surface or pin writes nothing; going to a meeting runs the ordinary journey
  and returns to the room.

## Pending

- Recap panel screenshots at 1440x900, 1200x720 and 1024x768 with a real
  entry. These wait for an ordinary-route producer (W3, or W2's organizer
  invitation).
- Orientation mount, and its skip, back and revisit browser proof, after the
  W1 commit.
- L3 browser proof (chapter route, pin reopen, accept and attend) after the private pack is staged.
- Private-pack screenshot identity from LAND.
