# Notes that were in src/director/data/director.json

Moved out of the game's data on Nov 27, 2026 (CTO's story audit, row C9), word for word. The data keeps what the game reads.

## `note`

Story director on the new core (docs/design/director-on-core2.md). Developer data, never shown to a player. Channels, kept-fact kinds and tie rows are open data rows; the code registers one measure per channel operation.

## `settingHours.note`

When a scene's setting can hold it, by the setting kind (situation-types.json settings), in minutes after midnight: a scene measured at the day's close stops the player's clock at the next minute its setting is open, never at midnight in a bedroom or an office (owner, Oct 27, 4 PM Eastern: no scene at midnight in an open office). A null opening is the controlled person's own day start (the core's playerDayStartMinute). One row per kind of setting, never per place.
