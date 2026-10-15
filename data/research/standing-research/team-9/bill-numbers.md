# Bill numbers need jurisdiction-specific sequences

Florida Senate shares an even-number sequence across measure types. Michigan uses biennial bill bands and letters for joint resolutions. North Dakota has distinct chamber starts, and Guam records include assembly and session suffixes. These primary sources show why one national counter rule is insufficient. This research packet goes to CTO before implementation; incomplete jurisdiction coverage is explicit.

## Primary mechanics verified

| Jurisdiction | Actual primary-source observation                                                                                                                                                                                                                                                                                                   | Boundaries                                                                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Federal      | Senate explains H.R./S. bill numbers follow introduction order; H.J.Res./S.J.Res., H.Con.Res./S.Con.Res., H.Res./S.Res. are distinct types. House official _How Our Laws Are Made_ says H.R. number retained throughout all parliamentary stages; companion is similar/identical separately introduced measure in opposite chamber. | Reset/start/reservation rule not yet primary-verified in this pass. Historic explanatory House document is corroboration, not current reserved-number authority. |
| Michigan     | Official legislature PDF: at beginning of each biennial session, House bills consecutively start4001; Senate bills start1; joint resolutions receive a LETTER in both houses.                                                                                                                                                       | Confirms main's MI starts and biennial basis; letter-series numbering needs separate representation. No annual reset.                                            |
| Florida      | Official Senate FAQ: House bills odd1,3,5…; Senate bills even2,4,6… . Companion introduced opposite house, substantially same and identical specific intent/purpose. Linked bill is contingent on another bill, different concept.                                                                                                  | Main starting-number-only schema cannot encode step2. FAQ requires relevant session when searching; exact regular/special reset rule not verified.               |
| North Dakota | Official legislature general-information page: House bills begin1001, Senate begin2001.                                                                                                                                                                                                                                             | Main starts primary-confirmed. Reset/type-specific/reservation rules not yet verified.                                                                           |
| Washington   | Official help page provides bill history, versions, amendments and companion field; official bills page defines two-year legislative biennium starting odd years.                                                                                                                                                                   | CURRENT help page read did NOT state main's1000/5000 ranges. Do not mark those primary-confirmed from the accessible page.                                       |

Primary URLs read:

- https://www.senate.gov/legislative/common/briefing/leg_laws_acts.htm
- https://www.govinfo.gov/content/pkg/CDOC-110hdoc49/pdf/CDOC-110hdoc49.pdf (House _How Our Laws Are Made_,110th Congress)
- https://legislature.mi.gov/documents/publications/HowBillBecomesLaw.pdf (working current path; old main-recorded path did not yield usable PDF)
- https://www.flsenate.gov/Reference/FAQ (questions4,6,7,10)
- https://ndlegis.gov/general-information
- https://leg.wa.gov/bills-meetings-and-session/bills/
- https://leg.wa.gov/bills-meetings-and-session/bills/help-with-bills/

## Actionable Team2 design suggestions, not approval

Persist immutable internal measure ID separately from displayed designation. Number allocation data should carry jurisdiction/body, numbering period/session and originating chamber. Each jurisdiction supplies its own namespace grouping, first value, step or letter series. Florida Senate shares a counter across types, so a universal per-type counter would contradict its rule. Allocate once on actual introduction, preserve through referral, amendment, passage, cross-chamber receipt, enactment and history. Opposite-chamber companion gets its own introduction and designation plus an explicit relation; transfer of the same measure does not create a new number. Do not conflate bill number, committee-report number, calendar number, amendment number and public-law/chapter number. Amendments/version labels belong to versions of the same measure.

Preserve old saves/IDs/numbers; no retroactive renumbering or research default overwrite. Missing legal rule is a research gap, never factual assertion that every jurisdiction starts1. Reserved numbers can make introduction order nontrivial; separate reservation/assignment record from naïve maximum+1. No specific federal/state reservation range is approved by this packet.

## Coverage ledger

56-place full coverage NOT READY. Direct bill-sequence rule verified only MI, FL, ND in this pass (3/56); WA partial session/companion evidence. The remaining 53 places need chamber, type, start, step, reset, special-session and reservation verification.

Remaining state coverage A–M: AL, AK, AZ, AR, CA, CO, CT, DE, GA, HI, ID, IL, IN, IA, KS, KY, LA, ME, MD, MA, MN, MS, MO, MT.

Remaining coverage N–W and D.C./territories: NE, NV, NH, NJ, NM, NY, NC, OH, OK, OR, PA, RI, SC, SD, TN, TX, UT, VT, VA, WA, WV, WI, WY, DC, PR, GU, VI, AS, MP. MI/FL/ND also still need their unverified fields; no place fully cleared.

Access attempts: Congress.gov help pages returned bot challenge; CT official LCO page returned tiny error response. AZ glossary returned HTML rather than PDF; Hawaii guessed PDF path returned HTML. Guam former .com bill-list path returned unusable91-byte response, current .gov homepage accessible but bill rules not yet read. These are source-access limits, not missing-law conclusions. Federal reserved-number resolution numbers were not guessed into evidence: inspected119th S.Res.4/6/8/9, none established reservation rule.

