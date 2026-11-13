---
id: core-life-record-part-14-a-past-that-moves-views
title: "The life record, part 14: big events in a past move a person's views, either way, from the records"
area: people
kind: feature
priority: 1
size: M
status: merged
standard: 2
claimed-by: opus-lr
pr: #8973
after: core-life-record-part-6-the-past-holds-what-happened-between-people
blocked-on:
lead: lives
model: opus
effort: high
root: design-life-record
source: gap sheet, Nov 12, 2026 (Fable A), filed by the Life records builder opus-lr
checked: opus-lr 2026-11-12
merged-at: 2026-11-13T02:48:41.350Z
---

**What.** The owner, Nov 12 (relayed by the CTO on #7365, 20:13Z): the life history before the start should "include some big events in your life that shape the person you are, right? So if your dad lost his job and then he kind of went off the rails and became a super MAGA guy, that could have turned you super MAGA, or it could have turned you liberal." Today a person's opening views come only from their state, age, schooling and faith, never from anything in their past. Seen: dev mode's Trace on a person's view, and their card, which tell the past event that moved it.

**Cause.** Found in code: `src/core2/modules/views.ts` opens a lean from the CES cell for state, age and profile (`openingLean`, `profileFromAverage` near line 305), spread by household heritage and the person's own key. No reader takes a record of the past: a parent's lost job (`person.out-of-work` in the work pass), a parent's death (`family:parent-died`), a past partnership's end or a hospital stay (#8670), an arrest (part 12) or service (part 11).

**Fix.** One reader in the views engine, run when a person is opened (`openWholePast` already runs the past passes first): for each formative record in their life before age 25 (a parent's job lost or a long spell out of work while they lived at home, a parent's death, the household evicted) and in their own adult past (their own job lost, a partnership ended, a hospital stay), a shift on the economic and social axes whose size comes from the research on economic shocks and partisanship (for example job loss and voting, Margalit 2019), and whose direction comes from the person's own traits and the parent's view on the record: a person who trusts the parent moves toward the parent's view, one who resents them moves away. Each shift keeps its record id as the reason, so dev mode's Trace on a view names the event. Words: the card and the Journal tell the event; a line linking it to their politics is Story's to write.

**Time box.** 2 hours of research and 8 hours of building, Opus.

**Rules.** No dice: traits and records decide the direction; research sets the size and checks totals across a town. Ask why: every shift names its record. Estimate, never UNKNOWN. One engine: the views engine; no second opinion model.

**Done when.** A test in three drawn places opens every town adult and prints how many have a view shifted by a past record, by kind, the mean shift, and the share that moved toward and away from the parent; the town's opening party shares stay within the CES spread. A second session, on main, opens a person whose parent lost a job before they were grown and sees in dev mode the shift with that record's id.

**Waits on.** Part 6 (#8670) for partnerships and hospital stays; parts 11 and 12 for service and arrests, read when they land.

**Files.** src/core2/modules/views.ts, src/core2/modules/people.ts, src/core2/data/views/

**Notes.** Built by the Life records builder (opus-lr), Nov 13. Two events move a view: a parent's layoff while the person was a child (toward or away from the parent by the new trait decision `views.parent-hardship`, further the more the parent follows politics), and the person's own last layoff as an adult (leftward, more for those who lean right, fading with years back at work). The sizes are TUNABLE (`SG-PEOPLE-past-views-sizes`): the papers' abstracts give directions only. A parent's layoff is read only once the parent's own past is opened, so opening a person never writes anyone else's past; opening a parent later re-reads their opened children.
