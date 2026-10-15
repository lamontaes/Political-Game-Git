# Five town councils retain their votes and enacted records after Continue

Five town-profile councils recorded their actual saved members' votes through the shared bill driver. Each authored proposal passed, and its enacted record survived Continue and a repeated step. This proves the controlled town-profile route. The earlier presentation-entry import failure remains a separate blocker. The run also exposed an effective-date mismatch: the profile says adoption day, but the existing callback records a date 30 days later.

MERGED: No. This proof is part of the preserved draft council-driver branch.

## What emerged

DECIDED, measured: David Peterson voted yea with the recorded reason `member:own-bill`. Amber Medina, Rosa Hayes, Robert Weiss and Taylor Anderson voted yea with `member:council-deference`. The saved vote passed five to zero. Their records are in `a77-town-profile-proof/named-councils.json:11`.

HARDWIRED, measured: the existing passage callback at `src/simulation/municipal-ordinance-procedure.ts:831` supplies a 30-day effective-date fallback. The town profile at `src/simulation/town-council-profile.ts:221` says the date is not distinct from enactment.

Measured: `a77-town-profile-proof/named-councils.json:51` records the first act's enactment on January 5 and effectiveness on February 4. This is an observed A83 gap, not a repaired date rule.

## Wider effects and missing links

Measured: `src/simulation/governing/town-profile-clock.test.ts:105` checks that every disposition belongs to the saved council. Line 115 requires an enacted record. Line 141 checks canonical Continue, unchanged offices and organization identity; line 152 rejects duplicate votes and enactments after a repeated step.

This controlled nonfiscal proposal does not establish natural filing, public service delivery, a monetary effect, a browser interaction or another institution's driver. The native fixture's successful import does not resolve the prior presentation-entry import failure. No shared import repair was made.

## Vital statistics

Measured: `a77-town-profile-proof/receipt.json:4` records six passing cases, no failures or skips, and 12.56 seconds total. Measured: `a77-town-profile-proof/receipt.json:9` records five councils, 25 saved member decisions and five enacted records. Line 21 records one scoped type root, 999 imported files and zero diagnostics.

Measured: `a77-town-profile-proof/receipt.json:26` records passing changed-file lint and format; line 32 records passing whitespace checks. No unchanged world or macro check, full suite or repository-wide sweep ran.

## What happens next

Claude's lazy-registry owner supplies the existing presentation-entry repair. Team 1 then renews the original changed council proof. Coordinator must release the A83 passage-date hunk and its pack-data dependency before Team 1 changes the protected callback. Audit and Coordinator still need to name A97's approved saved receipt type/query and producer owner; Team 1 retains the released duty reader.

Method: the standard small-world and local-seat producers built the saved councils. Five profile municipalities were sampled from all 56 jurisdictions with seed `a77-town-profile-roll-call-20261001`. The authored proposal isolates the existing council decision path. Places were 2112898, 3661489, 0567370, 4543495 and 4284272. The committed test source and executed file match; exact identities and logs are in `a77-town-profile-proof`.
