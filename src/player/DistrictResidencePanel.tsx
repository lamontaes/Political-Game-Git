import { useEffect, useMemo, useState } from "react";

import { fileForOffice } from "../presentation/campaign-projection";
import {
  bindingForDistrict,
  offeredDistricts,
  recordDesiredDistrict,
  recordedDistrictForOffice,
} from "../presentation/district-selection";
import type { DistrictSeatBinding, EntityId, World } from "../simulation";
import { candidacyPackForJurisdiction } from "../simulation";
import { GameSelect } from "./controls/GameSelect";

export interface DistrictResidencePanelProps {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
  /**
   * The office the host has already chosen. When present the panel drops its
   * own office selector rather than offering a second, disagreeing answer to a
   * question the host has settled.
   */
  readonly officeKey?: string | null;
  /**
   * Told which district the player has named, so a host that owns the filing
   * button can file for that seat. When present the panel does not file
   * itself; one screen keeps one way to put a name in.
   */
  readonly onBindingChange?: (binding: DistrictSeatBinding | null) => void;
}

/**
 * Feature-local district identity selection. Interior points are not shown as
 * membership. Choosing a district is not proving a home in that district. A
 * wires this beside the existing campaign workspace.
 */
export function DistrictResidencePanel({
  world,
  personId,
  onWorldChange,
  officeKey: hostOfficeKey,
  onBindingChange,
}: DistrictResidencePanelProps) {
  const person = world.people[personId];
  const offices = person
    ? (candidacyPackForJurisdiction(person.homeJurisdictionId)?.offices ?? [])
    : [];
  const hostOwnsOffice = hostOfficeKey !== undefined;
  const [ownOfficeKey, setOwnOfficeKey] = useState<string | null>(null);
  const officeKey = hostOwnsOffice ? (hostOfficeKey ?? null) : ownOfficeKey;
  const districts = useMemo(
    () =>
      person
        ? offeredDistricts(world, person.homeJurisdictionId, officeKey)
        : [],
    [person, world, officeKey],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // The district the world already wrote down for this chamber. Offering it
  // first is not a guess: a filing for any other district on the list would be
  // refused, because living in this state is not living in that district.
  const recorded = useMemo(
    () => recordedDistrictForOffice(world, personId, officeKey),
    [world, personId, officeKey],
  );
  const chosen = selected ?? recorded?.binding.recordId ?? null;
  const identity = districts.find((row) => row.recordId === chosen) ?? null;

  // Told once per district, keyed on the record rather than the object, so a
  // re-rendered list does not re-announce the same seat.
  const chosenRecordId = identity?.recordId ?? null;
  useEffect(() => {
    if (!onBindingChange) return;
    const row = districts.find((entry) => entry.recordId === chosenRecordId);
    onBindingChange(row ? bindingForDistrict(row) : null);
  }, [onBindingChange, districts, chosenRecordId]);

  /** One place where a named district becomes the panel's answer. */
  function choose(recordId: string | null) {
    setSelected(recordId);
  }

  function run(work: () => World) {
    try {
      onWorldChange(work());
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  if (!person) {
    return (
      <section data-testid="district-residence-panel">
        <p>This character is not in the world.</p>
      </section>
    );
  }

  return (
    <section data-testid="district-residence-panel">
      <h2>District seat</h2>
      {hostOwnsOffice ? null : (
        <label>
          Established office
          <GameSelect
            value={officeKey ?? ""}
            onChange={(event) => {
              setOwnOfficeKey(event.target.value || null);
              choose(null);
            }}
          >
            <option value="">Choose an office</option>
            {offices.map((office) => (
              <option key={office.officeKey} value={office.officeKey}>
                {office.office.title}
              </option>
            ))}
          </GameSelect>
        </label>
      )}
      <p>Choosing a district does not move you into it.</p>
      {districts.length === 0 ? (
        <p data-testid="district-residence-empty">
          No supported district identities are published for the office offered
          here.
        </p>
      ) : (
        <>
          <label>
            District
            <GameSelect
              data-testid="district-residence-select"
              value={chosen ?? ""}
              onChange={(event) => choose(event.target.value || null)}
            >
              <option value="">Choose a district</option>
              {districts.map((row) => (
                <option key={row.recordId} value={row.recordId}>
                  {row.sourceName ?? row.recordId}
                </option>
              ))}
            </GameSelect>
          </label>
          {recorded ? (
            <p data-testid="district-residence-recorded">
              The world has recorded this character living in this chamber's
              district since {recorded.startedOn}. Filing for any other district
              on this list would be refused.
            </p>
          ) : (
            <p data-testid="district-residence-unrecorded">
              The world has not recorded which of these districts this character
              lives in, so naming one here will not prove it.
            </p>
          )}
          <button
            type="button"
            data-testid="district-residence-select-intent"
            disabled={!identity}
            onClick={() => {
              if (!identity) return;
              run(() =>
                recordDesiredDistrict(
                  world,
                  personId,
                  bindingForDistrict(identity),
                ),
              );
            }}
          >
            Choose this district as the seat to file for
          </button>
          {onBindingChange ? null : (
            <button
              type="button"
              data-testid="district-residence-file"
              disabled={!identity}
              onClick={() => {
                if (!identity) return;
                run(() =>
                  fileForOffice(
                    world,
                    personId,
                    bindingForDistrict(identity),
                    officeKey,
                  ),
                );
              }}
            >
              File for this district
            </button>
          )}
        </>
      )}
      {message ? (
        <p data-testid="district-residence-message">{message}</p>
      ) : null}
    </section>
  );
}
