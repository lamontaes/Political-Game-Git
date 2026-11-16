---
id: director-cap-on-scene-repeats
title: "The same scene stops coming back to the same person: 45 of 64 scenes in three played years were one job-offer call (Ninnekah, Oklahoma: 15 of 16)"
area: director
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-director-cap-on-scene-repeats
pr: #8424
after:
blocked-on:
model: opus
effort: high
root: rc6-scenes-repeat
lead: director
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 4, root cause 6)
checked: fable 2026-11-10
claimed-at: 2026-11-11T01:19:15.865Z
branch: claude/pool-director-cap-on-scene-repeats
---

**What.** A scene plays again every time its cause recurs, and nothing asks what the last one settled. Measured by the audit's scene tool, a 17-year-old for one year in each of Ninnekah, Oklahoma (seed 3dac8ffb3f3c), Tesuque, New Mexico (seed 8a5d1fba28fc) and Odessa, Washington (seed fd7e212758b7): 45 of 64 scenes were the same job-offer call (15 of 16, 16 of 24, 14 of 24). In Ninnekah ten employers called, Woodward's Market three times, and he had no job at the end; in Tesuque one caller phoned four times and a relative's letter made the same ask three times in six months. In the audit's browser play (Blodgett Landing, New Hampshire, ten weeks) one stranger asked the same question three times. This item also takes the vote-ask cap: for a player seated in a legislature past the six-per-91-days cap, the ask is recorded with the season-cap reason and a bank journal line says the sponsor asked (Springfield, Oregon, 4169600, run seed chk2-b).

**Cause.** Measured: `scripts/dialogue-batch/scene-year.ts` on main 8ac2262853, seed 3dac8ffb3f3c (Ninnekah, Oklahoma), then seeds 8a5d1fba28fc and fd7e212758b7 (45 of 64). Found in code: `offerToPlayer` (`src/core2/modules/jobs.ts` line 4374) refuses a second offer only for the same position id, and the director's only limits are day counts in `scheduleMoment` (`src/director/scheduling.ts` line 759) and `produceCircumstances` (`src/director/ledger.ts` line 1451): `repeatDays` and `seasonCap` in `src/director/data/situation-types.json`. None reads what the earlier scene settled.

**Fix.** Limit how often one kind from one caller on one subject reaches a person by what the earlier scene settled (declined, lapsed, accepted, already told) and what changed since, read from records. With nothing changed the cause goes to the journal. Delete `repeatDays` and `seasonCap` if the record-based rule covers them. For a legislator player, a vote ask past the cap is recorded with the season-cap reason and a bank journal line says the sponsor asked.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: which repeat plays is decided by the records of the earlier scene and of what changed, never by a roll, a random skip or a hash. Sliding scales and causes: the limit is not a fixed count that flips at a number; a repeat needs a cause on record, and how soon it may come slides with how much changed and with the tie to the caller. Replace, never layer: if the record-based limit covers what `repeatDays` and `seasonCap` did, they are deleted in the same change and the PR counts them. One model, two tiers: an employer's memory of its own offer to a person is the same rule for a counted applicant, times the count. Owner, Nov 8, 2026: "There's lots of irrelevant scenes popping up." Vote-ask part: the player should hear a close vote's ask or see why not, worded through the English engine's banks (No hand-written player text), and the Words session's ruling on the cap for the player is cited in the PR body.

**Done when.** A second session starts the bench (`npm run bench`, play at /play), begins a new game with the Place field empty so it is a drawn place, writes down the place and seed, and plays a jobless 17-year-old for one year with dev mode's Run. When the first job offer comes it declines, and it keeps a screenshot of each later call. It runs `node --max-old-space-size=6144 --import tsx scripts/dialogue-batch/scene-year.ts --seed <seed> --out <file>` on the same seed and counts scenes by kind, caller and subject. It must see: every repeat of a kind to the same person from the same caller or on the same subject names the record that changed since the last one (an offer with different pay or position, a new story id, a new event), listed by record id, and a repeat with no changed record is a failure. No employer the player turned down calls again with the same job at the same pay, and no person brings the same news twice. The same on seeds 3dac8ffb3f3c, 8a5d1fba28fc and fd7e212758b7: Woodward's Market does not phone three times with nothing changed. In a second run where the player accepts the first offer the calls stop. For a player seated in a legislature in a drawn place, every vote-ahead ask is either staged or recorded with the season-cap reason, and the journal line for a capped ask says the sponsor asked, through a bank line (Springfield, Oregon, run seed chk2-b). A director test fails when a kind repeats to one person with no changed record. The owner plays it: after he turns a job down, that employer leaves him alone until something about the offer changes.

**Waits on.** Nothing.

**Files.** src/director/scheduling.ts, src/director/ledger.ts, src/director/circumstance.ts, src/director/data/situation-types.json, src/director/data/director.json, src/core2/modules/jobs.ts, data/english

**Notes.** From the Fable audit, Pillar 4 ("Three more played lives, a year each") and root cause 6: "A scene plays because something in the world matches it, and plays again every time that recurs. Nothing asks whether this scene belongs in this person's story now."