## CTO decisions still needed

Confirm desired handling of historical-save designations and source gaps while exact rules are filled. Decide whether full all-place legal completion is the gate for allocator changes. Federal reset/reserved-number authority and territory assembly-prefix rules remain immediate primary-source follow-up. No fabricated national rule and no single-state extrapolation supplied.

## Guam primary-record addendum

Current official https://guamlegislature.gov/bills-page1/ read:38th Legislature records include Bill No.100-38(COR),99-38(COR),98-38(LS),97-38(LS), and1-38(COR). These are observed designation examples, not rule text establishing an unconditional allocator. Chamber-neutral assembly suffix and COR/LS metadata show HB/SB-only formatting cannot cover this jurisdiction. https://guamlegislature.gov/bills-special-sessions/ read: separate special-session bill collection, updated09/14/2026. Reset, suffix meanings, first-number rule and reservation rules require standing-rules verification. Guam remains incomplete in coverage ledger.

## Federal/Florida follow-up, primary rules versus observed records

Federal constitutional January3 authority verified from National Archives: https://www.archives.gov/founding-docs/amendments-11-27 , AmendmentXX sections1-2. Senator/Representative terms end and successors begin at noonJanuary3 in their relevant years; Congress assembles at least annually beginning noonJanuary3 unless law appoints another day. This annual-session rule DOES NOT itself reset bill numbering annually. Exact bill-number reset at a new Congress and reserved-number authority still NOT VERIFIED here. Bot challenges/404-style responses prevented usable Senate glossary/legislative-process pages; tested119th Senate adopted resolutions4-15 contained no verified reservation rule,20 returned unusable response. Do not transform presumed reserved ranges into findings.

Florida current 2024-2026 Senate Rules primary PDF verified: https://www.flsenate.gov/PublishedContent/Reference/Publications/2024-2026SenateRules.pdf . Rule3.10: measures introduced in order Secretary receives them, serially numbered EVEN numbers as introduced, **without differentiation in number as to type**. Thus the earlier generic per-type-counter suggestion requires jurisdiction-specific namespace data: Florida Senate shares a numeric series among types. Rule1.15 Secretary examines legal form before issuing a bill number. Rule3.8 prefiled compliant bills serially numbered in anticipation of next regular session; introduced/read on first day. Rule3.7(3) can use identity/control number until permanent number affixed. Rule3.11 defines companion and permits substitution of an already-passed House companion; substitute remains actual separate measure, not renumbering original.

Observed Florida special-session designation: https://www.flsenate.gov/Session/Bill/2025A/1A reads House Bill1A(2025A), displayHB1-A. This confirms special-session letter in that actual record, not a universal special-session reset statute. Full regular/special reset/start/suffix assignment rule still incomplete. Session identity must be persisted independently of integer designation; ordinary calendarJanuary1 reset would not account for prefiling. No additional legal rule was inferred.

## Current implementation and CTO docket

Read-only source inspection at main a18f22a76b2b41c01ff030026024eb940ccefbef found durable designations and session handling in `src/simulation/measure-numbering.ts`. Existing writers already call this allocator. No duplicate allocator is requested. The existing `data/research/bill-numbering-starts.json` explicitly labels its quotes search excerpts and missing chamber starts default to 1. Those defaults establish behavior, not legal authority.

Inferred mismatch: starting values alone cannot encode Florida's even/odd progression, shared Senate type namespace, or Michigan lettered joint resolutions. Team2 should audit the exact allocator and data contract before taking a released source hunk. This packet changes no game code and certifies no existing test outcome.

Opening numbers use 2022 state introduction totals, evenly split across chambers and calendar days. Missing federal, D.C. and territorial counts use the state median. Council opening numbers use one ordinance per week. These are inherited game assumptions, not observed filing rates; prefiling and special sessions need exact treatment. Do not convert these assumptions into all-place observations.

CTO decision: approve a bounded Team2 exact-place numbering audit and additive contract repair for verified rules, with every untouched legal cell explicitly unresolved. Recommendation: preserve all filed designations, internal IDs and save histories; use jurisdiction-specific counter namespaces, sequence steps and session metadata only after exact evidence and released ownership. Alternative: hold all allocator edits until every place and field is verified. No decision is implied by delivery.

Next research step: finish federal reset/reservation authority and Florida special-session rules, then territorial standing rules. Original eight-topic bring-first docket follows in the companion queue. Team1's additional 23 photo-ID cure cells and NC holiday treatment remain queued behind this first priority; no generic seven-day rule is approved.

Validation: source reads and source inspection executed. Runtime links added or changed: 0. Newly proved three-step simulation chains: 0. Game tests, types, browser acceptance and simulations: NOT RUN. Research formatting and report results are recorded in the handback after execution.
