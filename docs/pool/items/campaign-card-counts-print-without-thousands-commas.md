---
id: campaign-card-counts-print-without-thousands-commas
title: "The Knock on doors card prints a count of a thousand or more without a comma"
area: elections
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9683
after:
blocked-on:
lead: elections
model: sonnet
effort: low
root: none
source: Account lead walk at Newry SC, Nov 16, 2026 (the Knock on doors card)
---

**What.** The Knock on doors card says how many signatures a petition holds, how many the clerk asks for and the count the doors gather to, and it prints each as plain digits. Where the clerk asks a thousand or more, as at Newry, South Carolina (2,451), the card reads "2451" and every other screen that shows a count writes "2,451". The player sees the same number written two ways. Seen: the card's three counts at Newry SC (`drawPlace("jpr-pin:3", "journal-player-race:0")`) once the petition is filed.

**Cause.** Found in code: `src/bench/play.mjs` fills `{signed}`, `{needed}` and `{target}` into the card's texts as plain digits through `String`, where the file's other counts call `toLocaleString` (the people and organizations counts).

**Fix.** Format the three counts in the card's `does` line in `src/bench/play.mjs` with `toLocaleString("en-US")`, as the file's other counts are; no change to the texts in `src/bench/data/controls.json`.

**Time box.** 1 hour for one Sonnet session.

**Rules.** Player-screen text (`player-screen-text`): a figure on a screen follows the one number format the rest of the screens use, never raw digits.

**Done when.** A second session plays a drawn place, Newry SC (`drawPlace("jpr-pin:3", "journal-player-race:0")`) on main from the filing to the first canvass and reads, on the Knock on doors card, the clerk's count with its comma.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs

**Notes.** Account lead, Nov 16. Rides with the companion PR that fixes the old-style `signaturesToGather` callers on the Train.
