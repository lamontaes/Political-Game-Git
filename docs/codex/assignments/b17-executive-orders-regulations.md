# Executive orders, regulations, enforcement and the bully pulpit (bank id b17, phase P4 build; unlocks every non-bill route for mayor, governor and President)

Verified against origin/main ec9a9601a (Oct 5). Bank spec: docs/codex/specs/bank/b17-executive-orders-regulations.md. Session 23 (docs/codex/brief-session23-executive-track-2026-10-05.md) owns the executive desk engine; this item extends its parts and never duplicates them.

## What the player experiences

As mayor, governor or President you can act without waiting for a bill. You sign an executive order telling agencies what to do, within what your office's constitution and laws allow; an order that reaches too far is refused with the reason. When something real happens (a storm, an outbreak) you can declare an emergency for as long as your state's law lets you. When a law leaves details to agencies, your agency head drafts the rule (who qualifies, how much, by when), people with a stake comment where the law requires it, and you approve it or send it back. You tell agencies what to enforce first. The first priority you set is not a label: it decides which rules your agencies draft first and what the desk opens. You can go public with a speech or statement to push a bill or a lawmaker. The legislature can undo what you did, the next executive can revoke it, and later courts can strike it.

## Owner decisions it rests on

- "Government acts through every route: executive orders, regulations, enforcement and the bully pulpit, not only bills." (roadmap P4)
- OWNER RULING (Oct 5): a governor "priority" that only reorders budget options is not acceptable. It must drive what the desk opens or be deleted.
- OWNER RULING (Oct 5): only 6 executive rule packs exist (federal, KY, NE, AK, MN, IL). Every state and territory must come through one data path, estimated from similar states where no source exists.
- OWNER RULING (Oct 5): no state-capital data exists; the capital is added as a place record from the same place tables (b11 part 1 builds that table; read it, do not make a second one).
- OWNER RULING (Oct 5): Session 23 owns the executive desk engine. b17 extends its parts.
- "One law system: every law is a data row run by one engine; one executive engine for federal, state and local." "Anything a government can change, the game can change by law."
- Speeches: "you pick themes, promises and audience; English engine writes it in your voice; moment and crowd decide how it lands."
- Fixed rules: zero dice; nothing blank or placeholder (estimate and mark); one rule for all 50 states, D.C. and territories; emergent not authored; real data calibrates only the start; one writer per record kind; delete what you replace.

## Existing code to extend (verified on ec9a9601a)

- `src/simulation/executive-authority-rules.ts:195 ExecutiveDirectiveAuthorityRule` (hasDirectiveAuthority, authorityBasis), `:228 EmergencyDeclarationAuthorityRule` (executiveMayDeclare, initialDurationDays, extension, legislativeTermination), `:292 AdministrativeAuthorityRule`. Pack fields at :351 and :353. Only civic-office code reads packs (`civic-office-definitions.ts:34,47`, `national-election-offices.ts`). No runtime reads the directive or emergency fields.
- `src/simulation/executive-authority-rule-packs.ts`: six packs (federal :302, KY :653, NE :800, AK :966, MN :1140, IL :1340), list at :1474, `:1508 executiveRulePackForJurisdiction` returns null for every other key; `:1523 executiveRulePackForOfficeKey`.
- `src/simulation/executive-governing-kernel-bank.ts`: `92H-K-050` (issue an executive order) and `92H-K-051` (inherited orders at transition) at ~:305-325, NEEDS_MECHANIC for want of an EO record family; rulemaking kernels `92H-K-110`, `-111` at ~:531-551 blocked on a regulation record. The blocker text names Book of the States Table 4.5, not retrieved (403): that is the number source to get.
- Governor priority, all in `src/simulation/governing/state-governing.ts`: options built `:607-630`; `:1286 currentPriority`; read at `:1182` and `:1208-1230` (chief-of-staff advice), `:1054-1067` (NPC decision), and `:3075` where it only moves its family to the front of the budget options. The file's own header (:121) says "E1 agenda priority -> agency implementation matter" and that is not built. Implementation pace options `:774`, `:828`. `:2222 decideGoverningMatter`. Matter families at :157-161 (bill, budget, agenda, chief of staff, program, clemency) plus `opened via openMatter`.
- `src/simulation/law-hierarchy.ts:37 LawLevel`: six values only (federal/state constitution and statute, local charter and ordinance), `:46 LAW_LEVELS`. `governing/law-in-force.ts:74 LawInForce`, `:115 lawInForce`. `enacted-law-effects.ts:796 applyLawConsequences`. `law-consequence-registry.ts` (56 lines, 8 kinds); `law-consequences/legal-outcome.ts`.
- `src/simulation/crisis/disaster.ts:686 decideStateDisasterRequest`, `:743 decideFederalDisasterDeclaration`: the only declaration path today.
- `speech-reception.ts:259 speechReception`, `:290 recordSpeechReception`; `presentation/press-request.ts:184 composePressAnswer`.
- `src/simulation/municipal-rule-registry.ts` (and `.generated.ts`): mayor powers where stated. `data/research/local-government/state-executive-governments.json` lists governments whose executive is the state's (D.C. entry).
- Session 23 parts (not yet merged): matters through `openMatter`, appointments (part 3), budget desk (part 4), one inbox (part 6). Its brief does not mention executive orders, regulations or emergencies, so none is covered. `legislature-game-profile.ts` is the read/estimated model.
- Not on main: any executive-order, regulation or emergency record (searched).

