---
id: director-cause-invite-unworded-for-budget-and-illness-causes
title: "A cause invite about a budget line or an illness is never staged: its subject has no words"
area: director
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: thread cluster 29 part 3
pr: 9407
after:
blocked-on:
lead: words
standard: 2
model: opus
effort: medium
root: none
source: Words lead's read of a council member's year at Salado TX (seed review1:2, train 2190669e), Nov 15
checked: account lead 2026-11-15
---

**What.** In a council member's year at Salado, Texas, six of eight cause invites were staged and dropped with "no narration for join-cause can be worded from the records given"; the two that played were about policy questions. Seen: in the cause invites a player is asked to join, which only ever name a policy question.

**Cause.** Found in code: a cause's topic is the topic of the event that formed it (`driveIdentity`, `src/core2/modules/drives.ts`): a policy question (`us-policy-positions:...`), a budget line (`budget-line:naturalResources`, from a budget change) or an illness (`health:stroke`, from the health engine's case event). The invite's `cause` fact (`src/director/purpose-scene.ts`) reads the topic through `topicInSentence`, which knows only policy questions and law amounts, so a budget-line or illness cause has no `cause` fact, and every join-cause narration needs one. The six dropped at Salado were `cause:health:stroke` (two), `cause:health:cancer`, `cause:budget-line:welfareAndMedicaid` and `cause:budget-line:naturalResources` (two).

**Fix.** One English reader for any cause topic, `causeTopicSaid` (`src/english/policy-names.ts`): a policy question or law amount as before, a budget line by what it is about (question-names.json `about`), an illness by what the people in it want (`data/english/cause-forms.json`, the Words lead's map for every condition the health engine keys, "better care after a stroke"). The invite's `cause` fact reads it.

**Time box.** 2 hours for one Opus session at medium effort.

**Rules.** No hand-written player text in code: the words come from the banks. One rule, all 56 places.

**Done when.** A test pinned to a named place and seed finds a cause invite about a budget line (and one about an illness) staged with its narration naming the cause. A second session plays a council member's year in a drawn town and sees cause invites about budget lines and illnesses, each naming what the cause is about.

**Waits on.** Nothing.

**Files.** src/english/policy-names.ts, data/english/cause-forms.json (new), src/director/purpose-scene.ts, src/director/cause-invite-topics.test.ts (new)

**Notes.** Filed by hand from the Words lead's Salado read (/mnt/project-files/words-lead/regression/page-read-salado.md, "Cause invites and the friend's ask").
