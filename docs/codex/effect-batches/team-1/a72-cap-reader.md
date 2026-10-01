# The existing filer reads admitted member limits

Before: researched chamber limits existed without a production reader. After: the shared filer checks actual saved bills against admitted subjects, sponsor kinds and periods before admitting another bill. Only the two fully bound source rows apply. Unread exceptions leave their limit unapplied and save an explanation. Filing thresholds and the number of proposals per intake remain unchanged.

## MERGED

This bounded A72 reader is not merged. The X5 data and bindings are already on main and remain unchanged. The separate filing-calibration branch and Audit year run keep their original source pin.

## WHAT EMERGED

DECIDED: five drawn-state minority members propose from their recorded principles through the existing filer. Nikhil Murray, Lydia Velazquez, Skyler Dunn, Quentin Wall and Richard Sandoval each file one bill under the controlled one-bill rule. A later intake admits no second bill. These are authored convictions and rule inputs, not natural filing totals or researched limits for those states.

HARDWIRED: member-agenda.ts calls the admitted reader against the candidate's actual subject, origin, date and numbering session. A blocked candidate is not admitted. Claims on sponsors and questions are saved only after admission, so a capped sponsor cannot reserve a question against an eligible sponsor. Unread limits create one canonical explanation per member and chamber intake.

## VITAL STATISTICS

The final focused run passed 17 of 17 cases in 16.22 seconds: 12 pure reader cases and five actual filer cases. The exact main caller failed all five admission controls in 12.37 seconds. Four strict roots had zero scoped or imported diagnostics. Scoped lint and format passed after removing one unused test import. Release retains the inherited CI prose failure; dice reports zero new and five stale entries. Spelling reports 26 inherited findings with none in owned paths. Final source-bound receipts record each result.

## 1. Why-chain (five whys, to bedrock)

1. A member may introduce another counted bill only if the applicable limit allows it.
2. The reader counts that member's actual saved bills in the declared chamber and period.
3. Exceptions use recorded subject and sponsor kinds, not the source's prose as executable law.
4. A conditional row applies only when its explicit predicate matches the introduction date.
5. An unbound exception makes the whole row unapplied. Bedrock: recorded legal facts and sourced institutional text.

Constituents, leadership, donors and news remain the existing filing mechanism's concern; this reader adds no chooser.

## 2. Research

The unchanged X5 table has 25 sourced rows, two admitted and 23 unbound. Colorado's joint limit is five per session with its admitted exceptions. Virginia House's odd-year limit is 15 per session. Virginia parity is read from the explicit introducedAt token. Tennessee and Wyoming have unbound session conditions; their rows are not guessed.

Each source quote, citation, binding and notAppliedReason is preserved. Missing session starts, legislative-day counts and special sponsor or bill markers remain explicit gaps.

## 3. Revisions

This slice isolates the existing reader and admission hunk from the separate filing-calibration branch. It changes neither the common threshold nor proposal multiplicity. The earlier reached-cap refusal for unread exemptions is superseded: the whole unread row stays unapplied and its explanation is recorded.

## 4. What gets built, in numbered parts

1. Import the existing cap reader into fileMemberAgendaBills.
2. Check the actual compiled bill before admitting its pure writer result.
3. Count only actual sponsor, chamber, jurisdiction and period records.
4. Apply only fully bound source rows and exceptions.
5. Save unread-limit explanations through the existing event writer.
6. Delay question claims until admission; preserve pending questions, cooldown, preemption, cadence and filing settings.

## 5. Simulated, records, world pieces, checks

SIMULATED: actual seated members propose from saved principles. RECORDS: bills, sponsors, subjects, origins, dates, session IDs and explanation events. WORLD PIECES: the sourced data is already on main; several special-rule facts are absent. CHECKS: both admitted rows, all 23 unbound rows, named actual filer writes, canonical Save/Continue and repeat.

Missing rows impose no cap under the explicit approved policy. Unread exceptions impose no guessed limit. This is a replacement of the unchecked production admission path, not a second filer or an isolated data slice.

## 6. Proof run

Place-selection seed team1-distinct-member-intakes draws New Mexico, Arkansas, Vermont, Ohio and North Dakota. World seed minority-member-filing starts each controlled state intake on February 1, 2027. No day or year is advanced locally.

An authored zero-cap control admits no bill. An authored one-cap control admits one and preserves the cap across canonical reload and a later intake. An unread zero-cap control admits the bill and retains one named explanation after reload and repeat. These controls do not claim those states have these legal caps. Pure queries independently check the actual X5 table.

Natural one-year filing spread remains with Audit's existing runner. No browser, speed, whole suite or full-jurisdiction enactment proof is claimed. Civic reports and feature walkthrough receive self-review under the no-helper rule.

## 7. Worked example

New Mexico's actual seated Nikhil Murray has controlled saved convictions supporting an open question. A bound zero-cap control admits none. A one-cap control saves his bill, and another intake cannot add a second. When the control has an unread exception, the limit is not applied: his bill is saved with “limit not applied: exemption unread.” Canonical reload and repeat retain the bill and explanation without duplicating either.

Exact source pins, table hashes, named bill IDs and raw logs are in a72-cap-reader-proof/. No law-effect stamp or passage consequence is claimed by a filing event.