## Build steps (one PR each, in this order)

1. **Executive rules everywhere.** New executive game profile in the `legislature-game-profile.ts` shape: read where a pack exists (the 6), otherwise generated from the spread of read packs plus one research table per field, marked estimated, for all 50 states, D.C. and the 5 territories. Mayors read strong/weak powers from `municipal-rule-registry` where stated, else estimated by form of government. `executiveRulePackForJurisdiction` never returns null. `Replaces:` the null return and every caller's null branch that only existed for the missing 50. Must NOT: write a state-named branch.
2. **Executive actions are law records in the one law system.** Add per-government levels to `LawLevel`: regulation (just below that government's statute) and executive order (below regulation), updating `LAW_LEVELS` and the rank. An action is a measure enacted by the executive route; `lawInForce` and `applyLawConsequences` read it unchanged. It may answer only what its authority reaches: details a statute in force delegates (a delegation term on the statute's consequence rows) or management of the executive branch. Text on Session 9's bill paper with clause menus filtered to that authority; a refused clause shows the reason in plain words. Records carry filed, published, effective and expiry states (the kernel blockers).
3. **Desk matters, and the priority finally works.** Add "executive order", "regulation" and "emergency" families, landing in Session 23's merged inbox (after its part 6, or coordinate on the board). Computer-run executives issue orders when agenda priority, principles and a recorded condition (a crisis, a died bill, a ruling) give reason (`evaluateDecision`). The agenda priority must now (a) order which delegated rules the agency head drafts first and (b) feed enforcement directives (part 6). `Replaces:` the budget-only use at `state-governing.ts:3075`: either keep it as one reader among these, or delete the priority option; leaving it as a budget reorder alone is refused. Build the E1 link named in the file header.
4. **Regulations from delegating laws.** When an enacted law delegates details, the implementing agency head (appointed through Session 23 part 3) drafts terms within the law's ranges and a regulation matter opens. Where the place's rules require comment, people with a stake decide whether to comment (lobbyists as people); the player sees who said what and can change terms. Legislative review runs where rules data say. Then the rule takes effect and consequences flow.
5. **Emergency declarations.** When a recorded crisis reaches the jurisdiction the executive may declare within the emergency rules (scene for the player, decision for others). Duration, extension and legislative termination come from the part 1 data. `decideStateDisasterRequest` reads the declaration as an input.
6. **Enforcement directives.** An action can set enforcement priority on a law (first, ordinary, lowest), bounded by the faithful-execution data. The legal-outcome consequence kind and Session 20's landing engine read it when ranking whom enforcement reaches.
7. **Undoing.** The legislature repeals or terminates through the normal bill path. At a transition the incoming executive gets an "inherited orders" matter (kernel 92H-K-051) and decides each by own reasons. A court-challenge flag is left for the later court engine.
8. **Bully pulpit.** A public address on a pending measure or named official reuses b08 part 4's public-pressure path; this part adds only the executive's reach (statewide or national outlets). Do not start before b08 part 4 merges; build parts 1-7 meanwhile.

## Must NOT build

Orders that write outcomes directly (only law terms through consequence rows); powers beyond the authority data; a new effect engine; a desk beside Session 23's inbox; budget or appointment work (Session 23 parts 3-4); authored speeches; dice; state patterns as code; a second capital table.

## Research tables

Missing numbers: executive-order authority basis, emergency duration, extension and legislative termination, and comment requirements for the 44 states, D.C. and territories without a pack. Kernels cite Book of the States Table 4.5 (not retrieved). Look first in `data/research/local-government/`, `data/source/state-local-fiscal-authority/`, `data/source/book-of-the-states/`. Then ONE search per field, 10 minutes, a table with source and a read/estimated flag per row. Estimated rows come from the spread of the 6 read packs, never a single copied pack.

## Done when (played-game proof)

- Random state, player governor: signs an order on a management question; an order beyond authority is refused with the reason. A delegating law leads to a drafted rule, named commenters, a player edit, an effective date and consequence lines. A hazard leads to a declaration that lapses after the state's duration unless extended. A computer-run successor revokes one order at transition with reasons. A strong-mayor and a weak-mayor town get different powers from the same code. Setting the governor's priority changes which rule is drafted first and what enforcement ranks, shown in the record.
- Same flow in a territory/D.C. place on an estimated pack. Same save, same answers.
- Tests: `executive-profile-coverage.test.ts` (all 56 states/D.C./territories non-null, estimated flagged), `executive-order-authority.test.ts`, `regulation-delegation.test.ts`, `emergency-duration.test.ts`, `inherited-orders-transition.test.ts`, `priority-drives-desk.test.ts`.

## Proof to post

PR comment per step: place and seed, printed authority rows with read/estimated flags, the refusal text, record ids for order, rule, comments, declaration and revocation, priority before/after effect, delete list per "Replaces:", `npm run typecheck` and changed tests passing.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.

- No open owner questions. Switches: priority fate = one function with two options stubbed (drive desk, default; delete the option), the desk-driving option is the one to build; which comment steps a place requires = a data row per jurisdiction; if Session 23 part 6 slips, the new families register through a single `openMatter` list so moving them into the inbox is a one-line change.
