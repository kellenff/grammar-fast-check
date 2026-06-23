import { readFileSync, writeFileSync } from 'node:fs';

const reportPath = process.argv[2] ?? 'reports/mutation/mutation.json';
const outputPath = process.argv[3] ?? 'reports/mutation/mutation-score.json';

const report = JSON.parse(readFileSync(reportPath, 'utf8'));

let killed = 0;
let timeout = 0;
let survived = 0;
let noCoverage = 0;
let errors = 0;
let total = 0;

for (const file of Object.values(report.files ?? {})) {
  for (const mutant of file.mutants ?? []) {
    total += 1;
    switch (mutant.status) {
      case 'Killed':
        killed += 1;
        break;
      case 'Timeout':
        timeout += 1;
        break;
      case 'Survived':
        survived += 1;
        break;
      case 'NoCoverage':
        noCoverage += 1;
        break;
      default:
        errors += 1;
        break;
    }
  }
}

const effective = killed + timeout + survived + noCoverage;
const coveredDenominator = killed + timeout + survived;

const mutationScore = effective === 0 ? 100 : ((killed + timeout) / effective) * 100;
const mutationScoreBasedOnCoveredCode =
  coveredDenominator === 0 ? 100 : ((killed + timeout) / coveredDenominator) * 100;

const result = {
  mutationScore: round(mutationScore),
  mutationScoreBasedOnCoveredCode: round(mutationScoreBasedOnCoveredCode),
  killed,
  timeout,
  survived,
  noCoverage,
  errors,
  totalMutants: total,
};

writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));

function round(value) {
  return Math.round(value * 100) / 100;
}
