# OPUS-GOV status (new account, from Oct 14, 2026)

Only OPUS-GOV writes this file. The earlier log is `docs/coordination/gov.md`.

- **Owns:** `src/rules` and the government engines (laws, budgets, offices, elections, campaigns, legislatures, executive).
- **Branch now:** `gov/wiring-votes-and-views`, draft PR to main.
- **Source:** the stress audit of Oct 14 (`docs/reports/stress-audit-2026-10-14/README.md`, PR #4160), defects 3, 18, 19, 4 and 6.

## What the owner can play now

Nothing new yet on this branch. When it lands: a speech, a committee hearing, a visit from a lobbyist, a constituent's case or a candidate's stated position changes what the people who heard it think about that question, by how much they like and trust the speaker, and the next vote reads what they think now. A council member who heard enough of the right speeches can change their vote.

## Checklist

- [ ] Defect 3: speaking, persuading and voting are one chain of reads (views engine moves the listener; legislature votes read the current view).
- [ ] Defect 18: interest-group membership follows the person's view; no one belongs to both sides.
- [ ] Defect 19: only cause drives and civic standing push someone to file (sub-agent, Sonnet).
- [ ] Defect 4: outcome-web landing rows deleted or given a real reader (sub-agent, Sonnet).
- [ ] Defect 6: unemployment claims read the law in force (sub-agent, Sonnet).

## Sub-agents

- Sonnet (high): defect 6, unemployment law read. Running.
- Sonnet (high): defects 19 and 4, candidacy reasons and outcome-web landings. Running.

## Needs from other sessions

- OPUS-PEOPLE: views.ts is theirs; the audit routed the views half of defect 3 to them and the owner's Oct 14 order gives it to this branch. Tell them the read changes here.

## Questions for the owner

- None yet.
