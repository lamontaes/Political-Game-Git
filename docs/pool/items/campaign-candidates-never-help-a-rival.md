---
id: campaign-candidates-never-help-a-rival
title: "A candidate never volunteers for, hosts a donor meeting for, or endorses a rival in their own race"
area: elections
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: governing lead, Oct 30 (review of the played-year proof: Moundridge, Kansas)
lead: governing
---

**What.** In a played year in Moundridge, Kansas (2048800, seed 4fb6157c0a5dc06c), one resident who filed for the player's own council seat also walked doors as the player's volunteer, after their party chapter endorsed the player, and hosted one of the player's donor meetings. askToVolunteer and volunteerReason (src/core2/modules/campaigns.ts about 1667-1725) and canJoinDonorMeeting and donorMeetingHost (about 3243-3311) never ask whether the person is running in the same contest, and both count family, so a relative in the candidate's household who files for the same seat works for their opponent. A person running for a seat campaigns for themselves, not for a rival.

**Rules.** One engine: the check is one reader of the contest's filings (a person with an active filing in the contest), used by volunteering, donor-meeting hosting and attending, and a person's own endorsement. No dice: it is a fact of the record, not a lean. Wire to the world: world candidates and the player are held to the same rule.

**Done when.** A test in a drawn place with the seed printed files two residents for one contest and shows that neither is enlisted as the other's volunteer, chosen as the other's donor-meeting host or attendee, or gives the other an endorsement, by filing id, while a resident not running is enlisted by the same call; src/core2/campaigns.test.ts and src/core2/donor-meeting.test.ts pass.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-rival-help.test.ts

**Notes.** TODO
