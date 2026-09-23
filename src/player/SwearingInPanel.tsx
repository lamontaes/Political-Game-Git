import { useState } from "react";

import type { EntityId, OathForm, OathSwornOn, World } from "../simulation";
import type { SwearingInView } from "../presentation/office-transition";
import {
  oathWordsForHeldOffice,
  takeOathForHeldOffice,
} from "../presentation/office-transition";
import { proseDate } from "../presentation/prose-dates";

export interface SwearingInPanelProps {
  readonly world: World;
  readonly personId: EntityId;
  readonly swearingIn: SwearingInView;
  readonly onWorldChange: (world: World) => void;
}

function lowerFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function swornSentence(swearingIn: SwearingInView) {
  const verb = swearingIn.form === "affirm" ? "affirmed" : "swore";
  if (!swearingIn.swornOn || !swearingIn.form)
    return `You raised your right hand and took the oath of office as ${swearingIn.officeTitle}.`;
  if (swearingIn.swornOn.key === "nothing")
    return `You raised your right hand and ${verb} the oath of office as ${swearingIn.officeTitle}.`;
  return `With your hand on ${lowerFirst(swearingIn.swornOn.label)}, you raised your right hand and ${verb} the oath of office as ${swearingIn.officeTitle}.`;
}

/**
 * The first days of the term: choose what to swear on, then repeat the oath
 * after the officiant one phrase at a time. Nothing is recorded until the last
 * phrase is spoken; then the oath is a public event, taken once.
 */
export function SwearingInPanel({
  world,
  personId,
  swearingIn,
  onWorldChange,
}: SwearingInPanelProps) {
  const [swornOn, setSwornOn] = useState<OathSwornOn | null>(null);
  const [form, setForm] = useState<OathForm>("swear");
  const [words, setWords] = useState<readonly string[] | null>(null);
  const [spoken, setSpoken] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (swearingIn.swornInOn)
    return (
      <div data-testid="swearing-in">
        <p className="game-note" data-testid="swearing-in-done">
          {swornSentence(swearingIn)}
        </p>
      </div>
    );

  const next = words ? words[spoken] : undefined;
  return (
    <div data-testid="swearing-in">
      <p className="game-note">
        Your term as {swearingIn.officeTitle} began{" "}
        {proseDate(swearingIn.startedOn)}. {swearingIn.ceremony}
      </p>
      {words ? (
        <>
          <p className="game-note">
            &ldquo;Raise your right hand and repeat after me.&rdquo;
          </p>
          {spoken > 0 ? (
            <blockquote data-testid="swearing-in-spoken">
              {words.slice(0, spoken).join(" ")}
            </blockquote>
          ) : null}
          {next ? (
            <button
              type="button"
              data-testid="swearing-in-repeat"
              onClick={() => {
                if (!swornOn) return;
                if (spoken + 1 < words.length) {
                  setSpoken(spoken + 1);
                  return;
                }
                try {
                  onWorldChange(
                    takeOathForHeldOffice(world, personId, {
                      swornOn,
                      form,
                    }),
                  );
                  setError(null);
                } catch (caught) {
                  setError(
                    caught instanceof Error ? caught.message : "Refused.",
                  );
                }
              }}
            >
              &ldquo;{next}&rdquo;
            </button>
          ) : null}
        </>
      ) : (
        <>
          <fieldset
            className="office-onboarding-fieldset"
            data-testid="swearing-in-sworn-on"
          >
            <legend>What will you place your hand on?</legend>
            {swearingIn.swornOnOptions.map((option) => (
              <label key={option.key} className="office-onboarding-choice">
                <input
                  type="radio"
                  name="swearing-in-sworn-on"
                  value={option.key}
                  checked={swornOn === option.key}
                  onChange={() => setSwornOn(option.key)}
                />
                <span>
                  <strong>{option.label}</strong>
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset
            className="office-onboarding-fieldset"
            data-testid="swearing-in-form"
          >
            <legend>Swear or affirm?</legend>
            <label className="office-onboarding-choice">
              <input
                type="radio"
                name="swearing-in-form"
                value="swear"
                checked={form === "swear"}
                onChange={() => setForm("swear")}
              />
              <span>
                <strong>Swear, ending &ldquo;So help me God&rdquo;</strong>
              </span>
            </label>
            <label className="office-onboarding-choice">
              <input
                type="radio"
                name="swearing-in-form"
                value="affirm"
                checked={form === "affirm"}
                onChange={() => setForm("affirm")}
              />
              <span>
                <strong>Affirm, without an appeal to God</strong>
              </span>
            </label>
          </fieldset>
          <button
            type="button"
            data-testid="swearing-in-take-oath"
            disabled={!swornOn}
            onClick={() => {
              try {
                setWords(oathWordsForHeldOffice(world, personId, form));
                setSpoken(0);
                setError(null);
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Refused.");
              }
            }}
          >
            Take the oath
          </button>
        </>
      )}
      {error ? (
        <p className="game-note" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
