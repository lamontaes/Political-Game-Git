export interface ShippingPolicy {
  names: string[];
  federalNames: string[];
  federalNameAllowedIn: RegExp;
  captures: { path: string; sha256: string }[];
  forbiddenText: string[];
}
export interface ShippingFile {
  file: string;
  bytes: number;
  sha256: string;
  failures: string[];
}
export interface ShippingScan {
  schema: string;
  directory: string;
  namesChecked: number;
  researchDigestsChecked: number;
  filesChecked: number;
  bytesChecked: number;
  violations: ShippingFile[];
  inventory: ShippingFile[];
}
export function shippingPolicy(root?: string): ShippingPolicy;
export function inspectShippingBytes(
  bytes: Buffer,
  policy: ShippingPolicy,
  file?: string,
): string[];
export function scanShippingDirectory(
  directory: string,
  policy: ShippingPolicy,
): ShippingScan;
