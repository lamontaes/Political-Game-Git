# Juvenile court age reaches named arrests through the offender eligibility gate

The juvenile-age reader sets who can enter the adult arrest path. The first saved named-person writer is the crime producer's arrest event, followed by a prosecution referral and charge. Younger people are omitted from this adult path; no juvenile proceeding or saved exclusion record exists there. Team 9 can stamp an actual supported arrest/referral chain, but must distinguish an applied eligibility rule from proof that raising the age changed an outcome. A missing arrest is not a saved diverted case.

## Exact producer and governing-law route

Measured source: adultCourtAgeAt reads the juvenile-age proposition and canonical law at src/simulation/justice/juvenile-court.ts:36. An answer of no yields 17 years; yes or an absent answer yields 18 years. The absent-law fallback is an estimate, not an enacted measure. It must not receive a fabricated law stamp.

Measured source: offenderFor reads that cutoff for the incident's jurisdiction and occurredAt at src/simulation/crime/offenders.ts:161. It excludes residents below the cutoff at line 169. It also excludes victims, the controlled player, people outside the town, unavailable/dead residents and people already jailed or recently referred. Passing this age gate alone does not cause an arrest.

Measured first saved named writer: recordArrests invokes offenderFor at src/simulation/crime/producer.ts:490. After policeCanName succeeds, it writes recordWorldEvent at line 494, with the actual offender ID and focus:subject participant. It writes personal knowledge and calls referForProsecution at line 555. The referral writer is src/simulation/justice/prosecution.ts:245. The later charge writer calls followUp at line 582. These are actual source entrypoints, not newly executed arrest proofs.

Proposed governing-law contract: expose the canonical law result alongside the cutoff while preserving the existing number reader. Carry actual question key, law identity, jurisdiction, evaluated incident date, answer, cutoff, person birth/age evidence and incident ID into the supported saved event's provenance. Distinguish the eligibility date from the later arrest recording date. Resolve and validate the law for the date the eligibility rule actually applied; do not relabel the later day's law as the earlier rule. Preserve the incident and arrest as referral source IDs. The exact canonical stamp helper must validate that identity/date before the builder claims attribution.

Measured counterfactual place example: Georgia is described by the source as an unraised-age jurisdiction at src/simulation/justice/juvenile-court.ts:12. For a 17-year-old, a no answer admits the age gate; a yes answer excludes it. That is source arithmetic, not a saved Georgia arrest or a named minor's diversion. No named 17-year-old receipt was supplied. Team 9's fixture should preserve a real fixture person's ID/name and show both law dates without inventing an arrest or juvenile case.

## What the builder can prove and what remains missing

Measured inspected fixture: src/simulation/crime/crime.test.ts:321 expects an actual named arrest and matching prosecution referral after 400 days. It checks offender age against adultCourtAgeAt at line 345. Zero tests were run here. The fixture does not itself compare a 17-year-old before and after an age-law change.

Required stamp meaning: a law-stamped adult arrest can prove that the recorded age rule was applied to the saved named arrest. It cannot, alone, prove an incremental effect of raising the age. An excluded 17-year-old produces no arrest record in this branch. A true diverted-case claim needs an actual supported eligibility/exclusion or juvenile case producer; its absence is a mechanism gap, not a request to manufacture a favorable event.

Requested ownership seam: Team 9's first build handoff is src/simulation/crime/producer.ts:494, with the small law-result adapter at src/simulation/justice/juvenile-court.ts:36 and eligibility provenance through src/simulation/crime/offenders.ts:161. Existing prosecution followUp ownership can stamp the downstream supported event only when this actual chain and governing rule are retained. The coordinator grants these exact additional files; Audit/Systems makes no production edit. Mandatory minimum and restored voting remain distinct next questions.

## Pin and checks

Source pin remained fd4925e6a6dae3446d2fefe40df2cfc2d2ef931e. Zero new worlds, runtime tests, crime cases, browser checks or production writes occurred. This handoff identifies existing source writers and a missing exclusion producer; it does not certify a saved juvenile-age firing proof.
