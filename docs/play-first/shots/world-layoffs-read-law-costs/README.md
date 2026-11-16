# The month's full bill for one business, in dev mode

`month-bill-1440x900.png`: a fresh life at Rockport, Washington, seed `aaab56f9-afda-4b84-8570-144a48857bc0`, dev mode on, one Calendar run to 2025-02-01. Dev mode's Trace for Duncan's business (`organization_0ddc4745b2bac82d`) shows its Why panel "Books behind", ending with the month's books (`business-trading:organization_0ddc4745b2bac82d:2025-02-01`): sales, the costs weighed and staff, then each charge by name. The charges are wages, supplies bought in town, costs paid outside the town, the employer's payroll taxes (four laws) and energy price laws (two laws). Each one says whether hiring, layoffs and closing weigh it.

Premises tax is paid quarterly and profit tax at the year's end, so neither appears in a first month. The test `src/core2/business-charges.test.ts` covers both.

The trace box was opened on the business by script after the Calendar run (the employer found through a worker's job record), not by a chain of clicks. The panel is the one dev mode's Trace shows for any business id. The text was set light on a dark panel for the picture.
