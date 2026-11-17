---
id: industry-no-negotiation-between-firm-and-workers
title: "No negotiation exists between a business and its workers or town over pay, layoffs or a closing"
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: words
model: opus
effort: medium
source: "Industries thread, Nov 16 (trace /mnt/project-files/account-lead/reports/industry-events-read-by-story.md), at the Account lead's direction, for the owner's Nov 16 01:58Z ask"
---

**What.** The owner asked that the story take industry effects "from negotiations to closures" (Nov 16, 01:58Z). The simulation has no bargaining between a private employer and its workers (over pay, hours, a layoff) or between an employer and the town (relief to stay open). Strikes exist only against the town's term, and only among school staff, renters, the jobless or every resident. Seen: src/core2/modules/public-action.ts on Train head a62a2fda.

**Cause.** Design: the owner's words of Nov 16, 01:58Z (cmsg_01TQLdz583SA7sRfRB4dFowZ3UgS4n8K2932PQhmyxdRRh). Found in code: src/core2/modules/public-action.ts `touched` (around line 135) groups only school staff, renters, the jobless and every resident; no module keeps a firm-and-workers or firm-and-town negotiation record.

**Fix.** Before building, look first for a ruling on unions and bargaining; then extend the public-action engine so a firm's own workers can act against their employer (a pay or layoff demand read from the firm's books and the workers' traits), with the owner's answer decided by the firm's books, and the conversation engine's register holding the lines. The player sees it as a scene with the workers or the owner and in the paper.

**Time box.** 4 hours; if not done, push what exists, open the draft PR and write the handoff in Notes.

**Rules.** No dice: the workers' traits and the firm's books decide, never a roll. Find the engine first: public-action already decides who joins; one engine per mechanic.

**Done when.** In a drawn place, a firm's workers press a demand on their employer and the owner's answer is decided by its books, by record id, told in a scene and the paper, and a second session sees it in the running game.

**Waits on.** A look-first reading for unions and bargaining rulings.

**Files.** src/core2/modules/public-action.ts

**Notes.** Nov 16 04:40Z, Words lead: take the six in this order: G1 closing reason, G5 official, G4 owner, G3 raised pay, G2 missed payment (private: only the owner, lender and household speak of it), G6 last; this is number 6. The builder sends a scene-first report (record, packet facts, write-back) before any line; a line names a law only when the closing's record does.
