# Future-System Coverage Map — Our Civic Duty

Status: reconciled map (overnight audit, 2026-09-05), from `docs/GAME-CONSTITUTION.md`, `ROADMAP.md`, `DECISION-LOG.md` (through D-074), `docs/systems/*`, `FIRST-BUILD-SPEC.md`, and read-only inspection of `src/`. It reconciles the roadmap/decision log against what actually exists in code, and states for each major system: status, what it **reuses**, what genuinely **needs new machinery**, and the **research gap** (as an exact question, not "needs research").

**Governing principle to preserve:** build UP and OUT from the one canonical World. The docs are emphatic that later systems _consume stable earlier records_ rather than fork them (ROADMAP "Dependency Spine"). Do not create parallel minigame simulations. Declared reuse seams already exist for almost everything below.

---

## Status legend

`IMPLEMENTED` · `PARTIAL` · `IMPLEMENTED-NOT-PLAYER-REACHABLE` · `DESIGN-READY (typed seam exists)` · `RESEARCH-PARTIAL` · `MISSING-RESEARCH` · `BLOCKED (art/PR/human-play)` · `IDEA-ONLY`

---

## A. Foundations — DONE (protect, do not reopen)

- **Persistent-person model, history, memory, beliefs, decisions, relationships (Stages 1–5):** IMPLEMENTED & accepted. Characters are histories, not stat blocks. Reused by everything.
- **Quantitative policy / causal economy / fiscal (Stage 6):** IMPLEMENTED (external audit pending on Runs C/D/E). No exposed meters (`assessAffordability`/`assessLifeLoadAt` return qualitative bands with evidence ids).
- **Incidents / mortality / vitality (Stage 6 Run D/E):** IMPLEMENTED (generalized incident catalog, eligibility, risk, mortality/incapacity). NOTE: only a **synthetic/test incident catalog** exists — no production incident _content_.
- **Modular character + scene compositor contracts (D-053/54/55/57):** IMPLEMENTED & accepted; **art release still gated** (see Graphics map). Fail-closed, identity-safe.
- **Legislative procedural spine (D-056):** IMPLEMENTED (partial) — append-only action log, position derived by replaying vs rule pack, roll-call with eligible membership/threshold/denominator, integrity recompute, KY/NE/AK rule packs (bicameral/unicameral/bicameral), fail-closed rule resolution.
- **The "narrative wave" (adaptive life/setup/threads/episodes/narration/adult-situations/questionnaire):** IMPLEMENTED in source, documented in `adaptive-life-and-setup.md` — but has **NO DECISION-LOG entry** (log ends D-074). _Governance gap: its accepted boundary is asserted only in a system doc + commit, not the authoritative decision log._

---

## B. The near frontier — the open PRs (each a real next step; DO NOT duplicate)

| System                                                      | PR      | Roadmap        | Status                 | Reuses                                                                       | Needs new                                                                                               |
| ----------------------------------------------------------- | ------- | -------------- | ---------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Campaign / candidacy / first election                       | **#85** | Stage 9        | building               | beliefs, decisions, orgs, geography, FEC data substrate (`data/source/fec`)  | contest/candidacy/poll/campaign-finance machinery                                                       |
| Legislative bargaining / targeted provisions / commitments  | **#79** | Stage 10       | building               | D-056 spine, relationships, `commitment-seam.ts`, `relationship-leverage.ts` | whip/bargaining/lobbying model; **commitment-seam convergence** (designed to converge, not yet unified) |
| Causal-trace observer/inspector                             | **#84** | Stage 12 slice | building               | append-only history, thread index                                            | trace export/navigation UI                                                                              |
| Declarative content bank (one shape)                        | **#83** | cross-cutting  | building               | EPISODE_FAMILIES, adult/formative/conversation banks                         | a generic registry (episode-bank is "shaped to be adopted by a registry later")                         |
| Player presentation / New Game / formative / Start-Anywhere | **#91** | 6.5+           | **read-only this run** | narrative wave, scene-first shell                                            | nationwide place corpus wiring (see §D)                                                                 |
| Garment morphology fit                                      | #89/#90 | art pipeline   | building               | compositor contracts                                                         | — (art-fit only)                                                                                        |

---

## C. The designed-but-unbuilt systems (typed seams already exist — build ON them)

Each of these has a **declared reuse seam**, so it should extend the canonical World, not fork it.

### Stage 7A — Institutions, law, authority, mutable rules — `DESIGN-READY`

Jurisdictions, chambers, offices, seats, terms, eligibility, appointments, confirmations, succession, powers, procedures, thresholds, vetoes/overrides, statutory/rule hierarchy, redistricting — resolving from the law **effective at the simulated date** (Constitution 9).

- **Reuse:** `evaluateLifeEligibility(actor, actionKey, date, jurisdiction, provider)` is the injection point (D-038); `organization` identity is the single extension seam (schools/employers/parties/campaigns/agencies/courts all reference the same org ids); legislature rule packs (D-056) already resolve known/unknown/not-applicable, fail-closed.
- **Needs new:** a generic **effective-dated law/authority store** that the eligibility provider reads.
- **Research gap:** none blocking design; the store shape is an engineering decision. Content research is per-jurisdiction (Stage 7B).

