# Session 4 can replace the two existing chat mounts

MERGED: None from this handoff. Session 3 releases the bounded old chat consumer hunks to Session 4 under the CTO-approved scene specification. The replacement must retain the existing World, actual people and canonical writers. Shared shell changes still have one writer, and the player-card design remains mockup-only. No new engine or redesigned legacy chat is authorized by this handoff.

## WHAT EMERGED

Measured: The following seams exist on actual shell-on-main source `c83bcaf8d97e289a095820eb283a9da75cb65085`. This is the verified main merge of the shell receive PR, not the earlier stacked merge. Line numbers below refer to that immutable source. They are existing interfaces, not a proposed new scene API.

| Bounded hunk                                       | Existing behavior and contract                                                                                                                                                                                                         |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/player/PlayerGame.tsx:258`                    | Imports SceneConversation and ConversationStarters. Remove obsolete imports when replacing their mounts.                                                                                                                               |
| `src/player/PlayerGame.tsx:2211`                   | talkTo accepts personId, optional subject and scene/panel invoker. It checks readOnly, calls openConversationWith, rejects unavailable entries, records return preference and dispatches set-conversation followed by talk-in-scene.   |
| `src/player/PlayerGame.tsx:2602`                   | ScenePanel foreground mounts SceneConversation only when conversation exists on the scene surface. The caller passes the same session World/person, subject/addressee, onWorldChange, transition registry and actual presentPersonIds. |
| `src/player/PlayerGame.tsx:2610`                   | onChange dispatches set-conversation. onBack ends it, then restores the prior workspace when available or returns focus to the actual addressee. Preserve return continuity rather than the rejected button-grid UI.                   |
| `src/player/PlayerGame.tsx:3629`                   | People mounts ConversationStarters with the same World/person and presentPersonIds, routing onStart through talkTo. Replace this obsolete entry consumer in coordination with Session 2/8.                                             |
| `src/player/SceneConversation.tsx:90`              | Existing component props expose World, playerPersonId, subject, addressee, onWorldChange(World), onChange(subject/addressee), onBack, optional transitionHandlers and presentPersonIds.                                                |
| `src/player/SceneConversation.tsx:347`             | The old say handler calls commitConversationTurn with projected session, room, progress, turn ordinal, addressee, audibility and intent. It hands result.world to onWorldChange; it does not create another World.                     |
| `src/presentation/person-conversation-entry.ts:43` | openConversationWith reads the selected person's available canonical conversation and can return unavailable. Do not silently substitute another person.                                                                               |
| `src/presentation/run-b-conversation.ts:546`       | commitConversationTurn validates World, room, session, addressee, ordinal and allowed intent before writing through the existing engine. Preserve canonical validation and record continuity.                                          |

Session 4 may replace these exact entry and foreground hunks and their obsolete component interface under the checked specification. This release does not cover all of PlayerGame, shell.css, player-card layout or Session 3's narrow politicsTabs availability logic. Coordinate any neighboring Session 2/8 changes before editing. The source links remain valid even if later main moves.

## Required evidence

CTO6006639692 releases the scene blocks in order: situation reader, participant selection, record-constrained exchange through composeGroundedLine with Lie, image selection, then writeback. Each block must be in play in a random town with a clip before the next. Name the existing episode/story-scene flow, conversation store and English files in the PR body. Do not introduce parallel copies.

The first proof requires two different characters arriving at the same place to produce different exchanges from the same primitives, with both clips posted. No authored situation bank beyond the twelve primitives is released before these blocks run. Earlier requirements still govern live records, actual attendees, canonical time/authority, Save/Continue and saved return; old screen test passes do not prove this scene behavior.

## VITAL STATISTICS

Measured: This is read-only source inspection and ownership release. No consumer code, game action or replacement scene was run. No production style or branch was changed for the handoff. The original five screen heads and their historical screenshots remain preserved.

Method: Fetched main contains the shell receive merge `c83bcaf8d97e289a095820eb283a9da75cb65085`; the PR base is main and its merge commit matches that source. The earlier stacked merge alone was insufficient. The actual owner ruling was read directly from issue comment 6006639692. No year job ran.
