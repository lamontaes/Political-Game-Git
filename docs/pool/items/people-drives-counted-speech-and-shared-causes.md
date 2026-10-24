---
id: people-drives-counted-speech-and-shared-causes
title: "Public comment draws its speakers from counted town adults too, by the same rule, so a counted adult who feels strongly speaks and hears the room"
area: people
kind: wiring
priority: 2
size: L
status: open
claimed-by:
pr: #5826
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Named adults form causes mostly from speeches heard at public comment: in Port Wentworth, Georgia (1362328, place seed 70b86923dd770297780580cb566840349af399702bdfb610c2994126dbe91442, drawn with seed sh2, purpose counted-share), one played year, 1,619 of the town's drives first formed from speech.heard and 41 from cause.shared; 215 of 547 named adults in town hold a cause (39 percent) against 11 of 7,265 counted adults (0.15 percent). The speeches are public comments (meetings.ts publicComment, `speech:remark:<bill>:<person>`), heard by the room: the body's members and the others who spoke. The speakers are the town adults who feel most strongly (view times civic temperament over commentBar), but `townAdults` lists full people only, so a counted adult who feels as strongly never stands up and never hears the room. Score the counted town adults by the same rule from their counted record (traits, lean, view) and fill in the ones who speak, since a speaker on the public record is a named person.

**Rules.** One model, two tiers: the counted adult is scored by the same rule as a named one, from their own record. No dice. Speed: the year stays within 20 percent of its base on the same machine.

**Done when.** In a one-year buildBenchWorld run in a drawn place (seed named), public comment on a bill includes a speaker who was counted until then (named by remark id), filled in before speaking, who forms a cause from the room by record id; the year is no more than 20 percent slower than its base.

**Files.** src/core2/modules/meetings.ts

**Notes.** Filed Oct 21 measuring people-drives-counted-tier-causes. The parent's per-adult share comparison mostly measures who is named (speakers become named people), not a rule gap: only people in the room hear a public comment, and the room is named by construction. A fairer comparison is per perceived event of the same kind (the job-loss, death and illness PRs report it). Cause sharing (drives.ts share-drive) reaches a holder's known people, who are full; counted holders take no daily acts, so counted-to-counted sharing is a separate question for the owner.

Sent back 2026-10-23 from PR #5826 (branch claude/counted-speech-causes): Missing line-by-line Done-when evidence table for public-comment fill-in, cause sharing and paired speed evidence; player-facing release declaration is present (initial missing-declaration claim corrected); finish on that branch, merge main into it first.

Sent back 2026-10-24 UTC from PR #5826 (branch claude/counted-speech-causes): meetings.ts:268-272 excludes demoted residents still present in core.people although countedResidents includes them and townAdults cannot; line 289 also fails to restore demoted speakers; use isDemoted and cover a returned counted resident; finish on that branch, merge main into it first.
