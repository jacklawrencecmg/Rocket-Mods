// test_validation.mjs — Tests for the validateLoan function

// ─── HELPERS (mirror from App.tsx) ────────────────────────────────────────────
const n = v => parseFloat(v) || 0;
const fmt$ = v => v == null ? "N/A" : `$${Number(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

// ─── COPY validateLoan FROM App.tsx ───────────────────────────────────────────
function validateLoan(l) {
  const warnings = [];
  const dlq = n(l.delinquencyMonths);
  const arrears = n(l.arrearagesToCapitalize);
  const currentPITI = n(l.currentPITI);
  const pmms = n(l.pmmsRate);
  const currentRate = n(l.currentInterestRate);
  const upb = n(l.upb);
  const origUpb = n(l.originalUpb);
  const currentPI = n(l.currentPI);
  const gmi = n(l.grossMonthlyIncome);

  if (dlq > 0 && arrears > 0 && currentPITI > 0) {
    const expected = dlq * currentPITI;
    if (arrears > expected * 2) {
      warnings.push(`Arrears (${fmt$(arrears)}) are more than 2× expected for DLQ period (${fmt$(expected)}) — verify capitalization amount`);
    } else if (arrears < expected * 0.3) {
      warnings.push(`Arrears (${fmt$(arrears)}) seem low for ${dlq} months DLQ (expected ~${fmt$(expected)}) — verify capitalization amount`);
    }
  }

  if (pmms > 0 && (pmms < 4 || pmms > 12)) {
    warnings.push(`PMMS rate ${pmms.toFixed(3)}% is outside normal range (4%–12%) — verify rate`);
  }

  if (currentRate > 0 && (currentRate < 2 || currentRate > 15)) {
    warnings.push(`Current interest rate ${currentRate.toFixed(3)}% is outside normal range — verify`);
  }

  if (upb > 0 && currentPI > 0 && currentRate > 0) {
    const impliedRate = (currentPI / upb) * 12 * 100;
    if (Math.abs(impliedRate - currentRate) > 3) {
      warnings.push(`Current P&I (${fmt$(currentPI)}) may not match UPB (${fmt$(upb)}) at rate ${currentRate.toFixed(3)}% — verify loan terms`);
    }
  }

  if (dlq > 12 && l.loanType === "FHA" && !l.foreclosureActive) {
    warnings.push(`FHA loans 12+ months delinquent typically have foreclosure initiated — verify foreclosure status`);
  }

  if (gmi > 0 && currentPITI > 0 && currentPITI / gmi > 0.60) {
    warnings.push(`Housing expense ratio ${(currentPITI / gmi * 100).toFixed(1)}% exceeds 60% of GMI — verify income and payment amounts`);
  }

  if (upb > 0 && origUpb > 0 && upb > origUpb * 1.5) {
    warnings.push(`Current UPB (${fmt$(upb)}) is >150% of original UPB (${fmt$(origUpb)}) — verify capitalization history`);
  }

  return warnings;
}

// ─── TEST FRAMEWORK ───────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch(e) { console.error(`FAIL: ${name} — ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || "assertion failed"); }
function assertHasWarning(warnings, substr) {
  const found = warnings.some(w => w.includes(substr));
  if (!found) throw new Error(`Expected warning containing "${substr}" but got: [${warnings.join("; ")}]`);
}
function assertNoWarning(warnings, substr) {
  const found = warnings.some(w => w.includes(substr));
  if (found) throw new Error(`Did NOT expect warning containing "${substr}" but got one`);
}

// ─── TESTS ───────────────────────────────────────────────────────────────────

// Rule 1: arrears > 2x expected → warning
test("Arrears > 2x expected triggers warning", () => {
  const warnings = validateLoan({ delinquencyMonths:"4", arrearagesToCapitalize:"10000", currentPITI:"1000", loanType:"FHA" });
  // expected = 4 * 1000 = 4000; 10000 > 4000*2 → warning
  assertHasWarning(warnings, "more than 2");
});

// Rule 1: arrears < 0.3x expected → warning
test("Arrears < 30% of expected triggers warning", () => {
  const warnings = validateLoan({ delinquencyMonths:"6", arrearagesToCapitalize:"500", currentPITI:"2000", loanType:"FHA" });
  // expected = 6 * 2000 = 12000; 500 < 12000*0.3=3600 → warning
  assertHasWarning(warnings, "seem low");
});

// Rule 1: arrears within normal range → no warning
test("Arrears in normal range = no warning", () => {
  const warnings = validateLoan({ delinquencyMonths:"4", arrearagesToCapitalize:"4000", currentPITI:"1000", loanType:"FHA" });
  assertNoWarning(warnings, "Arrears");
});

// Rule 2: PMMS < 4 → warning
test("PMMS rate < 4% triggers warning", () => {
  const warnings = validateLoan({ pmmsRate:"2.5", loanType:"FHA" });
  assertHasWarning(warnings, "outside normal range");
});

// Rule 2: PMMS > 12 → warning
test("PMMS rate > 12% triggers warning", () => {
  const warnings = validateLoan({ pmmsRate:"15", loanType:"FHA" });
  assertHasWarning(warnings, "outside normal range");
});

