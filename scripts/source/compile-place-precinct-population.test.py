"""Focused source-join checks; no synthetic voter or election decision."""
import importlib.util
import io
import unittest
import zipfile
from pathlib import Path
spec = importlib.util.spec_from_file_location("precinct_population", Path(__file__).with_name("compile-place-precinct-population.py"))
compiler = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compiler)

class PopulationJoin(unittest.TestCase):
    def test_absent_vtd_member_preserves_unknown_coverage(self):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as z:
            z.writestr("fixture_INCPLACE_CDP.txt", "BLOCKID|PLACEFP\n")
        with zipfile.ZipFile(buffer) as z:
            counts, average = compiler.join_precinct_populations(z, "fixture", {})
        self.assertEqual(counts, {})
        self.assertIsNone(average["vtdCount"])
        self.assertEqual(average["coverage"], "vtd-member-not-published")

    def archive(self, place="", vtd=""):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as z:
            z.writestr("fixture_INCPLACE_CDP.txt", "BLOCKID|PLACEFP\n" + place)
            z.writestr("fixture_VTD.txt", "BLOCKID|COUNTYFP|DISTRICT\n" + vtd)
        return zipfile.ZipFile(buffer)

    def test_crossing_places_do_not_duplicate_population_and_average_uses_whole_vtd(self):
        with self.archive("010010001001000|00001\n010010001001001|00002\n010010001001002|\n", "010010001001000|001|000001\n010010001001001|001|000001\n010010001001002|001|000002\n") as z:
            counts, average = compiler.join_precinct_populations(z, "fixture", {"010010001001000": 10, "010010001001001": 20, "010010001001002": 30})
        self.assertEqual(counts, {"0100001:voting-precinct": {"01001000001": 10}, "0100002:voting-precinct": {"01001000001": 20}})
        self.assertEqual(average["population"], 60)
        self.assertEqual(average["meanPopulation"], 30)

    def test_unassigned_is_a_recorded_gap_not_a_precinct(self):
        with self.archive("010010001001000|00001\n", "010010001001000|001|ZZZZZZ\n") as z:
            counts, average = compiler.join_precinct_populations(z, "fixture", {"010010001001000": 7})
        self.assertEqual(counts, {})
        self.assertEqual(average["unassignedPopulation"], 7)
        self.assertIsNone(average["meanPopulation"])

    def test_missing_population_is_rejected(self):
        with self.archive("010010001001000|00001\n", "010010001001000|001|000001\n") as z:
            with self.assertRaisesRegex(ValueError, "Missing recorded"):
                compiler.join_precinct_populations(z, "fixture", {})

    def test_duplicate_allocation_is_rejected(self):
        with self.archive("010010001001000|00001\n", "010010001001000|001|000001\n010010001001000|001|000001\n") as z:
            with self.assertRaisesRegex(ValueError, "duplicate allocation"):
                compiler.join_precinct_populations(z, "fixture", {"010010001001000": 7})

if __name__ == "__main__": unittest.main()
