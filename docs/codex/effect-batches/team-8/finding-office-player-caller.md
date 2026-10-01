# The player chooses their own resignation after a finding

Before: The desk answer called office continuity directly, without saving the finding subject's own decision trace.

After: The existing confirmed player answer forwards its chosen statement. For an actual finding and held office, the adapter saves those exact words and a canonical selected subject decision before calling the press resignation adapter. CTO review of this bounded caller is next. Browser verification and the automatic NPC producer remain incomplete.

## 1. Why-chain

Source inspection: PressDeskPanel's MatterItem.answer forwards the chosen option's statement at src/player/PressDeskPanel.tsx:401. The presentation adapter binds the actual saved finding, respondent and held office at src/presentation/office-response.ts:348. It records the player's chosen words as an event and uses that event as the canonical decision's source. The saved trace then reaches recordFindingOfficeResponse, which calls the office writer. Bedrock: the subject's own recorded player choice, not a colleague's demand or a finding treated as an automatic resignation.

## 2. Research

The [CTO ruling and Audit caller contract in 00c](https://docs.google.com/document/d/1L5IksyT3b-NydhTq8Px3pVT4s8MxCZ9oAj-wqNm5AM4/edit) identify the existing office-response adapter as the player caller. The approved design requires the subject's own selected trace and exact chosen words. This adds no empirical probability, NPC motive, weight system or resignation scheduler.

## 3. Revisions

The player must be the actual controlled subject. The actual finding and office supply the decision scope and registered resign/remain options. The selected player's statement is the decision consideration, supported by their saved choice event. Randomness is none. Missing chosen words refuse the finding resignation. The existing nonfinding office-answer route and other answer kinds remain. Confirmation and the world callback are unchanged.

## 4. What gets built

1. Forward the actual chosen statement in MatterItem.answer.
2. Bind the actual finding, subject and held office in the existing answer adapter.
3. Save the exact statement and the canonical subject decision.
4. Consume that trace through the existing press adapter and return the office writer's saved sentence.

The release covers only the granted presentation adapter, the two-line answer forwarding hunk, the owned focused test and evidence declaration. No broad workspace UI, peer-response, scheduler, financial core or office-core edits are included.

## 5. Simulated, records, world pieces, checks

The player chooses. The canonical engine saves that explicit choice with the person's own event as evidence. The press and office writers append their existing records and end the actual recorded tenure. The source world remains unchanged. A missing controlled subject or missing chosen words cannot create the decision. NPC subjects still require the separately admitted finding-boundary producer; no peer or counsel response supplies it. This caller does not create people, offices or findings.

## 6. Proof run

Measured src/simulation/press/finding-subject-response.test.ts:351 passed all 16 focused cases in 12.77 seconds. The nine original adapter cases remain. Seven new cases cover five controlled players, absent chosen words and refusal to treat an uncontrolled subject as a player choice. The stable seed team8-finding-office-response-all56 selects Kansas, Kentucky, Idaho, Iowa and Indiana from all 56 places. Each player case verifies exact text including surrounding spaces, the saved actor and finding scope, no randomness, tenure ending, canonical reload and refusal of a repeat answer. These are controlled recorded-tenure fixtures, not natural elected-office or browser proof.

## 7. Worked example

Measured Kansas fixture Fiona Zimmerman, person_82d45a526be12c14, chooses the exact statement `"  I choose to resign this office today.  "` after saved finding event_83f3c076987cdeba. Choice event_001df69aec5497de preserves those exact words. Decision-trace_2708caf3b442a3d9 selects resign for Fiona and that finding. The existing office writer ends her recorded fixture tenure. The desk returns “Fiona Zimmerman resigned. The office is vacant from March 2, 2026 until the body fills it under its own rules.” Evidence is test-results/team8/finding-office-player-caller-published.jsonl:1; its filename and SHA256 are committed in docs/codex/effect-batches/team-8/finding-office-player-evidence.txt. Andre Cabrera, Amir Thompson, Harper Peterson and Amara Mann follow the same controlled path in the other four fixtures.

Next: CTO exact-head review and browser proof when an executable is available. Audit and coordinator must admit the actual automatic NPC finding-boundary producer. The lower-priority NPC endpoint remains incomplete; unpaid-liability repair is separately published.

Method: base 993ca478802f8ec317af1b9361d46e89ef189b65. Both granted paths were clean in the leased and shared checkouts and matched main 072634b352c182c0ee75abe59e1e73e772ed73e4 before edits. Initial focused composition had 18 passes and 6 failures from a self-sourced fixture allegation; eight legacy office-answer cases passed. The replacement public fixture notice first failed its event-key rule, then passed after correction. No integrity assertion was weakened. Final native output is /tmp/team8-player-finding-office-source-final.log. Three strict type roots produced zero diagnostics; lint, format and whitespace passed. Zero-dice exited 1 with two inherited county flags and five stale entries; no changed caller line was flagged and the baseline remains untouched. Configured /opt/google/chrome/chrome and bundled Chromium are absent, so browser interaction is NOT RUN. Main advanced to 577b0ac03cfd21bd7159997971efcd5124deaa9b; that newer composition, automatic NPC response, natural finding, long-clock, full suite and final-main proof are NOT RUN.