// Rule 2: PMMS in range → no warning
test("PMMS rate in normal range = no warning", () => {
  const warnings = validateLoan({ pmmsRate:"7.0", loanType:"FHA" });
  assertNoWarning(warnings, "PMMS rate");
});

// Rule 3: current rate < 2 → warning
test("Current rate < 2% triggers warning", () => {
  const warnings = validateLoan({ currentInterestRate:"1.5", loanType:"FHA" });
  assertHasWarning(warnings, "Current interest rate");
});

// Rule 3: current rate > 15 → warning
test("Current rate > 15% triggers warning", () => {
  const warnings = validateLoan({ currentInterestRate:"16", loanType:"FHA" });
  assertHasWarning(warnings, "Current interest rate");
});

// Rule 3: current rate in range → no warning
test("Current rate in normal range = no warning", () => {
  const warnings = validateLoan({ currentInterestRate:"6.875", loanType:"FHA" });
  assertNoWarning(warnings, "Current interest rate");
});

// Rule 4: PI/UPB implied rate far from actual rate → warning
test("PI/UPB implied rate mismatch triggers warning", () => {
  // Actual rate: 6%, but PI implies ~3% → mismatch
  const warnings = validateLoan({ upb:"200000", currentPI:"500", currentInterestRate:"6", loanType:"FHA" });
  // implied = 500/200000 * 12 * 100 = 3%; |3-6| = 3 → triggers > 3 check... need > 3
  // So use: PI=$400 → 400/200000*12*100 = 2.4%; |2.4-6|=3.6 > 3 → warning
  const warnings2 = validateLoan({ upb:"200000", currentPI:"400", currentInterestRate:"6", loanType:"FHA" });
  assertHasWarning(warnings2, "may not match");
});

// Rule 4: PI matches rate → no warning
test("PI matches rate = no warning", () => {
  // At 6.875% on $200k for 360mo, PI ≈ $1314
  const warnings = validateLoan({ upb:"200000", currentPI:"1314", currentInterestRate:"6.875", loanType:"FHA" });
  assertNoWarning(warnings, "may not match");
});

// Rule 5: FHA, DLQ > 12, no foreclosure → warning
test("FHA DLQ>12 without foreclosure triggers warning", () => {
  const warnings = validateLoan({ loanType:"FHA", delinquencyMonths:"15", foreclosureActive:false });
  assertHasWarning(warnings, "12+ months delinquent");
});

// Rule 5: Non-FHA, DLQ > 12 → no FHA warning
test("Non-FHA DLQ>12 = no FHA foreclosure warning", () => {
  const warnings = validateLoan({ loanType:"VA", delinquencyMonths:"15", foreclosureActive:false });
  assertNoWarning(warnings, "12+ months delinquent");
});

// Rule 5: FHA, DLQ > 12 but foreclosure active → no warning
test("FHA DLQ>12 with active foreclosure = no warning", () => {
  const warnings = validateLoan({ loanType:"FHA", delinquencyMonths:"15", foreclosureActive:true });
  assertNoWarning(warnings, "12+ months delinquent");
});

// Rule 6: housing expense ratio > 60% → warning
test("Housing expense ratio > 60% triggers warning", () => {
  const warnings = validateLoan({ grossMonthlyIncome:"3000", currentPITI:"2000", loanType:"FHA" });
  // 2000/3000 = 66.7% > 60% → warning
  assertHasWarning(warnings, "exceeds 60%");
});

// Rule 6: ratio exactly 60% → no warning (not > 60)
test("Housing expense ratio exactly 60% = no warning", () => {
  const warnings = validateLoan({ grossMonthlyIncome:"5000", currentPITI:"3000", loanType:"FHA" });
  // 3000/5000 = 60% — NOT > 0.60 → no warning
  assertNoWarning(warnings, "exceeds 60%");
});

// Rule 7: UPB > 150% of original UPB → warning
test("UPB > 150% of original triggers warning", () => {
  const warnings = validateLoan({ upb:"400000", originalUpb:"200000", loanType:"FHA" });
  // 400000 > 200000*1.5=300000 → warning
  assertHasWarning(warnings, ">150%");
});

// Rule 7: UPB <= 150% → no warning
test("UPB <= 150% of original = no warning", () => {
  const warnings = validateLoan({ upb:"280000", originalUpb:"200000", loanType:"FHA" });
  assertNoWarning(warnings, ">150%");
});

// Clean loan → no warnings
test("Clean loan data = no warnings", () => {
  const warnings = validateLoan({
    loanType:"FHA", delinquencyMonths:"4", arrearagesToCapitalize:"7200",
    currentPITI:"1800", grossMonthlyIncome:"5200", pmmsRate:"7.0",
    currentInterestRate:"6.875", upb:"247500", originalUpb:"265000",
    currentPI:"1388", foreclosureActive:false,
  });
  assert(warnings.length === 0, `Expected no warnings but got: ${warnings.join("; ")}`);
});

// ─── REPORT ───────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log("\n=== VALIDATION TEST RESULTS ===\n");
console.log(`Total tests : ${total}`);
console.log(`PASSED      : ${passed}`);
console.log(`FAILED      : ${failed}`);
if (total > 0) console.log(`Accuracy    : ${(passed/total*100).toFixed(1)}%\n`);
if (failed === 0) console.log("All validation tests passed!");
