# Library decisions need a real board meeting; preschool needs actual attendance

The library candidate can save decisions on existing challenges, but its caller must supply an actual held board meeting and roster. Main's council meeting record does not supply that roster or library authority. Preschool funding also does not prove that a named child attended or that a parent gained work hours. Team 5 needs separate attendance, educational outcomes and parent consequences. Curriculum costs and public-institution tuition freezes need their own saved consumers without treating budget expense as delivered service or replacing accepted study terms.

## Library candidate and main meeting records are different contracts

Measured candidate source: resolveLibraryChallenges at src/simulation/library-materials-law.ts:48 reads existing challenges, a supplied town, member IDs and meeting key. It refuses absent store, empty roster or missing people, and requires local library authority. It saves ballots and a strict-majority removal result at line 104. Staff hours, legal hours and expense cents remain null at line 105. These references describe draft candidate 2a72c1cfb14d2da01717473d89d126eb41b152d6, not main.

Measured candidate schema: LibraryChallenge at src/simulation/library-materials-types.ts:4 contains filing person, town, title key, date and supporting record IDs. LibraryDecision at line 16 links challenge and meeting keys to dated ballots and attribution. The resolver consumes these challenges; it does not produce a title catalog or a filed challenge. No actual held-board caller, title producer or saved challenge receipt was verified in this bounded read.

Measured main source: localCouncilMeetingHandler at src/simulation/living-world/local-council-meetings.ts:615 handles a canonical council due item. Its local.council-meeting-held event at line 670 saves unit and vote information but participants is empty at line 676. A council meeting is not proof that a library board met. recordOrdinaryMeetingPresence at src/simulation/ordinary-meeting-presence.ts:150 requires the specific public-meeting activity, actual arrival and completed attendance. That authored meeting route does not establish library-board jurisdiction or a challenge agenda.

Proposed held-board caller: after an actual board meeting is recorded, pass its canonical identity and date, actual authorized members, town and existing eligible challenges to the resolver. Preserve the returned World. Link the decision to that saved meeting and title/challenge identities. Do not invent a meeting key, use all town officers as the roster, or infer a title challenge from a funding allocation. A canonical board/meeting and challenge producer remains required where absent; no existing library-board producer is certified here.

## Curriculum needs a returned World, not just a purchase estimate

Measured candidate reader: curriculumAdoptionEffect at src/simulation/public-budgets/curriculum-standards.ts:21 selects dated active pupils and governing purchase terms. It returns recipients and spending, with null spending when purchase terms are missing at line 85. curriculumAdoptionSpending at line 107 converts that result into a numeric cost only. Both functions are on the draft candidate; neither is a saved delivery writer.

Measured main caller: settlePublicBudgets invokes settleGovernmentMonth with the same World for each state at src/simulation/public-budgets/index.ts:146. Its final return installs the settled budget store at line 173. A new consumer that appends pupil records must explicitly thread and return its resulting World; a numeric spending return cannot preserve those records. Keep statutory purchase amount, expense, actual payment and pupil receipt/use separate. A law stamp on cost cannot prove curriculum reached a pupil.

## Tuition freezes must preserve accepted terms

Measured main contract: recordAcceptedEducationTerms at src/simulation/education-study-terms.ts:90 ties an immutable artifact to the accepted enrollment. It rejects replacing existing terms at line 113. pathForRelationship at src/simulation/life-paths2.ts:239 reads accepted or preserved legacy terms, and its registered resolver at line 1144 supplies study progression. Missing saved terms are not replaced by today's offer.

Measured charge seam: completeStudyPeriod at src/simulation/education-study-progression.ts:556 computes remaining tuition from the accepted period price and prior payments at line 580. It records the actual person-to-institution flow and transfer at line 604. Proposed freeze binding belongs at the lawful charge calculation for an actually covered public institution and applicable date. Preserve the accepted artifact and original price evidence; represent a supported legal cap or charge adjustment separately. Do not rewrite the agreement or infer institution coverage from its name. The exact public-institution classification and freeze-term adapter remain builder work.

## Seven preschool outcomes need distinct records

Owner-approved scope, relayed by the coordinator from the latest instruction, covers early reading/literacy, readiness, special education, grade retention, later graduation, parent work hours and paid childcare spending. The approved disjoint preschool-law-effects.ts is a proposed Team 5 file, not an existing producer. The existing canonical law question is us-policy-positions:education.universal-preschool at src/simulation/policy-pack-us-policy-positions.ts:825.

