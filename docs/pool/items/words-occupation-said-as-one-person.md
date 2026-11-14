---
id: words-occupation-said-as-one-person
title: "A person's work is said in the singular, never as the occupation group's plural name"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after: gov-governor-running-mates
blocked-on:
lead: words
source: Words lead read of #9080 (T44), Nov 14 03:16Z
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** A filled-in resident's job title is an occupation group's plural name from the occupation lists ("Editors", "Registered Nurses"), so wherever the game says one person's work it can say "an editors" or "Gia Trujillo, editors". Every reader that says a person's work says the singular ("editor", "registered nurse"). Seen: the Campaign board's running-mate rows, where #9080 now leaves such a person at name and town only; a conversation where the speaker names their work; and a celebration line that names a guest's job.

**Cause.** Found in code: job titles are copied from the occupation corpus (data/source/career-occupations/corpus.json, src/core2/data/press/staff.json), whose names are plural. The readers say the title as it is: `workDetail` and the readers beside it in src/director/conversation.ts (`sayableTitle` checks only for brackets and slashes), src/director/celebration-facts.ts line 80, and `ticketView` in src/bench/campaign.ts, which on #9080 hides a title its `groupName` test reads as plural instead of saying it.

**Fix.** One singular form per occupation, kept with the occupation row (a `singular` field next to its name, written once from the corpus), and the job record carries it as its title when a job is made, so no reader has to change a plural. Then `groupName` in src/bench/campaign.ts is deleted and the running-mate row says the work.

**Time box.** 3 hours for one sonnet session.

**Rules.** No hand-written player text in code: the singular lives in the occupation data. Replace, never layer: the `groupName` hide in campaign.ts goes in the same change.

**Done when.** A second session plays a new life in a drawn place with a seed it did not choose, meets ten residents, and sees no plural occupation name in any line that says one person's work; on a governor's Campaign board in a joint-ticket state, a running mate with an occupation shows it in the singular.

**Waits on.** gov-governor-running-mates (#9080) on the train.

**Files.** data/source/career-occupations/corpus.json, src/core2/data/press/staff.json, src/core2/modules/residents.ts, src/director/conversation.ts, src/director/celebration-facts.ts, src/bench/campaign.ts
