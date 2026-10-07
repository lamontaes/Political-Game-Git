---
id: council-agendas-reuse-recorded-history-lookups
impact: patch
section: Fixed
title: Council agendas reuse recorded history lookups
---

Council agendas reuse the existing history indexes when reading their own
measures, rejection votes and pending enactments. The lookups keep record order,
the supplied council snapshot, cooldowns and operative dates. Legislative timing,
member choices and legal session gates retain their existing rules.