Nov 10 re-run on main (commit 8ac2262853), scripts/dialogue-batch/scene-year.ts, one year each. Ninnekah, seed 3dac8ffb3f3c: 16 scenes, 15 job offers from ten employers; Woodward's Market (caller Rowan Tyson) on 2027-02-22, 2027-06-14 and 2027-08-09; Pollard's Market, Frazier's Market and Monroe Supply Company twice each; the 16th scene is the father's cause invite. Tesuque, seed 8a5d1fba28fc: 24 scenes, 16 job offers from nine employers, Edward Rowland four times (2027-03-08, 05-31, 07-12, 08-23); five letters, three of them from Cora Sinclair with the same ask (2027-01-01, 04-01, 06-01). Odessa, seed fd7e212758b7: 24 scenes, 14 job offers from nine employers; five letters, three from Nadia Robertson with the same ask. The player had no job at the end of any of the three.

What the audit did not verify, and one thing to know about its tool: the scene tool walks each offer's reply tree but records no reply, so in these runs every offer lapsed unanswered. Nobody has tested in the running game whether declining or accepting stops the calls. The cap has to hold for an offer that was answered and for one left to lapse. The audit also did not trace which records fired the five "someone has news" scenes in Blodgett Landing (no seed kept).

The jobs engine's half (an employer reads its own earlier offer to the same person before offering again) is in src/core2/modules/jobs.ts; ask the Jobs session per docs/coordination/CREW.md before editing it. Related: world-player-jobless-no-offers (open; the opposite case, a player who gets no offer), director-vote-ask-cap-and-the-player (open; the season cap and the player), director-casting-rule-on-every-scene-kind (filed with this one).

**Notes (pool redo, Nov 10).** Takes director-vote-ask-cap-and-the-player: the vote-ask cap and the player's journal line are folded into Fix and Done when above. `seasonCap` is in `src/director/data/situation-types.json` (the same cap that item cites at lines 83 to 89).

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 01:19 UTC) on branch claude/pool-director-cap-on-scene-repeats.

**Notes (stages of a bill, Nov 14).** Measured: the cap also swallows the player's own asks. `src/director/bill-sign-on.test.ts` (co-sponsor ask, scene-bill-sign-on-colleague-ask) at Manteca, California (0645484, world seed 1d3c1565): the player drafted a bill on 2025-02-12 on a question a colleague had turned down, and the second sign-on ask to that colleague was scheduled with `heldBack: [{ typeKey: "bill-sign-on", reason: "season-cap" }]`, a Journal line only, because the type's six moments in 91 days were spent on the player's earlier drafting days. What limits it should be a reason on the record (the colleague was just asked, the session calendar, the player's own time), never a count per season (account lead, Nov 14).

**Notes (stages of a bill, Nov 14, 20:55Z).** The player's own asks no longer count against the season. This is built on branch `claude/project-thread-lcf812` as the next PR after #9305, in `scheduling.ts` `pressedByPlayer`. It covers the types that are `playerAsks` and caused only by an event of the player's own act: `bill-sign-on`, `vote-sought` and `serve-sought`. What limits them is on the record:

- one sitting a day with the same person;
- the repeat window by bill or by cause;
- the colleague's own memory of being asked ("You asked me this before. It's still no.").

At Manteca (0645484, world seed 1d3c1565) the second sign-on ask, which the cap held, now plays.

What the other 80 types need before `seasonCap` can be deleted (it stays for them until then):

- **Doors** (`door-ask`, `door-signature`). Each is the circumstance producer's pick of the day, already spaced by its `everyParameter`. The cap is a second count on top. They can drop it once the producer reads "this resident was talked to, and nothing changed since" from the canvass record.
- **The other 31 types caused by events** (vote asks, reporters, offers, invitations). Each needs what #8424 gave job offers and letters: the caller's earlier ask of the same person, and what changed since, read from records. The floor vote's 121 scenes a year (Neodesha) is the case the cap was set for. There the session calendar is the record that limits it: one sitting folds a floor day's votes, and a vote the player already cast needs no second scene.
- **The 18 types caused by circumstances.** Their producer keeps the spacing; the cap is redundant once each row's spacing reads what the last scene settled.
- **Feeling, tie and money types (21).** These are paced by the life's `paces` budget, which already ranks scenes. The cap only stops one feeling from filling a season, which the ranking by importance should do on its own.

Nov 15 evidence (governor's briefing room, #9439): the season cap held back a live emergency. Frankfort, Kentucky (2128900), seed a1b2c3d4e5f6…e9, disaster 3624 on 2025-02-14: the briefing met the player governor on 02-15, 02-22 and 03-01, then the offers of 03-07 and 03-14 went to the journal as `season-cap` (type `emergency-briefing`, cap 6 per 91 days) while the offer was still the governor's to answer until 03-16. Only three briefings for this disaster had played, so the other scenes of the type that filled the cap were other disasters' briefings in the same window (not counted by the builder). The played file shows the schedule rows (momentId, outcome journal-line, heldBack season-cap). Fix by what the earlier scene settled, not by count: an unanswered offer with its request window still open must reach the player.
