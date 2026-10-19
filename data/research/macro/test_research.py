import unittest
import research


def calendar_month(index):
    return f"{2000 + index // 12:04d}-{index % 12 + 1:02d}"


class AgencyPreparationTests(unittest.TestCase):
    def test_bls_annual_average_is_excluded_and_footnotes_survive(self):
        payload = {"status": "REQUEST_SUCCEEDED", "Results": {"series": [{
            "seriesID": "LNS14000000", "data": [
                {"year": "1990", "period": "M13", "value": "999"},
                {"year": "1990", "period": "M01", "value": "5.4",
                 "footnotes": [{"code": "P", "text": "Preliminary"}]}]}]}}
        rows = research.bls_rows(payload)
        self.assertEqual([(r["month"], r["value"]) for r in rows], [("1990-01", 5.4)])
        self.assertEqual(rows[0]["footnotes"][0]["code"], "P")

    def test_qualified_and_nonfinite_agency_responses_are_rejected(self):
        with self.assertRaises(ValueError):
            research.bls_rows({"status": "REQUEST_SUCCEEDED", "message": ["Request limited"]})
        for value in ["NaN", "inf", "-inf"]:
            with self.assertRaises(ValueError):
                research.finite(value)

    def test_hmda_keeps_annual_cohorts_and_excludes_undisclosed_rates(self):
        row = {"action_taken": "1", "lien_status": "1", "loan_purpose": "1",
               "occupancy_type": "1", "reverse_mortgage": "2",
               "open-end_line_of_credit": "2", "business_or_commercial_purpose": "2",
               "interest_rate": "4", "activity_year": "2018", "loan_term": "360",
               "loan_type": "1", "total_units": "1", "intro_rate_period": "NA"}
        rows = [row, dict(row, interest_rate="6"), dict(row, interest_rate="1111"),
                dict(row, interest_rate="Exempt"), dict(row, intro_rate_period="1111"),
                dict(row, action_taken="3")]
        result = research.hmda_annual_rates(rows)
        self.assertEqual(result["observations"], [{"year": 2018, "loanType": "1",
            "termMonths": 360, "originations": 2, "meanNoteRatePct": 5,
            "frequency": "annual", "status": "SOURCED"}])
        self.assertEqual(sum(result["excluded"].values()), 4)
        self.assertNotIn("month", result["observations"][0])
        with self.assertRaises(KeyError):
            research.monthly_index(result["observations"])

    def test_bands_compare_exact_calendar_lags_not_adjacent_rows(self):
        rows = [{"month": calendar_month(i), "unemploymentPct": 4 + i / 10,
                 "priceIndex": 100 + i, "payrollJobsThousands": 1000 + i} for i in range(15)]
        rows = [r for r in rows if r["month"] != "2000-02"]
        band = research.historical_bands(rows)["unemploymentPct"]
        self.assertEqual(band["sampleCount"], 2)
        self.assertAlmostEqual(band["p05"], 1.2)
        self.assertAlmostEqual(band["p95"], 1.2)
        self.assertAlmostEqual(band["maxOneMonthMove"], 0.1)
        self.assertEqual(band["units"], "percentage-points")
        self.assertEqual(research.percentile(list(range(101)), 0.95), 95)

    def test_missing_and_duplicate_months_never_become_zero_observations(self):
        for month in ["2020", "2020-13", "2020-Q1"]:
            with self.assertRaises(ValueError):
                research.month_number(month)
        with self.assertRaises(ValueError):
            research.monthly_index([{"month": "2020-01"}, {"month": "2020-01"}])
        with self.assertRaises(ValueError):
            research.historical_bands([{"month": "2020-01", "unemploymentPct": 4}])

    def test_output_growth_is_annualized_and_does_not_bridge_a_missing_quarter(self):
        result = research.output_band([{"quarter": "1989-Q4", "realOutput": 100},
            {"quarter": "1990-Q1", "realOutput": 101},
            {"quarter": "1990-Q3", "realOutput": 200}])
        self.assertEqual(result["sampleCount"], 1)
        self.assertAlmostEqual(result["p05"], 4.060401)
        self.assertAlmostEqual(result["p95"], 4.060401)

    def test_twelve_month_regression_recovers_an_independent_exact_relation(self):
        policy, mortgage = [3.0], [4.0] * 13
        moves = [0.25, -0.5, 0, 0.5]
        for i in range(1, 36):
            policy.append(policy[-1] + moves[i % len(moves)])
        for i in range(1, 24):
            mortgage.append(mortgage[i - 1] + 1 + 2 * (policy[i] - policy[i - 1]))
        rows = [{"month": calendar_month(i), "policyRatePct": policy[i],
                 "mortgage30Pct": mortgage[i]} for i in range(36)]
        result = research.passthrough(rows, "2000-02", "2001-12")
        self.assertAlmostEqual(result["coefficient"], 2)
        self.assertAlmostEqual(result["intercept"], 1)
        self.assertAlmostEqual(result["standardErrorHAC12"], 0)
        self.assertEqual(result["sampleCount"], 23)
        for row in rows:
            row["policyRatePct"] = 3
        with self.assertRaisesRegex(ValueError, "No policy variation"):
            research.passthrough(rows, "2000-02", "2001-12")


if __name__ == "__main__":
    unittest.main()
