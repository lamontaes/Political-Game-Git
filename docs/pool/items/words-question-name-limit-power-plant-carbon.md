---
id: words-question-name-limit-power-plant-carbon
title: "The name of the power plant carbon question reads like a label, not something a person says"
area: words
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: PR 9152 replay, Nov 14
lead: words
standard: 2
model: fable
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** In a debate the player's replies on this question read "I oppose limits on power plant carbon." and "I support limits on power plant carbon." A person would say "I'm against limiting carbon from power plants" or "I support cutting power plant emissions". The name is a label for the question, not a phrase a person says. Seen: Wetumpka, Alabama, seed replay-stand-1:2, the debate's second question, in the replies listed in docs/seen/play-sitting-answer-reads-own-stand-on-record/lines.md.

**Cause.** Found in code: data/english/question-names.json, the row `us-federal-positions:energy-environment.limit-power-plant-carbon`: `about` is "limits on power plant carbon", and the plain answers put it after "I oppose" and "I support" unchanged. The `for` and `against` forms ("limit carbon from power plants", "say no to limits on power plant carbon") exist but the plain answer pieces read `about`.

**Fix.** The Words lead rewrites the row's `about` (and checks the other federal rows written the same way) so every plain answer piece reads as speech; no code change.

**Time box.** 1 hour.

**Rules.** Plain American English; people say how they feel, never a label.

**Done when.** A second session plays a debate in a drawn place (named with its seed) where this question is asked and sees the replies read as speech.

**Waits on.** Nothing.

**Files.** data/english/question-names.json
