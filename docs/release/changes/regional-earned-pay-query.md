---
id: regional-earned-pay-query
impact: patch
section: Fixed
title: Earned pay queries use the recorded workplace region
---

Final enacted pay terms and earned-pay authority validation use the workplace
recorded at the earned cutoff. An unbound workplace does not acquire a home or
default region. Existing authority, payer and amount checks remain intact.
