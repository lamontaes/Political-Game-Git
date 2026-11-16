---
id: screens-people-card-fills
title: "People: the approved person card fills the panel, with no empty half"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by: screens lane (Nov 16)
pr:
blocked-on:
source: owner, Nov 16, crew line item 4g
after:
lead: play-first
model: opus
effort: medium
root: none
---

**What.** On People the person's card put the name and a small bust in one narrow column and every section in one column beside it. Under the bust nearly half the card stood empty. The owner called it "A massive just hole." on Nov 16.
Seen: People in a new life, where the bust's column was empty below its first third.

**Cause.** Found in code: `src/bench/ui/strips.mjs` line 35, `stripScreen`, set the name over the bust in the left column, and `personCardNode` in `src/bench/play.mjs` put every section in one column when the person had no colleagues or public record.

**Fix.** Give `stripScreen` in `src/bench/ui/strips.mjs` a name-beside layout, and have `personCardNode` in `src/bench/play.mjs` set the life story in a second column beside a larger bust, as the approved card pl-people does. The player sees it on People and on every person card.

**Time box.** 2 hours for one session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the person card keeps one renderer, `stripScreen`, and the old one-column layout goes. One rule, all 56 places: the card is one layout for every person in every place.

**Done when.** A second session opens People in a drawn place and, for each of the first four people, sees the name beside the bust over two columns of sections, with no more than 45% of the card empty under the bust or under the sections.

**Waits on.** Nothing.

**Files.** src/bench/ui/strips.mjs, src/bench/play.mjs, src/bench/play.css, src/bench/people-card-fills.browser.mjs

**Notes.** Crew line #9747, item 4g.
