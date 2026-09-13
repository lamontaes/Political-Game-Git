import { useMemo, useState } from "react";

import { fileForOffice } from "../presentation/campaign-projection";
import {
  bindingForDistrict,
  offeredDistricts,
  recordDesiredDistrict,
} from "../presentation/district-selection";
import type { EntityId, World } from "../simulation";
import { candidacyPackForJurisdiction } from "../simulation";

export interface DistrictResidencePanelProps {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
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
}: DistrictResidencePanelProps) {
  const person = world.people[personId];
  const offices = person
    ? (candidacyPackForJurisdiction(person.homeJurisdictionId)?.offices ?? [])
    : [];
  const [officeKey, setOfficeKey] = useState<string | null>(null);
  const districts = useMemo(
    () =>
      person
        ? offeredDistricts(world, person.homeJurisdictionId, officeKey)
        : [],
    [person, world, officeKey],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const identity = districts.find((row) => row.recordId === selected) ?? null;

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
      <label>
        Established office
        <select
          value={officeKey ?? ""}
          onChange={(event) => {
            setOfficeKey(event.target.value || null);
            setSelected(null);
          }}
        >
          <option value="">Choose an office</option>
          {offices.map((office) => (
            <option key={office.officeKey} value={office.officeKey}>
              {office.office.title}
            </option>
          ))}
        </select>
      </label>
      <p>
        Published Gazetteer identities only. Choosing a numbered district is not
        proof that this character's home lies in it. An interior point is not a
        boundary, and living in this state is not living in a numbered district.
      </p>
      {districts.length === 0 ? (
        <p data-testid="district-residence-empty">
          No supported district identities are published for the office offered
          here.
        </p>
      ) : (
        <>
          <label>
            District
            <select
              data-testid="district-residence-select"
              value={selected ?? ""}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">Choose a district</option>
              {districts.map((row) => (
                <option key={row.recordId} value={row.recordId}>
                  {row.sourceName ?? row.recordId}
                </option>
              ))}
            </select>
          </label>
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
        </>
      )}
      {message ? (
        <p data-testid="district-residence-message">{message}</p>
      ) : null}
    </section>
  );
}
