# 92P civil-service and labor substrate

Status: COMPLETE

## Scope

Build the largest safe headless first wave of `CivilServiceProfile` and
`LaborBargainingProfile` without opening Stage 7 gameplay or touching the
campaign, legislative-bargaining, executive-authority, player, presentation,
or canonical-World ownership lanes.

The corpus covers the federal baseline plus all fifty states as an identity
universe. Facts are `KNOWN` only for federal, Alaska, Minnesota, and Nebraska
where this branch independently retrieves and verifies controlling official
text. Kentucky returned unsupported PDF bytes, Nebraska's strike provision was
rate-limited, and Illinois was not reproducibly acquirable; those fields and
all remaining unsupported state fields stay `UNKNOWN` and carry no value.

## Delivered

- A Node-only `civil-service-labor` source domain with closed typed fact
  vocabularies, official-source acquisition, literal-text verification, and
  adversarial validation.
- Distinct `CivilServiceProfile` and `LaborBargainingProfile` records for the
  federal government and all fifty states.
- Digest-locked official artifacts, deterministic corpus and manifest output,
  focused tests, source-system documentation, and an architecture-integrity
  audit entry.
- No grievance simulator, score, ranking, World adapter, simulation change, or
  player-facing surface.

## Guardrails preserved

- The Drive research packet is a research map, not production evidence.
- No fact becomes `KNOWN` until a locked first-party authority contains the
  exact provision the declaration cites.
- No microscopic employee grievance state machine, personnel transaction,
  collective-bargaining simulation, CBA, staff behavior, or player UI.
- No overlap with campaign, legislative-bargaining, or executive-authority
  ownership lanes.

## Acceptance state

Leave the branch and pull request unmerged with the final marker:
`READY FOR INDEPENDENT CIVIL-SERVICE/LABOR SOURCE AUDIT`.
