"""Offline agency-data preparation; no simulation decisions or invented observations."""
import argparse
import collections
import csv
import datetime
import hashlib
import json
import math
import pathlib
import re
import urllib.request


BLS_SERIES = {
    "LNS14000000": "unemploymentPct",
    "CUSR0000SA0": "priceIndex",
    "CES0000000001": "payrollJobsThousands",
}
BLS_ENDPOINT = "https://api.bls.gov/publicAPI/v2/timeseries/data/"


def finite(value):
    result = float(value)
    if not math.isfinite(result):
        raise ValueError("Observation is not finite")
    return result


def month_number(month):
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", month):
        raise ValueError("Expected a real calendar month, YYYY-MM")
    year, part = map(int, month.split("-"))
    if year < 1:
        raise ValueError("Invalid calendar year")
    return year * 12 + part - 1


def bls_rows(payload):
    if payload.get("status") != "REQUEST_SUCCEEDED" or payload.get("message"):
        raise ValueError("BLS rejected or qualified the request: " + str(payload.get("message")))
    results = payload["Results"]
    if isinstance(results, list):
        series = [s for result in results for s in result["series"]]
    else:
        series = results["series"]
    seen = set()
    rows = []
    for series_row in series:
        series_id = series_row["seriesID"]
        if series_id not in BLS_SERIES:
            raise ValueError("Unexpected BLS series")
        for point in series_row["data"]:
            if point["period"] == "M13":
                continue  # An annual average is never a monthly observation.
            if not re.fullmatch(r"M(0[1-9]|1[0-2])", point["period"]):
                raise ValueError("Unexpected BLS period")
            month = str(point["year"]) + "-" + point["period"][1:]
            month_number(month)
            key = (series_id, month)
            if key in seen:
                raise ValueError("Duplicate observation")
            seen.add(key)
            rows.append({
                "seriesId": series_id, "measure": BLS_SERIES[series_id],
                "month": month, "value": finite(point["value"]),
                "footnotes": point.get("footnotes", []), "status": "SOURCED",
            })
    return sorted(rows, key=lambda row: (row["seriesId"], row["month"]))


