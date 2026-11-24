---
id: release-m7-05-legal-check
title: "M7-05 Legal check"
area: release
kind: feature
priority: 3
size: S
status: blocked
claimed-by:
pr:
blocked-on: release-m7-05-part-1-real-person-check, release-m7-05-part-2-places-and-institutions, release-m7-05-part-3-source-lines
milestone: M7
source: "docs/roadmap/later-specs-draft.md M7-05"
standard: 2
model: sonnet
effort: low
root: none
lead: cto
after:
checked: fable 2026-11-10
---

**What.** Roadmap M7-05: confirm no real politicians appear (the owner's Sept 26 ruling), and list the real places, schools and institutions, the data sources and the photo and art sources. It is a research review by the team; there is no attorney (owner, Oct 12), and a one-time outside legal review is optional and blocks nothing. Rights and licenses are never checked or asked about (owner, Oct 26 and 27), so the source lines record only what the sources themselves state. It is too large for one session, so it is split into the parts named in Waits on.

**Cause.** Design: docs/roadmap/later-specs-draft.md section M7-05 (approved by the owner Oct 12) and docs/packages/M7-early-access.md.

**Fix.** Research review that no real politicians appear and that real places, schools, data and art are listed with a decision. Take the parts below one at a time once early-access preparation starts.

**Time box.** 2 hours for one Sonnet session, the closing check after the parts. When it runs out, write what was seen in the item and stop.

**Rules.** Spec approved by the owner Oct 12. Research before building: every finding is read from the shipped data, not recalled. One rule, all 56 places: the place and institution list covers every place's data the same way, never a state named in logic. Rights and licenses are not checked or asked about (owner, Oct 26 and 27).

**Done when.** A second session opens the review's three lists, checks a drawn place's names, schools and institutions against them, and finds each name checked against data/research/offices/real-officeholder-name-hashes.json with zero matches or each match fixed, each real institution carrying a decision, and each data and art source carrying the line its source states. Each part records its own evidence.

**Waits on.** Its parts: release-m7-05-part-1-real-person-check, release-m7-05-part-2-places-and-institutions, release-m7-05-part-3-source-lines. Early-access preparation (AGENTS.md: saves and release work wait for it) and the weekly reschedule.

**Files.** docs/roadmap/later-specs-draft.md, docs/packages/M7-early-access.md, data/research/offices/real-officeholder-name-hashes.json

**Notes.** Priority 3 until scheduled. Verify how much is built before starting.
