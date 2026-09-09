# EDU-PATH7 source and study consumer

Authority: BUILD-OUT7 shared execution and A; source research L06, appendix lanes16/63/77, research90 education/source corrections, and42A. The source is evidence; canonical LIFE remains save-world truth.

## Actual corpus and reuse

Acquired through `source:acquire -- --domain education`: NCES CCD2024–25 preliminary directory bundle (May14 release, August2025 bundle), HD2024, IC2024 including `ic2024_rv.csv` updated September2026, and both IPEDS dictionaries. Exact URLs, real retrieval instants, archive byte hashes and sizes are in `data/source/education/artifact-lock.json`. The CCD bundle contains its school/LEA dictionaries and release notes. No person-level data is used.

All101,333 school rows,19,484 LEA rows and6,072 HD rows are retained. Every5,963 IC row joins by UNITID. No arbitrary school ceiling; paging limits display only. CCD LEAID/NCESSCH retain zero padding; FIPST is state, never county. CCD county remains unknown. HD COUNTYCD is the publisher's five-digit county code, independently tested for UK21067 and Harvard25017. No city-name join to a World jurisdiction is fabricated.

Historical PR35 commit75495df was inspected. Its useful stable-ID conventions and unknown-founding/date separations are retained. Its32-school selection, inferred school levels/default open status and out-of-framework compiler are replaced. No actual old raw bytes were found in the targeted local trees; referenced2022 products are not claimed current or silently relabeled. This implementation acquired missing2024–25 products, rather than copying32 rows.

Corpus schema uses documented positional transport v1 (`src/education/compact.ts`). Per-row raw capability codes retain yes/no/not-applicable/unknown distinction; shared source dictionaries supply labels. Full source output is deterministic and source-domain autodiscovery is unchanged. `scripts/source/export-education.ts` generates three content-addressed browser chunks by institution kind; college search fetches only the college chunk. All-kind search covers all chunks. Browser verifies digest and row count before use; runtime imports no Node source modules.

## Declared consumer and honest limits

Institution listing and reported award/grade/noncredit capability are informational. Founding dates remain null. Admission, exact major, academic prerequisites, historic attendance, individual acceptance probability, financial aid and exact official tuition are not inferred. Source-year applicability is deliberately confined to2024-07-01 through2025-06-30; this is a bounded source-year consumer, not a claim those are every institution's term dates. A current2026 save can browse but cannot create a2024–25-source offer. Persisted accepted study continues according to save-world terms after source-year end.

Supported noncredit categories NONCRDT1–8 can create explicitly game-authored offers: eight two-hour sessions at least seven days apart, at least49 elapsed days, $25 per attended session, adult participation. These are design terms, not empirical duration/cost or official school policy. A request creates an application event plus a private offer artifact from the represented issuer. Accept/decline is explicit; offers expire after their issue date. Open-admission statistics never decide individual admission. Degree/grade rows remain browseable with the dependent missing-program/admission fields stated.

The source identity creates a represented Organization only after explicit request, at the current save date with authored representation provenance; `formedAt` is not asserted as the real institution's historical founding. No real person becomes a student. The institution's real past remains unknown.

Accepted terms are stored in an existing EvidenceArtifact related to the canonical acceptance event, which references the enrollment. The evidence substrate permits event/incident links; it is not weakened to admit arbitrary references. `education-study-terms.ts` resolves supported versions from that durable chain. `pathForRelationship` adds only the EDU program dispatch; existing LIFE schedule, actual attendance, fees, interruption/return, elapsed/session completion and history writers remain the engine. Unknown or malformed saved terms refuse progression rather than resolving today's provider. No new World family, source registry, clock, save store or credential ontology.

Credentials remain `EducationEnrollment` completed state, queried by `hasLifePathCredential(world,personId,programKind)`. NONCRDT1–8 map to `postsecondary:edu-path7-noncrdt1` through8. These records confer no academic degree, legal license, or equivalence to LIFE's old office/repair certificate. CAREER owner received this exact constraint.

## Integration and acceptance

UI owns LifePathsPanel registration and global roots. `docs/integration/edu-path7-ui.patch` mounts the feature inside the existing education/work panel; it does not create another navigation root. Pinned LIFE141 dependency: cb3a97ae1f8e67f99740607434d368ffcc3f3005; local merge composition1a3b2ea. LAND requested no edits to141/140 while landing; this lane changes neither donor PR. UI144 inspected dependency9f602f44e62ef04913a53515333dd03945c401f4 remains a recipient, not a merged dependency.

Diagnostic `edu-path7-proof.html` proves feature pointer/keyboard selection and save when run; it never counts as normal-player reachability. Actual normal mounting and journey remain pending UI application and proof. No human visual acceptance is claimed.

## Architecture audit and LEARN

Pure simulation/source boundary, stable IDs, append-oriented events, actor ownership, source-date limits, one canonical time and resource flow, same-save accepted terms, existing credentials and existing UI ownership are preserved. No accepted Stage6 semantics or unrelated domain changed. Source replay and corrupt/missing lock tests enforce provenance. Future source editions cannot silently change accepted terms.

LEARN: an extensible interface declaration is not an integrated provider. The regression follows a real enrollment through the existing resolver, scheduling, performance, interruption, reload and completion so a future static-catalog-only regression cannot masquerade as source integration.