def acquire_bls(output, first_year, last_year):
    """Uses inherited proxy and TLS trust; does not change network policy."""
    if first_year < 1 or last_year < first_year:
        raise ValueError("Invalid year interval")
    output.mkdir(parents=True, exist_ok=True)
    all_rows = []
    receipts = []
    for start in range(first_year, last_year + 1, 10):
        end = min(start + 9, last_year)
        body = json.dumps({"seriesid": list(BLS_SERIES), "startyear": str(start),
                           "endyear": str(end)}).encode()
        request = urllib.request.Request(BLS_ENDPOINT, data=body,
                                         headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(request, timeout=45) as response:
            raw = response.read()
        rows = bls_rows(json.loads(raw))
        if {r["seriesId"] for r in rows} != set(BLS_SERIES):
            raise ValueError("BLS response omitted a required series")
        path = output / f"bls-{start}-{end}.json"
        if path.exists() and path.read_bytes() != raw:
            raise ValueError("Refusing to overwrite a different raw vintage")
        path.write_bytes(raw)
        receipts.append({"file": path.name, "url": BLS_ENDPOINT,
                         "request": json.loads(body), "sha256": hashlib.sha256(raw).hexdigest(),
                         "retrievedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                         "terms": "https://www.bls.gov/opub/copyright-information.htm"})
        all_rows.extend(rows)
    keys = [(r["seriesId"], r["month"]) for r in all_rows]
    if len(keys) != len(set(keys)):
        raise ValueError("Overlapping BLS vintages")
    return {"observations": all_rows, "receipts": receipts}


def hmda_annual_rates(rows):
    """Origination-weighted means, by annual cohort/type/term. Never infer dates."""
    groups = {}
    excluded = collections.Counter()
    for row in rows:
        filters = {"action_taken": "1", "lien_status": "1", "loan_purpose": "1",
                   "occupancy_type": "1", "reverse_mortgage": "2",
                   "open-end_line_of_credit": "2", "business_or_commercial_purpose": "2"}
        if any(str(row.get(key, "")).strip() != expected for key, expected in filters.items()):
            excluded["outside-purchase-first-lien-owner-occupied-cohort"] += 1
            continue
        try:
            rate = finite(row["interest_rate"])
            year = int(row["activity_year"])
            term = finite(row["loan_term"])
            units = finite(row["total_units"])
            loan_type = str(row["loan_type"]).strip()
            if rate == 1111 or rate < 0 or year < 2018 or term <= 0 or not 1 <= units <= 4:
                raise ValueError("Undisclosed or ineligible observation")
            if loan_type not in ("1", "2", "3", "4"):
                raise ValueError("Undisclosed loan type")
        except (KeyError, ValueError, TypeError):
            excluded["missing-exempt-or-invalid-fields"] += 1
            continue
        # NA is a fixed-rate loan; Exempt/1111/absent does not establish fixed rates.
        intro = str(row.get("intro_rate_period", "")).strip()
        if intro != "NA":
            excluded["not-established-fixed-rate"] += 1
            continue
        key = (year, loan_type, term)
        group = groups.setdefault(key, {"count": 0, "sum": 0.0})
        group["count"] += 1
        group["sum"] += rate
    observations = [
        {"year": year, "loanType": loan_type, "termMonths": term,
         "originations": group["count"], "meanNoteRatePct": group["sum"] / group["count"],
         "frequency": "annual", "status": "SOURCED"}
        for (year, loan_type, term), group in sorted(groups.items())
    ]
    return {"observations": observations, "excluded": dict(excluded)}


def monthly_index(rows):
    index = {}
    for row in rows:
        month = month_number(row["month"])
        if month in index:
            raise ValueError("Duplicate month")
        index[month] = {key: finite(value) for key, value in row.items() if key != "month"}
    return index


def percentile(values, fraction):
    if not values or not 0 <= fraction <= 1:
        raise ValueError("Empty or invalid percentile")
    ordered = sorted(map(finite, values))
    rank = (len(ordered) - 1) * fraction  # Linear interpolation, quantile type 7.
    left = math.floor(rank)
    right = math.ceil(rank)
    return ordered[left] + (ordered[right] - ordered[left]) * (rank - left)


def change(value, earlier, percentage):
    if percentage:
        if earlier <= 0 or value <= 0:
            raise ValueError("Index levels must be positive")
        return (value / earlier - 1) * 100
    return value - earlier


def historical_bands(rows, start_month="1990-01"):
    index = monthly_index(rows)
    result = {}
    for field, percentage in [("unemploymentPct", False), ("priceIndex", True),
                              ("payrollJobsThousands", True)]:
        annual, single = [], []
        for month, row in sorted(index.items()):
            if month < month_number(start_month) or field not in row:
                continue
            for lag, target in [(12, annual), (1, single)]:
                if field in index.get(month - lag, {}):
                    target.append(change(row[field], index[month - lag][field], percentage))
        if not annual or not single:
            raise ValueError("Insufficient observed history for " + field)
        result[field] = {"p05": percentile(annual, 0.05), "p95": percentile(annual, 0.95),
                         "sampleCount": len(annual), "maxOneMonthMove": max(map(abs, single)),
                         "units": "percent" if percentage else "percentage-points"}
    return result


def passthrough(rows, first_month, last_month):
    """Descriptive regression: monthly policy move vs mortgage change through t+12.

    Bartlett/Newey-West covariance uses real calendar distances (12-month horizon).
    This is an association, not an identified causal monetary-policy effect.
    """
    index = monthly_index(rows)
    sample = []
    for month in range(month_number(first_month), month_number(last_month) + 1):
        now, before, after = index.get(month, {}), index.get(month - 1, {}), index.get(month + 12, {})
        if ("policyRatePct" in now and "policyRatePct" in before and
                "mortgage30Pct" in before and "mortgage30Pct" in after):
            sample.append((month, now["policyRatePct"] - before["policyRatePct"],
                           after["mortgage30Pct"] - before["mortgage30Pct"]))
    n = len(sample)
    if n < 3:
        raise ValueError("Insufficient observed monthly pairs; annual HMDA cannot fill them")
    xbar = sum(x for _, x, _ in sample) / n
    ybar = sum(y for _, _, y in sample) / n
    sxx = sum((x - xbar) ** 2 for _, x, _ in sample)
    if sxx == 0:
        raise ValueError("No policy variation; coefficient is unidentified")
    slope = sum((x - xbar) * (y - ybar) for _, x, y in sample) / sxx
    intercept = ybar - slope * xbar
    scores = {month: (x - xbar) * (y - intercept - slope * x) for month, x, y in sample}
    meat = sum(value ** 2 for value in scores.values())
    for lag in range(1, 13):
        meat += 2 * (1 - lag / 13) * sum(value * scores.get(month - lag, 0)
                                        for month, value in scores.items())
    variance = meat / (sxx ** 2) * n / (n - 2)
    if variance < -1e-12:
        raise ValueError("Negative covariance estimate")
    return {"coefficient": slope, "intercept": intercept,
            "standardErrorHAC12": math.sqrt(max(0, variance)), "sampleCount": n,
            "units": "mortgage-percentage-points per policy-percentage-point",
            "interpretation": "descriptive association, not a causal policy estimate"}


def output_band(rows, first_quarter="1990-Q1"):
    def quarter_number(quarter):
        if not re.fullmatch(r"\d{4}-Q[1-4]", quarter):
            raise ValueError("Expected YYYY-Q1 through YYYY-Q4")
        year, part = quarter.split("-Q")
        return int(year) * 4 + int(part) - 1
    index = {}
    for row in rows:
        quarter = quarter_number(row["quarter"])
        if quarter in index:
            raise ValueError("Duplicate output quarter")
        level = finite(row["realOutput"])
        if level <= 0:
            raise ValueError("Real output must be positive")
        index[quarter] = level
    growth = [((level / index[quarter - 1]) ** 4 - 1) * 100
              for quarter, level in sorted(index.items())
              if quarter >= quarter_number(first_quarter) and quarter - 1 in index]
    return {"p05": percentile(growth, 0.05), "p95": percentile(growth, 0.95),
            "sampleCount": len(growth), "units": "annualized-percent"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=["bls", "hmda", "bands", "output-band", "passthrough"])
    parser.add_argument("--input", type=pathlib.Path)
    parser.add_argument("--output", required=True, type=pathlib.Path)
    parser.add_argument("--first-year", type=int, default=1989)
    parser.add_argument("--last-year", type=int, default=datetime.date.today().year)
    parser.add_argument("--first-month")
    parser.add_argument("--last-month")
    args = parser.parse_args()
    if args.output.exists():
        parser.error("Output already exists; retain previous vintages")
    if args.operation == "bls":
        result = acquire_bls(args.output.parent / "raw", args.first_year, args.last_year)
    elif args.input is None:
        parser.error("--input is required for offline preparation")
    elif args.operation == "hmda":
        with args.input.open(newline="", encoding="utf-8-sig") as stream:
            result = hmda_annual_rates(csv.DictReader(stream))
        with args.input.open("rb") as stream:
            result["inputSha256"] = hashlib.file_digest(stream, "sha256").hexdigest()
    else:
        rows = json.loads(args.input.read_text())
        if args.operation == "bands":
            result = historical_bands(rows)
        elif args.operation == "output-band":
            result = output_band(rows)
        elif args.first_month is None or args.last_month is None:
            parser.error("--first-month and --last-month are required")
        else:
            result = passthrough(rows, args.first_month, args.last_month)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n")


if __name__ == "__main__":
    main()
