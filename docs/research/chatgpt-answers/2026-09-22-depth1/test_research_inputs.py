"""Checks of research artefacts and isolated examples, NOT Our Civic Duty tests."""
import unittest, json, hashlib, random
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def load(name): return json.loads((ROOT/name).read_text())

class ResearchInputs(unittest.TestCase):
    def test_queue_dispositions_cover_read_queue_without_duplicates(self):
        d=load('answers.json'); ids=[r['requestId'] for r in d['answers']+d['remaining']]
        self.assertEqual(len(ids),22); self.assertEqual(len(ids),len(set(ids)))
        self.assertEqual(sum(r['status'].startswith('partial') for r in d['answers']),1)
    def test_source_references_resolve(self):
        refs={s['id'] for s in load('source-register.json')}
        for r in load('answers.json')['answers']:
            self.assertTrue(set(r['sourceIds']) <= refs)
            self.assertTrue(r['answer'] and r['acceptance'] and r['receivingOwner'])
    def test_depth_recipe_fields_and_uniqueness(self):
        d=load('depth-content-catalogue.json'); rows=d['recipes']
        self.assertEqual(len(rows),36);self.assertEqual(len({r['key'] for r in rows}),36)
        for r in rows:
            for f in ['trigger','participantRoles','variationAxes','connects','requiredResult','forbiddenShortcut']:
                self.assertTrue(r[f],(r['key'],f))
        self.assertIn('not-a-loadable',d['status'])
    def test_proposition_candidate_shape(self):
        p=load('authored-policy-questions.candidate.json')
        self.assertEqual(p['provenance']['kind'],'authored-fiction')
        self.assertEqual(len(p['propositions']),24);self.assertEqual(len(p['subjects']),24)
        self.assertEqual(len({r['key'] for r in p['propositions']}),24)
        allowed={'key','issue','name','question','parameters','tags'}
        for r in p['propositions']:
            self.assertTrue(set(r)<=allowed);self.assertTrue(r['issue'].startswith('us-state-and-local:'))
            self.assertTrue(r['question'].endswith('?'))
        keys={p['pack']+':'+r['key'] for r in p['propositions']}
        for r in p['subjects']:
            self.assertEqual(r['scope'],'proposition');self.assertIn(r['about'],keys)
    def test_candidate_and_binding_notes_match(self):
        p=load('authored-policy-questions.candidate.json');b=load('policy-question-binding-notes.json')
        self.assertEqual({p['pack']+':'+r['key'] for r in p['propositions']},{r['questionKey'] for r in b['rows']})
        self.assertTrue(all(r['effectOperationToBind'] for r in b['rows']))
        self.assertIn('not-loaded',b['status'])
    def test_family_profile_not_empirical_or_a_family_exclusion(self):
        p=load('trait-family-private-profile.json')
        self.assertEqual(sum(r['selectionWeight'] for r in p['families']),100)
        self.assertEqual(len(p['families']),14)
        self.assertIn('not-empirical',p['status']);self.assertIn('allowing repeat family',p['sampling'])
    def test_sampling_experiment_units(self):
        d=load('trait-family-experiment.json')
        self.assertEqual(sum(d['countDistribution'].values()),100000)
        self.assertIn('not-game-or-human',d['kind'])
        self.assertTrue(all(0<=r['artificialAdultsWithFamilyPercent']<=100 for r in d['familyObservations']))
        self.assertTrue(all(r['across100ArtificialWorlds5to95Percent'][0]<=r['across100ArtificialWorlds5to95Percent'][1] for r in d['familyObservations']))
    def test_relationship_rubric_avoids_default_greeting_or_refusal_points(self):
        d=load('relationship-conduct-rubric.json'); rows=d['rows']
        self.assertEqual(rows[0]['proposedContributionRanges'],{})
        refusal=next(r for r in rows if r['conduct'].startswith('Respectful refusal'))
        self.assertEqual(refusal['proposedContributionRanges'],{})
        for r in rows:
            for lo,hi in r['proposedContributionRanges'].values(): self.assertLessEqual(lo,hi)

class IsolatedConservationExamples(unittest.TestCase):
    """Arithmetic invariants proposed for production tests, no game source imported."""
    def test_materialization_does_not_add_a_resident(self):
        residual=1000;tracked={}
        before=residual+len(tracked)
        for n in range(100):
            residual-=1;tracked[n]='A'
        self.assertEqual(before,residual+len(tracked));self.assertEqual(residual,900)
    def test_migration_and_real_birth_are_different(self):
        totals={'A':1000,'B':600};before=sum(totals.values())
        totals['A']-=1;totals['B']+=1
        self.assertEqual(sum(totals.values()),before)
        totals['B']+=1
        self.assertEqual(sum(totals.values()),before+1)
    def test_job_roles_are_not_residents_or_unique_workers(self):
        roles=[('p1','employerA'),('p1','employerB'),('p2','employerA')]
        self.assertEqual(len(roles),3);self.assertEqual(len({p for p,_ in roles}),2)
    def test_funded_transfer_is_exact_and_idempotent(self):
        accounts={'public':20000000,'recipients':0};seen=set()
        def apply(origin,n,cents):
            if origin in seen:return
            amount=n*cents
            if amount>accounts['public']:raise ValueError('unfunded')
            accounts['public']-=amount;accounts['recipients']+=amount;seen.add(origin)
        total=sum(accounts.values());apply('rule-rev1:period1',100000,100)
        self.assertEqual(accounts['recipients'],10000000)
        copy=accounts.copy();apply('rule-rev1:period1',100000,100)
        self.assertEqual(accounts,copy);self.assertEqual(sum(accounts.values()),total)

if __name__=='__main__':
    suite=unittest.defaultTestLoader.loadTestsFromModule(__import__(__name__))
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    output={'scope':'research structure and isolated arithmetic only; NOT repository/game tests','testsRun':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'skipped':len(result.skipped),'passed':result.wasSuccessful()}
    (ROOT/'validation-results.json').write_text(json.dumps(output,indent=2))
    raise SystemExit(0 if result.wasSuccessful() else 1)
