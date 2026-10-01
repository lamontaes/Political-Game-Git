# Constitutional roll calls explain why each member voted

Before: A state constitutional proposal saved its roll call, but a general procedure note replaced the explanation of why its members voted.

After: The existing vote writer keeps each actual member's recorded reason. It also names the most common recorded reason. The vote and its legal thresholds are unchanged.

## Why-chain

Measured: the shared chamber vote already returns a reason on each disposition (constitutional-reform.ts:852). The producer replaced those reasons with a general description of the procedure when it wrote provenance (constitutional-reform.ts:877).

Measured: the saved note is what the constitutional record exposes. Replacing it with procedure text hid the reasons although the member decisions existed. The repaired producer reads the saved disposition, joins its actual member name or key, and retains the reason.

Measured bedrock: the member's recorded decision is the source. This repair creates no motive, vote, member or weight. When a reason is absent, the note explicitly says no reason was recorded. Unrecorded political influences remain outside this repair.

## Research

Measured: this is a record-preservation repair. It uses the existing legal profile and shared member decision; no new legal or empirical claim is introduced (constitutional-reform.ts:842).

## Revisions

Measured: the caller, considerations, legal thresholds and existing constitutional writer remain unchanged. Only provenance text reads the returned member reasons (constitutional-reform.ts:853).

## What gets built

1. Count the actual returned reasons without changing dispositions.
2. Retain each member's name or existing key with that reason.
3. Include the most common recorded reason and the existing profile/source context.
4. Keep the unchanged seven-case constitutional-subjects test file.

## Simulated, records, world pieces, checks

Measured: the shared engine decides the actual state members from their existing considerations. The new work is bookkeeping after those decisions (constitutional-reform.ts:825).

Measured: the original roll call, source IDs and constitutional writer still supply the saved record. A missing reason stays explicitly absent. No person, proposal, institution or legal authority is supplied by this repair.

## Proof run

Measured: the complete constitutional-subjects test file passes all seven cases in 46.16 seconds (a79-member-reason-proof/tests.log:16). The previously failing case still asserts that the record names members' principle reasons. That assertion and every other test are unchanged.

Measured: the cases cover recall repeal and restoration, unsupported doctrine, policy adoption and repeal, catalog refusal, repeat filing and a proposal carrying every chamber. Save/Continue and world integrity assertions remain in the existing file.

## Worked example

Measured: the Grand Island, Nebraska fixture uses seed subjects-A. Its actual state members carry a policy amendment from their held principles. The saved note reports the recorded most-common reason member:principle:for (constitutional-subjects.test.ts:407).

Measured limit: this is a controlled fixture with supplied convictions. The raw test output does not print individual member names or establish a natural constitutional amendment rate. The producer now retains those names in the saved record; no named lawmaker is invented here.

## Method and handoff

Executed worktree: main 98e1c61b6bcfdcad104032ae1ed6ed8f6fc86aa8 plus the captured producer patch. Producer blob 12235aa9ff49007c1d4d76ce152b4c30578fb455 matches source commit 218d76f268be72dbb04467426b4b37d5e9ee1447. The complete test file is byte-identical to main. Two scoped strict roots have zero diagnostics; owned lint and format pass. Full audit:scan is recorded separately and does not establish every A79 caller is migrated.

No full suite, browser, year-speed or nationwide constitutional outcomes were run. A93 work and its initial one-pass/two-failure fixture receipt remain preserved on a separate branch. CTO Ruling 13 authorizes the separate ratification caller next. Publication requests exact-head review, not acceptance or a team merge.
