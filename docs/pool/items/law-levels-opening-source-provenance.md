---
id: law-levels-opening-source-provenance
title: "Opening law rows retain the statute cited by each jurisdiction"
area: laws
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: astra/opening-law-sources
pr: #7350
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-08T01:28:53.697Z
---

**What.** openLaws uses the question-level entry.source for every jurisdiction, dropping the answer-specific source string. Its parallel federal row also drops lawTerms. Preserve each researched jurisdiction source and federal legal terms in the one opening-law loader so the law paper and authority proof can identify the actual statute.

**Rules.** One law system; preserve recorded primary sources verbatim, without inventing citations or changing substantive starting answers or preemption.

**Done when.** A generated-world test checks every loaded opening policy row against its jurisdiction answer source, cite and lawTerms, prints place and replay, and fails on the old loader. Ten fresh draws and a new game pass.

**Files.** src/core2/modules/laws.ts,src/core2/policy-answers.ts,src/core2/opening-law-source-provenance.test.ts

**Notes.** Astra Nov 8 inspected openLaws in modules/laws.ts: both source assignments choose entry.source, and the parallel mandate terms include cite only. The underlying starting-law answer objects contain their own source strings. This is provenance preservation, not a certification that every stored source is a current primary statute. No implementation yet.
