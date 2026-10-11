import { addDays, type IsoDate } from "../elections/calendar";
export function statehoodAdmittedOn(
  tookEffect: IsoDate | null,
  admissionDays: number,
  onDate: IsoDate,
  asOf: IsoDate = onDate,
): IsoDate | null {
  if (!tookEffect) return null;
  const admitted = addDays(tookEffect, admissionDays);
  return admitted <= asOf ? admitted : null;
}

export function statehoodAdmissionDays(
  stages: readonly { readonly days: number }[],
): number {
  return stages.reduce((total, stage) => total + stage.days, 0);
}
