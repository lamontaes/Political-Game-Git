import unittest
from pathlib import Path
from intake import IntakeError
from prepare import emit_expressions

class ExpressionContractTests(unittest.TestCase):
    def test_expression_cannot_replace_identity_or_turn_the_head(self):
        for change in ({'identityOf':'different-face'},{'view':'left-profile'},{'pose':'seated'}):
            source={'identityOf':'face','view':'front','pose':'standing-neutral',**change}
            head={'id':'face','view':'front','pose':'standing-neutral','expressions':{'smile':source}}
            with self.assertRaises(IntakeError) as error:
                emit_expressions(Path('.'),{},'part',head,{},40)
            self.assertEqual(error.exception.code,'expression_identity_mismatch')

    def test_unpainted_expression_is_not_synthesized(self):
        self.assertEqual(emit_expressions(Path('.'),{},'part',{'id':'face'}, {},40),{})
        with self.assertRaises(IntakeError) as error:
            emit_expressions(Path('.'),{},'part',{'expressions':{'talk':{}}},{},40)
        self.assertEqual(error.exception.code,'unsupported_expression')

if __name__=='__main__':unittest.main()
