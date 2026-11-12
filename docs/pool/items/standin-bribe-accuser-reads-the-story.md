---
id: standin-bribe-accuser-reads-the-story
title: "The person who asks an official whether a reported bribe is true is someone who read the story"
area: director
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: words
standard: 2
model: sonnet
effort: medium
root: design-story-director
---

**What.** The day after the press carries a taken bribe, the person who asks the official to their face is the one with the highest tie and sociability among the official's family, household and acquaintances, whether or not they read the story. Stand-in SG-WORDS-bribe-accuser-anyone-close. Seen: in the talk where someone asks an official whether a reported bribe is true.

**Cause.** Found in code: src/director/data/circumstances.json, circumstance `bribe-accused` (pool "ties-of-named") is cast by src/director/circumstance.ts line 479 (the `ties-of-named` source), which returns family, household and known people with no reading of the news. The news engine records readers per story as `news.read:<story id>:<date>` events (src/core2/modules/news.ts line 157, storyOfReadEvent line 164, storiesHeard line 246).

**Fix.** Give the `bribe-accused` circumstance a pool that keeps only the people of ties-of-named whom the news engine's records say heard the story the scandal.reported record became (storiesHeard for that story), citing the news.read id; keep the closest and most sociable of those, and no scene when none read it. Delete the stopgap's marker row in src/director/data/stopgaps.json.

**Time box.** 3 hours for one Sonnet session. It stays cheap because it reads the readers of one story when the circumstance is called.

**Rules.** Ask why: the one who asks cites the news.read record that shows they read it. No dice. One rule, all 56 places.

**Done when.** A second session plays buildBenchWorld in a drawn place (place and seed named) until a bribe is reported against an official the player knows, and sees the accuser's scene cast from a person whose news.read record for that story is named, and no accusation from a relative who did not read it.

**Waits on.** Nothing.

**Files.** src/director/circumstance.ts, src/director/data/circumstances.json, src/core2/modules/news.ts, src/director/data/stopgaps.json
