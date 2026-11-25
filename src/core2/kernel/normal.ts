/** Standard normal CDF (Abramowitz and Stegun 7.1.26 error function). */
export function normalCdf(x: number, one: number, two: number): number {
  const t = one / (one + 0.3275911 * (Math.abs(x) / Math.sqrt(two)));
  const poly =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
    t;
  const erf = one - poly * Math.exp((-x * x) / two);
  return (one + (x < 0 ? -erf : erf)) / two;
}
