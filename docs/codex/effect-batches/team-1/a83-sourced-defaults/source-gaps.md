# A83 / #1709 effective-date source gaps

Prepared October 2, 2026. Read-only evidence payload for T3 integration; no shared source, JSON, tests, or publication changed. This is not proof of sourced default dates for all 50 states.

## Kansas: verified official trigger, missing publication producer

Official texts retrieved October 2, 2026:

- Kansas Office of Revisor of Statutes, [K.S.A. 45-310(a)](https://www.ksrevisor.gov/statutes/chapters/ch45/045_003_0010.html).
- Kansas Office of Revisor of Statutes, [K.S.A. 45-311](https://www.ksrevisor.gov/statutes/chapters/ch45/045_003_0011.html).

Section 45-310(a) states:

```text
All acts passed at each session of the legislature shall be published in one or more volumes, under the direction of the secretary of state, as soon as practicable after the close of the session at which the same are passed. Such acts shall take effect and be in force from and after such publication, unless otherwise specifically provided in such act.
```

It also states:

```text
Whenever any bill or act of the legislature shall provide that the same shall be effective from and after its publication in the statute book, the words "publication in the statute book" mean the date of publication of the session laws of Kansas specified in the certificate provided for by K.S.A. 45-311.
```

And:

```text
Nothing contained in this act shall be construed to require the same date of publication for separate volumes of the session laws of Kansas when more than one volume is published for a single legislative session.
```

Section 45-311 states:

```text
The secretary of state shall prefix to each printed volume of the laws his certificate that the acts and resolutions therein contained are truly copied from the original enrolled acts and other official documents of the legislature, and specifying the date of the publication of such volume.
```

The date condition is:

```text
The date of publication so specified shall not be sooner than the date that at least a limited number of the volume are in the office of the secretary of state and shall be July 1 if a limited number of the volume are in the office of the secretary of state on or before July 1, unless an earlier date for any volume is directed by concurrent resolution of the legislature.
```

The statute further distinguishes publication from distribution:

```text
The date so specified need not be the same as the date when such volume is first actually distributed. The certificates mentioned in this act shall be evidence of the facts contained therein.
```

Safely integrable evidence: ordinary statutory default is certified session-law publication, with an explicit act provision taking precedence. July 1 is conditional, and separate volumes can have distinct dates. The existing 91-day-after-session-end row is an estimate, not this verified legal trigger.

Missing executable contract: identify the act's session-law volume and read the secretary's certified publication date; preserve any explicit operative clause and relevant concurrent resolution. No such date or volume certificate was acquired in this research pass. Do not replace the estimate with unconditional July 1, approval date, adjournment date, or another fixed interval. The existing `StatuteDateContext` exposes final passage and session ends, not certified publication.

## Alabama: existing limited evidence, ordinary default unresolved

Existing held data: `data/research/laws/starting-law-2026.json:18–26`. It records an estimated 91-day-after-session-end rule, cites Ala. Code § 1-1-8 through Justia, and notes:

```text
Read but not dated: No default found for ordinary acts; Alabama acts name their own date. Penal acts take effect 60 days after approval.
```

This is a quotation of the repository's prior evidence note, not a newly verified statutory quotation. It does not establish an ordinary-act default, and the reported penal-act exception cannot be applied to a general-policy act without its actual statutory classification.

Retrieval limits: official legacy Code of Alabama URLs redirected to the legislature homepage; the alternate official code host was blocked. A targeted official PDF alternative returned 404. The Justia route returned 403. No new official § 1-1-8 text was obtained.

Safely integrable evidence: retain the existing estimate disclosure and distinguish prior penal-act evidence from unresolved ordinary-act applicability. Do not remove the estimated marker on the basis of this pass.

Missing contract: accessible official text establishing scope, default and exceptions; an actual act's operative clause; and, for any verified penal default, the act's legal classification and legally relevant approval date. Do not infer classification from a policy label or prose title.

## Hawaii: publication evidence note, dated trigger unresolved

Existing held data: `data/research/laws/starting-law-2026.json:139–147`. It records an estimated 91-day-after-session-end rule, cites [HRS § 1-2](https://www.capitol.hawaii.gov/hrscurrent/Vol01_Ch0001-0042F/HRS0001/HRS_0001-0002.htm), and notes:

```text
Read but not dated: Laws bind once printed and published; no number of days is set.
```

This is a quotation of the repository's prior evidence note, not a newly verified statutory quotation. Official current and archive HTML, and targeted PDF/case alternatives, returned 403; an LRB PDF alternative returned 404. No new official § 1-2 text or statutory exception was verified.

Safely integrable evidence: preserve the distinction between a reported printing/publication trigger and an estimated calendar interval. Do not equate publication with approval or convert the note into an exact date.

Missing contract: accessible official text and exceptions; the legally required printing/publication event and its actual date; and any explicit act clause. Existing passage/adjournment callbacks alone do not supply this evidence.

## Shared producer boundary

The current state date reader can consume passage and adjournment records. Neither callback supplies publication or an unknown operative clause. Preserve explicit saved act dates and versioned game profiles. Research evidence can be integrated independently of an executable rule: a verified trigger without its dated producer is not a sourced operative date.

No all-50-source claim is supported by this packet. T3 owns changes to the held JSON and its evidence/provenance representation; the parent owns code integration and publication.
