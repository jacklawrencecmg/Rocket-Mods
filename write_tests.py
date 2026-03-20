import io

path = 'C:/Users/jlawrence/OneDrive - cmgfi/Desktop/LMU2/test_evaluations.mjs'

tests = '''

// ─── TEST FRAMEWORK ───────────────────────────────────────────────────────────
let totalPass = 0, totalFail = 0;
const failures = [];
const summary = {};

function check(evaluatorName, testName, loan, checks) {
  const results = eval("evaluate" + evaluatorName)(loan);
  const resultMap = {};
  for (const r of results) resultMap[r.option] = r.eligible;
  if (!summary[evaluatorName]) summary[evaluatorName] = { pass:0, fail:0 };
  for (const [option, expected] of Object.entries(checks)) {
    const actual = resultMap[option];
    if (actual === undefined) {
      // option not found
      failures.push({ evaluatorName, testName, option, expected, actual:"NOT FOUND" });
      totalFail++;
      summary[evaluatorName].fail++;
    } else if (actual === expected) {
      totalPass++;
      summary[evaluatorName].pass++;
    } else {
      failures.push({ evaluatorName, testName, option, expected, actual });
      totalFail++;
      summary[evaluatorName].fail++;
    }
  }
}

// ─── FHA TEST CASES (50) ──────────────────────────────────────────────────────
// TC-FHA-01: Happy path reinstatement
check("FHA","TC01 Reinstatement eligible when DLQ>0",
  L({delinquencyMonths:"3"}),
  {"FHA Reinstatement": true});

// TC-FHA-02: Reinstatement not eligible when DLQ=0
check("FHA","TC02 Reinstatement ineligible when DLQ=0",
  L({delinquencyMonths:"0"}),
  {"FHA Reinstatement": false});

// TC-FHA-03: Repayment Plan happy path
check("FHA","TC03 Repayment Plan eligible",
  L({delinquencyMonths:"6", hardshipType:"Reduction in Income", canRepayWithin24Months:true, failedTPP:false}),
  {"Repayment Plan": true});

// TC-FHA-04: Repayment Plan fails - disaster hardship
check("FHA","TC04 Repayment Plan fails disaster hardship",
  L({delinquencyMonths:"6", hardshipType:"Disaster", canRepayWithin24Months:true}),
  {"Repayment Plan": false});

// TC-FHA-05: Repayment Plan fails - DLQ >12
check("FHA","TC05 Repayment Plan fails DLQ>12",
  L({delinquencyMonths:"13", hardshipType:"Reduction in Income", canRepayWithin24Months:true}),
  {"Repayment Plan": false});

// TC-FHA-06: Repayment Plan fails - canRepayWithin24Months=false
check("FHA","TC06 Repayment Plan fails canRepay=false",
  L({delinquencyMonths:"6", canRepayWithin24Months:false}),
  {"Repayment Plan": false});

// TC-FHA-07: Repayment Plan boundary DLQ=12 (eligible)
check("FHA","TC07 Repayment Plan boundary DLQ=12",
  L({delinquencyMonths:"12", canRepayWithin24Months:true}),
  {"Repayment Plan": true});

// TC-FHA-08: Formal Forbearance happy path
check("FHA","TC08 Formal Forbearance eligible",
  L({delinquencyMonths:"6", hardshipType:"Reduction in Income", canRepayWithin6Months:true}),
  {"Formal Forbearance": true});

// TC-FHA-09: Formal Forbearance via requestedForbearance
check("FHA","TC09 Formal Forbearance via requestedForbearance",
  L({delinquencyMonths:"6", hardshipType:"Reduction in Income", requestedForbearance:true}),
  {"Formal Forbearance": true});

// TC-FHA-10: Formal Forbearance fails DLQ=12 (boundary - needs <12)
check("FHA","TC10 Formal Forbearance fails DLQ=12",
  L({delinquencyMonths:"12", canRepayWithin6Months:true}),
  {"Formal Forbearance": false});

// TC-FHA-11: FHA Payment Deferral happy path (DLQ=3, hardship resolved)
check("FHA","TC11 Payment Deferral happy path",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", fhaHardshipResolved:true, fhaCumulativeDeferredMonths:"0", fhaPriorDeferralMonths:"0"}),
  {"FHA Payment Deferral": true});

// TC-FHA-12: FHA Payment Deferral fails DLQ=2 (boundary - needs >=3)
check("FHA","TC12 Payment Deferral fails DLQ=2",
  L({delinquencyMonths:"2", hardshipType:"Reduction in Income", fhaHardshipResolved:true}),
  {"FHA Payment Deferral": false});

// TC-FHA-13: FHA Payment Deferral fails DLQ=13
check("FHA","TC13 Payment Deferral fails DLQ=13",
  L({delinquencyMonths:"13", fhaHardshipResolved:true}),
  {"FHA Payment Deferral": false});

// TC-FHA-14: FHA Payment Deferral fails hardship not resolved
check("FHA","TC14 Payment Deferral fails hardship not resolved",
  L({delinquencyMonths:"6", fhaHardshipResolved:false}),
  {"FHA Payment Deferral": false});

// TC-FHA-15: FHA Payment Deferral fails cumulative >= 12
check("FHA","TC15 Payment Deferral fails cumulative>=12",
  L({delinquencyMonths:"6", fhaHardshipResolved:true, fhaCumulativeDeferredMonths:"12"}),
  {"FHA Payment Deferral": false});

// TC-FHA-16: FHA Payment Deferral fails prior deferral spacing <12
check("FHA","TC16 Payment Deferral fails prior spacing 6mo",
  L({delinquencyMonths:"6", fhaHardshipResolved:true, fhaPriorDeferralMonths:"6"}),
  {"FHA Payment Deferral": false});

// TC-FHA-17: FHA Payment Deferral passes prior deferral spacing =12
check("FHA","TC17 Payment Deferral passes prior spacing 12mo",
  L({delinquencyMonths:"6", fhaHardshipResolved:true, fhaPriorDeferralMonths:"12"}),
  {"FHA Payment Deferral": true});

// TC-FHA-18: FHA Payment Deferral fails - disaster hardship
check("FHA","TC18 Payment Deferral fails disaster hardship",
  L({delinquencyMonths:"6", hardshipType:"Disaster", fhaHardshipResolved:true}),
  {"FHA Payment Deferral": false});

// TC-FHA-19: FHA Payment Deferral fails - condemned property
check("FHA","TC19 Payment Deferral fails condemned",
  L({delinquencyMonths:"6", fhaHardshipResolved:true, propertyCondition:"Condemned"}),
  {"FHA Payment Deferral": false});

// TC-FHA-20: FHA 30-Year Mod eligible (manual canAchieve360=true)
check("FHA","TC20 30-Year Mod eligible manual",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", borrowerIntentRetention:true, canAchieveTargetByReamort:true}),
  {"FHA 30-Year Standalone Modification": true});

// TC-FHA-21: FHA 30-Year Mod fails - disaster hardship
check("FHA","TC21 30-Year Mod fails disaster hardship",
  L({delinquencyMonths:"3", hardshipType:"Disaster", canAchieveTargetByReamort:true}),
  {"FHA 30-Year Standalone Modification": false});

// TC-FHA-22: FHA 30-Year Mod fails - intent disposition
check("FHA","TC22 30-Year Mod fails disposition intent",
  L({delinquencyMonths:"3", borrowerIntentRetention:false, canAchieveTargetByReamort:true}),
  {"FHA 30-Year Standalone Modification": false});

// TC-FHA-23: FHA 30-Year Mod fails - wrong occupancy
check("FHA","TC23 30-Year Mod fails non-owner-occupied",
  L({delinquencyMonths:"3", occupancyStatus:"Tenant Occupied", canAchieveTargetByReamort:true}),
  {"FHA 30-Year Standalone Modification": false});

// TC-FHA-24: FHA 30-Year Mod fails - second lien
check("FHA","TC24 30-Year Mod fails second lien",
  L({delinquencyMonths:"3", lienPosition:"Second", canAchieveTargetByReamort:true}),
  {"FHA 30-Year Standalone Modification": false});

// TC-FHA-25: FHA 30-Year Mod fails - DLQ=0
check("FHA","TC25 30-Year Mod fails DLQ=0",
  L({delinquencyMonths:"0", canAchieveTargetByReamort:true}),
  {"FHA 30-Year Standalone Modification": false});

// TC-FHA-26: FHA 40-Year Combo Mod eligible (manual cannot360, can480)
check("FHA","TC26 40-Year Combo Mod eligible manual",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", borrowerIntentRetention:true, canAchieveTargetByReamort:false, canAchieveTargetBy480Reamort:true, partialClaimPct:"20"}),
  {"FHA 40-Year Combination Modification + Partial Claim": true});

// TC-FHA-27: FHA 40-Year Combo Mod fails - can360
check("FHA","TC27 40-Year Combo fails can achieve 360",
  L({delinquencyMonths:"3", canAchieveTargetByReamort:true, canAchieveTargetBy480Reamort:true, partialClaimPct:"20"}),
  {"FHA 40-Year Combination Modification + Partial Claim": false});

// TC-FHA-28: Payment Supplement eligible
check("FHA","TC28 Payment Supplement eligible",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", canAchieveTargetByReamort:false, comboPaymentLe40PctIncome:true}),
  {"Payment Supplement": true});

// TC-FHA-29: Payment Supplement fails - disaster hardship
check("FHA","TC29 Payment Supplement fails disaster",
  L({delinquencyMonths:"3", hardshipType:"Disaster", canAchieveTargetByReamort:false, comboPaymentLe40PctIncome:true}),
  {"Payment Supplement": false});

// TC-FHA-30: Payment Supplement fails - comboPayment>40pct
check("FHA","TC30 Payment Supplement fails combo>40pct",
  L({delinquencyMonths:"3", canAchieveTargetByReamort:false, comboPaymentLe40PctIncome:false}),
  {"Payment Supplement": false});

// TC-FHA-31: FHA Standalone PC eligible
check("FHA","TC31 Standalone PC eligible",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", borrowerIntentRetention:true, fhaBorrowerCanResumePreHardship:true, partialClaimPct:"20"}),
  {"FHA Standalone Partial Claim": true});

// TC-FHA-32: FHA Standalone PC fails - cannot resume pre-hardship
check("FHA","TC32 Standalone PC fails cannot resume",
  L({delinquencyMonths:"3", fhaBorrowerCanResumePreHardship:false, partialClaimPct:"20"}),
  {"FHA Standalone Partial Claim": false});

// TC-FHA-33: FHA Standalone PC fails - PC>30%
check("FHA","TC33 Standalone PC fails PC>30pct",
  L({delinquencyMonths:"3", fhaBorrowerCanResumePreHardship:true, partialClaimPct:"35"}),
  {"FHA Standalone Partial Claim": false});

// TC-FHA-34: Special Forbearance Unemployment eligible
check("FHA","TC34 Special Forbearance Unemployment eligible",
  L({delinquencyMonths:"6", hardshipType:"Unemployment", verifiedUnemployment:true, continuousIncome:false, ineligibleAllRetention:true, propertyListedForSale:false, assumptionInProcess:false}),
  {"Special Forbearance - Unemployment": true});

// TC-FHA-35: Special Forbearance Unemployment fails - wrong hardship type
check("FHA","TC35 Special Forbearance fails wrong hardship",
  L({delinquencyMonths:"6", hardshipType:"Reduction in Income", verifiedUnemployment:true, continuousIncome:false, ineligibleAllRetention:true}),
  {"Special Forbearance - Unemployment": false});

// TC-FHA-36: Special Forbearance Unemployment fails - has income
check("FHA","TC36 Special Forbearance fails continuous income",
  L({delinquencyMonths:"6", hardshipType:"Unemployment", verifiedUnemployment:true, continuousIncome:true, ineligibleAllRetention:true}),
  {"Special Forbearance - Unemployment": false});

// TC-FHA-37: PFS eligible
check("FHA","TC37 PFS eligible",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", borrowerIntentRetention:false, meetsPFSRequirements:true}),
  {"Pre-Foreclosure Sale (PFS)": true});

// TC-FHA-38: PFS fails - intent retain
check("FHA","TC38 PFS fails retain intent",
  L({delinquencyMonths:"3", borrowerIntentRetention:true, meetsPFSRequirements:true}),
  {"Pre-Foreclosure Sale (PFS)": false});

// TC-FHA-39: PFS fails - no meetsPFSRequirements
check("FHA","TC39 PFS fails meetsPFSRequirements=false",
  L({delinquencyMonths:"3", borrowerIntentRetention:false, meetsPFSRequirements:false}),
  {"Pre-Foreclosure Sale (PFS)": false});

// TC-FHA-40: DIL eligible
check("FHA","TC40 DIL eligible",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", outstandingDebtUncurable:true, meetsDILRequirements:true}),
  {"Deed-in-Lieu (DIL)": true});

// TC-FHA-41: DIL fails - no outstandingDebtUncurable
check("FHA","TC41 DIL fails no outstanding debt uncurable",
  L({delinquencyMonths:"3", outstandingDebtUncurable:false, meetsDILRequirements:true}),
  {"Deed-in-Lieu (DIL)": false});

// TC-FHA-42: Disaster Loan Modification eligible
check("FHA","TC42 Disaster Loan Mod eligible",
  L({delinquencyMonths:"6", hardshipType:"Disaster", verifiedDisaster:true, propertyInPDMA:true, principalResidencePreDisaster:true, incomeDocProvided:true, canAchieveTargetByReamort:true}),
  {"FHA Disaster Loan Modification": true});

// TC-FHA-43: Disaster Loan Modification not in results when verifiedDisaster=false
check("FHA","TC43 Disaster Loan Mod absent when verifiedDisaster=false",
  L({delinquencyMonths:"6", hardshipType:"Disaster", verifiedDisaster:false}),
  {"FHA Reinstatement": true}); // just verifying function runs without disaster options

// TC-FHA-44: Disaster Loan Mod fails DLQ>=12
check("FHA","TC44 Disaster Loan Mod fails DLQ>=12",
  L({delinquencyMonths:"12", hardshipType:"Disaster", verifiedDisaster:true, propertyInPDMA:true, principalResidencePreDisaster:true, incomeDocProvided:true, canAchieveTargetByReamort:true}),
  {"FHA Disaster Loan Modification": false});

// TC-FHA-45: Cooldown check - prior HR 12mo fails
check("FHA","TC45 30-Year Mod fails 12mo cooldown",
  L({delinquencyMonths:"3", priorFHAHAMPMonths:"12", canAchieveTargetByReamort:true}),
  {"FHA 30-Year Standalone Modification": false});

// TC-FHA-46: Cooldown check - prior HR 24mo passes
check("FHA","TC46 30-Year Mod passes 24mo cooldown",
  L({delinquencyMonths:"3", priorFHAHAMPMonths:"24", canAchieveTargetByReamort:true}),
  {"FHA 30-Year Standalone Modification": true});

// TC-FHA-47: Multiple eligible simultaneously (Reinstatement + Repayment + Formal Forbearance)
check("FHA","TC47 Multiple eligible simultaneously",
  L({delinquencyMonths:"6", hardshipType:"Reduction in Income", canRepayWithin24Months:true, canRepayWithin6Months:true}),
  {"FHA Reinstatement": true, "Repayment Plan": true, "Formal Forbearance": true});

// TC-FHA-48: Foreclosure active blocks base options
check("FHA","TC48 Foreclosure active blocks modification",
  L({delinquencyMonths:"6", foreclosureActive:true, canAchieveTargetByReamort:true}),
  {"FHA 30-Year Standalone Modification": false, "FHA Payment Deferral": false});

// TC-FHA-49: Uninhabitable property blocks base options
check("FHA","TC49 Uninhabitable blocks modification",
  L({delinquencyMonths:"6", propertyCondition:"Uninhabitable", canAchieveTargetByReamort:true}),
  {"FHA 30-Year Standalone Modification": false});

// TC-FHA-50: Non-principal-residence blocks modification
check("FHA","TC50 Non-principal-residence blocks modification",
  L({delinquencyMonths:"6", propertyDisposition:"Investment Property", canAchieveTargetByReamort:true}),
  {"FHA 30-Year Standalone Modification": false});

// ─── USDA TEST CASES (50) ─────────────────────────────────────────────────────
// TC-USDA-01: Reinstatement eligible
check("USDA","TC01 Reinstatement eligible",
  L({delinquencyMonths:"3"}),
  {"USDA Reinstatement": true});

// TC-USDA-02: Reinstatement not eligible DLQ=0
check("USDA","TC02 Reinstatement ineligible DLQ=0",
  L({delinquencyMonths:"0"}),
  {"USDA Reinstatement": false});

// TC-USDA-03: Informal Forbearance happy path
check("USDA","TC03 Informal Forbearance eligible",
  L({delinquencyMonths:"2", hardshipType:"Reduction in Income", hardshipDuration:"Short Term", borrowerIntentRetention:true, usdaHardshipNotExcluded:true, usdaForbearancePeriodLt12:true}),
  {"USDA Informal Forbearance": true});

// TC-USDA-04: Informal Forbearance fails disaster hardship
check("USDA","TC04 Informal Forbearance fails disaster",
  L({delinquencyMonths:"2", hardshipType:"Disaster", hardshipDuration:"Short Term", usdaForbearancePeriodLt12:true}),
  {"USDA Informal Forbearance": false});

// TC-USDA-05: Informal Forbearance fails - not short term
check("USDA","TC05 Informal Forbearance fails long term",
  L({delinquencyMonths:"2", hardshipDuration:"Long Term", usdaForbearancePeriodLt12:true}),
  {"USDA Informal Forbearance": false});

// TC-USDA-06: Informal Repayment Plan happy path
check("USDA","TC06 Informal Repayment Plan eligible",
  L({delinquencyMonths:"3", hardshipDuration:"Resolved", hardshipType:"Reduction in Income", borrowerIntentRetention:true, usdaHardshipNotExcluded:true, usdaNewPaymentLe200pct:true, usdaBorrowerPositiveNetIncome:true}),
  {"USDA Informal Repayment Plan": true});

// TC-USDA-07: Informal Repayment Plan fails - not resolved
check("USDA","TC07 Informal Repayment Plan fails not resolved",
  L({delinquencyMonths:"3", hardshipDuration:"Short Term", usdaNewPaymentLe200pct:true, usdaBorrowerPositiveNetIncome:true}),
  {"USDA Informal Repayment Plan": false});

// TC-USDA-08: Informal Repayment Plan fails no positive net income
check("USDA","TC08 Informal Repayment Plan fails no positive income",
  L({delinquencyMonths:"3", hardshipDuration:"Resolved", usdaNewPaymentLe200pct:true, usdaBorrowerPositiveNetIncome:false}),
  {"USDA Informal Repayment Plan": false});

// TC-USDA-09: USDA Special Forbearance happy path
check("USDA","TC09 Special Forbearance eligible",
  L({delinquencyMonths:"6", hardshipType:"Reduction in Income", lienPosition:"First", propertyCondition:"Standard", occupancyAbandoned:false, occupancyStatus:"Owner Occupied"}),
  {"USDA Special Forbearance": true});

// TC-USDA-10: USDA Special Forbearance fails disaster hardship
check("USDA","TC10 Special Forbearance fails disaster",
  L({delinquencyMonths:"6", hardshipType:"Disaster"}),
  {"USDA Special Forbearance": false});

// TC-USDA-11: USDA Special Forbearance fails DLQ>12
check("USDA","TC11 Special Forbearance fails DLQ>12",
  L({delinquencyMonths:"13", hardshipType:"Reduction in Income"}),
  {"USDA Special Forbearance": false});

// TC-USDA-12: USDA Disaster Forbearance eligible
check("USDA","TC12 Disaster Forbearance eligible",
  L({delinquencyMonths:"3", hardshipType:"Disaster", lienPosition:"First", occupancyStatus:"Owner Occupied", usdaDLQAt30AtDisaster:true}),
  {"USDA Disaster Forbearance": true});

// TC-USDA-13: USDA Disaster Forbearance fails non-disaster
check("USDA","TC13 Disaster Forbearance fails non-disaster",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", usdaDLQAt30AtDisaster:true}),
  {"USDA Disaster Forbearance": false});

// TC-USDA-14: USDA Disaster Forbearance fails no DLQAt30AtDisaster
check("USDA","TC14 Disaster Forbearance fails DLQ>30 at disaster",
  L({delinquencyMonths:"3", hardshipType:"Disaster", usdaDLQAt30AtDisaster:false}),
  {"USDA Disaster Forbearance": false});

// TC-USDA-15: USDA Streamline Mod eligible
check("USDA","TC15 Streamline Loan Mod eligible",
  L({delinquencyMonths:"4", delinquencyDays:"120", hardshipType:"Reduction in Income", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, usdaUpbGe5000:true, usdaPaymentsMade12:true, usdaBankruptcyNotActive:true, usdaLitigationNotActive:true, usdaPriorFailedStreamlineTPP:false, usdaNumPrevMods:"0", usdaForeclosureSaleGe60Away:true, propertyListedForSale:false}),
  {"USDA Streamline Loan Modification": true});

// TC-USDA-16: Streamline Mod fails DLQ<90d
check("USDA","TC16 Streamline Mod fails DLQ<90d",
  L({delinquencyMonths:"2", delinquencyDays:"60", hardshipType:"Reduction in Income", lienPosition:"First"}),
  {"USDA Streamline Loan Modification": false});

// TC-USDA-17: Streamline Mod fails prior mod count >= 2
check("USDA","TC17 Streamline Mod fails prior mods>=2",
  L({delinquencyMonths:"4", delinquencyDays:"120", hardshipType:"Reduction in Income", usdaNumPrevMods:"2", lienPosition:"First"}),
  {"USDA Streamline Loan Modification": false});

// TC-USDA-18: Streamline Mod fails failed TPP
check("USDA","TC18 Streamline Mod fails failed TPP",
  L({delinquencyMonths:"4", delinquencyDays:"120", hardshipType:"Reduction in Income", usdaPriorFailedStreamlineTPP:true, lienPosition:"First"}),
  {"USDA Streamline Loan Modification": false});

// TC-USDA-19: Streamline Mod fails property listed for sale
check("USDA","TC19 Streamline Mod fails listed for sale",
  L({delinquencyMonths:"4", delinquencyDays:"120", hardshipType:"Reduction in Income", propertyListedForSale:true, lienPosition:"First"}),
  {"USDA Streamline Loan Modification": false});

// TC-USDA-20: Streamline Mod fails disaster hardship
check("USDA","TC20 Streamline Mod fails disaster hardship",
  L({delinquencyMonths:"4", delinquencyDays:"120", hardshipType:"Disaster", lienPosition:"First"}),
  {"USDA Streamline Loan Modification": false});

// TC-USDA-21: Streamline Mod fails second lien
check("USDA","TC21 Streamline Mod fails second lien",
  L({delinquencyMonths:"4", delinquencyDays:"120", hardshipType:"Reduction in Income", lienPosition:"Second"}),
  {"USDA Streamline Loan Modification": false});

// TC-USDA-22: USDA Standalone MRA eligible
check("USDA","TC22 Standalone MRA eligible",
  L({delinquencyMonths:"2", delinquencyDays:"60", hardshipType:"Reduction in Income", lienPosition:"First", usdaBorrowerCanResumeCurrent:true, usdaHardshipDurationResolved:true, usdaBorrowerCannotCureDLQWithin12:true}),
  {"USDA Standalone Mortgage Recovery Advance (MRA)": true});

// TC-USDA-23: Standalone MRA fails disaster
check("USDA","TC23 Standalone MRA fails disaster",
  L({delinquencyMonths:"2", delinquencyDays:"60", hardshipType:"Disaster", usdaBorrowerCanResumeCurrent:true, usdaHardshipDurationResolved:true, usdaBorrowerCannotCureDLQWithin12:true}),
  {"USDA Standalone Mortgage Recovery Advance (MRA)": false});

// TC-USDA-24: Standalone MRA fails cannot resume
check("USDA","TC24 Standalone MRA fails cannot resume",
  L({delinquencyMonths:"2", delinquencyDays:"60", hardshipType:"Reduction in Income", usdaBorrowerCanResumeCurrent:false, usdaHardshipDurationResolved:true, usdaBorrowerCannotCureDLQWithin12:true}),
  {"USDA Standalone Mortgage Recovery Advance (MRA)": false});

// TC-USDA-25: USDA Disaster Modification eligible
check("USDA","TC25 Disaster Modification eligible",
  L({delinquencyMonths:"3", hardshipType:"Disaster", lienPosition:"First", hardshipDuration:"Resolved", usdaDLQAt30AtDisaster:true, usdaBorrowerCanResumePmtFalse:true, usdaLoanGe30DaysDLQ:true, usdaPostModPITILePreMod:true}),
  {"USDA Disaster Modification": true});

// TC-USDA-26: Disaster Modification fails non-disaster
check("USDA","TC26 Disaster Mod fails non-disaster",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", hardshipDuration:"Resolved", usdaDLQAt30AtDisaster:true, usdaBorrowerCanResumePmtFalse:true, usdaLoanGe30DaysDLQ:true, usdaPostModPITILePreMod:true}),
  {"USDA Disaster Modification": false});

// TC-USDA-27: Disaster Modification fails not resolved
check("USDA","TC27 Disaster Mod fails not resolved",
  L({delinquencyMonths:"3", hardshipType:"Disaster", hardshipDuration:"Long Term", usdaDLQAt30AtDisaster:true, usdaBorrowerCanResumePmtFalse:true, usdaLoanGe30DaysDLQ:true, usdaPostModPITILePreMod:true}),
  {"USDA Disaster Modification": false});

// TC-USDA-28: USDA Disaster MRA eligible (no extension, no mod eligible)
check("USDA","TC28 Disaster MRA eligible",
  L({delinquencyMonths:"3", hardshipType:"Disaster", lienPosition:"First", hardshipDuration:"Resolved", usdaDLQAt30AtDisaster:true, usdaBorrowerCanResumePmtFalse:true, usdaLoanGe30DaysDLQ:true, usdaPostModPITILePreMod:true, usdaEligibleForDisasterExtension:false, usdaEligibleForDisasterMod:false, usdaPriorWorkoutNotMRA:true, usdaReinstatementLtMRACap:true}),
  {"USDA Disaster Mortgage Recovery Advance (MRA)": true});

// TC-USDA-29: Disaster MRA fails extension eligible
check("USDA","TC29 Disaster MRA fails extension eligible",
  L({delinquencyMonths:"3", hardshipType:"Disaster", hardshipDuration:"Resolved", usdaDLQAt30AtDisaster:true, usdaBorrowerCanResumePmtFalse:true, usdaLoanGe30DaysDLQ:true, usdaPostModPITILePreMod:true, usdaEligibleForDisasterExtension:true, usdaPriorWorkoutNotMRA:true, usdaReinstatementLtMRACap:true}),
  {"USDA Disaster Mortgage Recovery Advance (MRA)": false});

// TC-USDA-30: Disaster Term Extension Mod eligible
check("USDA","TC30 Disaster Term Extension Mod eligible",
  L({hardshipType:"Disaster", hardshipDuration:"Long Term", lienPosition:"First", usdaPriorWorkoutDisasterForbearance:true, usdaHardshipNotResolved:true, usdaDLQGe12Contractual:true, usdaDLQAt30AtDisaster:true, usdaLoanGe60DLQ:true, usdaPrevWorkoutForbearance:true, usdaWorkoutStateActivePassed:true}),
  {"USDA Disaster Term Extension Modification": true});

// TC-USDA-31: Disaster Term Extension fails no prior forbearance
check("USDA","TC31 Disaster Term Extension fails no prior forbearance",
  L({hardshipType:"Disaster", hardshipDuration:"Long Term", usdaPriorWorkoutDisasterForbearance:false, usdaHardshipNotResolved:true, usdaDLQGe12Contractual:true, usdaDLQAt30AtDisaster:true, usdaLoanGe60DLQ:true, usdaPrevWorkoutForbearance:true, usdaWorkoutStateActivePassed:true}),
  {"USDA Disaster Term Extension Modification": false});

// TC-USDA-32: USDA Compromise Sale eligible
check("USDA","TC32 Compromise Sale eligible",
  L({hardshipDuration:"Long Term", borrowerIntentRetention:false, usdaDLQGt30:true, occupancyStatus:"Owner Occupied", usdaCompleteBRP:true, lienPosition:"First", usdaDLQLe60AndBRP:true}),
  {"USDA Compromise Sale": true});

// TC-USDA-33: Compromise Sale fails retention intent
check("USDA","TC33 Compromise Sale fails retention",
  L({hardshipDuration:"Long Term", borrowerIntentRetention:true, usdaDLQGt30:true, occupancyStatus:"Owner Occupied", usdaCompleteBRP:true, usdaDLQLe60AndBRP:true}),
  {"USDA Compromise Sale": false});

// TC-USDA-34: Compromise Sale fails short-term hardship
check("USDA","TC34 Compromise Sale fails short-term",
  L({hardshipDuration:"Short Term", borrowerIntentRetention:false, usdaDLQGt30:true, occupancyStatus:"Owner Occupied", usdaCompleteBRP:true, usdaDLQLe60AndBRP:true}),
  {"USDA Compromise Sale": false});

// TC-USDA-35: USDA DIL eligible
check("USDA","TC35 USDA DIL eligible",
  L({hardshipDuration:"Long Term", borrowerIntentRetention:false, usdaDLQGt30:true, occupancyStatus:"Owner Occupied", usdaCompleteBRP:true, lienPosition:"First", usdaDLQLe60AndBRP:true, usdaPriorWorkoutCompSaleFailed:true}),
  {"USDA Deed-in-Lieu": true});

// TC-USDA-36: USDA DIL fails no comp sale failed
check("USDA","TC36 USDA DIL fails no prior comp sale",
  L({hardshipDuration:"Long Term", borrowerIntentRetention:false, usdaDLQGt30:true, occupancyStatus:"Owner Occupied", usdaCompleteBRP:true, lienPosition:"First", usdaDLQLe60AndBRP:true, usdaPriorWorkoutCompSaleFailed:false}),
  {"USDA Deed-in-Lieu": false});

// TC-USDA-37: Condemned property blocks base options
check("USDA","TC37 Condemned blocks Streamline Mod",
  L({delinquencyMonths:"4", delinquencyDays:"120", hardshipType:"Reduction in Income", lienPosition:"First", propertyCondition:"Condemned"}),
  {"USDA Streamline Loan Modification": false});

// TC-USDA-38: Abandoned blocks base options
check("USDA","TC38 Abandoned blocks Streamline Mod",
  L({delinquencyMonths:"4", delinquencyDays:"120", hardshipType:"Reduction in Income", lienPosition:"First", occupancyAbandoned:true}),
  {"USDA Streamline Loan Modification": false});

// TC-USDA-39: MRA + Step3 eligible
check("USDA","TC39 MRA+Step3 eligible",
  L({delinquencyMonths:"4", delinquencyDays:"120", hardshipType:"Reduction in Income", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, usdaUpbGe5000:true, usdaPaymentsMade12:true, usdaBankruptcyNotActive:true, usdaLitigationNotActive:true, usdaForeclosureSaleGe60Away:true, usdaStep3DeferralRequired:true}),
  {"USDA Modification + MRA Servicing Plan": true});

// TC-USDA-40: MRA + Step3 fails no step3
check("USDA","TC40 MRA+Step3 fails no step3",
  L({delinquencyMonths:"4", delinquencyDays:"120", hardshipType:"Reduction in Income", lienPosition:"First", borrowerIntentRetention:true, usdaUpbGe5000:true, usdaPaymentsMade12:true, usdaBankruptcyNotActive:true, usdaLitigationNotActive:true, usdaForeclosureSaleGe60Away:true, usdaStep3DeferralRequired:false}),
  {"USDA Modification + MRA Servicing Plan": false});

// TC-USDA-41: Repayment Plan boundary DLQ=1d
check("USDA","TC41 Repayment Plan boundary 1d DLQ",
  L({delinquencyDays:"1", hardshipType:"Reduction in Income", hardshipDuration:"Resolved", borrowerIntentRetention:true, usdaHardshipNotExcluded:true, usdaNewPaymentLe200pct:true, usdaBorrowerPositiveNetIncome:true, lienPosition:"First", occupancyStatus:"Owner Occupied"}),
  {"USDA Informal Repayment Plan": true});

// TC-USDA-42: Informal Forbearance DLQ=0 eligible (pre-default)
check("USDA","TC42 Informal Forbearance DLQ=0 pre-default",
  L({delinquencyDays:"0", delinquencyMonths:"0", hardshipType:"Reduction in Income", hardshipDuration:"Short Term", borrowerIntentRetention:true, usdaHardshipNotExcluded:true, usdaForbearancePeriodLt12:true, lienPosition:"First", occupancyStatus:"Owner Occupied"}),
  {"USDA Informal Forbearance": true});

// TC-USDA-43: Streamline at exactly 90d DLQ boundary
check("USDA","TC43 Streamline boundary 90d DLQ",
  L({delinquencyDays:"90", hardshipType:"Reduction in Income", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, usdaUpbGe5000:true, usdaPaymentsMade12:true, usdaBankruptcyNotActive:true, usdaLitigationNotActive:true, usdaForeclosureSaleGe60Away:true}),
  {"USDA Streamline Loan Modification": true});

// TC-USDA-44: Streamline at 89d DLQ fails
check("USDA","TC44 Streamline 89d DLQ fails",
  L({delinquencyDays:"89", hardshipType:"Reduction in Income", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, usdaUpbGe5000:true, usdaPaymentsMade12:true, usdaBankruptcyNotActive:true, usdaLitigationNotActive:true, usdaForeclosureSaleGe60Away:true}),
  {"USDA Streamline Loan Modification": false});

// TC-USDA-45: Standalone MRA requires DLQ>=30d
check("USDA","TC45 Standalone MRA fails DLQ<30d",
  L({delinquencyDays:"29", hardshipType:"Reduction in Income", lienPosition:"First", usdaBorrowerCanResumeCurrent:true, usdaHardshipDurationResolved:true, usdaBorrowerCannotCureDLQWithin12:true}),
  {"USDA Standalone Mortgage Recovery Advance (MRA)": false});

// TC-USDA-46: Multiple eligible (Reinstatement + Special Forbearance)
check("USDA","TC46 Multiple eligible simultaneously",
  L({delinquencyMonths:"6", hardshipType:"Reduction in Income", lienPosition:"First", occupancyStatus:"Owner Occupied"}),
  {"USDA Reinstatement": true, "USDA Special Forbearance": true});

// TC-USDA-47: Litigation active blocks Streamline
check("USDA","TC47 Litigation active blocks Streamline",
  L({delinquencyMonths:"4", delinquencyDays:"120", hardshipType:"Reduction in Income", lienPosition:"First", borrowerIntentRetention:true, usdaUpbGe5000:true, usdaPaymentsMade12:true, usdaBankruptcyNotActive:true, usdaLitigationNotActive:false, usdaForeclosureSaleGe60Away:true}),
  {"USDA Streamline Loan Modification": false});

// TC-USDA-48: Bankruptcy active blocks Streamline
check("USDA","TC48 Bankruptcy active blocks Streamline",
  L({delinquencyMonths:"4", delinquencyDays:"120", hardshipType:"Reduction in Income", lienPosition:"First", borrowerIntentRetention:true, usdaUpbGe5000:true, usdaPaymentsMade12:true, usdaBankruptcyNotActive:false, usdaLitigationNotActive:true, usdaForeclosureSaleGe60Away:true}),
  {"USDA Streamline Loan Modification": false});

// TC-USDA-49: Foreclosure sale <60d blocks Streamline
check("USDA","TC49 Foreclosure sale <60d blocks Streamline",
  L({delinquencyMonths:"4", delinquencyDays:"120", hardshipType:"Reduction in Income", lienPosition:"First", borrowerIntentRetention:true, usdaUpbGe5000:true, usdaPaymentsMade12:true, usdaBankruptcyNotActive:true, usdaLitigationNotActive:true, usdaForeclosureSaleGe60Away:false}),
  {"USDA Streamline Loan Modification": false});

// TC-USDA-50: Disaster Mod fails lien=Second
check("USDA","TC50 Disaster Mod fails second lien",
  L({hardshipType:"Disaster", hardshipDuration:"Resolved", lienPosition:"Second", usdaDLQAt30AtDisaster:true, usdaBorrowerCanResumePmtFalse:true, usdaLoanGe30DaysDLQ:true, usdaPostModPITILePreMod:true}),
  {"USDA Disaster Modification": false});

// ─── VA TEST CASES (50) ───────────────────────────────────────────────────────
// TC-VA-01: Reinstatement eligible
check("VA","TC01 Reinstatement eligible",
  L({delinquencyMonths:"3", delinquencyDays:"90", lienPosition:"First", borrowerCanAffordReinstateOrRepay:true}),
  {"VA Reinstatement": true});

// TC-VA-02: Reinstatement fails DLQ=0
check("VA","TC02 Reinstatement fails DLQ=0",
  L({delinquencyDays:"0", delinquencyMonths:"0", lienPosition:"First", borrowerCanAffordReinstateOrRepay:true}),
  {"VA Reinstatement": false});

// TC-VA-03: Reinstatement fails cannot afford
check("VA","TC03 Reinstatement fails cannot afford",
  L({delinquencyDays:"90", lienPosition:"First", borrowerCanAffordReinstateOrRepay:false}),
  {"VA Reinstatement": false});

// TC-VA-04: Reinstatement fails foreclosure active
check("VA","TC04 Reinstatement fails foreclosure active",
  L({delinquencyDays:"90", lienPosition:"First", foreclosureActive:true, borrowerCanAffordReinstateOrRepay:true}),
  {"VA Reinstatement": false});

// TC-VA-05: VA Repayment Plan eligible
check("VA","TC05 Repayment Plan eligible",
  L({delinquencyDays:"60", hardshipType:"Reduction in Income", hardshipDuration:"Resolved", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, calculatedRPPGt0:true, borrowerCanAffordReinstateOrRepay:true}),
  {"VA Repayment Plan": true});

// TC-VA-06: Repayment Plan fails - not resolved
check("VA","TC06 Repayment Plan fails long term",
  L({delinquencyDays:"60", hardshipType:"Reduction in Income", hardshipDuration:"Long Term", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, calculatedRPPGt0:true, borrowerCanAffordReinstateOrRepay:true}),
  {"VA Repayment Plan": false});

// TC-VA-07: Repayment Plan fails disaster hardship
check("VA","TC07 Repayment Plan fails disaster",
  L({delinquencyDays:"60", hardshipType:"Disaster", hardshipDuration:"Resolved", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, calculatedRPPGt0:true, borrowerCanAffordReinstateOrRepay:true}),
  {"VA Repayment Plan": false});

// TC-VA-08: Special Forbearance eligible
check("VA","TC08 Special Forbearance eligible",
  L({hardshipType:"Reduction in Income", hardshipDuration:"Long Term", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, forbearancePeriodLt12:true}),
  {"VA Special Forbearance": true});

// TC-VA-09: Special Forbearance fails resolved hardship
check("VA","TC09 Special Forbearance fails resolved",
  L({hardshipType:"Reduction in Income", hardshipDuration:"Resolved", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, forbearancePeriodLt12:true}),
  {"VA Special Forbearance": false});

// TC-VA-10: Special Forbearance fails permanent (needs Long Term)
check("VA","TC10 Special Forbearance fails permanent",
  L({hardshipType:"Reduction in Income", hardshipDuration:"Permanent", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, forbearancePeriodLt12:true}),
  {"VA Special Forbearance": false});

// TC-VA-11: VA 40-Year Loan Modification eligible (broadest)
check("VA","TC11 40-Year Mod eligible",
  L({delinquencyDays:"90", hardshipType:"Reduction in Income", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, borrowerConfirmedCannotAffordCurrent:true}),
  {"VA 40-Year Loan Modification": true});

// TC-VA-12: VA 40-Year Mod fails DLQ<61d
check("VA","TC12 40-Year Mod fails DLQ<61d",
  L({delinquencyDays:"60", hardshipType:"Reduction in Income", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, borrowerConfirmedCannotAffordCurrent:true}),
  {"VA 40-Year Loan Modification": false});

// TC-VA-13: VA 40-Year Mod fails disaster hardship
check("VA","TC13 40-Year Mod fails disaster hardship",
  L({delinquencyDays:"90", hardshipType:"Disaster", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, borrowerConfirmedCannotAffordCurrent:true}),
  {"VA 40-Year Loan Modification": false});

// TC-VA-14: VA Traditional Mod eligible
check("VA","TC14 Traditional Mod eligible",
  L({delinquencyDays:"90", hardshipType:"Reduction in Income", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, borrowerConfirmedCannotAffordCurrent:true, borrowerCanAffordModifiedPayment:true}),
  {"VA Traditional Modification": true});

// TC-VA-15: Traditional Mod fails cannot afford modified
check("VA","TC15 Traditional Mod fails cannot afford modified",
  L({delinquencyDays:"90", hardshipType:"Reduction in Income", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, borrowerConfirmedCannotAffordCurrent:true, borrowerCanAffordModifiedPayment:false}),
  {"VA Traditional Modification": false});

// TC-VA-16: VA 30-Year Mod eligible
check("VA","TC16 30-Year Mod eligible",
  L({delinquencyDays:"90", hardshipType:"Reduction in Income", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, borrowerConfirmedCannotAffordCurrent:true, borrowerCanAffordCurrentMonthly:false}),
  {"VA 30-Year Loan Modification": true});

// TC-VA-17: VA 30-Year Mod fails can afford current monthly
check("VA","TC17 30-Year Mod fails can afford current monthly",
  L({delinquencyDays:"90", hardshipType:"Reduction in Income", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, borrowerConfirmedCannotAffordCurrent:true, borrowerCanAffordCurrentMonthly:true}),
  {"VA 30-Year Loan Modification": false});

// TC-VA-18: VASP always ineligible
check("VA","TC18 VASP always ineligible",
  L({delinquencyDays:"90", hardshipType:"Reduction in Income", lienPosition:"First"}),
  {"VASP (VA Partial Claim)": false});

// TC-VA-19: VA Compromise Sale eligible (DLQ>60)
check("VA","TC19 Compromise Sale eligible DLQ>60",
  L({delinquencyDays:"90", hardshipDuration:"Long Term", borrowerIntentRetention:false, lienPosition:"First", borrowerIntentDisposition:true}),
  {"VA Compromise Sale": true});

// TC-VA-20: Compromise Sale eligible DLQ<=60 with BRP
check("VA","TC20 Compromise Sale eligible DLQ<=60 with BRP",
  L({delinquencyDays:"60", hardshipDuration:"Long Term", borrowerIntentRetention:false, lienPosition:"First", completeBRP:true}),
  {"VA Compromise Sale": true});

// TC-VA-21: Compromise Sale fails DLQ<=60 without BRP
check("VA","TC21 Compromise Sale fails DLQ<=60 no BRP",
  L({delinquencyDays:"60", hardshipDuration:"Long Term", borrowerIntentRetention:false, lienPosition:"First", completeBRP:false}),
  {"VA Compromise Sale": false});

// TC-VA-22: Compromise Sale fails short-term hardship
check("VA","TC22 Compromise Sale fails short-term",
  L({delinquencyDays:"90", hardshipDuration:"Short Term", borrowerIntentRetention:false, lienPosition:"First", borrowerIntentDisposition:true}),
  {"VA Compromise Sale": false});

// TC-VA-23: VA DIL eligible
check("VA","TC23 DIL eligible",
  L({delinquencyDays:"90", hardshipDuration:"Long Term", borrowerIntentRetention:false, lienPosition:"First", borrowerIntentDisposition:true, priorWorkoutCompromiseSaleFailed:true}),
  {"VA Deed-in-Lieu": true});

// TC-VA-24: DIL fails no prior comp sale failed
check("VA","TC24 DIL fails no prior comp sale",
  L({delinquencyDays:"90", hardshipDuration:"Long Term", borrowerIntentRetention:false, lienPosition:"First", borrowerIntentDisposition:true, priorWorkoutCompromiseSaleFailed:false}),
  {"VA Deed-in-Lieu": false});

// TC-VA-25: Disaster Forbearance eligible
check("VA","TC25 Disaster Forbearance eligible",
  L({hardshipType:"Disaster", lienPosition:"First", dlqAtDisasterLt30:true, forbearancePeriodLt12:true}),
  {"VA Disaster Forbearance": true});

// TC-VA-26: Disaster Forbearance fails DLQ>30 at disaster
check("VA","TC26 Disaster Forbearance fails DLQ>30",
  L({hardshipType:"Disaster", lienPosition:"First", dlqAtDisasterLt30:false, forbearancePeriodLt12:true}),
  {"VA Disaster Forbearance": false});

// TC-VA-27: VA Disaster Modification eligible
check("VA","TC27 Disaster Modification eligible",
  L({hardshipType:"Disaster", lienPosition:"First", dlqAtDisasterLt30:true, loanGe60DaysDLQ:true, previousWorkoutForbearance:true, workoutStateActivePassed:true, activeRPP:false, pmmsLeCurrentPlus1:true}),
  {"VA Disaster Modification": true});

// TC-VA-28: Disaster Modification fails - activeRPP
check("VA","TC28 Disaster Mod fails activeRPP",
  L({hardshipType:"Disaster", lienPosition:"First", dlqAtDisasterLt30:true, loanGe60DaysDLQ:true, previousWorkoutForbearance:true, workoutStateActivePassed:true, activeRPP:true, pmmsLeCurrentPlus1:true}),
  {"VA Disaster Modification": false});

// TC-VA-29: VA Disaster Extend Modification eligible
check("VA","TC29 Disaster Extend Mod eligible",
  L({hardshipType:"Disaster", hardshipDuration:"Long Term", lienPosition:"First", dlqAtDisasterLt30:true, loanGe60DaysDLQ:true, previousWorkoutForbearance:true, workoutStateActivePassed:true, dlqGe12ContractualPayments:true}),
  {"VA Disaster Extend Modification": true});

// TC-VA-30: Disaster Extend Mod fails resolved hardship
check("VA","TC30 Disaster Extend Mod fails resolved",
  L({hardshipType:"Disaster", hardshipDuration:"Resolved", lienPosition:"First", dlqAtDisasterLt30:true, loanGe60DaysDLQ:true, previousWorkoutForbearance:true, workoutStateActivePassed:true, dlqGe12ContractualPayments:true}),
  {"VA Disaster Extend Modification": false});

// TC-VA-31: Non-disaster hardship skips disaster options
check("VA","TC31 Non-disaster skips disaster options",
  L({hardshipType:"Reduction in Income", delinquencyDays:"90"}),
  {"VA Disaster Forbearance": undefined}); // option only appears if isD

// TC-VA-32: Foreclosure active blocks all VA base options
check("VA","TC32 Foreclosure active blocks mods",
  L({delinquencyDays:"90", hardshipType:"Reduction in Income", lienPosition:"First", foreclosureActive:true, borrowerConfirmedCannotAffordCurrent:true, occupancyStatus:"Owner Occupied", borrowerIntentRetention:true}),
  {"VA 40-Year Loan Modification": false});

// TC-VA-33: Condemned blocks VA base
check("VA","TC33 Condemned blocks VA 40yr mod",
  L({delinquencyDays:"90", hardshipType:"Reduction in Income", lienPosition:"First", propertyCondition:"Condemned", borrowerConfirmedCannotAffordCurrent:true, occupancyStatus:"Owner Occupied", borrowerIntentRetention:true}),
  {"VA 40-Year Loan Modification": false});

// TC-VA-34: Abandoned blocks VA base
check("VA","TC34 Abandoned blocks VA 40yr mod",
  L({delinquencyDays:"90", hardshipType:"Reduction in Income", lienPosition:"First", occupancyAbandoned:true, borrowerConfirmedCannotAffordCurrent:true, occupancyStatus:"Owner Occupied", borrowerIntentRetention:true}),
  {"VA 40-Year Loan Modification": false});

// TC-VA-35: Second lien blocks all
check("VA","TC35 Second lien blocks VA 40yr mod",
  L({delinquencyDays:"90", hardshipType:"Reduction in Income", lienPosition:"Second", borrowerConfirmedCannotAffordCurrent:true, occupancyStatus:"Owner Occupied", borrowerIntentRetention:true}),
  {"VA 40-Year Loan Modification": false});

// TC-VA-36: DLQ exactly 61d passes 40yr mod
check("VA","TC36 DLQ=61d passes 40-Year Mod",
  L({delinquencyDays:"61", hardshipType:"Reduction in Income", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, borrowerConfirmedCannotAffordCurrent:true}),
  {"VA 40-Year Loan Modification": true});

// TC-VA-37: Multiple standard options eligible
check("VA","TC37 Multiple standard options eligible",
  L({delinquencyDays:"90", hardshipType:"Reduction in Income", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, borrowerConfirmedCannotAffordCurrent:true, borrowerCanAffordModifiedPayment:true, borrowerCanAffordCurrentMonthly:false}),
  {"VA Traditional Modification": true, "VA 30-Year Loan Modification": true, "VA 40-Year Loan Modification": true});

// TC-VA-38: Repayment Plan DLQ exactly 30d boundary
check("VA","TC38 Repayment Plan DLQ=30d eligible",
  L({delinquencyDays:"30", hardshipType:"Reduction in Income", hardshipDuration:"Resolved", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, calculatedRPPGt0:true, borrowerCanAffordReinstateOrRepay:true}),
  {"VA Repayment Plan": true});

// TC-VA-39: Repayment Plan DLQ=29d fails
check("VA","TC39 Repayment Plan DLQ=29d fails",
  L({delinquencyDays:"29", hardshipType:"Reduction in Income", hardshipDuration:"Resolved", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, calculatedRPPGt0:true, borrowerCanAffordReinstateOrRepay:true}),
  {"VA Repayment Plan": false});

// TC-VA-40: Repayment Plan fails calculatedRPP=0
check("VA","TC40 Repayment Plan fails RPP=0",
  L({delinquencyDays:"60", hardshipType:"Reduction in Income", hardshipDuration:"Resolved", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, calculatedRPPGt0:false, borrowerCanAffordReinstateOrRepay:true}),
  {"VA Repayment Plan": false});

// TC-VA-41: Special Forbearance DLQ=0 eligible (no DLQ requirement for forbearance)
check("VA","TC41 Special Forbearance DLQ=0 eligible",
  L({delinquencyDays:"0", delinquencyMonths:"0", hardshipType:"Reduction in Income", hardshipDuration:"Long Term", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, forbearancePeriodLt12:true}),
  {"VA Special Forbearance": true});

// TC-VA-42: Disaster Modification fails no prior forbearance
check("VA","TC42 Disaster Mod fails no prior forbearance",
  L({hardshipType:"Disaster", lienPosition:"First", dlqAtDisasterLt30:true, loanGe60DaysDLQ:true, previousWorkoutForbearance:false, workoutStateActivePassed:true, activeRPP:false, pmmsLeCurrentPlus1:true}),
  {"VA Disaster Modification": false});

// TC-VA-43: Disaster Modification fails PMMS>Rate+1%
check("VA","TC43 Disaster Mod fails PMMS check",
  L({hardshipType:"Disaster", lienPosition:"First", dlqAtDisasterLt30:true, loanGe60DaysDLQ:true, previousWorkoutForbearance:true, workoutStateActivePassed:true, activeRPP:false, pmmsLeCurrentPlus1:false}),
  {"VA Disaster Modification": false});

// TC-VA-44: Compromise Sale fails retention intent (non-disaster)
check("VA","TC44 Compromise Sale retention intent fails",
  L({delinquencyDays:"90", hardshipDuration:"Permanent", borrowerIntentRetention:true, lienPosition:"First", borrowerIntentDisposition:true}),
  {"VA Compromise Sale": false});

// TC-VA-45: DIL requires compromise sale first
check("VA","TC45 DIL requires prior comp sale",
  L({delinquencyDays:"90", hardshipDuration:"Long Term", borrowerIntentRetention:false, lienPosition:"First", borrowerIntentDisposition:true, priorWorkoutCompromiseSaleFailed:true}),
  {"VA Deed-in-Lieu": true, "VA Compromise Sale": true});

// TC-VA-46: Hardship DLQ boundary for RPP (>0 required)
check("VA","TC46 RPP boundary 1d DLQ passes",
  L({delinquencyDays:"30", hardshipType:"Reduction in Income", hardshipDuration:"Resolved", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, calculatedRPPGt0:true, borrowerCanAffordReinstateOrRepay:true}),
  {"VA Repayment Plan": true});

// TC-VA-47: Non-owner occupied blocks repayment plan
check("VA","TC47 Non-owner occupied blocks repayment plan",
  L({delinquencyDays:"60", hardshipType:"Reduction in Income", hardshipDuration:"Resolved", lienPosition:"First", occupancyStatus:"Tenant Occupied", borrowerIntentRetention:true, calculatedRPPGt0:true, borrowerCanAffordReinstateOrRepay:true}),
  {"VA Repayment Plan": false});

// TC-VA-48: Non-owner occupied blocks special forbearance
check("VA","TC48 Non-owner occupied blocks special forbearance",
  L({hardshipType:"Reduction in Income", hardshipDuration:"Long Term", lienPosition:"First", occupancyStatus:"Tenant Occupied", borrowerIntentRetention:true, forbearancePeriodLt12:true}),
  {"VA Special Forbearance": false});

// TC-VA-49: Reinstatement DLQ=1d boundary
check("VA","TC49 Reinstatement 1d DLQ eligible",
  L({delinquencyDays:"1", lienPosition:"First", borrowerCanAffordReinstateOrRepay:true}),
  {"VA Reinstatement": true});

// TC-VA-50: 40-Year Mod borrowerIntentRetention=false fails
check("VA","TC50 40-Year Mod fails disposition intent",
  L({delinquencyDays:"90", hardshipType:"Reduction in Income", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:false, borrowerConfirmedCannotAffordCurrent:true}),
  {"VA 40-Year Loan Modification": false});

// ─── FHLMC TEST CASES (50) ────────────────────────────────────────────────────
// TC-FHLMC-01: Reinstatement eligible
check("FHLMC","TC01 Reinstatement eligible",
  L({delinquencyMonths:"3"}),
  {"FHLMC Reinstatement": true});

// TC-FHLMC-02: Reinstatement ineligible DLQ=0
check("FHLMC","TC02 Reinstatement ineligible DLQ=0",
  L({delinquencyMonths:"0", arrearagesToCapitalize:"0"}),
  {"FHLMC Reinstatement": false});

// TC-FHLMC-03: Repayment Plan eligible
check("FHLMC","TC03 Repayment Plan eligible",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", fhlmcHardshipResolved:true}),
  {"FHLMC Repayment Plan": true});

// TC-FHLMC-04: Repayment Plan fails disaster
check("FHLMC","TC04 Repayment Plan fails disaster",
  L({delinquencyMonths:"3", hardshipType:"Disaster", fhlmcHardshipResolved:true}),
  {"FHLMC Repayment Plan": false});

// TC-FHLMC-05: Repayment Plan fails hardship not resolved
check("FHLMC","TC05 Repayment Plan fails not resolved",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", fhlmcHardshipResolved:false}),
  {"FHLMC Repayment Plan": false});

// TC-FHLMC-06: Payment Deferral happy path
check("FHLMC","TC06 Payment Deferral eligible",
  L({delinquencyMonths:"4", hardshipType:"Reduction in Income", fhlmcHardshipResolved:true, fhlmcCanResumeFull:true, fhlmcLoanAge:"24", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcCumulativeDeferredMonths:"0", fhlmcPriorDeferralMonths:"0"}),
  {"FHLMC Payment Deferral": true});

// TC-FHLMC-07: Payment Deferral fails DLQ=1
check("FHLMC","TC07 Payment Deferral fails DLQ=1",
  L({delinquencyMonths:"1", fhlmcHardshipResolved:true, fhlmcCanResumeFull:true, fhlmcLoanAge:"24", fhlmcMortgageType:"Conventional", lienPosition:"First"}),
  {"FHLMC Payment Deferral": false});

// TC-FHLMC-08: Payment Deferral fails DLQ=7
check("FHLMC","TC08 Payment Deferral fails DLQ=7",
  L({delinquencyMonths:"7", fhlmcHardshipResolved:true, fhlmcCanResumeFull:true, fhlmcLoanAge:"24", fhlmcMortgageType:"Conventional", lienPosition:"First"}),
  {"FHLMC Payment Deferral": false});

// TC-FHLMC-09: Payment Deferral DLQ=2 boundary
check("FHLMC","TC09 Payment Deferral DLQ=2 eligible",
  L({delinquencyMonths:"2", fhlmcHardshipResolved:true, fhlmcCanResumeFull:true, fhlmcLoanAge:"24", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcCumulativeDeferredMonths:"0", fhlmcPriorDeferralMonths:"0"}),
  {"FHLMC Payment Deferral": true});

// TC-FHLMC-10: Payment Deferral DLQ=6 boundary
check("FHLMC","TC10 Payment Deferral DLQ=6 eligible",
  L({delinquencyMonths:"6", fhlmcHardshipResolved:true, fhlmcCanResumeFull:true, fhlmcLoanAge:"24", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcCumulativeDeferredMonths:"0", fhlmcPriorDeferralMonths:"0"}),
  {"FHLMC Payment Deferral": true});

// TC-FHLMC-11: Payment Deferral fails cumulative>=12
check("FHLMC","TC11 Payment Deferral fails cumulative>=12",
  L({delinquencyMonths:"4", fhlmcHardshipResolved:true, fhlmcCanResumeFull:true, fhlmcLoanAge:"24", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcCumulativeDeferredMonths:"12"}),
  {"FHLMC Payment Deferral": false});

// TC-FHLMC-12: Forbearance Plan eligible (temporary non-disaster)
check("FHLMC","TC12 Forbearance Plan eligible temporary",
  L({hardshipType:"Reduction in Income", fhlmcLongTermHardship:false, propertyCondition:"Standard"}),
  {"FHLMC Forbearance Plan": true});

// TC-FHLMC-13: Forbearance Plan eligible (unemployment)
check("FHLMC","TC13 Forbearance Plan eligible unemployment",
  L({hardshipType:"Unemployment", fhlmcLongTermHardship:true, propertyCondition:"Standard"}),
  {"FHLMC Forbearance Plan": true});

// TC-FHLMC-14: Forbearance Plan fails disaster
check("FHLMC","TC14 Forbearance Plan fails disaster",
  L({hardshipType:"Disaster", fhlmcLongTermHardship:false, propertyCondition:"Standard"}),
  {"FHLMC Forbearance Plan": false});

// TC-FHLMC-15: Forbearance Plan fails long-term hardship (not unemployed)
check("FHLMC","TC15 Forbearance Plan fails long-term non-unemp",
  L({hardshipType:"Reduction in Income", fhlmcLongTermHardship:true, propertyCondition:"Standard", fhlmcUnemployed:false}),
  {"FHLMC Forbearance Plan": false});

// TC-FHLMC-16: Flex Mod eligible (standard)
check("FHLMC","TC16 Flex Mod eligible standard",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"24", fhlmcLongTermHardship:true, fhlmcVerifiedIncome:true, fhlmcRecourse:false, fhlmcPriorModCount:"0"}),
  {"Freddie Mac Flex Modification": true});

// TC-FHLMC-17: Flex Mod fails DLQ<2 no imminent default
check("FHLMC","TC17 Flex Mod fails DLQ=1 no ID",
  L({delinquencyMonths:"1", hardshipType:"Reduction in Income", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"24", fhlmcLongTermHardship:true, fhlmcVerifiedIncome:true, fhlmcImminentDefault:false}),
  {"Freddie Mac Flex Modification": false});

// TC-FHLMC-18: Flex Mod fails recourse
check("FHLMC","TC18 Flex Mod fails recourse",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"24", fhlmcLongTermHardship:true, fhlmcVerifiedIncome:true, fhlmcRecourse:true}),
  {"Freddie Mac Flex Modification": false});

// TC-FHLMC-19: Flex Mod fails non-conventional
check("FHLMC","TC19 Flex Mod fails non-conventional",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", fhlmcMortgageType:"FHA", lienPosition:"First", fhlmcLoanAge:"24", fhlmcLongTermHardship:true, fhlmcVerifiedIncome:true}),
  {"Freddie Mac Flex Modification": false});

// TC-FHLMC-20: Flex Mod fails loan age <12
check("FHLMC","TC20 Flex Mod fails loan age<12",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"11", fhlmcLongTermHardship:true, fhlmcVerifiedIncome:true}),
  {"Freddie Mac Flex Modification": false});

// TC-FHLMC-21: Flex Mod fails prior mods>=3
check("FHLMC","TC21 Flex Mod fails prior mods>=3",
  L({delinquencyMonths:"3", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"24", fhlmcLongTermHardship:true, fhlmcVerifiedIncome:true, fhlmcPriorModCount:"3"}),
  {"Freddie Mac Flex Modification": false});

// TC-FHLMC-22: Flex Mod Streamlined eligible (90d DLQ)
check("FHLMC","TC22 Flex Mod Streamlined eligible",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"24", fhlmcRecourse:false, fhlmcPriorModCount:"0"}),
  {"Freddie Mac Flex Modification (Streamlined)": true});

// TC-FHLMC-23: Flex Mod Streamlined fails DLQ<3
check("FHLMC","TC23 Flex Mod Streamlined fails DLQ=2",
  L({delinquencyMonths:"2", hardshipType:"Reduction in Income", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"24", fhlmcRecourse:false, fhlmcPriorModCount:"0", fhlmcStepRateMortgage:false}),
  {"Freddie Mac Flex Modification (Streamlined)": false});

// TC-FHLMC-24: Flex Mod Disaster eligible
check("FHLMC","TC24 Flex Mod Disaster eligible",
  L({hardshipType:"Disaster", fhlmcDisasterHardship:true, fhlmcFEMADesignation:true, fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcDLQAtDisaster:"0", fhlmcRecourse:false}),
  {"Freddie Mac Flex Modification (Disaster)": true});

// TC-FHLMC-25: Flex Mod Disaster fails no FEMA
check("FHLMC","TC25 Flex Mod Disaster fails no FEMA",
  L({hardshipType:"Disaster", fhlmcDisasterHardship:true, fhlmcFEMADesignation:false, fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcDLQAtDisaster:"0"}),
  {"Freddie Mac Flex Modification (Disaster)": false});

// TC-FHLMC-26: Disaster Payment Deferral eligible
check("FHLMC","TC26 Disaster Payment Deferral eligible",
  L({delinquencyMonths:"4", hardshipType:"Disaster", fhlmcDisasterHardship:true, fhlmcFEMADesignation:true, fhlmcHardshipResolved:true, fhlmcCanResumeFull:true, lienPosition:"First", fhlmcMortgageType:"Conventional", fhlmcDLQAtDisaster:"0"}),
  {"FHLMC Disaster Payment Deferral": true});

// TC-FHLMC-27: Disaster Payment Deferral fails DLQ at disaster >=2
check("FHLMC","TC27 Disaster Payment Deferral fails DLQ at disaster>=2",
  L({delinquencyMonths:"4", hardshipType:"Disaster", fhlmcDisasterHardship:true, fhlmcFEMADesignation:true, fhlmcHardshipResolved:true, fhlmcCanResumeFull:true, lienPosition:"First", fhlmcMortgageType:"Conventional", fhlmcDLQAtDisaster:"2"}),
  {"FHLMC Disaster Payment Deferral": false});

// TC-FHLMC-28: Short Sale eligible
check("FHLMC","TC28 Short Sale eligible",
  L({hardshipType:"Reduction in Income", borrowerIntentRetention:false, fhlmcMortgageType:"Conventional"}),
  {"Freddie Mac Short Sale": true});

// TC-FHLMC-29: Short Sale fails retain intent
check("FHLMC","TC29 Short Sale fails retain intent",
  L({hardshipType:"Reduction in Income", borrowerIntentRetention:true, fhlmcMortgageType:"Conventional"}),
  {"Freddie Mac Short Sale": false});

// TC-FHLMC-30: Short Sale fails non-conventional
check("FHLMC","TC30 Short Sale fails non-conventional",
  L({hardshipType:"Reduction in Income", borrowerIntentRetention:false, fhlmcMortgageType:"FHA"}),
  {"Freddie Mac Short Sale": false});

// TC-FHLMC-31: FHLMC DIL eligible
check("FHLMC","TC31 DIL eligible",
  L({hardshipType:"Reduction in Income", borrowerIntentRetention:false, fhlmcMortgageType:"Conventional", meetsDILRequirements:true}),
  {"Freddie Mac Deed-in-Lieu": true});

// TC-FHLMC-32: DIL fails meetsDILRequirements=false
check("FHLMC","TC32 DIL fails requirements not met",
  L({hardshipType:"Reduction in Income", borrowerIntentRetention:false, fhlmcMortgageType:"Conventional", meetsDILRequirements:false}),
  {"Freddie Mac Deed-in-Lieu": false});

// TC-FHLMC-33: Flex Mod fails disaster hardship
check("FHLMC","TC33 Flex Mod standard fails disaster",
  L({delinquencyMonths:"3", hardshipType:"Disaster", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"24", fhlmcLongTermHardship:true, fhlmcVerifiedIncome:true}),
  {"Freddie Mac Flex Modification": false});

// TC-FHLMC-34: Active TPP blocks Flex Mod
check("FHLMC","TC34 Active TPP blocks Flex Mod",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"24", fhlmcLongTermHardship:true, fhlmcVerifiedIncome:true, fhlmcActiveTPP:true}),
  {"Freddie Mac Flex Modification": false});

// TC-FHLMC-35: Active Forbearance blocks Flex Mod
check("FHLMC","TC35 Active Forbearance blocks Flex Mod",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"24", fhlmcLongTermHardship:true, fhlmcVerifiedIncome:true, fhlmcActiveForbearance:true}),
  {"Freddie Mac Flex Modification": false});

// TC-FHLMC-36: Unexpired offer blocks Payment Deferral
check("FHLMC","TC36 Unexpired offer blocks Payment Deferral",
  L({delinquencyMonths:"4", fhlmcHardshipResolved:true, fhlmcCanResumeFull:true, fhlmcLoanAge:"24", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcCumulativeDeferredMonths:"0", fhlmcPriorDeferralMonths:"0", fhlmcUnexpiredOffer:true}),
  {"FHLMC Payment Deferral": false});

// TC-FHLMC-37: Approved liquidation blocks Payment Deferral
check("FHLMC","TC37 Approved liquidation blocks Payment Deferral",
  L({delinquencyMonths:"4", fhlmcHardshipResolved:true, fhlmcCanResumeFull:true, fhlmcLoanAge:"24", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcCumulativeDeferredMonths:"0", fhlmcPriorDeferralMonths:"0", fhlmcApprovedLiquidationOption:true}),
  {"FHLMC Payment Deferral": false});

// TC-FHLMC-38: Failed flex TPP blocks Flex Mod
check("FHLMC","TC38 Failed Flex TPP blocks Flex Mod",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"24", fhlmcLongTermHardship:true, fhlmcVerifiedIncome:true, fhlmcFailedFlexTPP12Mo:true}),
  {"Freddie Mac Flex Modification": false});

// TC-FHLMC-39: Prior Flex Mod 60DLQ blocks Flex Mod
check("FHLMC","TC39 Prior Flex Mod 60DLQ blocks Flex Mod",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"24", fhlmcLongTermHardship:true, fhlmcVerifiedIncome:true, fhlmcPriorFlexMod60DLQ:true}),
  {"Freddie Mac Flex Modification": false});

// TC-FHLMC-40: Condemned blocks Forbearance Plan
check("FHLMC","TC40 Condemned blocks Forbearance Plan",
  L({hardshipType:"Reduction in Income", fhlmcLongTermHardship:false, propertyCondition:"Condemned"}),
  {"FHLMC Forbearance Plan": false});

// TC-FHLMC-41: Investment property hard stop <60DLQ blocks Flex Mod
check("FHLMC","TC41 Investment property <60DLQ hard stop",
  L({delinquencyMonths:"1", hardshipType:"Reduction in Income", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"24", fhlmcLongTermHardship:true, fhlmcVerifiedIncome:true, fhlmcPropertyType:"Investment Property"}),
  {"Freddie Mac Flex Modification": false});

// TC-FHLMC-42: Investment property passes at 60+DLQ
check("FHLMC","TC42 Investment property 60+DLQ passes Flex Mod",
  L({delinquencyMonths:"2", hardshipType:"Reduction in Income", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"24", fhlmcLongTermHardship:true, fhlmcVerifiedIncome:true, fhlmcPropertyType:"Investment Property"}),
  {"Freddie Mac Flex Modification": true});

// TC-FHLMC-43: Forbearance Plan approvedLiquidation blocks
check("FHLMC","TC43 Forbearance Plan blocked by liquidation",
  L({hardshipType:"Reduction in Income", fhlmcLongTermHardship:false, propertyCondition:"Standard", fhlmcApprovedLiquidationOption:true}),
  {"FHLMC Forbearance Plan": false});

// TC-FHLMC-44: Flex Mod no-income verification fails
check("FHLMC","TC44 Flex Mod fails no verified income",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"24", fhlmcLongTermHardship:true, fhlmcVerifiedIncome:false}),
  {"Freddie Mac Flex Modification": false});

// TC-FHLMC-45: Flex Mod Streamlined doesn't require income verification
check("FHLMC","TC45 Flex Mod Streamlined no income req",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"24", fhlmcVerifiedIncome:false, fhlmcRecourse:false, fhlmcPriorModCount:"0"}),
  {"Freddie Mac Flex Modification (Streamlined)": true});

// TC-FHLMC-46: Disaster Payment Deferral fails current DLQ>12
check("FHLMC","TC46 Disaster Payment Deferral fails DLQ>12",
  L({delinquencyMonths:"13", hardshipType:"Disaster", fhlmcDisasterHardship:true, fhlmcFEMADesignation:true, fhlmcHardshipResolved:true, fhlmcCanResumeFull:true, lienPosition:"First", fhlmcMortgageType:"Conventional", fhlmcDLQAtDisaster:"0"}),
  {"FHLMC Disaster Payment Deferral": false});

// TC-FHLMC-47: Disaster Payment Deferral DLQ=1 boundary
check("FHLMC","TC47 Disaster Payment Deferral DLQ=1",
  L({delinquencyMonths:"1", hardshipType:"Disaster", fhlmcDisasterHardship:true, fhlmcFEMADesignation:true, fhlmcHardshipResolved:true, fhlmcCanResumeFull:true, lienPosition:"First", fhlmcMortgageType:"Conventional", fhlmcDLQAtDisaster:"0"}),
  {"FHLMC Disaster Payment Deferral": true});

// TC-FHLMC-48: Flex Mod imminent default valid rules
check("FHLMC","TC48 Flex Mod imminent default eligible",
  L({delinquencyMonths:"1", hardshipType:"Reduction in Income", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"24", fhlmcLongTermHardship:true, fhlmcVerifiedIncome:true, fhlmcImminentDefault:true, fhlmcCashReservesLt25k:true, fhlmcPropertyType:"Primary Residence", fhlmcFICO:"600"}),
  {"Freddie Mac Flex Modification": true});

// TC-FHLMC-49: Multiple options eligible at once
check("FHLMC","TC49 Multiple options eligible",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", fhlmcMortgageType:"Conventional", lienPosition:"First", fhlmcLoanAge:"24", fhlmcLongTermHardship:true, fhlmcVerifiedIncome:true}),
  {"FHLMC Reinstatement": true, "Freddie Mac Flex Modification": true, "Freddie Mac Flex Modification (Streamlined)": true});

// TC-FHLMC-50: Second lien blocks Payment Deferral
check("FHLMC","TC50 Second lien blocks Payment Deferral",
  L({delinquencyMonths:"4", fhlmcHardshipResolved:true, fhlmcCanResumeFull:true, fhlmcLoanAge:"24", fhlmcMortgageType:"Conventional", lienPosition:"Second", fhlmcCumulativeDeferredMonths:"0", fhlmcPriorDeferralMonths:"0"}),
  {"FHLMC Payment Deferral": false});

// ─── FNMA TEST CASES (50) ─────────────────────────────────────────────────────
// TC-FNMA-01: Reinstatement eligible
check("FNMA","TC01 Reinstatement eligible",
  L({delinquencyMonths:"3"}),
  {"FNMA Reinstatement": true});

// TC-FNMA-02: Reinstatement ineligible DLQ=0
check("FNMA","TC02 Reinstatement ineligible DLQ=0",
  L({delinquencyMonths:"0", arrearagesToCapitalize:"0"}),
  {"FNMA Reinstatement": false});

// TC-FNMA-03: Forbearance Plan eligible principal residence
check("FNMA","TC03 Forbearance Plan eligible principal res",
  L({hardshipType:"Reduction in Income", fnmaPropertyType:"Principal Residence", propertyCondition:"Standard"}),
  {"FNMA Forbearance Plan": true});

// TC-FNMA-04: Forbearance Plan fails condemned
check("FNMA","TC04 Forbearance Plan fails condemned",
  L({hardshipType:"Reduction in Income", fnmaPropertyType:"Principal Residence", propertyCondition:"Condemned"}),
  {"FNMA Forbearance Plan": false});

// TC-FNMA-05: Forbearance Plan fails non-principal non-disaster
check("FNMA","TC05 Forbearance Plan fails investment non-disaster",
  L({hardshipType:"Reduction in Income", fnmaPropertyType:"Investment Property", fnmaDisasterHardship:false}),
  {"FNMA Forbearance Plan": false});

// TC-FNMA-06: Forbearance Plan passes investment with disaster
check("FNMA","TC06 Forbearance Plan passes investment + disaster",
  L({hardshipType:"Disaster", fnmaPropertyType:"Investment Property", fnmaDisasterHardship:true}),
  {"FNMA Forbearance Plan": true});

// TC-FNMA-07: Repayment Plan eligible
check("FNMA","TC07 Repayment Plan eligible",
  L({hardshipType:"Reduction in Income", fnmaHardshipResolved:true, propertyCondition:"Standard"}),
  {"FNMA Repayment Plan": true});

// TC-FNMA-08: Repayment Plan fails disaster
check("FNMA","TC08 Repayment Plan fails disaster",
  L({hardshipType:"Disaster", fnmaHardshipResolved:true, propertyCondition:"Standard"}),
  {"FNMA Repayment Plan": false});

// TC-FNMA-09: Repayment Plan fails hardship not resolved
check("FNMA","TC09 Repayment Plan fails not resolved",
  L({hardshipType:"Reduction in Income", fnmaHardshipResolved:false, propertyCondition:"Standard"}),
  {"FNMA Repayment Plan": false});

// TC-FNMA-10: Payment Deferral happy path
check("FNMA","TC10 Payment Deferral eligible",
  L({delinquencyMonths:"4", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaHardshipResolved:true, fnmaCanResumeFull:true, fnmaCannotReinstate:true, fnmaCumulativeDeferredMonths:"0", fnmaPriorDeferralMonths:"0", fnmaWithin36MonthsMaturity:false}),
  {"FNMA Payment Deferral": true});

// TC-FNMA-11: Payment Deferral fails DLQ=1
check("FNMA","TC11 Payment Deferral fails DLQ=1",
  L({delinquencyMonths:"1", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaHardshipResolved:true, fnmaCanResumeFull:true, fnmaCannotReinstate:true}),
  {"FNMA Payment Deferral": false});

// TC-FNMA-12: Payment Deferral fails DLQ=7
check("FNMA","TC12 Payment Deferral fails DLQ=7",
  L({delinquencyMonths:"7", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaHardshipResolved:true, fnmaCanResumeFull:true, fnmaCannotReinstate:true}),
  {"FNMA Payment Deferral": false});

// TC-FNMA-13: Payment Deferral fails near maturity
check("FNMA","TC13 Payment Deferral fails near maturity",
  L({delinquencyMonths:"4", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaHardshipResolved:true, fnmaCanResumeFull:true, fnmaCannotReinstate:true, fnmaCumulativeDeferredMonths:"0", fnmaPriorDeferralMonths:"0", fnmaWithin36MonthsMaturity:true}),
  {"FNMA Payment Deferral": false});

// TC-FNMA-14: Payment Deferral fails cumulative>=12
check("FNMA","TC14 Payment Deferral fails cumulative>=12",
  L({delinquencyMonths:"4", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaHardshipResolved:true, fnmaCanResumeFull:true, fnmaCannotReinstate:true, fnmaCumulativeDeferredMonths:"12", fnmaPriorDeferralMonths:"0", fnmaWithin36MonthsMaturity:false}),
  {"FNMA Payment Deferral": false});

// TC-FNMA-15: Payment Deferral fails second lien
check("FNMA","TC15 Payment Deferral fails second lien",
  L({delinquencyMonths:"4", hardshipType:"Reduction in Income", lienPosition:"Second", fnmaLoanAge:"24", fnmaHardshipResolved:true, fnmaCanResumeFull:true, fnmaCannotReinstate:true, fnmaCumulativeDeferredMonths:"0", fnmaPriorDeferralMonths:"0"}),
  {"FNMA Payment Deferral": false});

// TC-FNMA-16: Fannie Mae Flex Mod eligible
check("FNMA","TC16 Flex Mod eligible",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaPriorModCount:"0"}),
  {"Fannie Mae Flex Modification": true});

// TC-FNMA-17: Flex Mod fails DLQ<2 no ID
check("FNMA","TC17 Flex Mod fails DLQ=1 no ID",
  L({delinquencyMonths:"1", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaImminentDefault:false}),
  {"Fannie Mae Flex Modification": false});

// TC-FNMA-18: Flex Mod fails loan age<12
check("FNMA","TC18 Flex Mod fails loan age<12",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"11"}),
  {"Fannie Mae Flex Modification": false});

// TC-FNMA-19: Flex Mod fails prior mods>=3
check("FNMA","TC19 Flex Mod fails prior mods>=3",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaPriorModCount:"3"}),
  {"Fannie Mae Flex Modification": false});

// TC-FNMA-20: Flex Mod fails failed TPP
check("FNMA","TC20 Flex Mod fails failed TPP",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaFailedTPP12Months:true}),
  {"Fannie Mae Flex Modification": false});

// TC-FNMA-21: Flex Mod fails re-default
check("FNMA","TC21 Flex Mod fails re-default",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaReDefaulted12Months:true}),
  {"Fannie Mae Flex Modification": false});

// TC-FNMA-22: Flex Mod Streamlined eligible (90d DLQ)
check("FNMA","TC22 Flex Mod Streamlined eligible",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaPriorModCount:"0"}),
  {"Fannie Mae Flex Modification (Streamlined)": true});

// TC-FNMA-23: Flex Mod Streamlined fails DLQ=2
check("FNMA","TC23 Flex Mod Streamlined fails DLQ=2",
  L({delinquencyMonths:"2", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24"}),
  {"Fannie Mae Flex Modification (Streamlined)": false});

// TC-FNMA-24: Flex Mod Disaster eligible
check("FNMA","TC24 Flex Mod Disaster eligible",
  L({delinquencyMonths:"3", hardshipType:"Disaster", fnmaDisasterHardship:true, fnmaFEMADesignation:true, lienPosition:"First", fnmaDelinquencyAtDisaster:"0"}),
  {"Fannie Mae Flex Modification (Disaster)": true});

// TC-FNMA-25: Flex Mod Disaster fails no FEMA
check("FNMA","TC25 Flex Mod Disaster fails no FEMA",
  L({delinquencyMonths:"3", hardshipType:"Disaster", fnmaDisasterHardship:true, fnmaFEMADesignation:false, fnmaInsuredLoss:false, lienPosition:"First", fnmaDelinquencyAtDisaster:"0"}),
  {"Fannie Mae Flex Modification (Disaster)": false});

// TC-FNMA-26: Flex Mod Disaster fails DLQ at disaster>=2
check("FNMA","TC26 Flex Mod Disaster fails DLQ at disaster>=2",
  L({delinquencyMonths:"3", hardshipType:"Disaster", fnmaDisasterHardship:true, fnmaFEMADesignation:true, lienPosition:"First", fnmaDelinquencyAtDisaster:"2"}),
  {"Fannie Mae Flex Modification (Disaster)": false});

// TC-FNMA-27: Disaster Payment Deferral eligible
check("FNMA","TC27 Disaster Payment Deferral eligible",
  L({delinquencyMonths:"4", hardshipType:"Disaster", fnmaDisasterHardship:true, fnmaFEMADesignation:true, lienPosition:"First", fnmaDelinquencyAtDisaster:"0", fnmaHardshipResolved:true, fnmaCanResumeFull:true, fnmaCannotReinstate:true, fnmaCumulativeDeferredMonths:"0", fnmaPriorDeferralMonths:"0", fnmaWithin36MonthsMaturity:false, fnmaSameDlisasterPriorDeferral:false}),
  {"FNMA Disaster Payment Deferral": true});

// TC-FNMA-28: Disaster Payment Deferral DLQ=1 boundary
check("FNMA","TC28 Disaster Payment Deferral DLQ=1",
  L({delinquencyMonths:"1", hardshipType:"Disaster", fnmaDisasterHardship:true, fnmaFEMADesignation:true, lienPosition:"First", fnmaDelinquencyAtDisaster:"0", fnmaHardshipResolved:true, fnmaCanResumeFull:true, fnmaCannotReinstate:true, fnmaCumulativeDeferredMonths:"0", fnmaPriorDeferralMonths:"0", fnmaWithin36MonthsMaturity:false}),
  {"FNMA Disaster Payment Deferral": true});

// TC-FNMA-29: Disaster Payment Deferral fails DLQ=0
check("FNMA","TC29 Disaster Payment Deferral fails DLQ=0",
  L({delinquencyMonths:"0", hardshipType:"Disaster", fnmaDisasterHardship:true, fnmaFEMADesignation:true, lienPosition:"First", fnmaDelinquencyAtDisaster:"0", fnmaHardshipResolved:true, fnmaCanResumeFull:true, fnmaCannotReinstate:true}),
  {"FNMA Disaster Payment Deferral": false});

// TC-FNMA-30: Disaster Payment Deferral fails same disaster
check("FNMA","TC30 Disaster Payment Deferral fails same disaster",
  L({delinquencyMonths:"4", hardshipType:"Disaster", fnmaDisasterHardship:true, fnmaFEMADesignation:true, lienPosition:"First", fnmaDelinquencyAtDisaster:"0", fnmaHardshipResolved:true, fnmaCanResumeFull:true, fnmaCannotReinstate:true, fnmaSameDlisasterPriorDeferral:true}),
  {"FNMA Disaster Payment Deferral": false});

// TC-FNMA-31: Short Sale eligible
check("FNMA","TC31 Short Sale eligible",
  L({hardshipType:"Reduction in Income", borrowerIntentRetention:false}),
  {"Fannie Mae Short Sale": true});

// TC-FNMA-32: Short Sale fails retain intent
check("FNMA","TC32 Short Sale fails retain",
  L({hardshipType:"Reduction in Income", borrowerIntentRetention:true}),
  {"Fannie Mae Short Sale": false});

// TC-FNMA-33: Mortgage Release DIL eligible
check("FNMA","TC33 Mortgage Release DIL eligible",
  L({hardshipType:"Reduction in Income", borrowerIntentRetention:false, meetsDILRequirements:true}),
  {"Fannie Mae Mortgage Release (DIL)": true});

// TC-FNMA-34: Mortgage Release fails requirements not met
check("FNMA","TC34 Mortgage Release fails requirements",
  L({hardshipType:"Reduction in Income", borrowerIntentRetention:false, meetsDILRequirements:false}),
  {"Fannie Mae Mortgage Release (DIL)": false});

// TC-FNMA-35: Recourse blocks Flex Mod
check("FNMA","TC35 Recourse blocks Flex Mod",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaRecourseArrangement:true}),
  {"Fannie Mae Flex Modification": false});

// TC-FNMA-36: Active liquidation blocks Flex Mod
check("FNMA","TC36 Active liquidation blocks Flex Mod",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaActiveLiquidation:true}),
  {"Fannie Mae Flex Modification": false});

// TC-FNMA-37: Active TPP blocks Flex Mod
check("FNMA","TC37 Active TPP blocks Flex Mod",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaActiveTPP:true}),
  {"Fannie Mae Flex Modification": false});

// TC-FNMA-38: Pending offer blocks Flex Mod
check("FNMA","TC38 Pending offer blocks Flex Mod",
  L({delinquencyMonths:"3", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaActivePendingOffer:true}),
  {"Fannie Mae Flex Modification": false});

// TC-FNMA-39: Payment Deferral via imminent default
check("FNMA","TC39 Payment Deferral via imminent default",
  L({delinquencyMonths:"1", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaImminentDefault:true, fnmaHardshipResolved:false, fnmaCanResumeFull:true, fnmaCannotReinstate:true, fnmaCumulativeDeferredMonths:"0", fnmaPriorDeferralMonths:"0", fnmaWithin36MonthsMaturity:false}),
  {"FNMA Payment Deferral": true});

// TC-FNMA-40: Flex Mod via imminent default eligible
check("FNMA","TC40 Flex Mod via imminent default",
  L({delinquencyMonths:"1", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaImminentDefault:true, fnmaPropertyType:"Principal Residence", fnmaLongTermHardship:true, fnmaCashReservesLt3Mo:true, fnmaFICO:"600", fnmaPriorModCount:"0"}),
  {"Fannie Mae Flex Modification": true});

// TC-FNMA-41: Payment Deferral DLQ=2 boundary
check("FNMA","TC41 Payment Deferral DLQ=2 boundary eligible",
  L({delinquencyMonths:"2", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaHardshipResolved:true, fnmaCanResumeFull:true, fnmaCannotReinstate:true, fnmaCumulativeDeferredMonths:"0", fnmaPriorDeferralMonths:"0", fnmaWithin36MonthsMaturity:false}),
  {"FNMA Payment Deferral": true});

// TC-FNMA-42: Payment Deferral DLQ=6 boundary
check("FNMA","TC42 Payment Deferral DLQ=6 boundary eligible",
  L({delinquencyMonths:"6", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaHardshipResolved:true, fnmaCanResumeFull:true, fnmaCannotReinstate:true, fnmaCumulativeDeferredMonths:"0", fnmaPriorDeferralMonths:"0", fnmaWithin36MonthsMaturity:false}),
  {"FNMA Payment Deferral": true});

// TC-FNMA-43: Flex Mod disaster hardship fails standard
check("FNMA","TC43 Flex Mod standard fails disaster",
  L({delinquencyMonths:"3", hardshipType:"Disaster", lienPosition:"First", fnmaLoanAge:"24"}),
  {"Fannie Mae Flex Modification": false});

// TC-FNMA-44: Forbearance Plan abandonment blocks
check("FNMA","TC44 Forbearance Plan fails abandoned",
  L({hardshipType:"Reduction in Income", fnmaPropertyType:"Principal Residence", occupancyAbandoned:true}),
  {"FNMA Forbearance Plan": false});

// TC-FNMA-45: Multiple eligible simultaneously
check("FNMA","TC45 Multiple eligible simultaneously",
  L({delinquencyMonths:"4", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaHardshipResolved:true, fnmaCanResumeFull:true, fnmaCannotReinstate:true, fnmaCumulativeDeferredMonths:"0", fnmaPriorDeferralMonths:"0", fnmaWithin36MonthsMaturity:false}),
  {"FNMA Reinstatement": true, "FNMA Payment Deferral": true, "Fannie Mae Flex Modification": true, "Fannie Mae Flex Modification (Streamlined)": true});

// TC-FNMA-46: Loan age <12 fails Payment Deferral
check("FNMA","TC46 Loan age <12 fails Payment Deferral",
  L({delinquencyMonths:"4", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"11", fnmaHardshipResolved:true, fnmaCanResumeFull:true, fnmaCannotReinstate:true, fnmaCumulativeDeferredMonths:"0", fnmaPriorDeferralMonths:"0"}),
  {"FNMA Payment Deferral": false});

// TC-FNMA-47: Flex Mod DLQ=2 passes (60day)
check("FNMA","TC47 Flex Mod DLQ=2 eligible",
  L({delinquencyMonths:"2", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaPriorModCount:"0"}),
  {"Fannie Mae Flex Modification": true});

// TC-FNMA-48: Failed TPP blocks Payment Deferral
check("FNMA","TC48 Failed TPP blocks Payment Deferral",
  L({delinquencyMonths:"4", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaHardshipResolved:true, fnmaCanResumeFull:true, fnmaCannotReinstate:true, fnmaCumulativeDeferredMonths:"0", fnmaPriorDeferralMonths:"0", fnmaWithin36MonthsMaturity:false, fnmaFailedTPP12Months:true}),
  {"FNMA Payment Deferral": false});

// TC-FNMA-49: Disaster Flex Mod fails DLQ at disaster >=2
check("FNMA","TC49 Disaster Flex Mod fails DLQ at disaster>=2",
  L({delinquencyMonths:"4", hardshipType:"Disaster", fnmaDisasterHardship:true, fnmaFEMADesignation:true, lienPosition:"First", fnmaDelinquencyAtDisaster:"2"}),
  {"Fannie Mae Flex Modification (Disaster)": false});

// TC-FNMA-50: Insured loss (no FEMA) qualifies Disaster Payment Deferral
check("FNMA","TC50 Insured loss no FEMA Disaster Deferral",
  L({delinquencyMonths:"4", hardshipType:"Disaster", fnmaDisasterHardship:true, fnmaFEMADesignation:false, fnmaInsuredLoss:true, lienPosition:"First", fnmaDelinquencyAtDisaster:"0", fnmaHardshipResolved:true, fnmaCanResumeFull:true, fnmaCannotReinstate:true, fnmaCumulativeDeferredMonths:"0", fnmaPriorDeferralMonths:"0", fnmaWithin36MonthsMaturity:false, fnmaSameDlisasterPriorDeferral:false}),
  {"FNMA Disaster Payment Deferral": true});

// ─── REPORT ───────────────────────────────────────────────────────────────────
const total = totalPass + totalFail;
console.log("\\n=== LOSS MITIGATION ELIGIBILITY TEST RESULTS ===\\n");
console.log(`Total tests : ${total}`);
console.log(`PASSED      : ${totalPass}`);
console.log(`FAILED      : ${totalFail}`);
console.log(`Accuracy    : ${(totalPass/total*100).toFixed(1)}%\\n`);

console.log("Per-Evaluator Summary:");
for (const [name, s] of Object.entries(summary)) {
  const pct = ((s.pass/(s.pass+s.fail))*100).toFixed(1);
  console.log(`  ${name.padEnd(6)}: ${s.pass}/${s.pass+s.fail} passed (${pct}%)`);
}

if (failures.length > 0) {
  console.log("\\nFAILURES:");
  for (const f of failures) {
    console.log(`  [${f.evaluatorName}] ${f.testName}`);
    console.log(`    Option  : "${f.option}"`);
    console.log(`    Expected: ${f.expected}`);
    console.log(`    Actual  : ${f.actual}`);
  }
} else {
  console.log("\\nAll tests passed!");
}
'''

with io.open(path, 'a', encoding='utf-8') as f:
    f.write(tests)

print("Test cases and runner appended")
