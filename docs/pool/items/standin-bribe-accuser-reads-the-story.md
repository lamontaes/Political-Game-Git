---
id: standin-bribe-accuser-reads-the-story
title: "The person who asks an official whether a reported bribe is true is someone who read the story"
area: director
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: S3
pr: 9359
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

**Measured (S3, Nov 14, three drawn places: Lake Michigan Beach MI, Shiloh TN, Chalan Pago-Ordot GU, seed scandal-days:0-2).** The paper prints a reported bribe on day 7 (4 to 8 stories) and its readers begin on day 8 (12 to 41), reaching 70 to 160 by day 21; at day 1 nothing is printed or read. A cast at the report's day plus one therefore can never name a reader. Also, a scandal story carried no news.read record at all (the news engine emits one only for a story that argues a change or names a law).

**Fix.** Cast the accusation from the readers' own record, the way law-news-street does: the news engine emits news.read for a story that names a crime and an official (`crimeId` and `officialId`); the `bribe-accused` circumstance reads news.read, takes the official from the story (player rule `official-in-it`), and casts among the readers (`witnessed`) who know the official, scored on tie and sociability; the scene cites the news.read id. The old scandal.reported cast, the ties-of-named pool and the stopgap's marker row are deleted.

**Time box.** 3 hours for one Sonnet session. It stays cheap because it reads the readers of one story when the circumstance is called.

**Rules.** Ask why: the one who asks cites the news.read record that shows they read it. No dice. One rule, all 56 places.

**Done when.** A second session plays buildBenchWorld in a drawn place (place and seed named) until a bribe is reported against an official the player knows, and sees the accuser's scene cast from a person whose news.read record for that story is named, and no accusation from a relative who did not read it.

**Waits on.** Nothing.

**Files.** src/director/circumstance.ts, src/director/data/circumstances.json, src/core2/modules/news.ts, src/director/data/stopgaps.json