Measured registry boundary: OUTCOME_MEASURES registers fixed readers and place bases at src/simulation/outcome-web/index.ts:284. Among these seven requested outcomes, only graduation has a matching registered place measure in the inspected registry. Six have no matching canonical outcome key verified here. Proposed records below describe their meaning without inventing stable keys.

| Requested outcome | Existing key or writer evidence | Required named-record consequence |
| --- | --- | --- |
| Early reading/literacy | No matching registered measure or preschool assessment writer verified. | Child, actual exposure and dated assessment with instrument, score and unit. |
| Readiness | No matching registered measure or assessment writer verified. | A distinct dated readiness assessment; literacy is not the entire measure. |
| Special education | A policy topic at src/simulation/policy-pack-us-state-and-local.ts:371 is not an outcome. | Actual evaluation, eligibility/service determination and date; missing evaluation is not zero need. |
| Grade retention | No matching registered measure or retention decision writer verified. | Actual school-year promotion/retention decision with enrollment and evidence. |
| Later graduation | school.graduation-pct at data/research/outcome-web/place-outcome-bases-2024.json:140 is percent of the four-year adjusted public-school cohort. schoolStageTransitionHandler at src/simulation/school-stages.ts:496 writes completed enrollment states at line 545. | Named child completion at the actual later stage; a place percentage does not prove that child's diploma. |
| Parent work hours | labor.mothers-participation is an existing link target at data/research/outcome-web/links.json:1946, not work hours or a verified registered hours reader. createWorkRelationship at src/simulation/life.ts:972 and recordWorkStatus at line 1188 preserve work relationships and status. | Actual parent relationship and dated job/schedule work hours; participation cannot be converted into hours. |
| Paid childcare spending | No matching registered measure or preschool spending producer verified. | Actual prior/after paid care obligations and completed transfers, with covered hours and fees. Free preschool does not eliminate extended care automatically. |

Measured distinct existing measure: school.math-proficient-pct at data/research/outcome-web/place-outcome-bases-2024.json:207 is eighth-grade NAEP proficiency. It cannot stand in for preschool literacy or school-entry readiness. Existing universal-prek-to-graduation and universal-prek-to-math-proficiency declarations at data/research/outcome-web/links.json:2335 and line 3030 are not new packet approval of their numerical sizes or named-child producers.

## Actual child exposure must precede research-qualified outcomes

Measured source foundation: createEducationEnrollment at src/simulation/life.ts:475 validates an actual person, organization and dated enrollment. recordEducationEnrollmentState at line 554 saves subsequent states. Existing childhood creation records parent-child kinship and care at src/simulation/character-history.ts:3633. createCareResponsibility and recordCareResponsibilityState at src/simulation/life.ts:1581 and line 1635 preserve actual caregivers and changes. These primitives do not prove that preschool attendance occurred.

Proposed typed exposure producer: preserve actual child and caregiver IDs, age/eligibility evidence, governing law and dates, real provider/place, funded capacity, accepted enrollment, schedule, actual attendance/completion and source event IDs. Keep appropriation, offered capacity, enrollment and attendance separate. Then preserve each distinct outcome's observation date, instrument/unit, source IDs and research population/lag. Parent consequences additionally need actual care substitution and job/payment records. Missing attendance, job, price or measured outcome remains unavailable.

Measured packet limit: docs/codex/effect-batches/team-9/prek-outcomes-pass.json:6 lists all seven requested outcomes at research pin a82a04fc079783e460e1867d5ccd59f83b90c8cb. Its studies distinguish Boston lottery attendance, Tulsa school-entry tests, Tennessee admission and Chicago extended services. Its parentsAndSpending section at line 139 leaves exact hours and out-of-pocket spending estimates unverified. Its integration limits at line 149 prohibit pooling incompatible populations and reversing already educated cohorts on repeal. No national coefficient or new world-level outcome is authorized by this packet.

## Preserved example and checks

Measured historical example: Jennifer Conway in Appomattox, Virginia, has pay rising from 189,200 to 224,000 cents in docs/codex/handbacks/team-5-teacher-five-state-receipt.json:18. This saved person/pay evidence shows the required distinction between a consequence and its source terms. It is not a named preschool child, parent-hours change, library decision or curriculum delivery receipt. No such named saved receipt was supplied or created in this bounded diagnosis.

Main source is b0fb2464f682f72e6a970a87b353074fa530034f. Candidate library/curriculum and research packet pins are explicitly separate. The JSON retains fetched source blobs and limits. Zero new tests, worlds, audits, production edits, Git mutations or publications occurred. Team 5 owns implementation; coordinator grants any additional caller/schema paths. Mechanical check completed with exit 0, zero errors and zero warnings. Independent review remains pending.
