# PT3-SCENE — one conversation box and understandable destinations

Owner: existing UI owner (Claude Code). Source: PLAYTEST 3 (2026-09-11),
prompt 03, recovering Run B (Aug 26–27) and UI9-01/07/08/09.

Base: draft PR #144 (`codex/ui-core-release-transfer` at `302e1f0c`). Main does
not yet contain the UI shell, so both deliveries are leaves against #144; a
merge into #144 is not a main release.

## Delivered as two PRs

1. **Day / Work destinations** (`claude/pt3-day-work-destinations`).
   Today answers now / next / waiting / use your time and links into Work,
   Calendar and Places. Work is one layout for every life (office, running for
   office, jobs and study, hiring) with a role sentence and jump list; the
   campaign moved out of the day. The same canonical "Get on with the day"
   control is on both. Menu grouped; duplicate "Life scenes" route removed.
2. **Scene conversation** (`claude/pt3-scene-conversation`, stacked on 1).
   `SceneConversation` is the one bounded conversation box in the room; the
   scene panel, the person action menu, the dossier and People all open it.
   History is read back from canonical events (`scene-conversation.ts`) and
   paged inside the box. `PlayerConversation.tsx` and the scene panel's inline
   transcript are removed. No new conversation engine: the box draws
   `projectPlayerConversation` and commits through `commitConversationTurn`.

## Held semantics

- Reading and navigation spend no time. Exchanges keep their existing costs
  (ordinary talk 2 minutes, spending time 30; subject turns none). UI9-08's
  duration question is not decided here.
- Listen is whatever the subject's state offers; no count cap exists or was
  added. Life-talk has no pending-contribution state and so offers none.
- Guardian162 availability is unchanged; nothing populates a scene.
- Portraits come from `PersonPortrait`; its initials fallback stands in where
  no approved likeness exists.

## Open follow-ups (not blockers)

- Life-talk has no represented "pending contribution", so its Listen can only
  appear if that producer gains one (LIFE-CONTENT owner).
- "Say hello" can repeat indefinitely with "Hi again." — producer behavior.
- Seven browser tests in `campaign-first-election`, `legislation-docket` and
  `owner-play-repair`, plus one in `ui-core-feature-adapters`, already fail on
  `302e1f0c`; they are not caused by this work.
