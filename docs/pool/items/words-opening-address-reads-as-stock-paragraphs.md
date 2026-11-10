---
id: words-opening-address-reads-as-stock-paragraphs
title: "The opening address says one thing twice in a row and reads a law record aloud: 'Federal law answers legal cannabis sales with a no.' (Blodgett Landing, New Hampshire)"
area: words
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: words
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 5)
---

**What.** The President's opening address now has moods and can name bad news, but it still reads as stock paragraphs set in a row. Measured in the audit's played opening on main as of Nov 9 (its one browser life was Blodgett Landing, New Hampshire; no seed kept): two back-to-back sentences say the same thing, "I begin this work with a glad heart... I took the oath with a light heart.", and one line is a law record printed as a sentence, "Federal law answers legal cannabis sales with a no." The same address did name bad news: "work has grown harder to find this year." Checked by me on Nov 10's main (commit 8ac2262853), read not played: all three lines are still in data/english/parts/opening-speech.json. `planAddress` (src/director/opening-story.ts:627) builds the occasion block as the move `occasion` followed at once by the move `oath` (near line 848), and for a hopeful address each of those moves has a piece that says the President is glad to begin, in almost the same words. `composeBlocks` (line 1020) only stops the same piece being used twice; it does not stop two different pieces that make the same point. Each priority block says a `law` move (near line 742) whose piece is "Federal law answers {about} with a yes." or "with a no.", filled from the law row's yes or no (`standFacts`, line 489). Fix the class: no two neighboring sentences of any address make the same point, for every kind of address and every speaker's office; and a sentence about a law says what the law does to people, in the words a President would use, or is left out.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: every sentence stays a bank piece written to the civic-prose skill; the composer chooses and orders them, and code types no line. Replace, never layer: the "answers {about} with a yes" and "with a no" pieces are deleted when their replacements land, and the PR counts what was removed. Ask why: a law sentence in the address cites the law row it tells, and says only what that row and its reach hold. One rule, all 56 places: the check runs on openings drawn from all 56, with the place and seed named, and the same rule covers a governor's and a mayor's address. Owner, Oct 24, 2026, as the audit quotes him: the opening speech "shouldn't be formulaic, and it should be customized to the world." Owner, Nov 8, 2026: "the opening presidential address still isn't really at my liking. It's still very robotic."

**Done when.** A different session starts the bench (`npm run bench`, play at /play), begins a new game with the Place field empty so it is a drawn place, writes down the place and seed, and takes a screenshot of every part of the opening address as it plays. It does this for three drawn openings, and once more with Blodgett Landing, New Hampshire typed into the Place field. Reading each address through, it must see: no two neighboring sentences make the same point (no second "glad heart" after the first), no sentence of the form "law answers ... with a yes" or "with a no", and every sentence about a law says who it reaches or what it changes. A test composes the address for ten drawn openings through the real composer, prints the place and seed of each, and fails when two neighboring pieces carry the same point tag or when a law sentence names no effect. The owner plays it: the President sounds like a person making one speech, and never reads him a line from a law table.

**Files.** src/director/opening-story.ts, src/director/data/opening-address.json, data/english/parts/opening-speech.json, src/director/opening-address.test.ts, src/director/opening-address-kinds.test.ts

**Notes.** From the Fable audit, Pillar 5 ("The opening address (measured)"). The audit puts no place beside this quote; its only played opening was the browser life in Blodgett Landing, New Hampshire, where a journal pop-up also appeared over the address. No seed was kept, so the repro is a drawn opening with a hopeful address and a President whose first priority is a law not in force.

The pieces, on Nov 10's main: opening-speech.occasion.polished-ina-hopeful-i-begin-this-work-with-a-glad-heart-because ("I begin this work with a glad heart, because I believe in the people I have come to serve."), opening-speech.oath.polished-ina-hopeful-i-took-the-oath-with-a-light-heart-because ("I took the oath with a light heart, because I believe this country is capable of a good deal more than it has been asked to do lately."), both written Nov 8 for the hopeful kind; opening-speech.law.polished-ina-sta-federal-law-answers-about-with-a-no and its "yes" twin, written Oct 27.

Not verified: I did not play an opening on Nov 10's main, and the audit read one address, so nobody has counted how often the pair or the law line comes up. The audit's wider finding, that the address "still reads as stock paragraphs in a row", is a judgment about the whole speech; this item fixes the two faults it measured and the composer rule behind each, not the whole of that judgment.

Related: words-opening-speech-kind-by-date (open), director-opening-as-a-scene (open), words-opening-speech-per-world, play-first-09-opening-speech-per-world and words-address-flows-from-records (all done; marked done, still shows).
