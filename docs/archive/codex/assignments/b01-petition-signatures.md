# B01 Petition signatures, where the place requires them

Bank id b01 · Phase P1 (council journey) · Unlocks step 2 of the golden path: "files at the clerk's office, a conversation that teaches the campaign" (the clerk is where signatures are counted and the gate is passed).
Code checked at origin/main 1ee0abcda (Oct 5).

## What the player experiences

The clerk tells you what your race needs: a fee, signatures, or either one, and the deadline. If signatures: you go and ask people. The first few asks are played (neighbor, coworker, a stranger outside the grocery store). Each person answers from who they are and what they think of you. Then you set "gathering signatures" as your standing campaign routine and the rest happens in the background, along with any friends or volunteers you recruited (b02). You see your own running count, which is not perfect. At the clerk's counter some signatures are no good (not registered, wrong district, signed twice), so a careful candidate collects extra. In a fee-only place there is no petition at all, and nobody mentions one.

## Owner decisions it rests on

- "Signatures: a few played scenes, the rest background, where the place requires them."
- "Files at the clerk's office (a conversation that teaches the campaign)."
- "You usually start alone; recruit friends, family, volunteers."
- Zero dice. Nothing blank or unknown: estimate from similar places and mark it estimated. One rule for all 50 states, D.C. and territories through one data path. Laws declare WHO/WHAT/HOW MUCH as data rows. One writer per kind of record. Delete what you replace.

## Existing code to extend (verified against 1ee0abcda)

- `src/simulation/candidacy.ts:499 candidacyEligibility`. The one filing gate. Returns `{eligible, blocks[], office, pack}`. No fee or signature field. Seam: add petition terms to the result (see Part 1).
- `src/simulation/campaigns.ts:594 fileCampaign`; the gate call is `:617` and the refusal is thrown at `:628-631`. No petition step. Seam: after the eligibility call, require the clerk-verified count.
- `src/source/domains/state-office-qualifications/types.ts:35-44 QualificationField`. Nine fields, no FILING_FEE or PETITION_SIGNATURES. The queued brief Q1 part 1 (`cto-notes/briefs-queued-2026-10-05.md:18`) adds them. Grep for `eligibilityFor`, `clerk-encounter`, `FILING_FEE` in src returns nothing: none of Q1 has landed.
- `src/simulation/campaign-life-activities.ts:1174` (type field `petitions: CampaignGuidanceUnestablished`), `:1191 NOT_ESTABLISHED`, `:1237-1240` the four NOT_ESTABLISHED lines (authority, deadline, fees, petitions), and `:1259` (guidanceText: "not established by this game's sourced rules"). Violates "nothing unknown". Replaced here.
- `src/simulation/municipal-election-rules.ts:349 PetitionSignatureBase`, `:366 PetitionThreshold`, `:371 assertPetitionThreshold`, `:392 resolveRequiredSignatures`. Percent-of-a-named-base math. Reuse as is.
- `src/simulation/recall.ts:427 recallResidentViews`, `:538 recallPetitionClosesHandler`. The existing petition pattern (counts eligible residents). Candidate petitions differ: a signature exists only because someone was asked and signed. Do not touch recall.
- `src/simulation/issue-record.ts:343 isEligibleVoterIn` (the spec said living-world/issue-record.ts; that path is wrong). Use for the clerk's validity check.
- `src/simulation/campaign-routine.ts:49 CAMPAIGN_ROUTINE_WORK` (only `outreach`, `fundraising`), `:200 setCampaignRoutine`, `:325 campaignRoutineBlockAt`. The work-kind type is `CampaignRoutineWork` at `src/simulation/campaign-life-types.ts:191` (`"outreach" | "fundraising"`). Add `petition` to BOTH.
- `src/simulation/campaign-contact-calibration.ts:44 modelCampaignFieldReach(form, minutes)`. Returns door knocks or phone dials only for `door-canvass` and `phone-shift` and has a `PLACEHOLDER(wave2)` that one candidate minute equals one volunteer-equivalent minute. Seam: a new form for petition circulating, or reuse door-canvass reach. Do not invent a second reach model.
- `src/simulation/decisions.ts:66 evaluateDecision` with `randomness: "none"`. The signer's choice.
- `src/simulation/official-view-reads.ts:168 viewOfOfficial` (the spec gave no path). The signer's view of the candidate.
- `src/simulation/world.ts:979 recordWorldEvent`. The only event writer.
- `src/presentation/english-composition.ts:215 composeGroundedLine`. Request and reply lines.
- `data/research/elections/party-nomination-rules-2026.json` `places[*].filing` has FEC filing deadlines (federal). Deadline source for congressional races.
- Newer code covering part of the spec: none. `data/research/campaign-reality/README.md` says in plain words that "filing fees and petition requirements" are unestablished in the qualification corpus.

