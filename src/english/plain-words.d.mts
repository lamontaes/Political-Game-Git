export declare const MONTH_NAMES: readonly string[];
export declare function dateWords(
  iso: string,
  options?: {
    weekday?: boolean;
    month?: "long" | "short";
    year?: boolean | string;
  },
): string;
export declare function fullNameOf(person: {
  givenName: string;
  familyName: string;
}): string;
export declare function capitalFirst(text: string): string;
export declare function possessive(name: string): string;
export declare function listWords(
  items: readonly string[],
  conjunction?: string,
): string;
export declare function monthWords(iso: string): string;
export declare function timeWords(minuteOfDay: number): string;
export declare function moneyWords(
  minor: number,
  options?: { rounded?: boolean },
): string;
