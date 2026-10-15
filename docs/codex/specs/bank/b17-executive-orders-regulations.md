# Executive orders, regulations, enforcement and the bully pulpit (bank id b17, phase P4)

## What the player experiences

As mayor, governor or President you can act without waiting for a bill. You can sign an executive order telling agencies what to do, within what your office's constitution and laws allow. When something real happens (a storm, an outbreak) you can declare an emergency for as long as your state's law lets you. When a law leaves details to agencies, your agency head drafts the rule (who qualifies, how much, by when), people with a stake comment where the law requires it, and you approve it or send it back. You can tell agencies what to enforce first. You can go public with a speech or statement to push a bill or a lawmaker. The legislature can undo what you did, the next executive can revoke it, and later courts can strike it. Budgets, appointments and the bill desk are Session 23's desk; this adds the other routes.

## Owner decisions this rests on

- "Government acts through every route: executive orders, regulations, enforcement and the bully pulpit, not only bills." (roadmap P4)
- "As governor or president you have real work: a desk with bills, budgets and appointments." "Mayor: budget fights, appointments, vetoes, emergencies are scenes; budget numbers are a screen."
- One law system: every law is a data row run by one engine; one executive engine for federal, state and local.
- "Anything a government can change, the game can change by law."
- Speeches: "you pick themes, promises and audience; English engine writes it in your voice; moment and crowd decide how it lands."

## Existing code it must use

- `src/simulation/executive-authority-rules.ts:195 ExecutiveDirectiveAuthorityRule`, `:210` reorganization, `:228 EmergencyDeclarationAuthorityRule` (duration, extension, legislative termination), `:292 AdministrativeAuthorityRule` (faithful execution). No runtime code reads the directive or emergency fields.
- `src/simulation/executive-authority-rule-packs.ts`: only six packs (federal `:303`, KY `:654`, NE `:801`, AK `:967`, MN `:1141`, IL `:1341`); `:1508 executiveRulePackForJurisdiction` returns null for 44 states, D.C. and the territories.
- `src/simulation/executive-governing-kernel-bank.ts:305–326` kernels "issue an executive order" and "inherited orders at transition", both NEEDS_MECHANIC for want of an executive-order record; `:531–551` rulemaking kernels blocked on a regulation record.
- `src/simulation/governing/state-governing.ts:157–164` matter families; `:607` agenda options "priority:<family>" whose effect text says agencies are told, but only budget option order (`:3075`) and chief-of-staff advice (`:1182–1230`) read it; `:751` implementation pace options; `:2222 decideGoverningMatter`.
- `src/simulation/law-hierarchy.ts:37 LawLevel` (no executive or regulation level); `governing/law-in-force.ts:74 LawInForce`, `:115 lawInForce`.
- `src/simulation/enacted-law-effects.ts:796 applyLawConsequences`; `law-consequence-registry.ts` (8 kinds incl. `legalOutcomeRegistration`, `law-consequences/legal-outcome.ts:174`); `law-consequence-types.ts:275 LawConsequenceContext`.
- `src/simulation/crisis/disaster.ts:686 decideStateDisasterRequest`, `:743 decideFederalDisasterDeclaration` (the only declaration path today).
- `src/simulation/speech-reception.ts:259,290`; `presentation/press-request.ts:184`.
- Session 23 brief: matters through `openMatter`, appointments (part 3), budget desk (part 4), one inbox (part 6). `legislature-game-profile.ts` for the read/estimated pattern.

## What to change

1. **Executive rules everywhere.** Add an executive game profile in the `legislature-game-profile.ts` shape: read where a pack exists, otherwise generated from the spread of read packs plus one quick research table per field (one search, cite), marked estimated. Mayors read strong/weak-mayor powers from `municipal-rule-registry` where stated, else estimated by form of government. `executiveRulePackForJurisdiction` never returns null.
2. **Executive actions are law records in the one law system.** Add per-government levels to `LawLevel`: regulation (just below that government's statute) and executive order (below regulation). An executive action is a measure enacted by the executive route; `lawInForce` and `applyLawConsequences` read it unchanged. It may answer only questions its authority reaches: details a statute in force delegates (a delegation term on the statute's consequence rows) or management of the executive branch. Its text is written on Session 9's bill paper, with clause menus filtered to that authority. A refused clause shows the reason in plain words.
3. **New desk matters.** Add "executive order", "regulation" and "emergency" families to the governing matters, landing in Session 23's merged inbox (after its part 6, or coordinated on the board). Computer-run executives issue orders when their agenda priority, principles and a recorded condition (a crisis, a bill they wanted that died, a ruling) give them reason (`evaluateDecision`). The agenda priority finally does something: it orders which rules agencies draft first and feeds enforcement directives.
4. **Regulations from delegating laws.** When an enacted law delegates details, the implementing agency's head (a person, appointed through Session 23 part 3) drafts terms within the law's ranges and a regulation matter opens. Where the place's rules require public comment, people with a stake decide whether to comment (lobbyists as people); the player sees who said what and can change terms. Legislative review runs where the rules data say. Then the rule takes effect and consequences flow.
5. **Emergency declarations.** When a recorded crisis (hazard, epidemic, disaster episode) reaches the jurisdiction, the executive may declare within the emergency rules: a scene for the player, a decision for others. Duration, extension and legislative termination come from data. Emergency powers are rule rows; the existing disaster request path reads the declaration as an input.
6. **Enforcement directives.** An executive action can set enforcement priority on a law (first, ordinary, lowest), bounded by the faithful-execution data. The legal-outcome kind and Session 20's landing engine read it when ranking whom enforcement reaches.
7. **Undoing.** The legislature repeals or terminates through the normal bill path; at a transition the incoming executive gets an "inherited orders" matter (kernel 92H-K-051) and decides each by their own reasons; a court-challenge flag is left for the later court engine.
8. **Bully pulpit.** A public address on a pending measure or a named official reuses b08 part 4's public-pressure path; this part adds only the executive's reach (statewide or national outlets carrying the address).

## Must NOT build

Orders that write outcomes directly (only law terms through consequence rows); powers beyond the authority data; a new effect engine; a desk beside Session 23's inbox; budget or appointment work (Session 23 parts 3–4); authored speeches; dice; state patterns written as code (an "Iowa" or "Virginia" branch).

## Done when (proof in a played game)

Random state, player governor: signs an order on a management question; an order beyond authority is refused with the reason. A law delegating details leads to a drafted rule, named commenters, a player edit, an effective date and consequence lines. A hazard leads to a declaration that lapses after the state's duration unless extended. A computer-run successor revokes one order at transition with reasons. A strong-mayor and a weak-mayor town get different powers from the same code. Tests: `executive-profile-coverage.test.ts` (all 56 non-null), `executive-order-authority.test.ts`, `regulation-delegation.test.ts`, `emergency-duration.test.ts`, `inherited-orders-transition.test.ts`.

## Depends on

Session 23 (inbox, appointments, budget), Session 9 (bill paper), Session 20 (landing engine), Session 21 (shared kinds), Session 25 (crisis events), b08 (public pressure).

## Open questions for the owner

None.