## Build steps (each is one PR)

1. **Petition terms in the one gate and in data.** Files: `source/domains/state-office-qualifications/types.ts`, `normalize.ts`, `validate.ts`, `compile.ts` (the Q1 part 1 list), `candidacy.ts`, `campaign-life-activities.ts` (replace the NOT_ESTABLISHED lines and the sentence at :1259), a data file `data/research/elections/candidate-filing-terms.json`. Shape per place and office family: `{feeMinorUnits, signatures: number | {percent, base}, feeInLieuOfSignatures: boolean, circulationOpens, deadline, sameDistrictOnly, onePerSigner, estimated: boolean, estimatedFrom}`. If Q1 part 1 has landed, extend its `eligibilityFor`; if not, add only the fields to the one gate and do not build a second reader. Unread place: the median of the same office family across places that are read; set `estimated: true` in data only (never in player text); never refuse for lack of research. NOTE this changes the Q1 draft, which says "no researched claim: eligible false, refuse". The owner's rule (estimate, never blank) wins; the Q1 sentence must be replaced when this lands, and the CTO should tell whoever holds Q1. Must NOT: build a reader beside `candidacyEligibility`; leave any NOT_ESTABLISHED line.
2. **A signature is a dated event.** New `src/simulation/candidate-petitions.ts` with `askToSign(world, {campaignId, circulatorPersonId, signerPersonId, at})`. Runs `evaluateDecision` (sign / decline) from the signer's `viewOfOfficial` of the candidate, warmth with the circulator, party lean against the candidate's, and traits through the shared trait reader. Writes `campaign.petition-signed` or `campaign.petition-declined` through `recordWorldEvent`, signer and circulator as participants. No new record list. Must NOT: any chance of signing; any percent of people.
3. **Played asks.** Offer `askToSign` as a choice in Session 4's situation reader when the player is with a person who could sign during circulation (doors, work, home). Request and reply go through `composeGroundedLine`. Must NOT: author lines; build a mini-game; ship a new petition screen.
4. **Background gathering.** Add `petition` to `CAMPAIGN_ROUTINE_WORK` and `CampaignRoutineWork`. When a routine block or a helper's shift completes, reach comes from the existing reach function (extended for the petition form); the people reached are the next residents of the district in `world.personOrder`, starting from an offset taken from the block's stable key (selection only), skipping anyone already asked; each goes through `askToSign`. Helpers (b02) circulate on their own recorded hours. Must NOT: tick daily; touch every resident.
5. **Clerk verification.** In Session 13's clerk conversation (Q1 part 4, not yet built), count signed events: valid only if `isEligibleVoterIn` on the filing date, inside the district, and that person's first signature. The clerk says the valid and invalid counts and each reason. Short means refused with the shortfall. Where the fee is an alternative, paying it passes. `fileCampaign` throws if the count is short, using the same refusal path as the eligibility block.
6. **Player count.** Campaign screen shows "signatures you have" (all signed events), never the valid count before the clerk checks. Reuse the existing campaign screen; add a line only.

