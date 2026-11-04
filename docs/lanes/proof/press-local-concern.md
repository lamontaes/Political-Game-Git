# Local adults' concern in press interviews

Pool item: people-press-local-adult-concern. Not Built yet: fresh New Game, the natural story/interview witness and changed-source timing remain pending. Parent people-counted-readers-stances-from-stories stays unfinished.

The existing interviewQuestions caller now builds one audience through the existing full-person place index and countedResidentsOf reader, using living adults and household weights. It reads current stance rows per question. This replaces the daily concern-result cache and its all-resident denominator/all-world numerator; it adds no saved table, background outcome or sampled person. Actual counted story delivery is separate unfinished work.

The generated-world edge check draws Rentiesville, Oklahoma (4062950), replay9568487810db434f. Corrected source passes (4.45s test/14.72s command); eslint and prettier pass. The controlled stances are test-only, not a played-world witness. Original reader fails with cached zero instead of0.007142857142857143 (3.47s/12.09s). A second countercheck clears only the original cache to isolate its old arithmetic:0.016304347826086956 instead of0.007142857142857143 (3.57s/12.45s). Both restore the corrected source exactly, SHA256473bc1923168b321d31725a63e852f3d002aaef33b82b2918e62fc2cab6da7ba. No assertion was weakened.

Serial four-year base on main ee2927103d: Tallulah Falls, Georgia (1375328), replaye998a30ab889846b;28.3/86.0/56.5/105.3seconds, all below120, exit0. The changed-source run will use the same town, replay, host,8GB heap and64MB semi-space. Different interview questions may legitimately change downstream records; this is a behavior repair and does not claim record equality.
