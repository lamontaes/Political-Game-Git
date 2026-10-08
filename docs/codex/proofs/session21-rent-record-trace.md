P1 / rent consequence and provenance

The receipt in `session21-rent-record-trace.json` binds the simulation to code
head `71648944efd1af27b2c6c64535e739d3467a431a`. It uses seed
`session21-rent-record-trace-30-days`, random place `3627859`, and world
`world_1a82fdb43e2d5d17`, from January 5 through February 4, 2026.

The ordinary opening had recorded tenancies and zero lease flows. The harness
explicitly called the existing `startTownLeases` producer on those tenancies;
it authored no lease, amount, law, donor, or account. The producer's own lease
provenance uses its existing `authored` label. This is an explicit producer
trace, not proof that ordinary opening dispatch initialized the lease.

The recorded lease `resource-flow_f52be81e41b6f89e` joins tenancy
`housing-tenure_cf0dfce82ca8f79c`, dwelling `dwelling_b5bc02b90b4f119e`, and
leaseholder `person_095c5189519f6554`. Initial terms
`resource-flow-terms_1dec91245468d1c7` charge $864 monthly. Authoritative
`advanceWorld` progression produced completed February 1 rent payment
`resource-transfer-outcome_c57e6fd7747f3ea7`, transferring $864. The final
resource-position ledger names that actual outcome. The opening-to-final
balance also includes other income and expenses; it is not attributed solely
to rent. Canonical serialization/deserialization preserved the lease terms
and payment outcome exactly.

The dated inclusionary law query returned null for this actual dwelling. The
lease is market rent with no inclusionary stamp or `termResolution`. This is
the measured missing-source boundary, not affordable-lease provenance
acceptance. Rent outcomes join their terms by `resourceFlowId`; the resource
writer does not copy rent stamps directly onto outcomes. No reference or
validator was weakened.

The first harness attempt stopped at the absent opening lease. A second
attempt's manual calendar loop produced rent records but failed canonical
reload with "Future due item was skipped by authoritative time." Both failures
remain in the local logs. The final attempt used authoritative time progression
and passed; it did not discard scheduled work. No year timing or speed ratio
was measured.

The developer contract
`../contracts/session21-inclusionary-share-mapping-options.json` leaves the DC
scalar/category choice unselected. It copies the existing data row and lists
the actual evidence needed for either modeled unit-share proxy or
category-aware floor-area allocation. It changes no production classification,
amount, formula, stamp, or schedule. The numeric query still needs explicit
shared source/model classification for the existing category-average proxy;
its prose note is not parsed to create canonical provenance.
