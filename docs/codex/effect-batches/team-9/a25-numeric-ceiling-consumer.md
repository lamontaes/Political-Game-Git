# A25 — Read the actual numeric juvenile ceiling

The owned reader now derives general adult age from an inclusive numeric juvenile ceiling through the existing dated law query. This is a draft awaiting coordinator integration of the shared starting-law rows; it is not production age coverage.

## 1. Why-chain

The law supplies the highest age within general juvenile jurisdiction. An older person crosses that age boundary. A Boolean answer does not establish the boundary. A missing numeric term therefore cannot authorize adult offender selection. A younger person's transfer needs a separate saved decision by an actual authorized judge or prosecutor; no such producer is added here.

## 2. Research

The packet extracts the 54 numeric cited notes already preserved in #1647 at 6d78aa78bd0caa51edb9fe56bd04bed4f8fc0130. It retains each source/status and known operative date. It is not 54 fresh statutory verifications. American Samoa and the Virgin Islands remain unknown; no age or date is invented. Ruling 36 admits the inclusive highest-age convention.

## 3. Revisions

Removed the Boolean 17/18 fallback and its default age. The existing offender caller returns no named adult offender when the threshold is unknown. Old Boolean-age pretrial tests move to the new numeric and unsupported-term cases. No cash-bail assertion is changed.

## 4. What gets built

The owned juvenile reader calls the shared final-term query for existing term key `age`, unit `years`, at the incident date. It returns the integer ceiling plus one or null. Its existing crime caller refuses null. The law identifier remains the existing question binding in this legacy reader; no new named-law dispatch or schema is added. Coordinator owns the shared starting-law rows and catalog; this branch supplies the batch rather than editing those files.

## 5. Simulated, records, world pieces, checks

The focused test uses authored numeric terms drawn from the existing LA/TX/VT citations inside a cloned starting-law fixture. The actual dated query and small-world jurisdiction join execute. Reload, missing terms, future refusal and the Louisiana operative boundary are covered. One authored enacted Boolean-only record proves that enactment alone supplies no age. Those authored records are reader-boundary fixtures, not canonical enactment proof.

## 6. Proof run

Initial fixture used the wrong `terms` field: 3 passed and 4 failed in 18.74 seconds; the correction to existing `lawTerms` yielded 7 of 7 in 19.21 seconds. Expanded two-file run gave 11 passed and 2 failed in 22.34 seconds: the new summer-date fixture had an inconsistent UTC offset, and the unchanged pretrial bail assertion expected a tenth deposit. Corrected only the A25 fixture to the builder's actual winter date with complete typed records; the entire new juvenile file passed 8 of 8 in 20.46 seconds. The other pretrial cases have their prior passing receipt; its bail failure remains explicit and blocks READY. No assertion or stock limit was weakened.

Earlier three-root types passed with 1009 dependencies and zero diagnostics; the expanded check initially found three fixture errors, corrected with complete records and optional-array guards. Final four-root check compiled 1010 dependency files with zero diagnostics; changed-source lint, formatting, report and whitespace passed. No full suite or unrelated behavioral file ran. Logs remain local under `/tmp/team9-a25-numeric*`, not in the PR.

## 7. Worked example

The cited Vermont fixture supplies an inclusive ceiling of 18, so the general adult threshold is 19. Louisiana and Texas supply 16, producing 17. Before Louisiana's saved April 19, 2024 operative date, this packet supplies no prior numeric term and the reader refuses admission. Boolean-only Alaska and unread AS/VI supply no fixture term, so no threshold or named adult offender is inferred.

## Dependencies and next action

Intake f990bcc4bbba76de183ad94a22c00f8b251b19a1 receives root #1679 at 40462483772ec3227302e412bbcf9fe45c851974 plus preserved A103/A105/A10 work. The same dated query is reused unchanged. Root must integrate the packet's juvenile rows and close any catalog declaration seam, then the fixture overlay must be replaced with actual production-row proof. Adult transfer and Team2's actual prosecutor-office producer remain separate. Automatic approval review rejected an attempted combined correction that also touched the bail assertion outside active A25 scope; that assertion remains unchanged, with the failure preserved for a separate scope decision.
