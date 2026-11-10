---
id: words-work-four-answers
title: "Work questions: replies that mean different things"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: story/work-four-answers
pr: 8164
blocked-on:
source: added by hand on the branch
---

**What.** The work questions repeat themselves. Where do you work (own-work-new), Remember the old employer (shared-work) and the reply to a heard job (heard-work) offered one answer worded several ways. New moves detail (the player's town or current employer), deflect (a later time) and change (raise home or mutual) sit beside plain, brief and turn, so a player who is asked about work can give a real choice of answers. The player can then say where they live, name their present employer, or put the question off.

**Files.** data/english/parts/conversation.json, src/director/data/conversation-rules.json

**Rules.** Declared slots only; evasion points to a later time; American English; no dice (traits and calibration rank the moves).

**Done when.** In a drawn place and a seed nobody chose, a talk that opens with Where do you work shows replies that differ in meaning, named by place and seed; words:rules shows no new pulls; conversation tests pass. Still open: follows needs own-work and heard-work to list home, and shared-work to list mutual, before the change moves are offered; the engine needs the job start date (since), the asker's own work and place as answer facts, and the job title.
