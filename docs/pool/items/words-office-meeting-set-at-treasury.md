---
id: words-office-meeting-set-at-treasury
title: "A legislator's meeting opens at the state's seat, never at the state treasury"
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/treasury-arrival
pr: #9554
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Account lead, Nov 15 (an arrival line read "at Wyoming treasury" for a legislator's scene)
claimed-at:
checked: words builder A 2026-11-15
---

**What.** A scene whose setting is "office" or "workplace" for an official whose job is their government's payroll body opens at the treasury, a place nobody meets in. Seen: a Wyoming House member's scenes set at "Wyoming treasury".

**Cause.** Found in code: `resolveSetting` (src/director/scheduling.ts) returns the subject's job organization for "office" and "workplace". An official's job record names their government's treasury (organization kind `government-treasury` or `government-outside`, the same kind `employerIsGovernment` in src/english/journal-words.ts reads) as the employer, so the setting is the payroll account. The underlying oddity is that an official's job organization is their government's treasury, not an office. Its other readers: `employerInTalk` in src/director/employer-in-talk.ts through `publicEmployerFor` in conversation.ts (the "I work at" lines), `employerIsGovernment` in journal-words.ts, view-learned.ts, public-pay-floor.ts and dev-mode.ts; none of them is changed here.

**Fix.** One rule that reads the record's kind, never a name, for every government level: `isPayrollOrganization` (journal-words.ts) says whether an organization is a payroll body, `employerIsGovernment` reads it, and `resolveSetting` does not place a scene at one. "Office" falls back to the government's seat through one resolver (`seatSetting`, the same record the "seat" setting reads). The governor's briefing room keeps the `officeId` fact its cause record names (`executive.emergency-offered`), which "office" reads first.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** One engine per mechanic: one resolver for an official's room. No names in logic. Pinned test at a named place and seed.

**Done when.** At Sheridan WY, seed 7, no scene type's setting resolves to a payroll body for a legislator, the governor, a mayor or a county official (src/director/office-room-played.test.ts, red on the unfixed code, green after), and the played arrival lines for a legislator's meeting and the governor's briefing are in the played file at the head (scripts/words/office-arrival-replay.ts). A second session (not the builder) plays a legislator's scene in the running game at a drawn place from all 56 (place and seed named) and sees it set at the seat, not at the treasury.

**Waits on.** Nothing.

**Files.** src/director/scheduling.ts, src/english/journal-words.ts, src/director/office-room-played.test.ts, scripts/words/office-arrival-replay.ts, scripts/words/office-rooms-table.ts

**Seen:** not yet.
