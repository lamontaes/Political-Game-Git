---
id: words-other-states-laws-under-nation
title: "News tells a law another state passed, under a Nation heading, worded by the English engine"
area: words
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: gov-every-state-and-town-governs
source: added with npm run pool -- add
claimed-at:
---

**What.** Every state legislature now sits and enacts laws of its own, each as a law row under that state's key with its chamber votes and the governor's decision, but the press drops every record that is not the town's, its state's or the nation's (wireItem in src/core2/press-topics.ts returns null for another state), so the player never learns the country is moving. Print a short story, under a Nation heading on the News screen the player already has, when another state enacts a law, naming the state and what the law does. The story is worded by the English engine from the law row and its bill (state, question, vote, governor's decision), and the Nation outlet covers statehouses the way a national paper would, by a coverage rule in data, never a list of state names.

**Rules.** Serves LAW.md section 11, The world on screen makes sense. No hand-written player text in code: the story's words come from English engine bank pieces written with the civic-prose process and graded; numbers come from the record. One engine per mechanic: the press stays the one writer of stories and the news engine the one that decides who hears one; this adds a coverage rule and a heading, not a second paper. Ask why: a state's story cites the law row id and the bill, and when the screen has no Nation story it says why in plain words.

**Done when.** In a buildBenchWorld played year from a drawn place, a test names the place and seed and shows that at least five other states' enacted laws appear on News under a Nation heading, each with its law row id and bill named in the test, worded with the state's name and no field name, kind, id or ISO date, and the player's own state's laws still appear where they did. A screenshot from the drawn place, with its seed, shows the heading and one story.

**Files.** src/core2/press-topics.ts, src/english/english-newscast.ts, data/english/parts, src/bench/calendar.ts, src/bench/play.mjs

**Notes.** Filed by State Sessions, Nov 5, after gov-every-state-and-town-governs step 3 merged. Read: OWNER-DECISIONS, DECISION-REGISTER, play-other-states-news-on-screen (jobs reports under the same heading; build the heading once and share it), news-other-places-events-not-kept (the engine side of keeping other places' events). The law row id is law:US-XX:state:<question>:general:<date>:<bill number>; its bill is in the legislature module's bills table with the chamber votes and governor's decision. Needs from others: the Words session for the bank pieces (Review: words).