Replaces: the two petition/fee `NOT_ESTABLISHED` lines and the guidanceText sentence in `campaign-life-activities.ts`; any fee or signature constant in `fileCampaign`.

## Must not build

- A second eligibility reader or filing path beside `candidacyEligibility` / `fileCampaign`.
- Any chance a person signs, "X% of people sign", or a fixed invalid rate (invalid comes only from records).
- Authored petition dialogue or a signature mini-game.
- A daily tick over residents.
- State or town special cases; the Kentucky-only pattern in `campaign-compliance.ts` must not be copied.
- Any change to recall or initiative petitions (they stay in `recall.ts` and the municipal packs).
- New UI beyond one count line and the clerk's lines.

## Research tables

Checked first: `data/research/` has no petition or fee table; `docs/research/qualification-source-ledger.md` and `OPEN-QUESTIONS.md` have none; the Q1 brief assigns the 50-state research to subagents (one question, not yet answered). One web search was run for samples. These are examples to seed the rule, NOT a calibrated table. The 56-place data file must come from Q1's research; wherever it is missing the median rule above applies.

| Place and office                  | Signatures                                           | Fee         | Source                                       |
| --------------------------------- | ---------------------------------------------------- | ----------- | -------------------------------------------- |
| Provo, UT, council                | 250                                                  | $75         | provo.municipal.codes/Code/2.05.015          |
| Berkeley, CA, council             | not stated in result                                 | $150        | berkeley.municipal.codes/Charter/6.1         |
| Temple, TX, council               | 25 qualified voters of the district                  | $100        | templetx.gov city secretary elections page   |
| Lycoming County, PA, city offices | 100                                                  | $25         | lyco.org 2025 municipal primary instructions |
| North Plains, OR                  | 25 city electors or 1% of last gubernatorial turnout | none stated | North Plains code ch. 33                     |
| Cottage Grove, OR, ward seat      | 20 electors in the ward                              | none stated | Cottage Grove code 2.06                      |
| Seattle, WA                       | 1,200 valid signatures (alternative to fee)          | not stated  | search result summary                        |

Rule for unread rows: median of the same office family across read places, ranked by population band when at least three read places in the band exist, else across all read places; marked estimated in data. Never zero.

## Done when

New game in a random state whose office needs signatures: the clerk names the number and deadline; two played asks occur in a scene; the routine is set to gathering; after two in-game weeks the count rises from background asks with named signers; at filing the clerk reports valid and invalid counts with each reason; a short petition is refused with the shortfall. New game in a random fee-only place: no petition is mentioned.
Tests: `src/simulation/candidate-petitions.test.ts` (same world gives same signers; an opposer declines; an unregistered signer counts for the player and is rejected by the clerk; a duplicate is rejected); `candidacy.test.ts` (an unread state returns estimated terms and is never refused for missing research); a loop over all 56 places proving every elective office returns non-blank terms.

## Proof to post

On the branch under `docs/codex/evidence/b01-petitions/`: screenshots of the clerk lines (needs, count, verdict), of one played ask, and of the campaign count line. Printed lines: the filing terms for one fee-only place and one signature place, the signed-event list with named signers, the clerk's valid/invalid split with reasons, and the output of the 56-place loop.

## Standing rules

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."

Open owner questions named in this doc: none (the spec lists none). Open items that could become questions, each with its switch:

- Fee-or-signatures alternative per place: the data row field `feeInLieuOfSignatures` in `candidate-filing-terms.json`; the clerk and gate read only that field.
- Unread-place estimate rule (median of same office family, population band first): one function `estimatedFilingTerms(place, officeFamily)` with the band rule isolated, so changing the rule edits one function, not callers.
- If Q1 part 1 has not landed when this starts: build parts 2 to 4 against the new fields in the one gate and log the dependency in the docket.
