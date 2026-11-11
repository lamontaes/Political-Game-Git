---
id: play-town-moves-news-line
title: "News prints a line when someone the player knows moves away"
area: play
kind: feature
priority: 3
size: S
status: in-pr
claimed-by: claude/pool-play-town-moves-news-line
pr: #8674
after:
blocked-on:
standard: 2
lead: words
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:52:03.112Z
---

**What.** The town's size and moves show on Who you are, but News prints nothing when someone the player knows moves away. The news engine keeps no story for a move: the move is recorded as person.moved-away and read by people, offices, jobs and parties, never by news or press. A line built in the bench would be a view inventing news, which breaks one engine per mechanic. The press should record a known person's move as a story, and News then prints it like any other story with no bench change.

**Cause.** Found in code: `person.moved-away` (MOVED_AWAY_EVENT, re-exported from src/core2/modules/people.ts) is read by src/core2/modules/people.ts, moves.ts, renewal.ts, offices.ts, jobs.ts and parties.ts but not by src/core2/modules/news.ts or src/core2/modules/press.ts, and `wireItem` in src/core2/press-topics.ts (line 111) has no case for it. The old branch play-first/play-town-moves-on-screen has a `wordMovedAway` draft for reference.

**Fix.** Have the press turn a known person's move into a wire item in `wireItem`, worded from the English engine's news bank (data/english/parts/news.json), citing the moved-away record by id, so News prints it with no bench change. The builder adds the wire item, the facts it carries (who moved, from where, the record id) and the test; the news pieces themselves in data/english/parts/news.json are Story's under the Nov 10 split of words work, so name the pieces needed in the pull request body for Story. A person is "known" by the same rule the press already uses for other people stories.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the line cites the moved-away record by id. No hand-written player text: the words come from the English engine's news bank (`Review: words`). One engine per mechanic: the bench writes no news of its own. An effect is a read, not a record: the press reads the move record when it prints.

**Done when.** A second session (not the builder) plays a year in a drawn place (place and seed named) in which a person the player knows moves away, opens News, and sees the move as a story naming the person and the record id of the moved-away event (shown by a screenshot at 1440x900), with a test that fails when a known person's move prints no story.

**Waits on.** Nothing.

**Files.** src/core2/press-topics.ts, src/core2/modules/press.ts, src/core2/modules/news.ts, src/core2/modules/people.ts, data/english/parts/news.json

**Notes.** lead: Lane 4. The old branch play-first/play-town-moves-on-screen (Oct 26, before the old core was deleted) has a wordMovedAway draft for reference.

Lane 4, Nov 4: the news engine keeps no story for a move: `person.moved-away` is read by people, offices, jobs and parties, never by news or press (`src/core2/modules/news.ts`, `press.ts`). A line built in the bench would be a view inventing news (one engine per mechanic). Needs first: the press records a known person's move as a story (Lane 3, the press and news engines); then News shows it as any other story, with no bench change.