### Stage 7B — Real civic data wired into gameplay — `RESEARCH-PARTIAL / substrate BUILT`

- **Already built:** `src/source/domains` + `data/source` hold compiled, provenanced corpora — counties, places, political-districts, state-office-qualifications, FEC, federal-courts, HUD-housing, FEMA-disasters, plus ACS-PUMS, BEA-regional, BLS-LAUS. This is real and refusal-based (unknown stays unknown).
- **Needs:** wiring corpora into gameplay; **Lexington is still an explicit placeholder** with no sourced snapshot.
- **Research gap (exact):** _for the chosen launch jurisdiction(s), what is the sourced, dated government structure — offices, districts, current officeholders, terms, selection method — with `as_of`/source/URL for each?_ Source class: official state/county government + Ballotpedia/OpenStates for cross-checks.

### Stage 8 — Population, opinion, reputation, electorate — `DESIGN-READY (needs model) / substrate PARTIAL`

Population cells/coalitions, party ID, turnout propensity, issue salience, candidate impressions, trusted cues, geographic fame, coalition evolution — **no single partisan score, no dense voter×issue matrix** (Constitution 4, 16, 28).

- **Reuse:** Stage 3 beliefs/principles, geography, public statements, events; ACS-PUMS/counties/districts substrate.
- **Needs new:** a **scalable opinion-formation model** (progressive resolution — Constitution 26 forbids computing every voter every turn).
- **Research gap (exact):** _what is a defensible, source-backed method to seed population cells and party-ID/turnout priors from ACS-PUMS + district returns without a dense voter matrix?_ Blocks Stage 9 realism.

### Stage 9 — Elections & campaigns — `DESIGN-READY` (**PR #85 is starting here**)

Recruitment, fundraising, donors/PACs/finance rules, volunteers, field, speeches, interviews, debates/forums, endorsements, opposition research, polling & _fallible_ pollsters, turnout, election-night results, post-election consequences.

- **Reuse:** beliefs, decisions, electorate (Stage 8), org identity, resource flows; FEC substrate.
- **Needs new:** contest/candidacy/poll/campaign-finance machinery.
- **Research gap (exact):** _what are the actual ballot-access, filing, and campaign-finance rules (contribution limits, disclosure thresholds, PAC rules) for the launch jurisdiction, effective-dated?_ Source: state board of elections + FEC. **Depends on Stage 8 for realistic turnout/opinion.**

### Stage 10 — Governing, budgeting, bargaining, oversight — `PARTIAL` (**PR #79 extends here**)

D-056 shipped the procedural spine. Explicitly deferred (`legislation.md:160-173`): committees-as-negotiation, calendars/deadlines as live constraints, committee substitutes, procedural floor motions, line-item/amendatory veto, confirmations, **lobbying, caucus, whip, bargaining, promises/deals**, public-opinion effects, appropriations/budgeting, judicial review, other states, and **amendment/substitute text realization** ("adopting an amendment does not yet rewrite the bill text").

- **Reuse:** D-056 records, Stage 4 decisions, relationships/`relationship-leverage.ts`, Stage 6 fiscal.
- **Needs new:** bargaining/whip/budget machinery + provision-rewrite/text-diff.
- **Design note:** member decisions are currently **authored by scenarios, not modeled** (`legislation.md:105`). A transcript harness gets authored votes, not emergent ones — that seam is where relationships/bargaining attach later.

### Stage 11 — Staff, appointments, delegation, mentorship — `PARTIAL`

- **Reuse:** persistent-person model, relationship interactions, work relationships; D-Lite Work/Pending already models assignees/waiting-on + one explicit delegation.
- **Needs new:** staff capability/continuity behavior (improve/decline/burn out/leave/fail confirmation; coaching-tree lineages). Constitution 12 (staff are persistent characters, not equipment bonuses).

### Stage 12 — Civic wiki/archive, Observer Mode, control-transfer, branching — `DESIGN-READY (needs infra)`

