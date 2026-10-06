---
id: lw03-federal-tax-term-consequence-rows
impact: none
---

Federal income, sales, payroll, and corporate tax-term questions now carry the existing typed-tax assessment row through the `bindTaxLawTerms(world, { law, questionKey, proposalId, onDate, cutoff })` reader already consumed by the tax consequence resolver. Federal assessment behavior still requires supported legal authority and saved-record evidence; unsupported bindings remain unavailable.
