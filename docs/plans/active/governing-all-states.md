# GOVERNING — all-fifty-state executive/legislative baseline and continuity

Owner: Claude (GOVERNING, PLAYTEST-PORK-01 section C and the retained GAMEPLAY
ROLE). Branch `claude/governing-all-states`, base `fed321f7`. LAND integrates.

## Increments

1. **Time** — one time command (`src/presentation/time-command.ts`) with a
   disclosed target, a quiet stretch capped at the next dated item, stale
   source refusal and receipts; a root World-change guard
   (`src/presentation/world-change-guard.ts`) so a change computed from an
   older World never replaces a newer one. StoryView and the corner Day/Week
   control use it.
2. **Campaign → office for all fifty governors** — per-state disposition
   registry; term rules (including weekday-relative starts) compiled into the
   rules resolver; an ordinary executive authority profile for states without
   an accepted pack, labelled as a game profile; filing uses the office's own
   cycle instead of a 28-day horizon; exact unsupported reasons.
3. **Institutional continuity** — Congress and state membership across term
   boundaries; pending successor, vacancy with cause and no-current-record kept
   distinct.
4. **Governing matters** — appointments, budget priorities, bills presented and
   implementation follow-through for the player and NPC offices; three-to-five
   item briefing projection for Your office.

## Rules

- Accepted facts, rejected matrices and authored game profiles stay separate.
- Missing law stays UNKNOWN; a versioned game profile is labelled as such.
- Old recorded victories are not rewritten; any recovery is an explicit,
  versioned option.
