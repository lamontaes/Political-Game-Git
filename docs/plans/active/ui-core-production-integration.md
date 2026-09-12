# UI-CORE-RELEASE — the accepted shell, on the normal route

Historical Claude checkpoint. Continued by the exclusive [Codex transfer](ui-core-release-transfer.md); that plan supersedes this checkpoint's status, prototype-head and title-integration statements.

**Branch:** `claude/ui-core-production-integration`
**Base:** `origin/main` at `0dceca57a44ce30201c03ea387ae470737112dde`
**Status:** implementation delivered; unmerged, pending owner visual acceptance.

This is phase two of UI-CORE-RELEASE. Phase one — the development-only
click-through and its R1 corrections — is [#133], frozen at
`bc258e70be4dbcafdb9cc64a04a7e81c62683351` and deliberately left alone.

## What was carried across, and what was not

The prototype answered the design questions. What comes across is the **shape**
of the answers, rebuilt against the canonical world:

| Carried                                            | Left behind                               |
| -------------------------------------------------- | ----------------------------------------- |
| One reducer owning navigation, history and Escape  | The prototype reducer and its state       |
| The approach-radius cluster and its stable hit box | `PROTOTYPE_NOW`, a clock that cannot move |
| The pin gesture model, keyed by reference          | Prototype rooms and `roomId` travel       |
| The attribution rule: no badge for plain knowledge | Prototype people, bills and meetings      |
| Reading the version and notes from the checkout    | The prototype's own asset registry        |

Production imports nothing from `src/ui-prototype/**`. A browser proof asserts
the normal route's rendered page contains no trace of it.

## What a player can now do on the normal route

- Start a real life through the existing creator, or continue a saved one.
- Move around a quiet shell whose corner cluster rests small and translucent and
  rises as the pointer approaches, on keyboard focus, or when opened.
- Open People, see the family, friends, work and political categories the
  records actually establish, and open anybody's record.
- Get **that person's** record — the id travels from the selection to the
  action menu, the quick dossier, the full record and the conversation.
- Talk to them through the existing conversation system, with them as the
  addressee, or read the specific reason the world cannot offer that right now.
- Pin people, commitments and measures to one mixed rail; drag to reorder, or
  use Move up / Move down; change size; unpin. The rail survives navigation and
  survives a reload.
- Open the Calendar and see whose each entry is — the chamber's agenda is
  labelled as the chamber's, not as an appointment.
- Open Personal: name, age, household, education, work, and three kinds of money
  kept in three lines because the world keeps them in three positions.
- Open the Journal and follow a person reference into their record and back.
- Open Offices / Work, look at what is moving, pin the bill, go to the floor.
- Read the patch notes and the version, both read from this checkout.
- Set the preferences that something actually reads.

## Where the new code lives

Pure projections, testable without React or a DOM:

- `src/presentation/shell-navigation.ts` — the state machine.
- `src/presentation/person-dossier.ts` — one person, as the player knows them.
- `src/presentation/personal-record.ts` — identity, household, history, purses.
- `src/presentation/player-calendar.ts` — yours and the chamber's, separated.
- `src/presentation/people-directory.ts` — categories, derived not asserted.
- `src/presentation/person-conversation-entry.ts` — talk to _this_ person.
- `src/presentation/release-identity.ts` — version and notes, no literal.
- `src/presentation/browser-shell-state.ts` — the pin and preference store.

Components:

- `src/player/ShellNav.tsx`, `ShellPinRail.tsx`, `ShellDossier.tsx`,
  `ShellWorkspaces.tsx`, `useShell.ts`, `shell.css`.

Touched:

- `src/player/PlayerGame.tsx` — `PlayingScreen` now composes the shell.
- `src/player/PlayerConversation.tsx` — one optional `initialAddressee` prop.
- `src/presentation/browser-world-repository.ts` — the database migration.
- `src/main.tsx` — one stylesheet import.

## The persistence question, answered once

Pins and preferences are not world content. Writing them into a saved world
would change a life's content identity every time somebody rearranged a rail.
They are also not a second save store. They are **one more object store in the
game's existing database**, created by an additive version-2 migration in the
module that already owns that database. Every world written by version 1 is
still where it was and still readable — the existing repository suite proves
that, unchanged — and a browser proof takes a pinned rail through a save, a
reload and a continue.

A record the reader cannot validate comes back as "nothing stored", and the
shell keeps working with its defaults. A browser with storage switched off gets
a game whose pins last the session and no false claim that they will last longer.

## Deferred, and still deferred

The owner reserved these, and this phase does not quietly approve them:

- the broader **Personal** redesign — only the minimum clarity is here;
- the **Relationship Web**;
- global **Search**;
- expanded **News / Newspaper**;
- new **help** and **notification** systems.

Also still open, and owned elsewhere:

- **U03-02**, the title audience face — a pre-ship art gate on
  `title_bg_civic_community_meeting_hero_slot_5504x3072_v1`, recorded against
  #133 and owned by visual review. No generation happened here.
- **FLOW-PLACE1** — real travel and presence. Nothing here moves anybody.
- **PEOPLE1** — complete deterministic people; the portrait seam is used as it
  is, and no likeness is invented for a stranger.
- **#136 / VERSION-AUTO1** — release automation. This branch reads its output
  and touches none of its files.
- **LEG-CONTENT1** — feature-local legislative components. The existing
  `LegislationWorkspace` is consumed through its current props, unchanged.

## What is not delivered

- The title screen keeps its accepted production composition. The R1 title
  corrections are visual direction the owner approved on the prototype and has
  not accepted as final; reopening the production title was not required by this
  phase's delivery list and would have reopened accepted visual work.
- Scene figures are not click targets. `SceneBackdrop` draws them decoratively
  and says so; the People rail is the interaction surface, as it already was.
- No new art, no release activation, no monitoring.
