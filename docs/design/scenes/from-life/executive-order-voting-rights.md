# Episode: the governor signs an order, and someone it reaches is in the room

Scenes from life (`scenes-from-life`), owner's Oct 27 executive brief ("signing... with the sponsor in the room", executive at every level). Calibration only: no real person's name or words ship, and none are in the packet. A researcher's packet for the director engineer (CTO change of role, Oct 27). The director's build item is `scene-executive-order-signed`.

## Sources

- Reason, December 13, 2019, read in full: a new governor signed an executive order days after taking office restoring the vote to about 140,000 people who had completed sentences for nonviolent felonies in the state, and said he would also ask the legislature to change the law. His father had signed a similar order before leaving office in 2015, and the next governor overturned it, saying a blanket order without a change in the law went beyond a governor's power. The article warns that a future governor could revoke this one as quickly.
- UPI and CNN, December 12, 2019 (search summaries; pages not opened in full): the order excluded treason, election bribery and many violent offenses, federal and out-of-state convictions and people with pending charges; it fulfilled a campaign promise; the signing was at a ceremony, where a voting-rights supporter from Louisville shook the governor's hand.
- Iowa (as the Reason article reports it): a successor reversed a predecessor's restoration order. The same pattern, three times.

## Packet

1. A governor promised it in the campaign. Days after taking office they sign the order.
2. A supporter, someone the order reaches, is in the room and shakes the governor's hand.
3. The order is plain about who it covers and who it leaves out: the sentence finished, nothing pending, no violent crime.
4. The governor says the order is the first step and asks the legislature to write it into law.
5. The risk everyone names is the next governor: the order lasts as long as the governor does.
6. What changes: tens of thousands of people can register and vote, a line in the paper, and a promise to the legislature.

## Does the engine fire it?

Asked in played worlds (`buildBenchWorld`, two-level), governors' years in Hindman, Kentucky and others, and the voting-standing counts in four drawn towns:

- **Exists:** the order itself. `issueOrder` enacts a state law row from tomorrow (`order:<state>:restore-voting-after-sentence:<date>`), citing the governor, and a later governor's order with `revoke: true` ends it. In Hindman a governor issued it on January 22, 2025, in the first week of the year.
- **Exists:** the act's record. The governor's state office day writes `office-act` naming the governor (entry `executive-order`, subject `restore-voting-after-sentence`, whether it was the governor's own choice). Nothing reads it for a scene.
- **Exists:** what it does. `barredFromVoting` (a conviction on record plus an unfinished sentence, or no restoration law in force) and `felonyDisenfranchisedShare` (the state's share of adults the report counts, less the part the restoration returns to the rolls) both read the law row.
- **Does not exist as named people:** the person it reaches. In four drawn towns (Afton, Wyoming; Lancaster, New Hampshire; Inglenook, Connecticut; Reform, Alabama) none of about 1,700 to 2,100 full people is barred from voting, because convictions come only from played cases. Those it reaches are the counted adults. The scene's guest is therefore a resident filled in from the counted pool (`fillInPerson`), matching the state's share, as the two-level population rule has it.
- **Does not exist:** the supporter or group that would be in the room.
- **Does not exist:** what happens to the order's reach when the next governor revokes it, as a scene (the revoke exists; no cause for a scene).

## Same producer, two other lives

- The 2015 order and its reversal: a revoke with the first governor's supporter in the room is the mirror, `revoke: true` as the cause.
- Iowa's reversal: the same cast with a closed door as the ending.

## Gaps

Cast (the filled-in resident), place (the governor's office or a ceremony room) and lines can be written now. The build item names `fillInPerson` for the guest.
