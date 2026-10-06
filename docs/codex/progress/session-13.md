# P1 / Citizenship producer / Session 13

The private citizenship producer is published for review. New people receive a marked county-share estimate; later status changes require a recorded private event. Consumers receive citizenship-only checks and keep their own applicable office and voting requirements.

## Checked source

Draft PR: #2455. Registered workspace: `/workspace/session13-federal-reader`. Branch: `codex/session13-citizenship-status`. Source head: `1bd8916f88d27e8a2d51053fe0f4eb6170188af8`; base: `f88508186b78f526ecf89a420b5fb584171e039a`. Final receipts and consumer documentation follow that source commit.

Thirteen targeted cases passed with ten skipped. All eight new citizenship cases ran. Configured application and Node typing passed; changed-root typing found zero errors in twelve roots. The separate import check reports 803 uncovered test files and zero unresolved imports. Source compilation, four compiler checks, lint, formatting, zero-dice, and the declaration range passed.

The repaired source-reference failure and the auxiliary 16-opening birthday timeout are retained. Exact main reproduces the same 30-second timeout. No timeout was raised. No played naturalization, clerk route, election-night route, merge, or build is claimed.

## Next handoff

Publish the final receipt head to Sessions 23 and 21 on #2424. The exact contract is `docs/codex/citizenship-producer-session13.md`; the authoritative field is `Person.citizenshipStatuses`. Use `citizenshipStatusOf`, `citizenshipEligibility`, and `recordCitizenshipTransition` through the simulation index. Missing old saves stay unknown; no transition may be invented to qualify a nominee.

Next command: `git log -1 --format=%H` to resolve the receipt head, then post that exact head and the source contract. Do not merge or build. Earlier clerk/night work remains separate on `codex/session13-clerk-night-composition`; no scene readiness is claimed.
