---
id: common-town-compensation
impact: patch
section: Fixed
title: Town pay and earned shifts use one compensation writer
---

Routes town paydays, weekly recorded pay, and completed shifts through the same
period writer. Existing earned terms, minimum wage and teacher-floor readers,
leave claims, and payroll taxes remain tied to the recorded period. Tracked
employer funds limit the transfer. Repeated settlement and Save/Continue do not
post a second paycheck. Owner draws remain outside employee payroll taxation.

Uses the common recurring-income reader's exact cadence tokens. Nested clock
transitions retain their final integrity check; changed standalone batches are
validated, while unchanged settlement keeps World identity. Delegated-assignment
pay and broader labor behavior follow separately.
