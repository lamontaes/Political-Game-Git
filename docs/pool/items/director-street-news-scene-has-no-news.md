---
id: director-street-news-scene-has-no-news
title: '"Riley has news for you" opens a street talk that has no news: a greeting, "Last time was last week", and a question about a relative'
area: director
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Playtester P1, Nov 13
claimed-at:
---

**What.** On main 5e68cde1, played week by week. In Curtisville, Pennsylvania (bench seed 24b09c77-0589-433f-9b6b-0c77e53b4ff7), on Apr 18, May 23 and Jun 27, 2025: "First thing on April 18th, Riley Hendricks walks up to you in the street. Riley has news for you." The talk is "Good to see you. / Last time was last week. / How's Vanessa doing?", with the reply "Thanks for asking. I'll tell Vanessa you asked." It is the same each month, with a different relative named. Riley is a township supervisor, the two had not met the week before, and no news is ever said. In Hickory Hill, Kentucky (bench seed b258ee86-71f0-47cc-9311-fb3f905f521f), on Sep 10 and Oct 15: "Brittany McClure walks up to you in the street. Brittany has news for you." The clock then stops with Continue and no talk. In Curtisville on Apr 8 there is also "First thing on April 8th, Bradley Moreno calls. The phone rings. It's Bradley Moreno, from Moreno's Kitchen.", and the next line is the sister Cameron Webb's newspaper talk. Seen: the street and phone scenes that open with someone bringing news.

**Cause.** Measured: Curtisville, Pennsylvania, bench seed 24b09c77-0589-433f-9b6b-0c77e53b4ff7, and Hickory Hill, Kentucky, bench seed b258ee86-71f0-47cc-9311-fb3f905f521f, each played on the bench with Week from a new life. The lead is `scene-words.lead-news-arrives-other.other-has-news-for-you` (data/english/parts/scene-words.json) on a news-arrives circumstance (src/director/data/circumstances.json, the `*-street` rows). The talk that follows is the small-talk body of data/english/parts/conversation.json ("Last time was {when}."), not a line carrying the record that called the scene. "Last time was last week" reads a last-contact date the two did not share. Which step drops the record's purpose is not yet traced.

**Fix.** Trace a scene staged from a `*-street` circumstance through src/director/purpose-scene.ts and find where the talk falls back to small talk. A news-arrives scene either says the news its cause record carries, or does not open with "has news for you". The "Last time was" line reads only a contact that the relationship records hold. A phone call's talk is with the caller the narration names. Each fix gets its test in src/director.

**Time box.** 4 hours for one Opus session.

**Rules.** scene-standard: a scene exists only if it writes something back, and the lead's promise of news is kept by the talk that follows it. One rule, all 56 places: the fix is in the one scene engine and its banks, never in a place's data.

**Done when.** A second session, on main, plays three new lives in a drawn place each, three months each with Week and Day, and takes a screenshot of every street or phone scene: each one that says someone "has news" says that news, no talk claims a meeting the records do not hold, and every call is spoken by the caller the narration names.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, src/director/data/circumstances.json, data/english/parts/scene-words.json, data/english/parts/conversation.json

**Notes.** opus-lr, Nov 13, 08:15Z: #9016 closed on Fable A's ruling (#8928, 08:06Z). #8922 removed every street row that cast `news-arrives` and the `story-read` scene, so the street stops this item named (Curtisville's "Riley has news for you", Hickory Hill's stop with no talk) can no longer be staged. What is left is the greeting: "Last time was…" read from a talk on record (`lastTalk` in `src/director/conversation.ts`, on branch `claude/director-street-news-has-news`) instead of the tie's contact date. It comes back as a small pull request on main the hour house talk (#8879) lands, when Fable A says.