- **Reuse:** append-only history, causal inspector (#84).
- **Needs new:** branch persistence (D-013 future), archive/query UI, autonomous world tick. Constitution 30 (same systems run without a player).

---

## D. Life-mode systems the owner named for tomorrow's direction

| System                                                                               | Status                                                                                                                                 | Reuse                                                                   | Needs new / research                                                                                                                                             |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Opening/exposition experience** (staged birth/family grounding, AC-II feel)        | `PARTIAL` — New Game generates household + intro exists (#91); opening epistemic exception is approved                                 | household generation, `presentPeople` introductions, scene-first shell  | staged multi-beat opening sequence; **birth/age-0 not buildable** (`MINIMUM_START_AGE=5`) — needs a 0–4 path + content                                           |
| **Age-dependent formative catch-up montage**                                         | `PARTIAL` — depth `summarize-earlier-life` vs `play-formative-years` exists; quick-gen writes one fixed template                       | CharacterHistoryPlan, history families                                  | scale montage to start age; **fix known gap: quick-gen lives share one shape** (`adaptive-life-and-setup.md:239`)                                                |
| **Distinct visual Create Character** (skin/face/hair/body before Begin)              | `BLOCKED (art)` — compositor contract exists; `PRODUCTION_CHARACTER_LIBRARY` empty                                                     | modular compositor (D-053/55)                                           | art release + a creator UI that writes only appearance (no personality/ideology/biography)                                                                       |
| **Education-at-18 / college as playable Life Mode**                                  | `IMPLEMENTED-NOT-PLAYER-REACHABLE` — headless `EducationEnrollment`/apprenticeship shipped                                             | enrollment/org/work/eligibility records                                 | interactive Life-Mode content + choices (admissions/aid/major/pay/work/alternatives). Non-mandatory; vocational/apprenticeship/military/community-college routes |
| **Careers / first jobs**                                                             | `PARTIAL` — WorkRelationship + teen-work + apprenticeship compose canonical work                                                       | work/compensation/expertise records                                     | autonomous career/promotion behavior + job-search gameplay                                                                                                       |
| **Meeting new people / friendship / rivalry / romance / one-time**                   | `PARTIAL` — Run B/C composers cover friendship/mentoring/calls/visits/reconnection; romance/marriage/children via CharacterHistoryPlan | relationship-interaction history, decision engine                       | **autonomous, asymmetric relationship dynamics** + a **meeting-new-people generator** (`relationships.md:31`)                                                    |
| **Not-a-clicking-simulator** (time auto-advances; stop only when something warrants) | `PARTIAL` — `letStoryTimePass` + variable quiet steps exist; ordinary-stretch fallback exists                                          | selector, quiet-step pacing                                             | make quiet time truly auto-advance in chunks and stop on situation/opportunity/obligation/thread-due; the current loop still shows many low-value beats          |
| **Forever-unfurling contextual tutorial**                                            | `IDEA-ONLY`                                                                                                                            | capability-gated "Elsewhere" surfaces already reveal systems in context | a small skippable opening coach + per-system first-encounter teaching                                                                                            |
| **Crises & causal divergence at scale**                                              | `PARTIAL` — incidents/mortality built; no crisis simulator/health/media model                                                          | incident catalog, causal ancestry, due-item scheduler                   | large-scale crisis chains (Constitution 17: causally grounded, not random cards)                                                                                 |

---

## E. Content banks — coverage reality (for any content lane)

| Bank                           | Count                                                             | Static-enumerable?                      | Note                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Episode families               | 9 families / 42 stages / 93 options (~349 strings)                | **Yes** (`EPISODE_FAMILIES`)            | Best-quality bank; concrete, gray, branching, cross-beat consequence                                          |
| Adult situations               | 35 / 102 options (~383 strings)                                   | **Yes** (`adultSituationBank()`)        | Good; watch the shared "…, which …" memory cadence                                                            |
| Formative situations           | ~20 / 49 options (~178 strings)                                   | **No** — private `AUTHORED_SITUATIONS`  | **Weakest & thinnest**; vague referents; ages 5–7 uncovered. _Recommend exporting `formativeSituationBank()`_ |
| Conversation subjects          | **5** (2 are hard-coded Run B/C demos)                            | keys only; dialogue is method-generated | Explicitly unfinished; general life conversation carried by 3 subjects                                        |
| Incidents                      | 4 synthetic/test defs                                             | n/a                                     | **No production incident content**; text generated generically                                                |
| Setup/opening/young-life banks | setup-opening (~1500) + questionnaire (~2100) + young-life (~900) | partial                                 | policy-docket items flagged as exam-like; re-authoring pending                                                |

---

## F. Stale-authority cleanup (bank for a docs lane — DO NOT delete anything)

- **DECISION-LOG has no entry for the narrative wave** (ends D-074). Add a decision recording its accepted boundary.
- `docs/agent/ACTIVE-HANDOFF.md` is stale (dated 2026-08-28, names PR #16/#18/#19 as next). Update or supersede.
- `ROADMAP.md` Stage 10 still "FUTURE" despite D-056; `FIRST-BUILD-SPEC.md` scope list understates coverage (education/work, committees, staff delegation all shipped since). Add "superseded by" notes.
- Roadmap "pending review" labels (Stage 6 Runs C/D/E, Stage 6.5) not updated after 60A/70A/72A/77A human-play repairs.

---

## G. The concrete next integration bundle (per ROADMAP 455-458)

**Lexington MVP Slices E / F / G** — a minimum institution+electorate+campaign+election of _one_ council race (E), a minimum governing term (F), and continuation/next cycle (G) — over Stages 7–10. These "remain separately gated and were not started by D-Lite." This is the natural vertical slice that turns the designed seams into a playable political arc, and it is the frame within which #85 (campaign) and #79 (legislation) eventually meet.
