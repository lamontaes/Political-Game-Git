---
id: election-night-adds-up
impact: patch
section: Fixed
title: Election night adds up
---

The shares on an election result were each rounded on their own, so a
two-way race could print 72.0% and 28.1% and leave you adding up to 100.1.
Nothing was wrong with the count; the table now totals what it should.
