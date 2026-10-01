# Governor budget choices follow a saved priority

Before: An NPC budget request could reach a seeded choice or take a chief's hold-flat suggestion even when the governor had no saved priority.

After: The governor selects an available budget option that matches their recorded first priority and a saved appropriation's source lineage. Without that match the request stays pending. Matching staff advice retains its recorded reason. No amount or default policy was added.

## MERGED

This is an independent draft on `codex/team1-budget-saved-priority`, based on the unchanged budget bridge at `5945f22ecbe24d85f77a3805443cbf4ad09d4883`. Runtime source is `85695e3522762dba346574cf88d93dbad695324e`. It is not on main. No team merge occurred.

## WHAT EMERGED

DECIDED: Five actual governors selected “Put more into appropriations” from a controlled saved priority and source-backed option. The callback's saved reason is “It matches the officeholder's recorded first priority.” This request choice does not introduce an increase; the independent bill bridge still copies current services.

HARDWIRED: `src/simulation/governing/state-governing.ts:2589` matches the saved priority, source-backed family and available option. Missing evidence returns the unchanged world. VITAL STATISTICS: The combined run passed 31 cases: 16 NPC cases and 15 independent request-bridge cases. Natural preference formation and national session coverage remain unproved.

## 1. Why-chain (five whys, to bedrock)

1. The governor chooses a budget option because it matches their saved first priority.
2. The first priority exists because the officeholder's earlier agenda decision recorded it for that office and holder.
3. The option is available because the request lists a program family with a recorded appropriation.
4. That family is supported because the appropriation joins its actual source measure and single or exact bundled draft lineage.
5. The chain ends at the person's recorded agenda choice and the government's recorded authority. A tag or missing preference cannot supply either.

The actual creation of those preferences is outside this slice. Missing priority, an explicit no-priority decision, an unmatched priority or another person's agenda leaves the budget matter open. The unchanged generic branches remain protected.

## 2. Research

Audit's October 1, 11:25:48 UTC contract identifies `currentPriority` as the existing saved agenda reader and the existing matching budget advice as the reusable reason. It explicitly rejects treating missing priority as hold-flat. Team2's clean narrow release was confirmed at `5bf0c950d19aab23fd4f8d8aec2aab6da7deb457`.

No researched rate or amount was introduced. The tests' $10 appropriations and controlled saved choices are fixture inputs, not real cost estimates or naturally generated decisions. Actual funding still joins appropriation, source measure and family.

## 3. Revisions

Availability alone does not authorize hold-flat. The NPC branch ignores the chief's existing missing-priority fallback. If the chief advises the same backed saved priority, the existing reason is retained. The default-policy question remains with the CTO.

Annual and biennial source amounts, calendar, governor lapse, institution driver, program commitment and payment behavior are unchanged. No score threshold, quota or weight changed.

## 4. What gets built, in numbered parts

1. Add one budget-only branch before the generic NPC fallback.
2. Read the actual current holder's existing saved first priority.
3. Require its recorded appropriation/source lineage and matching available option.
4. Record the decision through the existing writer, retaining matching advice's reason.
5. Keep missing matches pending without changing history.
6. Cover five seeded eligible places, staff advice, missing and unsupported choices, another holder, repeat and canonical reload.

No new filer, decision schema, scheduler or bill amount was added. Every other family and executive branch remains byte-for-byte outside the owned delta.

## 5. Simulated, records, world pieces, checks

SIMULATED: The actual NPC callback selects a supported option from the governor's controlled saved agenda record. Its reason is saved in the due-item outcome context.

RECORDS: Existing matter decisions and due-item states record what occurred. Appropriation and paid-transfer lists remain unchanged by this request decision. The actual due-item runner supplies time; no skipped-item guard was weakened.

WORLD PIECES: Current officeholder, saved agenda choice, recorded authority, source bill lineage and available budget option must all exist. Without them the matter stays pending. A pending matter is not a fabricated vote, bill or payment.

CHECKS: Two strict roots covering 853 files report zero scoped and zero imported diagnostics. Lint, formatting and whitespace pass. The inherited malformed release declaration and five stale zero-dice removals remain disclosed. The own declaration parses. No allowlist or shared guard was changed.

## 6. Proof run

Seed `saved-budget-npc-choice` samples five eligible places: Georgia's Rafael Richmond, Arizona's Martin Jacobs, Utah's Matthew York, Montana's Sonia Page and Arkansas's Devon Vang. These are controlled saved-choice fixtures, not proof across all jurisdictions.

The first fixture had time-integrity and history-removal failures. It was corrected to execute the canonical due-item runner and to represent missing lineage with an actual unbound appropriation. Its raw failure receipt remains retained.

The corrected fourteen-case fixture failed 12 cases and passed two on the old NPC branch in 12.55 seconds. The same fourteen cases passed on the new branch in 14.98 seconds. Two additional staff cases verify ignored unsupported hold-flat advice and retained matching advice. The final combined run passed all 31 cases in 18.22 seconds, including the 15 budget bridge regressions.

Canonical reload and repeat preserve pending requests without a choice and decided requests without a second decision. No new nationwide year, browser, speed or whole-suite run occurred. The earlier retained budget-year save remains unchanged. National session coverage and natural spending are not claimed.

## 7. Worked example

Rafael Richmond's Georgia budget matter is `event_9a54c61938532057`. With no saved priority, it remains open and has no decision event. With the controlled saved appropriations priority and source bill `legislative-measure_d2d4604553f314a8`, the actual callback writes decision `event_a393e8dab2a3f4a1` selecting “Put more into appropriations.”

The $10 source authority is unchanged. No transfer occurs. The decision's callback reason names the governor's recorded priority. Reopening and repeated dispatch add no second decision.

Method: Only the released 30-line budget-selection branch changed in production. The new fixture and declaration are owned. Main was fetched before publication; its changes since the tested main source were claims/status documents only. Raw logs, original hashes, source hashes and proof records live in `budget-saved-priority-proof/`. Extra EOF blank lines are removed only from copied logs. The owner forbids helpers, so the report received a self-review against civic-reports and feature-walkthrough. Next is exact-head review and a usable scoring calibration contract; no invented default or threshold will be added.
