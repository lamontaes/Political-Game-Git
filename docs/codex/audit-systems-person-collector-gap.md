# The audit drops defendant identities already saved on justice events

The stamped-event collector reads four flat person fields and misses the defendant saved in event participants. Its export can therefore say that no person identity exists even when the source event carries one. The aggregate counts person IDs from that export, so its observed people count omits these subjects. A future audit adapter should extract validated subject roles from the saved event, preserve exact identity joins and deduplicate by world and person. The live collector, worker and historical receipts remain unchanged.

## Exact source mismatch

Measured collector: stampedTouched at scripts/law-audit/audit.ts:656 reads personId, studentPersonId, pupilPersonId and recipientPersonId at lines 661–666. It checks no participant array. HistoricalEvent at src/simulation/types.ts:696 instead stores participants and involvedEntityIds. Each participant has an explicit personId and role at line 675.

Measured justice producer: followUp at src/simulation/justice/prosecution.ts:330 takes the referral's focus:subject identity. It writes the actual defendant under focus:defendant at line 354. A separate agency:decided participant can identify the judge or decider at line 358. involvedEntityIds includes both at line 347. Taking all participants or all involved IDs would count actors who decided the case as affected defendants.

Measured stamp linkage: the pretrial consequence retains referral, prior event and consequence IDs at src/simulation/justice/prosecution.ts:404. appendStampedRows exports these IDs and the consequence locator at scripts/law-audit/audit.ts:932. It exports a filtered payload rather than the whole event. stampedConsequence at line 631 excludes identity fields and does not preserve the participant array as a consequence payload. A printed name in the event text is not a replacement for that omitted person ID.

## Seven event observations are not seven known people

Measured sealed D9 receipt: docs/codex/law-audit/audit-systems-restart-d9e4b868-20260930-1921/US-AL.json:7 records 24 completed months in Rockford, Alabama. Its two starting end-cash-bail audit rows contain seven distinct event locators. All seven export the no-person-identity fallback. This is a count of seven evidence events, not seven unique defendants. Their subject-ID count cannot be reconstructed from those exports alone.

Measured named example: the event locator events:event_f409b3b6a3f4adbd appears in the same receipt at line 1883. Its summary says Hannah Giles could not pay $2,251 toward $22,510 bail and was held before trial at line 1887. The exported touched field at line 1884 says “No person-level identity on this record; Rockford, Alabama.” It retains three source event IDs at line 1891 but exports no defendant person ID. Hannah's name must not be matched to another world or another person record to fill the gap. The summary amounts are reported bail amounts, not a completed $2,251 payment.

Measured aggregation: docs/codex/law-audit/aggregate-sealed.py:32 extracts person IDs solely from touched and scopes them by watched-world state. Line 48 counts that set. It therefore cannot count a subject absent from the exported identity string. The missing count is unmeasured until actual saved event identities are available; zero exported IDs does not mean zero people affected.

## Proposed future worker enrichment

Proposed adapter scope: enrich evidence in a future owned audit worker after the pay-engine restart, while retaining the merged collector and unchanged raw receipts. Emit a companion structured subject-ID field and provenance rather than parsing display names. Keep existing firing, canonical-law validation, payload and stamp deduplication behavior intact. This is an audit extraction repair, not a new production consequence or a new world run.

Proposed justice mapping: for validated pretrial held/released events, select only actual focus:defendant participants from that consequence. Require each ID to resolve in the same world's people store. Deduplicate repeated subject entries. Exclude agency:decided, witnesses, presence and unrelated involved IDs. Other event types need their own validated subject-role contract; a blanket focus/impact namespace rule is not justified by this one producer.

Measured lookup reuse: eventById(world, id) at src/simulation/event-index.ts:62 resolves the exact saved event ID. The collector creates event locators from saved IDs at scripts/law-audit/audit.ts:773 and retains history collection identity at line 793. Resolve events:event_<id> back to that exact event. If only an explicit source event is available, join through its saved ID and verify the correct type, jurisdiction, application date and subject lineage. Never use the array index, summary name or a same-name person as an identity join.

Proposed companion evidence: preserve world/seed identity, law source and key, event locator/ID, selected role, subject person IDs, extraction path and source record IDs. Count unique subjects by world identity plus person ID; retain law/application grouping separately. Multiple consequences for one person count once within the declared people denominator. Missing world/event/subject join remains an explicit identity-unavailable observation, not a generated ID or a legal zero.

## Checks and ownership

Production source was read at d9e4b8689b24470af29262d5b38affcc9dbb360a. The seven-event measurement reads only the existing sealed Alabama receipt. No saved World was advanced or created, and no test was run. Zero live collector/worker edits, production writes, Git mutations or publications occurred. Audit/Systems owns the proposed future evidence adapter; coordinator controls the pay-engine restart. Raw D9 receipts remain historical evidence with their original identity limits. Mechanical check completed with exit 0, zero errors and zero warnings. Independent review remains pending.
