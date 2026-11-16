---
id: core-homeowners-living-alone-can-move-in
title: "Two people who each live alone in a home they own can still be asked to move in together"
area: people
lead: lives
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: "Family life builder, Nov 16, re-pinning #9256's proposal test on Train 3 (Account lead: a real gap the player will meet)"
checked:
---

**What.** A player who owns a home and lives alone can never be asked to move in by a partner who also owns a home and lives alone, so the couple stays dating forever and can never reach a proposal. With new games starting at 18 or older, the player is often an older adult who lives alone in an owned home, so the player will meet this. Seen: the partner's ask to live together, and after it Propose on the partner's card, for a player who owns their home and lives alone.

**Cause.** Found in code: `movingOrder` in src/core2/modules/partnerships.ts returns undefined when neither of the couple can leave, and `canLeave` returns false for a one-person household that owns its home (`if (!left.length) return !ownsHome(api, mover.householdId)`), so the monthly climb never sets `move-in-asked`. Measured: Pulaski, Ohio (3964906), seed family-a of src/director/proposal-played.test.ts on Train c0f54ca0: the player (born 1958) and the best-fit single (born 1958) both live alone, the couple's progress reaches 1 in January 2026, and the stage stays `dating` through February 2026 and beyond.

**Fix.** Let a mover who lives alone in an owned home leave it for the partner's household; the moves engine already sells a home whose last member leaves (`sellHome` in src/core2/housing-sale.ts, called from src/core2/modules/moves.ts), so the move-in writes through it rather than a new path. Which one moves stays the existing rule (less cash moves); the ask names who.

**Time box.** 4 hours for one Opus session.

**Rules.** Wire to the world: the home left behind goes through the moves and housing engines, so it is sold and the town's housing count shows it. No dice: who moves is still decided by the couple's cash and households, never a draw.

**Done when.** At a drawn place and seed where the player lives alone in an owned home, a second session plays a new life, dates someone who also lives alone in an owned home, is asked to move in, says yes, sees the household change and the home left behind sold in dev mode, and can then press Propose; a pinned test at Pulaski, Ohio, family-a is red before the change and green after.

**Waits on.** Nothing.

**Files.** src/core2/modules/partnerships.ts, src/core2/modules/moves.ts, src/core2/housing-sale.ts, src/director/proposal-played.test.ts

**Notes.** Filed Nov 16 on the family-items branch beside #9256.
