import { useState, useCallback, useMemo } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LOAN_TYPES = ["FHA","USDA","VA","FNMA","FHLMC"];
const TABS = ["inputs","results","audit","report","compare"];
const TAB_LABELS = { inputs:"📋 Inputs", results:"✅ Results", audit:"🔍 Audit Trail", report:"📄 Report", compare:"⚖️ Compare" };
const HARDSHIP_TYPES = ["Reduction in Income","Unemployment","Business Failure","Increase in Housing Expenses","Property Problem","Unknown","Disaster"];
const STANDARD_HARDSHIPS = ["Unemployment","Business Failure","Increase in Housing Expenses","Property Problem","Reduction in Income","Unknown"];

// ─── INITIAL STATE ────────────────────────────────────────────────────────────
const initLoan = {
  loanType:"FHA",
  loanNumber:"", borrowerName:"",
  repayMonths:"24",
  // Financials
  upb:"", originalUpb:"", currentEscrow:"", currentPI:"", currentPITI:"",
  grossMonthlyIncome:"", currentInterestRate:"", pmmsRate:"", modifiedPI:"",
  arrearagesToCapitalize:"", escrowShortage:"", legalFees:"", lateFees:"",
  priorPartialClaimBalance:"", partialClaimPct:"",
  targetPayment:"",
  // Dates
  originalMaturityDate:"", noteFirstPaymentDate:"", noteTerm:"",
  approvalEffectiveDate:"",
  // Delinquency
  delinquencyMonths:"", delinquencyDays:"",
  // Hardship/Property
  hardshipType:"Reduction in Income", hardshipDuration:"Resolved",
  lienPosition:"First", occupancyStatus:"Owner Occupied",
  propertyCondition:"Standard", propertyDisposition:"Principal Residence",
  foreclosureActive:false, occupancyAbandoned:false, continuousIncome:true,
  borrowerIntentRetention:true,
  // Modification flags
  canAchieveTargetByReamort:true, currentRateAtOrBelowMarket:true,
  currentPITIAtOrBelowTarget:true, borrowerConfirmedCannotAffordCurrent:false,
  borrowerCanAffordModifiedPayment:false, borrowerCanAffordReinstateOrRepay:false,
  borrowerCanAffordCurrentMonthly:false, modifiedPILe90PctOld:false,
  meetsPFSRequirements:false, outstandingDebtUncurable:false, meetsDILRequirements:false,
  // FHA
  priorFHAHAMPMonths:"", verifiedDisaster:false, propertyInPDMA:false,
  propertySubstantiallyDamaged:false, repairsCompleted:false,
  principalResidencePreDisaster:true, currentOrLe30DaysAtDisaster:false,
  incomeGePreDisaster:false, incomeDocProvided:true,
  arrearsExceed30PctLimit:false, modPaymentLe40PctGMI:false,
  unemployed:false, comboPaymentLe40PctIncome:false, failedTPP:false,
  canRepayWithin6Months:false, canRepayWithin24Months:true,
  canAchieveTargetBy480Reamort:false,
  requestedForbearance:false, verifiedUnemployment:false,
  ineligibleAllRetention:false, propertyListedForSale:false, assumptionInProcess:false,
  // USDA
  usdaUpbGe5000:true, usdaPaymentsMade12:true, usdaBankruptcyNotActive:true,
  usdaLitigationNotActive:true, usdaPriorFailedStreamlineTPP:false,
  usdaNumPrevMods:"0", usdaForeclosureSaleGe60Away:true,
  usdaBorrowerCanResumeCurrent:false, usdaHardshipDurationResolved:true,
  usdaLoanModIneligible:false, usdaBorrowerCannotCureDLQWithin12:false,
  usdaForbearancePeriodLt12:true, usdaTotalDLQLt12:true,
  usdaHardshipNotExcluded:true, usdaNewPaymentLe200pct:true,
  usdaBorrowerPositiveNetIncome:true, usdaPriorWorkoutDisasterForbearance:false,
  usdaHardshipNotResolved:true, usdaDLQGe12Contractual:false,
  usdaDLQAt30AtDisaster:false, usdaLoanGe60DLQ:false, usdaLoanGe30DaysDLQ:false,
  usdaPrevWorkoutForbearance:false, usdaWorkoutStateActivePassed:false,
  usdaEligibleForDisasterExtension:false, usdaEligibleForDisasterMod:false,
  usdaPriorWorkoutNotMRA:true, usdaReinstatementLtMRACap:true,
  usdaBorrowerCanResumePmtFalse:true, usdaPostModPITILePreMod:true,
  usdaDLQGt30:false, usdaCompleteBRP:false,
  usdaDLQLe60AndBRP:false, usdaDLQGe60AndDisposition:false,
  usdaPriorWorkoutCompSaleFailed:false,
  // FNMA
  fnmaLoanAge:"24",
  fnmaPropertyType:"Principal Residence",
  fnmaHardshipResolved:false,
  fnmaCanResumeFull:false,
  fnmaCannotReinstate:true,
  fnmaImminentDefault:false,
  fnmaWithin36MonthsMaturity:false,
  fnmaPriorDeferralMonths:"24",
  fnmaCumulativeDeferredMonths:"0",
  fnmaPriorModCount:"0",
  fnmaFailedTPP12Months:false,
  fnmaReDefaulted12Months:false,
  fnmaRecourseArrangement:false,
  fnmaActiveLiquidation:false,
  fnmaActiveRepayPlan:false,
  fnmaActivePendingOffer:false,
  fnmaActiveTPP:false,
  fnmaDisasterHardship:false,
  fnmaFEMADesignation:false,
  fnmaInsuredLoss:false,
  fnmaDelinquencyAtDisaster:"0",
  fnmaSameDlisasterPriorDeferral:false,
  // FHLMC
  fhlmcHardshipResolved:false,
  fhlmcCanResumeFull:false,
  fhlmcImminentDefault:false,
  fhlmcLoanAge:"24",
  fhlmcMortgageType:"Conventional", // Conventional, FHA, VA, RHS
  fhlmcPropertyType:"Primary Residence", // Primary Residence, Second Home, Investment Property
  fhlmcLongTermHardship:true, // long-term/permanent hardship (NOT unemployment → forbearance)
  fhlmcUnemployed:false,
  fhlmcVerifiedIncome:true,
  fhlmcCashReservesLt25k:true,
  fhlmcFICO:"680",
  fhlmcPrior30DayDLQ6Mo:false, // 2+ 30-day DLQ in past 6 months
  fhlmcHousingExpenseRatio:"", // % — pre-mod housing expense / GMI
  fhlmcPropertyValue:"", // for MTMLTV calculation
  fhlmcPostedModRate:"", // Freddie Mac posted modification interest rate
  fhlmcRecourse:false,
  fhlmcStepRateMortgage:false,
  fhlmcRateAdjustedWithin12Mo:false,
  fhlmcPriorModCount:"0",
  fhlmcFailedFlexTPP12Mo:false,
  fhlmcPriorFlexMod60DLQ:false, // prior Flex Mod → 60+ DLQ within 12mo, not cured
  fhlmcApprovedLiquidationOption:false,
  fhlmcActiveTPP:false,
  fhlmcActiveForbearance:false,
  fhlmcActiveRepayPlan:false,
  fhlmcUnexpiredOffer:false,
  fhlmcDisasterHardship:false,
  fhlmcFEMADesignation:false,
  fhlmcDLQAtDisaster:"0",
  // VA
  activeRPP:false, pmmsLeCurrentPlus1:true,
  dlqAtDisasterLt30:false, loanGe60DaysDLQ:false,
  previousWorkoutForbearance:false, workoutStateActivePassed:false,
  dlqGe12ContractualPayments:false, borrowerIntentDisposition:false,
  completeBRP:false, priorWorkoutCompromiseSaleFailed:false,
  calculatedRPPGt0:true, forbearancePeriodLt12:true, totalDLQLt12:true,
};

// ─── MATH HELPERS ─────────────────────────────────────────────────────────────
const n = v => parseFloat(v) || 0;
const fmt$ = v => v == null ? "N/A" : `$${Number(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtPct = v => v == null ? "N/A" : `${Number(v).toFixed(4)}%`;
const fmtDate = d => { if (!d) return "N/A"; try { return new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"}); } catch { return d; }};
const addMonths = (dateStr, months) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr+"T00:00:00");
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split("T")[0];
  } catch { return null; }
};
const addDays = (dateStr, days) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr+"T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  } catch { return null; }
};
const monthsBetween = (d1, d2) => {
  if (!d1 || !d2) return null;
  try {
    const a = new Date(d1+"T00:00:00"), b = new Date(d2+"T00:00:00");
    return (b.getFullYear()-a.getFullYear())*12 + (b.getMonth()-a.getMonth());
  } catch { return null; }
};
// Monthly P&I payment = P * [r(1+r)^n] / [(1+r)^n - 1]
const calcMonthlyPI = (principal, annualRate, termMonths) => {
  if (!principal || !annualRate || !termMonths) return null;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / termMonths;
  return principal * (r * Math.pow(1+r, termMonths)) / (Math.pow(1+r, termMonths) - 1);
};
// Remaining term from original note
const calcRemainingTerm = (noteFirstPmt, noteTerm, effectiveDate) => {
  if (!noteFirstPmt || !noteTerm || !effectiveDate) return null;
  const elapsed = monthsBetween(noteFirstPmt, effectiveDate);
  if (elapsed == null) return null;
  return Math.max(1, n(noteTerm) - elapsed);
};
// Original maturity date from first payment + term
const calcOriginalMaturity = (firstPmt, termMonths) => {
  if (!firstPmt || !termMonths) return null;
  return addMonths(firstPmt, n(termMonths) - 1);
};
// First payment date = effective date + 1 month (typically first of month after 30-45 days)
const calcNewFirstPayment = (effectiveDate) => {
  if (!effectiveDate) return null;
  const d = new Date(effectiveDate+"T00:00:00");
  d.setMonth(d.getMonth() + 2);
  d.setDate(1);
  return d.toISOString().split("T")[0];
};

// ─── CALCULATION ENGINE ───────────────────────────────────────────────────────
function calcApprovalTerms(optionName, l) {
  const upb = n(l.upb);
  const originalUpb = n(l.originalUpb) || upb;
  const escrow = n(l.currentEscrow);
  const arrears = n(l.arrearagesToCapitalize);
  const escShortage = n(l.escrowShortage);
  const legal = n(l.legalFees);
  const lateFees = n(l.lateFees);
  const priorPC = n(l.priorPartialClaimBalance);
  const pcPct = n(l.partialClaimPct);
  const pmms = n(l.pmmsRate);
  const currentRate = n(l.currentInterestRate);
  const gmi = n(l.grossMonthlyIncome);
  const currentEscrow = n(l.currentEscrow);
  const dlqMonths = n(l.delinquencyMonths);
  const effDate = l.approvalEffectiveDate || new Date().toISOString().split("T")[0];
  const noteFirstPmt = l.noteFirstPaymentDate;
  const noteTerm = n(l.noteTerm);
  const origMaturity = l.originalMaturityDate || calcOriginalMaturity(noteFirstPmt, noteTerm);
  const remainingTerm = calcRemainingTerm(noteFirstPmt, noteTerm, effDate);

  // Capitalized amount (used across modifications)
  const capAmount = arrears + escShortage + legal; // late fees excluded
  const newUPB = upb + capAmount;
  const newFirstPmt = calcNewFirstPayment(effDate);

  // Maturity helpers
  const mat360FromMod = addMonths(effDate, 360);
  const mat480FromOrig = noteFirstPmt ? addMonths(noteFirstPmt, 480) : null;
  const mat120PastOrig = origMaturity ? addMonths(origMaturity, 120) : null;

  // Target payment
  const target = n(l.targetPayment) || (gmi > 0 ? gmi * 0.31 : 0);

  // 30% statutory PC limit
  const maxPCAmount = originalUpb > 0 ? originalUpb * 0.30 : null;
  const remainingPCAvailable = maxPCAmount != null ? Math.max(0, maxPCAmount - priorPC) : null;

  const opt = optionName;

  // ── FHA Disaster Loan Modification ──
  if (opt === "FHA Disaster Loan Modification") {
    const newMat = mat360FromMod;
    const newPI = pmms > 0 && newUPB > 0 ? calcMonthlyPI(newUPB, pmms, 360) : null;
    const newPITI = newPI != null ? newPI + currentEscrow : null;
    return {
      "Modified Loan Amount (New UPB)": fmt$(newUPB),
      "Capitalized Amount": fmt$(capAmount),
      "  → Arrearages": fmt$(arrears),
      "  → Escrow Shortage": fmt$(escShortage),
      "  → Legal / Foreclosure Fees": fmt$(legal),
      "  → Late Fees (EXCLUDED)": lateFees > 0 ? `${fmt$(lateFees)} — NOT capitalized` : "None",
      "New Interest Rate": pmms > 0 ? fmtPct(pmms)+" (PMMS)" : "Enter PMMS rate",
      "New Loan Term": "360 months (30 years)",
      "New Monthly P&I": fmt$(newPI),
      "New Monthly Escrow": fmt$(currentEscrow || null),
      "New Monthly PITI": fmt$(newPITI),
      "New Maturity Date": fmtDate(newMat),
      "New First Payment Date": fmtDate(newFirstPmt),
      "Trial Payment Plan": "Required if income docs not provided — 3 months at new PITI",
      "Approval Notification": "2-day mail with enclosed 2-day return envelope",
    };
  }

  // ── FHA Disaster Standalone Partial Claim ──
  if (opt === "FHA Disaster Standalone Partial Claim") {
    const pcAmount = Math.min(capAmount, remainingPCAvailable || capAmount);
    return {
      "Partial Claim Amount": fmt$(pcAmount),
      "  → Arrearages": fmt$(arrears),
      "  → Escrow Shortage": fmt$(escShortage),
      "  → Legal / Foreclosure Fees": fmt$(legal),
      "  → Late Fees (EXCLUDED)": lateFees > 0 ? `${fmt$(lateFees)} — NOT included` : "None",
      "Prior Partial Claim Balance": fmt$(priorPC),
      "30% Statutory Cap": maxPCAmount != null ? fmt$(maxPCAmount) : "Enter Original UPB",
      "Remaining PC Available": remainingPCAvailable != null ? fmt$(remainingPCAvailable) : "Enter Original UPB",
      "PC Within Limit?": maxPCAmount ? (pcAmount <= remainingPCAvailable ? "✅ Yes" : "❌ Exceeds limit") : "Enter Original UPB",
      "First Mortgage Rate": "UNCHANGED — "+fmtPct(currentRate || null),
      "First Mortgage Term": "UNCHANGED",
      "First Mortgage Maturity": "UNCHANGED",
      "First Mortgage Payment": "UNCHANGED",
      "PC Lien Type": "Non-interest bearing subordinate lien",
      "PC Payoff Trigger": "Due upon sale, refinance, or payoff of first mortgage",
      "Approval Notification": "2-day mail with enclosed 2-day return envelope",
    };
  }

  // ── FHA-HAMP Standalone Loan Modification ──
  if (opt === "FHA-HAMP Standalone Loan Modification") {
    const newMat = mat360FromMod;
    const newPI = pmms > 0 && newUPB > 0 ? calcMonthlyPI(newUPB, pmms, 360) : null;
    const newPITI = newPI != null ? newPI + currentEscrow : null;
    const targetMet = target > 0 && newPITI != null ? newPITI <= target : null;
    return {
      "Modified Loan Amount (New UPB)": fmt$(newUPB),
      "Capitalized Amount": fmt$(capAmount),
      "  → Arrearages": fmt$(arrears),
      "  → Escrow Shortage": fmt$(escShortage),
      "  → Legal / Foreclosure Fees": fmt$(legal),
      "  → Late Fees (EXCLUDED)": lateFees > 0 ? `${fmt$(lateFees)} — NOT capitalized` : "None",
      "New Interest Rate": pmms > 0 ? fmtPct(pmms)+" (PMMS)" : "Enter PMMS rate",
      "New Loan Term": "360 months (30 years)",
      "New Monthly P&I": fmt$(newPI),
      "New Monthly Escrow": fmt$(currentEscrow || null),
      "New Monthly PITI": fmt$(newPITI),
      "Target Payment (31% GMI)": gmi > 0 ? fmt$(gmi*0.31) : "Enter GMI",
      "Target Payment Met?": targetMet == null ? "Enter PMMS rate & GMI" : targetMet ? "✅ Yes" : "❌ No — consider Combo Mod+PC",
      "New Maturity Date": fmtDate(newMat),
      "New First Payment Date": fmtDate(newFirstPmt),
      "Trial Payment Plan": "3-month TPP at new PITI amount",
      "Approval Notification": "2-day mail with enclosed 2-day return envelope",
    };
  }

  // ── FHA-HAMP Standalone Partial Claim ──
  if (opt === "FHA-HAMP Standalone Partial Claim") {
    const pcAmount = Math.min(capAmount, remainingPCAvailable || capAmount);
    return {
      "Partial Claim Amount": fmt$(pcAmount),
      "  → Arrearages": fmt$(arrears),
      "  → Escrow Shortage": fmt$(escShortage),
      "  → Legal / Foreclosure Fees": fmt$(legal),
      "  → Late Fees (EXCLUDED)": lateFees > 0 ? `${fmt$(lateFees)} — NOT included` : "None",
      "Prior Partial Claim Balance": fmt$(priorPC),
      "30% Statutory Cap": maxPCAmount != null ? fmt$(maxPCAmount) : "Enter Original UPB",
      "Remaining PC Available": remainingPCAvailable != null ? fmt$(remainingPCAvailable) : "Enter Original UPB",
      "First Mortgage Rate": "UNCHANGED — "+fmtPct(currentRate || null)+" (at or below market — required)",
      "First Mortgage Term": "UNCHANGED",
      "First Mortgage Maturity": "UNCHANGED",
      "First Mortgage PITI": "UNCHANGED (already at or below target payment — required)",
      "PC Lien Type": "Non-interest bearing subordinate lien",
      "PC Payoff Trigger": "Due upon sale, refinance, or payoff of first mortgage",
      "Trial Payment Plan": "Not required for Standalone PC",
      "Approval Notification": "2-day mail with enclosed 2-day return envelope",
    };
  }

  // ── FHA-HAMP Combo Mod + PC ──
  if (opt === "FHA-HAMP Combo Loan Modification & Partial Claim") {
    const newMat = mat360FromMod;
    // Mod covers arrears + escrow shortage; PC covers legal fees + any principal deferment
    const modCapAmount = arrears + escShortage;
    const newModUPB = upb + modCapAmount;
    const newPI = pmms > 0 && newModUPB > 0 ? calcMonthlyPI(newModUPB, pmms, 360) : null;
    const newPITI = newPI != null ? newPI + currentEscrow : null;
    const pcAmountBase = legal; // legal/foreclosure in PC
    const pcTotal = Math.min(pcAmountBase, remainingPCAvailable || pcAmountBase);
    const targetMet = target > 0 && newPITI != null ? newPITI <= target : null;
    const pctOfGMI = gmi > 0 && newPITI != null ? (newPITI/gmi*100).toFixed(1) : null;
    return {
      "Modified Loan Amount (New UPB — Modification)": fmt$(newModUPB),
      "  → Arrearages Capitalized in Mod": fmt$(arrears),
      "  → Escrow Shortage Capitalized in Mod": fmt$(escShortage),
      "Partial Claim Amount": fmt$(pcTotal),
      "  → Legal / Foreclosure Fees in PC": fmt$(legal),
      "  → Late Fees (EXCLUDED from both)": lateFees > 0 ? `${fmt$(lateFees)} — NOT included` : "None",
      "Prior Partial Claim Balance": fmt$(priorPC),
      "30% Statutory Cap": maxPCAmount != null ? fmt$(maxPCAmount) : "Enter Original UPB",
      "Remaining PC Available": remainingPCAvailable != null ? fmt$(remainingPCAvailable) : "Enter Original UPB",
      "New Interest Rate": pmms > 0 ? fmtPct(pmms)+" (PMMS)" : "Enter PMMS rate",
      "New Loan Term": "360 months (30 years)",
      "New Monthly P&I": fmt$(newPI),
      "New Monthly Escrow": fmt$(currentEscrow || null),
      "New Monthly PITI": fmt$(newPITI),
      "New PITI as % of GMI": pctOfGMI ? pctOfGMI+"%" : "Enter GMI",
      "Target Payment (31% GMI)": gmi > 0 ? fmt$(gmi*0.31) : "Enter GMI",
      "40% GMI Cap": gmi > 0 ? fmt$(gmi*0.40) : "Enter GMI",
      "Target Payment Met?": targetMet == null ? "Enter inputs" : targetMet ? "✅ Yes" : "❌ No — new PITI above target",
      "Modified Payment NOT Below Target?": targetMet == null ? "Enter inputs" : !targetMet ? "✅ Confirmed (PC cannot push below target)" : "N/A",
      "New Maturity Date": fmtDate(newMat),
      "New First Payment Date": fmtDate(newFirstPmt),
      "PC Lien Type": "Non-interest bearing subordinate lien",
      "PC Payoff Trigger": "Due upon sale, refinance, or payoff",
      "Trial Payment Plan": "3-month TPP at new PITI amount",
      "Approval Notification": "2-day mail with enclosed 2-day return envelope",
    };
  }

  // ── Repayment Plan ──
  if (opt === "Repayment Plan") {
    const currentPITI = n(l.currentPITI);
    const totalArrears = arrears || (currentPITI * dlqMonths);
    const repayMos = Math.min(24, Math.max(1, n(l.repayMonths) || 24));
    const monthlyCatchUp = totalArrears > 0 ? totalArrears / repayMos : null;
    const totalMonthly = monthlyCatchUp != null ? currentPITI + monthlyCatchUp : null;
    return {
      "Current Monthly PITI": fmt$(currentPITI || null),
      "Total Arrearages": fmt$(totalArrears || null),
      "Repayment Period": `${repayMos} months (max 24)`,
      "Monthly Catch-Up Amount": fmt$(monthlyCatchUp),
      "Total Monthly Installment": fmt$(totalMonthly),
      "Late Fees During Plan": "NOT assessed while performing under Repayment Plan",
      "Note": "If escrow changes during plan, monthly installment may also change",
      "First Payment Date": fmtDate(newFirstPmt),
    };
  }

  // ── Formal Forbearance ──
  if (opt === "Formal Forbearance") {
    return {
      "Forbearance Type": "Reduced or suspended payment",
      "Maximum Duration": "6 months",
      "Monthly Payment During Forbearance": "Reduced per agreement or $0 if fully suspended",
      "Late Fees": "NOT assessed during forbearance period",
      "Follow-On Required": "Repayment Plan or Permanent Home Retention Option at conclusion",
      "First Post-Forbearance Payment Date": fmtDate(addMonths(effDate, 7)),
    };
  }

  // ── Special Forbearance – Unemployment ──
  if (opt === "Special Forbearance – Unemployment") {
    const currentPITI = n(l.currentPITI);
    const maxAccrual = currentPITI * 12;
    return {
      "Forbearance Type": "Reduced or suspended payment — Unemployment",
      "Maximum Arrearage Accrual": fmt$(maxAccrual || null)+" (12 months PITI equivalent)",
      "Monthly Payment During Plan": "Suspended and/or reduced",
      "Late Fees": "NOT assessed for duration of plan",
      "Initial Period (3 months) Ends": fmtDate(addMonths(effDate, 3)),
      "First Post-Forbearance Payment (initial 3-mo)": fmtDate(addMonths(effDate, 4)),
      "First Post-Forbearance Payment (full 12-mo max)": fmtDate(addMonths(effDate, 13)),
      "Note": "Servicer may extend in 3-month increments; total accrual not to exceed 12 months PITI",
    };
  }

  // ── Payment Supplement ──
  if (opt === "Payment Supplement") {
    const currentPITI = n(l.currentPITI);
    const affordablePayment = gmi > 0 ? gmi * 0.31 : null;
    const supplementNeeded = affordablePayment != null && currentPITI > 0 ? Math.max(0, currentPITI - affordablePayment) : null;
    const pctGMI = gmi > 0 && currentPITI > 0 ? (currentPITI / gmi * 100).toFixed(1) : null;
    return {
      "Purpose": "Bridges gap between borrower's affordable payment and full PITI during unemployment",
      "Current Monthly PITI": fmt$(currentPITI || null),
      "Borrower's Affordable Payment (31% GMI)": affordablePayment != null ? fmt$(affordablePayment) : "Enter GMI",
      "Estimated Monthly Supplement Amount": supplementNeeded != null ? fmt$(supplementNeeded) : "Enter PITI & GMI",
      "Current PITI as % of GMI": pctGMI ? pctGMI+"%" : "Enter GMI & PITI",
      "Combo Payment ≤ 40% GMI?": gmi > 0 && currentPITI > 0 ? (currentPITI/gmi <= 0.40 ? "✅ Yes" : "❌ No — exceeds 40% cap") : "Enter inputs",
      "Supplement Source": "FHA — paid directly to servicer via partial claim",
      "Maximum Duration": "Up to 36 months",
      "Eligibility Basis": "Borrower unemployed AND ineligible for all standard retention options",
      "Follow-On": "Permanent loss mitigation option required upon re-employment",
    };
  }

  // ── Pre-Foreclosure Sale (PFS) — FHA ──
  if (opt === "Pre-Foreclosure Sale (PFS)") {
    const fhaNetValue = upb > 0 ? upb * 0.88 : null;
    return {
      "Outstanding UPB": fmt$(upb || null),
      "Appraisal Requirement": "FHA-approved appraiser required prior to listing",
      "FHA Net Value (88% of UPB — reference)": fhaNetValue != null ? fmt$(fhaNetValue) : "Enter UPB",
      "Minimum Net Proceeds": "Must equal or exceed FHA Net Value after closing costs",
      "Listing Period": "Up to 4 months (servicer may extend with justification)",
      "Borrower Proceeds": "$0 — seller receives no sale proceeds",
      "Cash Incentive to Borrower": "Up to $750 upon successful closing (servicer-discretionary)",
      "Deficiency": "Forgiven upon FHA claim payment — borrower released",
      "Property Condition": "Marketable condition required; substantially damaged properties ineligible",
      "Approval Sequence": "Servicer approval required before listing; HUD approval if >6 months DLQ",
      "HUD Approval": "Required if loan > 6 months delinquent at time of application",
    };
  }

  // ── Deed-in-Lieu (DIL) — FHA ──
  if (opt === "Deed-in-Lieu (DIL)") {
    return {
      "Outstanding UPB": fmt$(upb || null),
      "Appraisal Requirement": "FHA-approved appraiser required",
      "Property Condition": "Conveyed broom-swept, undamaged, and in marketable condition",
      "Title Requirement": "Clear title — all junior liens and encumbrances must be cleared first",
      "Deficiency": "Forgiven upon FHA claim payment — borrower fully released",
      "Borrower Incentive": "Up to $750 upon completion (servicer-discretionary)",
      "Prior PFS Attempt Required?": "✅ Yes — PFS must be attempted and failed before DIL is approved",
      "Subordinate Liens": "Borrower responsible for clearing prior to transfer",
      "Occupancy": "Borrower must vacate property prior to deed conveyance",
      "Approval Notification": "2-day mail with enclosed 2-day return envelope",
    };
  }

  // ── FHA 40-Year Loan Modification (ML 2023-22 — effective May 2024) ──
  if (opt === "FHA 40-Year Loan Modification") {
    const newMat480 = newFirstPmt ? addMonths(newFirstPmt, 480) : null;
    const newPI = pmms > 0 && newUPB > 0 ? calcMonthlyPI(newUPB, pmms, 480) : null;
    const newPITI = newPI != null ? newPI + currentEscrow : null;
    const targetMet = target > 0 && newPITI != null ? newPITI <= target : null;
    const ubpCheck = originalUpb > 0 ? newUPB <= originalUpb : null;
    const pctGMI = gmi > 0 && newPITI != null ? (newPITI/gmi*100).toFixed(1) : null;
    return {
      "Modified Loan Amount (New UPB)": fmt$(newUPB),
      "UPB ≤ Original UPB?": ubpCheck == null ? "Enter Original UPB" : ubpCheck ? `✅ Yes — ${fmt$(newUPB)} ≤ ${fmt$(originalUpb)}` : `❌ No — ${fmt$(newUPB)} exceeds ${fmt$(originalUpb)} — ineligible`,
      "Capitalized Amount": fmt$(capAmount),
      "  → Arrearages": fmt$(arrears),
      "  → Escrow Shortage": fmt$(escShortage),
      "  → Legal / Foreclosure Fees": fmt$(legal),
      "  → Late Fees (EXCLUDED)": lateFees > 0 ? `${fmt$(lateFees)} — NOT capitalized` : "None",
      "New Interest Rate": pmms > 0 ? fmtPct(pmms)+" (PMMS — required per ML 2023-22)" : "Enter PMMS rate",
      "New Loan Term": "480 months (40 years)",
      "New Monthly P&I": fmt$(newPI),
      "New Monthly Escrow": fmt$(currentEscrow || null),
      "New Monthly PITI": fmt$(newPITI),
      "New PITI as % of GMI": pctGMI ? pctGMI+"%" : "Enter GMI",
      "Target Payment (31% GMI)": gmi > 0 ? fmt$(gmi*0.31) : "Enter GMI",
      "Target Payment Met?": targetMet == null ? "Enter PMMS rate & GMI" : targetMet ? "✅ Yes" : "❌ No — consider Combo Mod+PC",
      "New Maturity Date": fmtDate(newMat480),
      "Maturity Basis": "480 months from new first payment date (ML 2023-22)",
      "New First Payment Date": fmtDate(newFirstPmt),
      "Trial Payment Plan": "3-month TPP required (ML 2023-22 §III.A.2)",
      "Authority": "HUD ML 2023-22 — effective for case numbers assigned on/after May 8, 2024",
    };
  }

  // ── USDA Streamline Loan Modification ──
  if (opt === "USDA Streamline Loan Modification") {
    const newMat360 = mat360FromMod;
    const newMat480 = newFirstPmt ? addMonths(newFirstPmt, 480) : null;
    const maturityDate = newMat480 || newMat360;
    const newPI_existing = pmms > 0 && newUPB > 0 && remainingTerm ? calcMonthlyPI(newUPB, pmms, remainingTerm) : null;
    const newPI_extended = pmms > 0 && newUPB > 0 ? calcMonthlyPI(newUPB, pmms, 480) : null;
    const newPITI_existing = newPI_existing != null ? newPI_existing + currentEscrow : null;
    const newPITI_extended = newPI_extended != null ? newPI_extended + currentEscrow : null;
    const targetMet_existing = target > 0 && newPITI_existing != null ? newPITI_existing <= target : null;
    const targetMet_extended = target > 0 && newPITI_extended != null ? newPITI_extended <= target : null;
    const pctGMI = gmi > 0 && newPITI_extended != null ? (newPITI_extended/gmi*100).toFixed(1) : null;
    // Step 3: principal deferral — defer enough UPB so 480-month P&I hits target
    let step3 = {};
    if (target > 0 && newPITI_extended != null && !targetMet_extended && pmms > 0) {
      const targetPI = Math.max(0, target - currentEscrow);
      const r = pmms / 100 / 12;
      const affordableUPB = r > 0 ? targetPI * (Math.pow(1+r,480) - 1) / (r * Math.pow(1+r,480)) : targetPI * 480;
      const deferralAmt = Math.max(0, newUPB - affordableUPB);
      const step3PI = calcMonthlyPI(affordableUPB, pmms, 480);
      const step3PITI = step3PI != null ? step3PI + currentEscrow : null;
      step3 = {
        "Step 3 — Principal Deferral Required": fmt$(deferralAmt),
        "Step 3 — Modified UPB (after deferral)": fmt$(affordableUPB),
        "Step 3 — New P&I (480mo on deferred balance)": fmt$(step3PI),
        "Step 3 — New PITI": fmt$(step3PITI),
        "Step 3 — Target Met?": step3PITI != null ? (step3PITI <= target ? "✅ Yes" : "❌ Cannot achieve target — loan ineligible") : "Enter inputs",
        "Step 3 — Deferral Lien": "Non-interest bearing subordinate note; due on sale, refinance, or payoff",
      };
    }
    return {
      "Modified Loan Amount (New UPB)": fmt$(newUPB),
      "Capitalized Amount": fmt$(capAmount),
      "  → Arrearages": fmt$(arrears),
      "  → Escrow Shortage": fmt$(escShortage),
      "  → Legal / Foreclosure Fees": fmt$(legal),
      "  → Late Fees (EXCLUDED)": lateFees > 0 ? `${fmt$(lateFees)} — NOT capitalized` : "None",
      "New Interest Rate": pmms > 0 ? fmtPct(pmms)+" (PMMS)" : "Enter PMMS rate",
      "Step 1 — Existing Term Payment": newPI_existing != null ? fmt$(newPI_existing)+" P&I / "+fmt$(newPITI_existing)+" PITI" : "Enter inputs",
      "Step 1 — Remaining Term": remainingTerm ? `${remainingTerm} months` : "Enter Note dates",
      "Step 1 — Target Met?": targetMet_existing == null ? "Enter inputs" : targetMet_existing ? "✅ Yes — use existing term" : "❌ No — extend term",
      "Step 2 — Extended to 480 Months Payment": newPI_extended != null ? fmt$(newPI_extended)+" P&I / "+fmt$(newPITI_extended)+" PITI" : "Enter inputs",
      "Step 2 — Target Met (480mo)?": target > 0 && newPITI_extended != null ? (targetMet_extended ? "✅ Yes" : "❌ No — proceed to Step 3 (principal deferral)") : "Enter inputs",
      ...step3,
      "Maximum Term": "480 months from First Installment Date of Modification",
      "New Maturity Date": targetMet_existing ? fmtDate(newMat360)+" (Step 1 — existing term)" : fmtDate(newMat480)+" (Step 2/3 — extended to 480mo)",
      "New First Payment Date": fmtDate(newFirstPmt),
      "New Monthly PITI (480-month scenario)": fmt$(newPITI_extended),
      "PITI as % of GMI": pctGMI ? pctGMI+"% (target ≤ 31%)" : "Enter GMI",
      "Target Payment (31% GMI)": gmi > 0 ? fmt$(gmi*0.31) : "Enter GMI",
      "Trial Payment Plan": "3 months (4 months if imminent default)",
      "Approval Notification": "2-day mail with enclosed 2-day return envelope",
    };
  }

  // ── USDA Standalone MRA ──
  if (opt === "USDA Standalone Mortgage Recovery Advance (MRA)") {
    const maxMRA = originalUpb * 0.30;
    const mraAmount = Math.min(capAmount, Math.max(0, maxMRA - priorPC));
    return {
      "MRA Amount": fmt$(mraAmount),
      "  → Arrearages Covered": fmt$(arrears),
      "  → Escrow Shortage": fmt$(escShortage),
      "  → Legal Fees": fmt$(legal),
      "  → Late Fees (EXCLUDED)": lateFees > 0 ? `${fmt$(lateFees)} — NOT included` : "None",
      "Prior MRA Balance": fmt$(priorPC),
      "Maximum MRA (30% of Original UPB)": fmt$(maxMRA || null),
      "Remaining MRA Capacity": fmt$(Math.max(0, maxMRA - priorPC)),
      "MRA Within Cap?": maxMRA ? (mraAmount <= (maxMRA - priorPC) ? "✅ Yes" : "❌ Exceeds cap") : "Enter Original UPB",
      "First Mortgage Rate": "UNCHANGED",
      "First Mortgage Term": "UNCHANGED",
      "First Mortgage Payment": "UNCHANGED",
      "MRA Lien Type": "Non-interest bearing subordinate lien",
      "MRA Payoff Trigger": "Due upon sale, refinance, or payoff of first mortgage",
      "Trial Payment Plan": "Required — resume current contractual payment",
    };
  }

  // ── USDA Disaster Modification ──
  if (opt === "USDA Disaster Modification") {
    const newMat = mat360FromMod;
    const newPI = pmms > 0 && newUPB > 0 ? calcMonthlyPI(newUPB, pmms, 360) : null;
    const newPITI = newPI != null ? newPI + currentEscrow : null;
    return {
      "Modified Loan Amount (New UPB)": fmt$(newUPB),
      "Capitalized Amount": fmt$(capAmount),
      "  → All Arrearages": fmt$(arrears),
      "  → Escrow Shortage": fmt$(escShortage),
      "  → Legal / Foreclosure Fees": fmt$(legal),
      "  → Late Fees (EXCLUDED)": lateFees > 0 ? `${fmt$(lateFees)} — NOT capitalized` : "None",
      "New Interest Rate": pmms > 0 ? fmtPct(pmms)+" (PMMS)" : "Enter PMMS rate",
      "New Loan Term": "360 months (30 years)",
      "New Monthly P&I": fmt$(newPI),
      "New Monthly Escrow": fmt$(currentEscrow || null),
      "New Monthly PITI": fmt$(newPITI),
      "New Maturity Date": fmtDate(newMat),
      "New First Payment Date": fmtDate(newFirstPmt),
      "Trial Payment Plan": "3-month TPP required",
    };
  }

  // ── USDA Disaster Term Extension ──
  if (opt === "USDA Disaster Term Extension Modification") {
    const extMonths = Math.min(dlqMonths, 12);
    const newMat = origMaturity ? addMonths(origMaturity, extMonths) : null;
    const currentPITI = n(l.currentPITI);
    return {
      "Interest Rate": "UNCHANGED — "+fmtPct(currentRate || null),
      "Monthly Payment": "UNCHANGED — "+fmt$(currentPITI || null),
      "Term Extension": `${extMonths} month(s) (= number of DLQ payments, max 12)`,
      "Original Maturity Date": fmtDate(origMaturity),
      "New Maturity Date": fmtDate(newMat),
      "New First Payment Date": fmtDate(newFirstPmt),
      "Capitalized Amount": "None — no capitalization",
      "Trial Payment Plan": "Not required if complete application submitted; otherwise 3-month TPP",
    };
  }

  // ── USDA Disaster MRA ──
  if (opt === "USDA Disaster Mortgage Recovery Advance (MRA)") {
    const maxMRA = originalUpb * 0.30;
    const mraAmount = Math.min(capAmount, Math.max(0, maxMRA - priorPC));
    return {
      "MRA Amount": fmt$(mraAmount),
      "  → All Arrearages Covered": fmt$(arrears),
      "  → Late Fees (EXCLUDED)": lateFees > 0 ? `${fmt$(lateFees)} — NOT included` : "None",
      "Prior MRA Balance": fmt$(priorPC),
      "Maximum MRA (30% Original UPB)": fmt$(maxMRA || null),
      "First Mortgage Rate": "UNCHANGED",
      "First Mortgage Term": "UNCHANGED",
      "First Mortgage Payment": "UNCHANGED",
      "MRA Lien Type": "Non-interest bearing subordinate lien",
      "Trial Payment Plan": "3-month TPP required",
    };
  }

  // ── USDA Informal Forbearance ──
  if (opt === "USDA Informal Forbearance") {
    return {
      "Forbearance Duration": "Up to 3 months",
      "Monthly Payment During Plan": "Reduced or suspended per agreement",
      "Late Fees": "Not assessed during plan",
      "RPP Requirement": "Borrower must qualify for ≥1 RPP with length ≤3 months",
      "First Post-Forbearance Payment": fmtDate(addMonths(effDate, 4)),
    };
  }

  // ── USDA Informal Repayment Plan ──
  if (opt === "USDA Informal Repayment Plan") {
    const currentPITI = n(l.currentPITI);
    const totalArrears = arrears || (currentPITI * dlqMonths);
    const rppMonths = Math.min(3, Math.max(1, n(l.repayMonths) || 3));
    const catchUp = totalArrears > 0 ? totalArrears / rppMonths : null;
    const total = catchUp != null ? currentPITI + catchUp : null;
    return {
      "Current Monthly PITI": fmt$(currentPITI || null),
      "Total Arrearages": fmt$(totalArrears || null),
      "Plan Length": `${rppMonths} months (max 3 per USDA HB-1-3555)`,
      "Monthly Catch-Up Amount": fmt$(catchUp || null),
      "Total Monthly RPP Payment": fmt$(total || null),
      "200% Cap": fmt$(currentPITI * 2 || null),
      "Within 200% Cap?": currentPITI > 0 && total > 0 ? (total <= currentPITI * 2 ? "✅ Yes" : "❌ Exceeds 200% cap") : "Enter PITI",
      "First Post-Plan Payment": fmtDate(addMonths(effDate, 4)),
    };
  }

  // ── USDA Special / Disaster Forbearance ──
  if (opt === "USDA Special Forbearance" || opt === "USDA Disaster Forbearance") {
    const currentPITI = n(l.currentPITI);
    return {
      "Forbearance Duration": opt === "USDA Disaster Forbearance" ? "3-month increments, reviewed monthly" : "Per servicer determination",
      "Monthly Payment During Plan": "Reduced or suspended",
      "Late Fees": "Not assessed during plan",
      "First Post-Forbearance Payment": fmtDate(addMonths(effDate, 4)),
      "Current Monthly PITI (for reference)": fmt$(currentPITI || null),
    };
  }

  // ── VA Reinstatement ──
  if (opt === "VA Reinstatement") {
    const currentPITI = n(l.currentPITI);
    const totalArrears = arrears || (currentPITI * dlqMonths);
    const totalReinstate = totalArrears + lateFees + legal;
    return {
      "Reinstatement Amount (P&I + Escrow Advances)": fmt$(totalArrears || null),
      "  → Arrearages (P&I)": fmt$(arrears || null),
      "  → Escrow Shortage / Advances": fmt$(escShortage || null),
      "Late Fees": fmt$(lateFees || null)+" (included per servicer policy)",
      "Legal / Foreclosure Fees": fmt$(legal || null)+" (if applicable)",
      "Estimated Total Due": fmt$(totalReinstate || null),
      "Payment Method": "Certified funds — cashier's check or wire transfer",
      "Quote Validity": "Typically 30 days from quote date; request updated quote if expired",
      "Effect": "Full reinstatement cures the default — no plan or modification required",
      "Note": "Servicer must accept reinstatement tendered at any time before foreclosure sale (VA M26-4 §2.A)",
    };
  }

  // ── VA Disaster Modification ──
  if (opt === "VA Disaster Modification") {
    const newMat = mat360FromMod;
    const newPI = pmms > 0 && newUPB > 0 ? calcMonthlyPI(newUPB, pmms, 360) : null;
    const newPITI = newPI != null ? newPI + currentEscrow : null;
    return {
      "Modified Loan Amount (New UPB)": fmt$(newUPB),
      "Capitalized Amount": fmt$(capAmount),
      "  → All Arrearages": fmt$(arrears),
      "  → Escrow Shortage": fmt$(escShortage),
      "New Interest Rate": pmms > 0 ? fmtPct(pmms)+" (PMMS)" : "Enter PMMS rate",
      "New Loan Term": "360 months (30 years)",
      "New Monthly P&I": fmt$(newPI),
      "New Monthly Escrow": fmt$(currentEscrow || null),
      "New Monthly PITI": fmt$(newPITI),
      "New Maturity Date": fmtDate(newMat),
      "New First Payment Date": fmtDate(newFirstPmt),
      "Trial Payment Plan": "3-month TPP required",
    };
  }

  // ── VA Disaster Extend Modification ──
  if (opt === "VA Disaster Extend Modification") {
    const extMonths = Math.min(dlqMonths, 12);
    const newMat = origMaturity ? addMonths(origMaturity, extMonths) : null;
    const currentPITI = n(l.currentPITI);
    return {
      "Interest Rate": "UNCHANGED — "+fmtPct(currentRate || null),
      "Monthly Payment": "UNCHANGED — "+fmt$(currentPITI || null),
      "Term Extension": `${extMonths} month(s) (DLQ payments, max 12)`,
      "Original Maturity Date": fmtDate(origMaturity),
      "New Maturity Date": fmtDate(newMat),
      "New First Payment Date": fmtDate(newFirstPmt),
      "Trial Payment Plan": "Not required if complete application submitted",
    };
  }

  // ── VA Special Forbearance / Disaster Forbearance ──
  if (opt === "VA Special Forbearance" || opt === "VA Disaster Forbearance") {
    const isDisasterFbr = opt === "VA Disaster Forbearance";
    return {
      "Forbearance Type": isDisasterFbr ? "Disaster — reduced or suspended payments" : "Special — reduced or suspended payments (active hardship)",
      "Initial Forbearance Period": "3 months",
      "Maximum Duration": "Up to 12 months total (servicer may extend in 3-month increments per VA M26-4)",
      "Monthly Payment During Plan": "Reduced or suspended per agreement",
      "Late Fees": "NOT assessed during forbearance period",
      "Follow-On Required": "Repayment Plan or permanent retention option at conclusion",
      "First Post-Forbearance Payment (initial 3-mo)": fmtDate(addMonths(effDate, 4)),
      "First Post-Forbearance Payment (full 12-mo max)": fmtDate(addMonths(effDate, 13)),
    };
  }

  // ── VA Repayment Plan ──
  if (opt === "VA Repayment Plan") {
    const currentPITI = n(l.currentPITI);
    const totalArrears = arrears || (currentPITI * dlqMonths);
    const planMonths = Math.min(18, dlqMonths || 6); // VA allows up to 18 months per M26-4
    const catchUp = planMonths > 0 ? totalArrears / planMonths : null;
    const totalPmt = catchUp != null ? currentPITI + catchUp : null;
    return {
      "Current Monthly PITI": fmt$(currentPITI || null),
      "Total Arrearages (Reinstatement Amount)": fmt$(totalArrears || null),
      "Plan Length": planMonths+" months (max 18 per VA M26-4; exact terms from FHLMC RPP Calculator)",
      "Monthly Catch-Up Amount": fmt$(catchUp),
      "Total Monthly Plan Payment (PITI + Catch-Up)": fmt$(totalPmt),
      "Late Fees During Plan": "NOT assessed while performing under Repayment Plan",
      "Note": "Use FHLMC RPP Calculator to confirm eligible plan lengths and verify affordability",
      "First Post-Plan Payment": fmtDate(addMonths(effDate, planMonths + 1)),
    };
  }

  // ── VA Traditional / 30-Year / 40-Year Mod ──
  if (opt === "VA Traditional Modification" || opt === "VA 30-Year Loan Modification" || opt === "VA 40-Year Loan Modification") {
    const is40yr = opt === "VA 40-Year Loan Modification";
    const isTraditional = opt === "VA Traditional Modification";
    const termMonths = is40yr ? 480 : 360;
    const rateToUse = isTraditional ? currentRate : pmms;

    // Maturity logic:
    // 30-year / Traditional: lesser of (360mo from mod first installment) OR (120mo past original maturity)
    // 40-year: 480 months from the NEW first payment date of the modified loan (Circular 26-22-18)
    const newMat360 = mat360FromMod;
    const newMat120 = mat120PastOrig;
    const mat480fromNewFirst = newFirstPmt ? addMonths(newFirstPmt, 480) : null;
    const mat30yr = newMat360 && newMat120
      ? (new Date(newMat360) < new Date(newMat120) ? newMat360 : newMat120)
      : newMat360 || newMat120;
    const mat30yrLabel = newMat360 && newMat120
      ? (new Date(newMat360) < new Date(newMat120) ? "360mo from mod applied (earlier)" : "120mo past original applied (earlier)")
      : "Enter note dates for cap comparison";
    const maxMat = is40yr ? mat480fromNewFirst : mat30yr;

    const newPI = rateToUse > 0 && newUPB > 0 ? calcMonthlyPI(newUPB, rateToUse, termMonths) : null;
    const newPITI = newPI != null ? newPI + currentEscrow : null;

    // Arrearages 25% cap — applies to 30-year and Traditional only (Circular 26-22-18 removes this for 40-year)
    const arrearsPct = originalUpb > 0 ? (capAmount / originalUpb * 100).toFixed(1) : null;
    const arrearsCheck = arrearsPct != null ? parseFloat(arrearsPct) <= 25 : null;

    // UPB cap — 30-year/Traditional: new UPB must not exceed original UPB
    // 40-year: no restriction — Circular 26-22-18 explicitly allows new UPB to exceed original
    const ubpCheck = newUPB <= originalUpb;

    // Payment reduction
    const currentPI_val = n(l.currentPI);
    const currentPITI_val = n(l.currentPITI);
    const piReductionPct = currentPI_val > 0 && newPI != null ? ((1 - newPI / currentPI_val) * 100) : null;
    const pitiReductionPct = currentPITI_val > 0 && newPITI != null ? ((1 - newPITI / currentPITI_val) * 100) : null;

    const tppNote = isTraditional
      ? "3-month TPP required (waiver available with VA approval for imminent default only)"
      : "3-month TPP required — per VA Circular 26-21-12 (not waivable)";

    return {
      "Modified Loan Amount (New UPB)": fmt$(newUPB),
      ...(is40yr
        ? { "UPB vs Original": originalUpb > 0 ? `${fmt$(newUPB)} vs ${fmt$(originalUpb)} original — ✅ No cap for 40-year (Circular 26-22-18)` : "Enter Original UPB" }
        : { "  UPB ≤ Original UPB?": originalUpb > 0 ? (ubpCheck ? `✅ Yes — ${fmt$(newUPB)} ≤ ${fmt$(originalUpb)}` : `❌ No — ${fmt$(newUPB)} exceeds ${fmt$(originalUpb)}`) : "Enter Original UPB" }
      ),
      "Capitalized Amount": fmt$(capAmount),
      ...(is40yr
        ? {}
        : {
            "  Arrearages as % of Original Balance": arrearsPct ? arrearsPct+"% (must be ≤ 25%)" : "Enter Original UPB",
            "  Arrearages Within 25% Cap?": arrearsCheck == null ? "Enter Original UPB" : arrearsCheck ? "✅ Yes" : "❌ Exceeds 25% cap — ineligible for this mod type",
          }
      ),
      "  → Arrearages": fmt$(arrears),
      "  → Escrow Shortage": fmt$(escShortage),
      "  → Legal Fees": fmt$(legal),
      "  → Late Fees (EXCLUDED)": lateFees > 0 ? `${fmt$(lateFees)} — NOT capitalized` : "None",
      "New Interest Rate": rateToUse > 0
        ? fmtPct(rateToUse) + (isTraditional ? " (negotiated — VA approval required)" : " (PMMS — required per VA Circular 26-21-12)")
        : (isTraditional ? "Enter negotiated rate" : "Enter PMMS rate"),
      "New Loan Term": termMonths+" months ("+(termMonths/12)+" years)",
      "New Monthly P&I": fmt$(newPI),
      "New Monthly Escrow": fmt$(currentEscrow || null),
      "New Monthly PITI": fmt$(newPITI),
      ...(is40yr
        ? {
            "P&I Reduction": piReductionPct != null ? piReductionPct.toFixed(1)+"% reduction (must be ≥ 10%)" : "Enter current P&I",
            "P&I Reduction ≥ 10%?": piReductionPct != null ? (piReductionPct >= 10 ? "✅ Yes" : "❌ No — does not meet 10% threshold") : "Enter current P&I",
          }
        : {
            "Payment Reduction (PITI)": pitiReductionPct != null
              ? (pitiReductionPct > 0 ? `✅ ${pitiReductionPct.toFixed(1)}% reduction (${fmt$(currentPITI_val)} → ${fmt$(newPITI)})` : `❌ No reduction — new PITI ${fmt$(newPITI)} ≥ current ${fmt$(currentPITI_val)}`)
              : "Enter current PITI & rate",
          }
      ),
      "New Maturity Date": fmtDate(maxMat),
      ...(is40yr
        ? {
            "Maturity Basis": "480 months from new first payment date (VA Circular 26-22-18)",
            "480-Month Maturity Date": fmtDate(mat480fromNewFirst),
          }
        : {
            "Maturity Cap — 360mo from mod first installment": fmtDate(newMat360),
            "Maturity Cap — 120mo past original maturity": fmtDate(newMat120),
            "Maturity Applied": mat30yrLabel,
          }
      ),
      "New First Payment Date": fmtDate(newFirstPmt),
      "Trial Payment Plan": tppNote,
    };
  }

  // ── VASP ──
  if (opt === "VASP (VA Partial Claim)") {
    const maxPC = originalUpb * 0.30;
    const pcAmt = Math.min(capAmount, Math.max(0, maxPC - priorPC));
    // VASP: VA purchases loan and servicer modifies at PMMS for 360 months
    const vaspPI = pmms > 0 && upb > 0 ? calcMonthlyPI(upb, pmms, 360) : null;
    const vaspPITI = vaspPI != null ? vaspPI + escrow : null;
    const pctGMI = gmi > 0 && vaspPITI != null ? (vaspPITI/gmi*100).toFixed(1) : null;
    return {
      "VASP / Partial Claim Amount": fmt$(pcAmt),
      "  → Arrearages": fmt$(arrears),
      "  → Escrow Shortage": fmt$(escShortage),
      "  → Late Fees (EXCLUDED)": lateFees > 0 ? `${fmt$(lateFees)} — NOT included` : "None",
      "Prior PC Balance": fmt$(priorPC),
      "30% Statutory Cap": maxPC > 0 ? fmt$(maxPC) : "Enter Original UPB",
      "Remaining PC Capacity": maxPC > 0 ? fmt$(Math.max(0, maxPC - priorPC)) : "Enter Original UPB",
      "PC Within Cap?": maxPC > 0 ? (pcAmt <= (maxPC - priorPC) ? "✅ Yes" : "❌ Exceeds cap") : "Enter Original UPB",
      "New First Mortgage Rate": pmms > 0 ? fmtPct(pmms)+" (PMMS — VA sets rate)" : "VA sets at PMMS — enter PMMS rate",
      "New First Mortgage Term": "360 months (VA-serviced after purchase)",
      "New First Payment Date": fmtDate(newFirstPmt),
      "New Maturity Date": fmtDate(mat360FromMod),
      "Estimated New Monthly P&I": fmt$(vaspPI),
      "Estimated New Monthly Escrow": fmt$(escrow || null),
      "Estimated New Monthly PITI": fmt$(vaspPITI),
      "New PITI as % of GMI": pctGMI ? pctGMI+"%" : "Enter GMI",
      "PC Lien Type": "Non-interest bearing subordinate lien",
      "PC Payoff Trigger": "Due upon sale, refinance, or payoff",
      "Process Note": "VA purchases loan from servicer; borrower makes payments directly to VA",
    };
  }

  // ── VA Compromise Sale ──
  if (opt === "VA Compromise Sale") {
    const vaNetValue = upb > 0 ? upb * 0.95 : null;
    return {
      "Outstanding UPB": fmt$(upb || null),
      "Appraisal": "Required — VA-approved appraiser; servicer orders at VA direction",
      "Minimum Net Proceeds (Est.)": vaNetValue != null ? `${fmt$(vaNetValue)} (approx. 95% of VA-appraised value)` : "Enter UPB for estimate",
      "Selling Costs Allowed": "Commission (up to 6%), title, transfer taxes, customary closing costs",
      "Listing Period": "Up to 120 days (servicer may extend with VA approval)",
      "Borrower Proceeds": "Borrower receives NO proceeds",
      "Relocation Assistance": "Not available for Compromise Sale (available for DIL only)",
      "Deficiency": "VA pays guaranty claim; VA may pursue on entitlement — borrower should consult VA",
      "VA Approval": "Servicer submits net proceeds to VA for concurrence before accepting offer",
      "VA Entitlement Effect": "Portion of entitlement used; may be restored via one-time restoration",
    };
  }

  // ── VA Deed-in-Lieu ──
  if (opt === "VA Deed-in-Lieu") {
    return {
      "Outstanding UPB": fmt$(upb || null),
      "Appraisal": "Required — VA-approved appraiser",
      "Prior Compromise Sale Attempt": "✅ Required — must attempt and fail Compromise Sale before DIL",
      "Title Requirement": "Clear title — all junior liens must be cleared prior to conveyance",
      "Property Condition": "Broom-swept, undamaged, ready for sale — borrower must vacate prior to conveyance",
      "Relocation Assistance": "Up to $1,500 upon successful completion",
      "Deficiency": "Borrower released from personal deficiency upon VA acceptance of deed",
      "VA Approval": "Servicer must obtain VA concurrence before accepting deed",
      "VA Entitlement Effect": "Portion of entitlement used; may be restored via one-time restoration",
    };
  }

  // ── USDA Compromise Sale ──
  if (opt === "USDA Compromise Sale") {
    return {
      "Outstanding UPB": fmt$(upb || null),
      "Appraisal": "Required — licensed appraiser; FMV established within 90 days of sale",
      "Net Recovery Value": "FMV minus typical selling costs (commission, transfer taxes, closing costs)",
      "Minimum Net Proceeds": "Must equal or exceed USDA-determined net recovery value",
      "Listing Period": "Up to 90 days (may extend with USDA approval)",
      "Borrower Proceeds": "Borrower receives NO proceeds",
      "Deficiency": "USDA guarantee covers shortfall; borrower may be released depending on circumstances",
      "USDA Approval": "Servicer must obtain USDA concurrence prior to accepting offer or closing",
      "Borrower Cooperation": "Must cooperate in marketing, maintain property in marketable condition",
    };
  }

  // ── USDA Deed-in-Lieu ──
  if (opt === "USDA Deed-in-Lieu") {
    return {
      "Outstanding UPB": fmt$(upb || null),
      "Appraisal": "Required — licensed appraiser",
      "Prior Compromise Sale Attempt": "✅ Required — must attempt and fail Compromise Sale before DIL",
      "Title Requirement": "Clear title — all junior liens must be cleared prior to conveyance",
      "Property Condition": "Broom-swept, undamaged, ready for sale",
      "USDA Approval": "Must request USDA approval prior to permitting DIL if imminent default",
      "Deficiency": "USDA guarantee covers shortfall; borrower released upon acceptance",
    };
  }

  // ── FHLMC Repayment Plan ──
  if (opt === "FHLMC Repayment Plan") {
    const monthlyContractual = n(l.currentPI) + escrow;
    const incentiveNote = dlqMonths >= 2 ? "Servicer eligible for $500 incentive (≥60 DLQ at plan entry)" : "Servicer incentive requires ≥60 DLQ at plan entry";
    return {
      "Plan Type": "Freddie Mac Repayment Plan — Reinstatement via Installments",
      "Installment Cap": monthlyContractual > 0 ? `Reasonable installment; borrower must demonstrate ability to pay (150% guideline per Freddie Mac)` : "Enter current P&I and escrow",
      "Combined P&I + Escrow (Contractual)": fmt$(monthlyContractual),
      "Borrower Eligibility": "Temporary hardship now resolved; borrower can resume full payment + catch-up",
      "Late Charges": "May be included in repayment plan; must be waived upon completion",
      "Servicer Compensation": `$500 incentive — ${incentiveNote}`,
      "Authority": "Freddie Mac Single-Family Guide §9203.2 (02/11/26)",
    };
  }
  // ── FHLMC Payment Deferral ──
  if (opt === "FHLMC Payment Deferral") {
    return {
      "Deferred Amount": fmt$(arrears),
      "  → Past-Due P&I Payments": `Up to ${Math.min(dlqMonths, 6)} months`,
      "  → Servicer Advances (third-party)": "Included if paid to third parties prior to effective date",
      "  → Escrow Shortage": escShortage > 0 ? `${fmt$(escShortage)} — NOT deferred; spread over escrow analysis` : "None",
      "Interest on Deferred Balance": "None — non-interest-bearing",
      "Deferred Balance Due": "At maturity, sale/transfer, refinance, or payoff",
      "First Payment After Deferral": "Full contractual monthly payment",
      "Late Charges": "Waived upon completion",
      "Administrative Fees": "None",
      "Servicer Compensation": "$500 incentive (subject to $1,000 combined cap per mortgage)",
      "Authority": "Freddie Mac Single-Family Guide §9203 (02/11/26)",
    };
  }
  // ── FHLMC Disaster Payment Deferral ──
  if (opt === "FHLMC Disaster Payment Deferral") {
    return {
      "Deferred Amount": fmt$(arrears),
      "  → Past-Due P&I Payments": `Up to ${Math.min(dlqMonths, 12)} months (disaster: up to 12 months)`,
      "  → Servicer Advances (third-party)": "Included",
      "  → Escrow Shortage": escShortage > 0 ? `${fmt$(escShortage)} — NOT deferred` : "None",
      "Disaster Nexus Required": "Eligible Disaster — FEMA-declared or insured loss event",
      "Pre-Disaster Delinquency": "Borrower must have been current or <60 days DLQ at disaster date",
      "Interest on Deferred Balance": "None — non-interest-bearing",
      "Deferred Balance Due": "At maturity, sale/transfer, refinance, or payoff",
      "Servicer Compensation": "$500 incentive (subject to $1,000 combined cap per mortgage)",
      "Authority": "Freddie Mac Single-Family Guide §9203 Disaster provisions (02/11/26)",
    };
  }
  // ── FHLMC Forbearance Plan (Unemployment) ──
  if (opt === "FHLMC Forbearance Plan") {
    const end6mo = addMonths(effDate, 6);
    const end12mo = addMonths(effDate, 12);
    return {
      "Plan Type": "Freddie Mac Forbearance Plan — Unemployment Hardship",
      "Hardship Requirement": "Unemployment (temporary hardship) — unemployed borrowers must be offered forbearance, not Flex Modification",
      "Authorized Initial Term": "Up to 6 months (servicer-authorized)",
      "Extension": "Up to 6 additional months with FHLMC approval (total up to 12 months)",
      "Payment During Plan": "Reduced or suspended per plan terms",
      "Late Charges": "Must NOT accrue or be collected during active forbearance",
      "6-Month End Date": fmtDate(end6mo),
      "12-Month End Date (max)": fmtDate(end12mo),
      "Post-Forbearance": "Evaluate for Repayment Plan, Payment Deferral, or Flex Modification upon re-entry",
      "Note": "A disaster-related forbearance plan does NOT disqualify borrower from subsequent Flex Modification",
      "Authority": "Freddie Mac Single-Family Guide §9203.3 (02/11/26)",
    };
  }
  // ── Freddie Mac Flex Modification ──
  if (opt === "Freddie Mac Flex Modification" || opt === "Freddie Mac Flex Modification (Streamlined)" || opt === "Freddie Mac Flex Modification (Disaster)") {
    // Arrearages capitalizable (NOT escrow shortage — spread over 60 months)
    const flexNewUPB = upb + arrears + legal;
    const currentPI_val = n(l.currentPI);
    const propValue = n(l.fhlmcPropertyValue);
    const fmModRate = n(l.fhlmcPostedModRate) || n(l.pmmsRate); // FM posted mod rate
    // MTMLTV with post-capitalized UPB
    const mtmltv = propValue > 0 && flexNewUPB > 0 ? (flexNewUPB / propValue * 100) : null;
    // Step 2: Preliminary rate
    const prelimRate = currentRate; // For fixed-rate mortgages (simplified)
    // Step 3: Interest rate relief (only if MTMLTV ≥ 50%)
    const canReduceRate = mtmltv == null || mtmltv >= 50;
    const rateFloor = fmModRate > 0 ? fmModRate : null;
    // Step 4: Term extension to 480 months
    // Step 5: Principal forbearance (only if MTMLTV > 50%, up to 30% of post-cap UPB)
    const canForbearPrincipal = mtmltv == null || mtmltv > 50;
    const maxForbearance = flexNewUPB * 0.30;
    // Target: P&I reduction EXCEEDING 20%
    const target20Plus = currentPI_val > 0 ? currentPI_val * 0.799 : null; // just under 80% = just over 20% reduction
    // Step 1 → re-amortize at current rate for remaining term
    const step1PI = remainingTerm && currentRate > 0 && flexNewUPB > 0 ? calcMonthlyPI(flexNewUPB, currentRate, remainingTerm) : null;
    // Step 3 → rate reduced to floor, remaining term
    const step3PI = remainingTerm && rateFloor && rateFloor < currentRate && flexNewUPB > 0 ? calcMonthlyPI(flexNewUPB, rateFloor, remainingTerm) : null;
    // Step 4 → floor rate at 480 months
    const step4PI = rateFloor && flexNewUPB > 0 ? calcMonthlyPI(flexNewUPB, rateFloor, 480) : (currentRate > 0 && flexNewUPB > 0 ? calcMonthlyPI(flexNewUPB, currentRate, 480) : null);
    // Step 5 → forbear principal until target or 30% cap
    let forbearAmount = 0, ibUPB = flexNewUPB, step5PI = step4PI;
    if (step4PI != null && target20Plus != null && step4PI > target20Plus && canForbearPrincipal) {
      // How much principal needs to be forborne to hit target at 480mo?
      const rateForCalc = (rateFloor && rateFloor < currentRate) ? rateFloor : currentRate;
      if (rateForCalc > 0) {
        const r = rateForCalc / 100 / 12;
        const factor = (r * Math.pow(1+r,480)) / (Math.pow(1+r,480)-1);
        const targetPrincipal = factor > 0 ? target20Plus / factor : null;
        if (targetPrincipal != null) {
          forbearAmount = Math.min(flexNewUPB - targetPrincipal, maxForbearance);
          forbearAmount = Math.max(0, forbearAmount);
          ibUPB = flexNewUPB - forbearAmount;
          step5PI = calcMonthlyPI(ibUPB, rateForCalc, 480);
        }
      }
    }
    // Determine which step achieves target
    let achievedPI = null, achievedRate2 = currentRate, achievedTerm2 = remainingTerm || 360, stepApplied2 = "", achievedForbear = 0;
    if (step1PI != null && target20Plus != null && step1PI <= target20Plus) {
      stepApplied2 = "Step 1 (re-amortize at current rate, remaining term) — >20% target met";
      achievedPI = step1PI; achievedRate2 = currentRate; achievedTerm2 = remainingTerm || 360;
    } else if (step3PI != null && target20Plus != null && step3PI <= target20Plus && canReduceRate) {
      stepApplied2 = "Step 3 (rate reduced to FM floor rate, remaining term) — >20% target met";
      achievedPI = step3PI; achievedRate2 = rateFloor || currentRate; achievedTerm2 = remainingTerm || 360;
    } else if (step4PI != null && target20Plus != null && step4PI <= target20Plus) {
      stepApplied2 = "Step 4 (480-month term extension) — >20% target met";
      achievedPI = step4PI; achievedRate2 = (rateFloor && canReduceRate) ? rateFloor : currentRate; achievedTerm2 = 480;
    } else if (step5PI != null && forbearAmount > 0) {
      stepApplied2 = `Step 5 (principal forbearance: ${fmt$(forbearAmount)}) — target met or 30% cap applied`;
      achievedPI = step5PI; achievedRate2 = (rateFloor && canReduceRate) ? rateFloor : currentRate; achievedTerm2 = 480; achievedForbear = forbearAmount;
    } else {
      stepApplied2 = step4PI != null ? "Steps 1–5 attempted — target not achieved (offer if P&I ≤ pre-mod)" : "Enter loan data for step analysis";
      achievedPI = step4PI || step1PI; achievedRate2 = (rateFloor && canReduceRate) ? rateFloor : currentRate; achievedTerm2 = 480;
    }
    const achievedPITI2 = achievedPI != null ? achievedPI + escrow : null;
    const piReductionPct2 = currentPI_val > 0 && achievedPI != null ? (currentPI_val - achievedPI) / currentPI_val * 100 : null;
    const newMat480fhlmc = noteFirstPmt ? addMonths(effDate, 480) : null;
    const newMatFHLMC = achievedTerm2 === 480 ? newMat480fhlmc : addMonths(effDate, achievedTerm2);
    const piEligible = achievedPI != null && currentPI_val > 0 && achievedPI <= currentPI_val;
    const isStreamlined = opt.includes("Streamlined");
    const isDisaster = opt.includes("Disaster");
    return {
      "Modification Type": `Freddie Mac Flex Modification® — ${isStreamlined ? "Streamlined (No BRP)" : isDisaster ? "Disaster Eligibility" : "Standard (Full BRP)"}`,
      "Step Applied": stepApplied2 || "—",
      "Capitalized Amount": fmt$(arrears + legal),
      "  → Delinquent Accrued Interest / Arrearages": fmt$(arrears),
      "  → Foreclosure/Legal Costs": fmt$(legal),
      "  → Escrow Shortage (NOT capitalizable)": escShortage > 0 ? `${fmt$(escShortage)} — spread over 60 months (min 12 months)` : "None",
      "  → Late Fees (NOT capitalizable)": lateFees > 0 ? `${fmt$(lateFees)} — NOT capitalized` : "None",
      "New UPB (Post-Capitalization)": fmt$(flexNewUPB),
      "Post-Mod MTMLTV": mtmltv != null ? `${mtmltv.toFixed(1)}% (${fmt$(flexNewUPB)} / ${fmt$(propValue)})` : "Enter property value for MTMLTV",
      "FM Posted Modification Rate (Floor)": rateFloor != null ? fmtPct(rateFloor) : "Enter FM posted mod rate",
      "Rate Relief Applied?": canReduceRate ? (rateFloor && rateFloor < currentRate ? "✅ Yes — MTMLTV ≥ 50%" : "Rate already at or below floor") : "❌ No — MTMLTV < 50%",
      "New Interest Rate": achievedRate2 > 0 ? fmtPct(achievedRate2) : "N/A",
      "New Term": achievedTerm2 ? `${achievedTerm2} months (${(achievedTerm2/12).toFixed(1)} years)` : "N/A",
      ...(achievedForbear > 0 ? {
        "Principal Forbearance Amount": fmt$(achievedForbear),
        "  → Interest-Bearing UPB": fmt$(ibUPB),
        "  → Non-Interest-Bearing (Forborne)": fmt$(achievedForbear),
        "  → Forbearance Cap (30% of post-cap UPB)": fmt$(maxForbearance),
        "  Forborne Balance Due": "At maturity, sale/transfer, refinance, or payoff of interest-bearing UPB",
      } : {}),
      "New Monthly P&I (Interest-Bearing UPB)": fmt$(achievedPI),
      "New Monthly Escrow": fmt$(escrow || null),
      "New Monthly PITI": fmt$(achievedPITI2),
      "P&I Reduction": piReductionPct2 != null ? `${piReductionPct2.toFixed(1)}% (${fmt$(currentPI_val)} → ${fmt$(achievedPI)})` : "Enter current P&I",
      "P&I Reduction > 20%? (Target)": piReductionPct2 != null ? (piReductionPct2 > 20 ? `✅ Yes — ${piReductionPct2.toFixed(1)}%` : `⚠️ No (${piReductionPct2.toFixed(1)}%) — still offer if new P&I ≤ pre-mod P&I`) : "Enter current P&I",
      "New P&I ≤ Pre-Mod P&I? (Minimum Requirement)": piEligible ? `✅ Yes — eligible to offer` : (achievedPI != null && currentPI_val > 0 ? `❌ No — modification cannot be offered` : "Enter current P&I"),
      "New Maturity Date": fmtDate(newMatFHLMC),
      "New First Payment Date": fmtDate(newFirstPmt),
      "Trial Period Plan": "3 monthly payments at estimated post-modified amount",
      "TPP — First Payment Due": "Last day of first Trial Period month",
      "Late Charges": "May accrue during TPP; ALL waived upon permanent modification",
      "Servicer Compensation": "$1,000 incentive (subject to $1,000 combined cap per mortgage)",
      "Authority": "Freddie Mac Single-Family Guide §9206 (02/11/26)",
    };
  }
  // ── FHLMC Short Sale ──
  if (opt === "Freddie Mac Short Sale") {
    const estNet = upb > 0 ? upb * 0.93 : null;
    return {
      "Outstanding UPB": fmt$(upb || null),
      "Property Valuation": "Required — BPO or appraisal; value determined via Resolve",
      "Estimated Net Proceeds": estNet != null ? `${fmt$(estNet)} (est. ~93% of UPB)` : "Enter UPB for estimate",
      "Selling Costs Allowed": "Commission, title, transfer taxes, customary closing costs",
      "Servicer Approval": "Servicer has delegated authority for Standard Short Sale per §9208; others require Freddie Mac approval via Resolve",
      "Streamlined Short Sale": "Available for eligible borrowers — reduced documentation per §9208.3",
      "Borrower Deficiency": "May be waived per Freddie Mac guidelines",
      "Relocation Assistance": "May be available per current Freddie Mac guidelines",
      "MI Claim": "Servicer provides claim documentation to MI within 60 days of short sale",
      "Servicer Compensation": "$2,200 incentive",
      "Authority": "Freddie Mac Single-Family Guide §9208 (02/11/26)",
    };
  }
  // ── FHLMC Deed-in-Lieu ──
  if (opt === "Freddie Mac Deed-in-Lieu") {
    return {
      "Outstanding UPB": fmt$(upb || null),
      "Property Valuation": "Required — BPO or appraisal via Resolve",
      "Title Requirement": "Clear title — junior liens must be cleared prior to conveyance",
      "Property Condition": "Broom-swept, undamaged, ready for sale; borrower must vacate",
      "Servicer Approval": "Servicer has delegated authority for Standard DIL per §9209; others require Freddie Mac via Resolve",
      "Streamlined DIL": "Available for eligible borrowers — reduced documentation per §9209",
      "Borrower Deficiency": "Borrower may be released from deficiency upon FHLMC acceptance",
      "Relocation Assistance": "May be available per current Freddie Mac guidelines",
      "MI Claim": "Servicer provides claim documentation to MI within 60 days of DIL acceptance",
      "Servicer Compensation": "$1,500 incentive",
      "Authority": "Freddie Mac Single-Family Guide §9209 (02/11/26)",
    };
  }

  // ── FNMA Forbearance Plan ──
  if (opt === "FNMA Forbearance Plan") {
    const end6mo = addMonths(effDate, 6);
    const end12mo = addMonths(effDate, 12);
    return {
      "Authorized Initial Term": "Up to 6 months (servicer-authorized)",
      "Authorized Extension": "Up to 6 additional months (total 12 months authorized)",
      "FNMA Prior Approval Required If": "Cumulative term > 12 months OR loan > 12 months delinquent",
      "Combined Forbearance + Repayment Plan Cap": "Must NOT exceed 36 months total",
      "Payment During Plan": "Reduced or suspended per plan agreement",
      "Late Charges": "Must NOT accrue or be collected during active forbearance",
      "6-Month End Date": fmtDate(end6mo),
      "12-Month Maximum End Date": fmtDate(end12mo),
      "Disaster Variant": "Up to 3 months without QRPC if FEMA-declared, <2mo DLQ at disaster, ≥1mo DLQ at eval",
      "Post-Forbearance (QRPC not achieved)": "Evaluate → Payment Deferral; if ineligible → Flex Modification",
      "Authority": "Fannie Mae Servicing Guide D2-3.2-01 (10/11/2023)",
    };
  }
  // ── FNMA Repayment Plan ──
  if (opt === "FNMA Repayment Plan") {
    const monthlyContractual = n(l.currentPI) + escrow;
    const maxMonthly = monthlyContractual > 0 ? monthlyContractual * 1.50 : null;
    const brpRequired = dlqMonths > 3;
    return {
      "Maximum Monthly Payment": maxMonthly != null ? `${fmt$(maxMonthly)} (150% of contractual ${fmt$(monthlyContractual)})` : "Enter current P&I and escrow",
      "BRP Required?": brpRequired ? "✅ Yes — >90 days DLQ or plan >6 months" : "Not required (≤90 DLQ and plan ≤6 months; verify capacity via QRPC)",
      "Plan Duration": brpRequired ? "Plan >12 months requires FNMA prior written approval" : "Up to 6 months (servicer-authorized)",
      "Combined Forbearance + Repayment Plan Cap": "Must NOT exceed 36 months total",
      "Late Charges (During Plan)": "Must be WAIVED upon successful completion",
      "Late Charges (At Plan Establishment)": "May be included in plan repayment amounts",
      "Post-Failed Repayment Plan": "Evaluate → Payment Deferral; if ineligible → Flex Modification",
      "Authority": "Fannie Mae Servicing Guide D2-3.2-02 (08/13/2025)",
    };
  }
  // ── FNMA Payment Deferral ──
  if (opt === "FNMA Payment Deferral") {
    const deferMonths = Math.min(n(l.delinquencyMonths), 6);
    const cumUsed = n(l.fnmaCumulativeDeferredMonths);
    const cumRemaining = Math.max(0, 12 - cumUsed);
    const effectiveDeferMonths = Math.min(deferMonths, cumRemaining);
    return {
      "Deferred Amount": fmt$(arrears),
      "  → Past-Due P&I Payments": `Up to ${effectiveDeferMonths} months (delinquency: ${deferMonths}mo; cap remaining: ${cumRemaining}mo)`,
      "  → Out-of-Pocket Escrow Advances": "Included (third-party advances paid prior to effective date)",
      "  → Escrow Shortage": escShortage > 0 ? `${fmt$(escShortage)} — repaid over 60-month escrow analysis (NOT deferred)` : "None",
      "Cumulative Cap": `${cumUsed} months used / 12-month lifetime cap (excludes disaster deferrals)`,
      "Interest on Deferred Balance": "None — non-interest-bearing balance",
      "Deferred Balance Due": "At maturity, sale/transfer, refinance, or payoff of interest-bearing UPB",
      "First Payment After Deferral": "Full contractual monthly payment (no change to rate/term/other terms)",
      "Late Charges": "All waived upon completion",
      "Administrative Fees": "None",
      "Post-Deferral Default Risk": "If 60-day DLQ within 6 months → evaluate for Flex Modification by 75th DLQ day",
      "Authority": "Fannie Mae Servicing Guide D2-3.2-04 (08/13/2025)",
    };
  }
  // ── FNMA Disaster Payment Deferral ──
  if (opt === "FNMA Disaster Payment Deferral") {
    const deferMonths = Math.min(n(l.delinquencyMonths), 12);
    return {
      "Deferred Amount": fmt$(arrears),
      "  → Past-Due P&I Payments": `Up to ${deferMonths} months (disaster maximum: 12 months)`,
      "  → Out-of-Pocket Escrow Advances": "Included (third-party advances paid prior to effective date)",
      "  → Escrow Shortage": escShortage > 0 ? `${fmt$(escShortage)} — repaid over 60-month escrow analysis (NOT deferred)` : "None",
      "vs. Standard Payment Deferral": "Disaster: up to 12mo deferred; 1–12mo DLQ eligible; no 12-month cumulative cap applied",
      "Same-Disaster Restriction": "Loan may NOT receive a second disaster deferral for the same disaster event",
      "Disaster Deferrals & Cumulative Cap": "Disaster deferrals do NOT count toward the 12-month non-disaster cumulative cap",
      "Interest on Deferred Balance": "None — non-interest-bearing balance",
      "Deferred Balance Due": "At maturity, sale/transfer, refinance, or payoff of interest-bearing UPB",
      "First Payment After Deferral": "Full contractual monthly payment",
      "Late Charges": "All waived upon completion",
      "Administrative Fees": "None",
      "Authority": "Fannie Mae Servicing Guide D2-3.2-05 (08/13/2025)",
    };
  }
  // ── Fannie Mae Flex Modification ──
  if (opt === "Fannie Mae Flex Modification" || opt === "Fannie Mae Flex Modification (Disaster)") {
    // Flex Mod: arrearages + legal fees capitalized; escrow shortage NOT capitalized
    const flexNewUPB = upb + arrears + legal;
    const currentPI_val = n(l.currentPI);
    const floorRate = pmms > 0 ? Math.max(pmms - 0.50, 4.625) : 4.625;
    // Step 1: Re-amortize at current rate for remaining term
    const step1PI = remainingTerm && currentRate > 0 && flexNewUPB > 0 ? calcMonthlyPI(flexNewUPB, currentRate, remainingTerm) : null;
    // Step 2: Rate reduced to floor rate, same remaining term
    const step2PI = remainingTerm && floorRate > 0 && flexNewUPB > 0 ? calcMonthlyPI(flexNewUPB, floorRate, remainingTerm) : null;
    // Step 3: Extend term to 480 months at floor rate
    const step3PI = floorRate > 0 && flexNewUPB > 0 ? calcMonthlyPI(flexNewUPB, floorRate, 480) : null;
    // Target: pre-mod P&I (for ≥31 DLQ must be ≤; conceptually target 20% reduction)
    const targetPI20 = currentPI_val > 0 ? currentPI_val * 0.80 : null;
    // Determine which step meets the target (20% reduction benchmark)
    let stepApplied = "", achievedRate = currentRate, achievedTerm = remainingTerm || 360, achievedPI = step1PI;
    if (step1PI != null && targetPI20 != null && step1PI <= targetPI20) {
      stepApplied = "Step 1: Re-amortize at current rate — target met";
      achievedRate = currentRate; achievedTerm = remainingTerm || 360; achievedPI = step1PI;
    } else if (step2PI != null && targetPI20 != null && step2PI <= targetPI20) {
      stepApplied = "Step 2: Rate reduced to floor rate — target met";
      achievedRate = floorRate; achievedTerm = remainingTerm || 360; achievedPI = step2PI;
    } else {
      stepApplied = step3PI != null ? "Step 3: Term extended to 480 months at floor rate" : "Steps 1–3 attempted";
      achievedRate = floorRate; achievedTerm = 480; achievedPI = step3PI;
    }
    const achievedPITI = achievedPI != null ? achievedPI + escrow : null;
    const piReductionPct = currentPI_val > 0 && achievedPI != null ? (currentPI_val - achievedPI) / currentPI_val * 100 : null;
    const newMat480 = noteFirstPmt ? addMonths(noteFirstPmt, 480) : null;
    const newMatStd = addMonths(effDate, achievedTerm);
    const newMaturity = achievedTerm === 480 ? newMat480 : newMatStd;
    const tppMonths = dlqMonths >= 1 ? "3-month TPP (31+ days DLQ)" : "4-month TPP (current or <31 DLQ)";
    return {
      "Modification Type": "Fannie Mae Flex Modification — Fixed Rate",
      "Step Applied": stepApplied || "Enter loan data for step analysis",
      "Capitalized Amount": fmt$(arrears + legal),
      "  → Arrearages": fmt$(arrears),
      "  → Legal Fees": fmt$(legal),
      "  → Escrow Shortage (EXCLUDED)": escShortage > 0 ? `${fmt$(escShortage)} — NOT capitalized per D2-3.2-06` : "None",
      "  → Late Fees (EXCLUDED)": lateFees > 0 ? `${fmt$(lateFees)} — NOT capitalized` : "None",
      "New UPB": fmt$(flexNewUPB),
      "Floor Rate (max of PMMS−50bps or 4.625%)": pmms > 0 ? fmtPct(floorRate) : "Enter PMMS rate",
      "New Interest Rate": achievedRate > 0 ? fmtPct(achievedRate) : "N/A",
      "New Term": achievedTerm ? `${achievedTerm} months (${(achievedTerm/12).toFixed(1)} years)` : "N/A",
      "New Monthly P&I": fmt$(achievedPI),
      "New Monthly Escrow": fmt$(escrow || null),
      "New Monthly PITI": fmt$(achievedPITI),
      "P&I Reduction": piReductionPct != null ? `${piReductionPct.toFixed(1)}% (${fmt$(currentPI_val)} → ${fmt$(achievedPI)})` : "Enter current P&I",
      "P&I Reduction ≥ 20%?": piReductionPct != null ? (piReductionPct >= 20 ? `✅ Yes — ${piReductionPct.toFixed(1)}%` : `❌ No — ${piReductionPct.toFixed(1)}% (principal forbearance may be required if MTMLTV > 100%)`) : "Enter current P&I",
      "New Maturity Date": fmtDate(newMaturity),
      "New First Payment Date": fmtDate(newFirstPmt),
      "Trial Period Plan": tppMonths,
      "Escrow Shortage": escShortage > 0 ? `${fmt$(escShortage)} — spread over 60-month escrow analysis (not capitalized)` : "None",
      "Late Charges": "May be assessed during TPP; ALL waived upon permanent modification",
      "Authority": `Fannie Mae Servicing Guide D2-3.2-06 (08/13/2025)${opt.includes("Disaster") ? " — Disaster Reduced Eligibility Criteria" : ""}`,
    };
  }
  // ── Fannie Mae Short Sale ──
  if (opt === "Fannie Mae Short Sale") {
    const estNetValue = upb > 0 ? upb * 0.93 : null;
    return {
      "Outstanding UPB": fmt$(upb || null),
      "Property Valuation": "Required — BPO or appraisal ordered by servicer per FNMA guidelines",
      "Estimated Minimum Net Proceeds": estNetValue != null ? `${fmt$(estNetValue)} (est. ~93% of UPB)` : "Enter UPB for estimate",
      "Selling Costs Allowed": "Commission (up to 6%), title, transfer taxes, customary closing costs",
      "Servicer Approval": "Servicer may approve within FNMA delegation; submit to FNMA if outside delegation",
      "Subordinate Lien Payments": "Require FNMA prior written approval before paying subordinate lienholders",
      "Borrower Relocation Assistance": "May be available per current FNMA guidelines",
      "Deficiency": "Servicer may release borrower from deficiency per FNMA guidelines",
      "Authority": "Fannie Mae Servicing Guide D2-3.3-01 (08/13/2025)",
    };
  }
  // ── Fannie Mae Mortgage Release (DIL) ──
  if (opt === "Fannie Mae Mortgage Release (DIL)") {
    return {
      "Outstanding UPB": fmt$(upb || null),
      "Property Valuation": "Required — BPO or appraisal per FNMA guidelines",
      "Title Requirement": "Clear title — junior liens must be cleared or subordinated prior to conveyance",
      "Property Condition": "Broom-swept, undamaged, ready for sale; borrower must vacate prior to conveyance",
      "Relocation Assistance": "May be available per current FNMA guidelines",
      "Deficiency": "Borrower released from personal deficiency upon FNMA acceptance of deed",
      "Subordinate Lien Payments": "Require FNMA prior written approval before paying subordinate lienholders",
      "Servicer Approval": "Submit to FNMA for approval; limited servicer delegation for DIL",
      "Authority": "Fannie Mae Servicing Guide D2-3.3-02",
    };
  }

  return { "Note": "Calculated terms not available for this option. See program guidelines." };
}

// ─── AUDIT NODE ───────────────────────────────────────────────────────────────
function node(q, a, pass) { return { question:q, answer:String(a), pass }; }

// ─── ELIGIBILITY ENGINES ─────────────────────────────────────────────────────
function evaluateFHA(l) {
  const results = [];
  const dlq=n(l.delinquencyMonths), priorHAMP=n(l.priorFHAHAMPMonths), pcPct=n(l.partialClaimPct), gmi=n(l.grossMonthlyIncome);
  const baseNodes=[node("Occupancy=Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("Foreclosure≠Active",!l.foreclosureActive,!l.foreclosureActive),node("Property≠Condemned/Uninhabitable",l.propertyCondition,l.propertyCondition!=="Condemned"&&l.propertyCondition!=="Uninhabitable"),node("Property=Principal Residence",l.propertyDisposition,l.propertyDisposition==="Principal Residence"),node("Lien=First",l.lienPosition,l.lienPosition==="First")];
  const baseEligible=baseNodes.every(nd=>nd.pass);
  if (l.verifiedDisaster) {
    const dn=[...baseNodes,node("In PDMA",l.propertyInPDMA,l.propertyInPDMA),node("Principal Residence pre-disaster",l.principalResidencePreDisaster,l.principalResidencePreDisaster),node("DLQ<12mo",dlq,dlq<12),node("Not damaged OR repairs done",l.propertySubstantiallyDamaged?l.repairsCompleted:"N/A",!l.propertySubstantiallyDamaged||l.repairsCompleted)];
    const db=dn.every(nd=>nd.pass);
    results.push({option:"FHA Disaster Loan Modification",eligible:db&&l.canAchieveTargetByReamort&&(l.currentOrLe30DaysAtDisaster||l.incomeGePreDisaster||l.incomeDocProvided),nodes:[...dn,node("Can achieve target",l.canAchieveTargetByReamort,l.canAchieveTargetByReamort),node("Income/DLQ condition",l.currentOrLe30DaysAtDisaster||l.incomeGePreDisaster||l.incomeDocProvided,l.currentOrLe30DaysAtDisaster||l.incomeGePreDisaster||l.incomeDocProvided)],note:!l.incomeDocProvided?"3-mo trial plan available":null});
    results.push({option:"FHA Disaster Standalone Partial Claim",eligible:db&&!l.canAchieveTargetByReamort&&pcPct<=30,nodes:[...dn,node("Cannot achieve target",!l.canAchieveTargetByReamort,!l.canAchieveTargetByReamort),node(`PC(${pcPct}%)≤30%`,pcPct,pcPct<=30)]});
  }
  const hb=baseEligible&&(priorHAMP===0||priorHAMP>=24)&&l.continuousIncome&&dlq>0&&STANDARD_HARDSHIPS.includes(l.hardshipType)&&l.borrowerIntentRetention;
  const hn=[...baseNodes,node("Std hardship",l.hardshipType,STANDARD_HARDSHIPS.includes(l.hardshipType)),node("Continuous income",l.continuousIncome,l.continuousIncome),node("DLQ>0",dlq,dlq>0),node("Prior HAMP≥24mo or none",priorHAMP===0?"None":priorHAMP+"mo",priorHAMP===0||priorHAMP>=24),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention)];
  results.push({option:"FHA-HAMP Standalone Loan Modification",eligible:hb&&l.canAchieveTargetByReamort,nodes:[...hn,node("Target achievable 360mo",l.canAchieveTargetByReamort,l.canAchieveTargetByReamort)],calc:gmi>0?`Target 31% GMI: $${(gmi*0.31).toFixed(2)}/mo`:null});
  results.push({option:"FHA 40-Year Loan Modification",eligible:hb&&!l.canAchieveTargetByReamort&&l.canAchieveTargetBy480Reamort,nodes:[...hn,node("Cannot achieve 360mo target",!l.canAchieveTargetByReamort,!l.canAchieveTargetByReamort),node("Can achieve 480mo target",l.canAchieveTargetBy480Reamort,l.canAchieveTargetBy480Reamort)],note:"ML 2023-22 — eff. May 2024; rate=PMMS; term=480mo",calc:gmi>0?`Target 31% GMI: $${(gmi*0.31).toFixed(2)}/mo`:null});
  results.push({option:"FHA-HAMP Standalone Partial Claim",eligible:hb&&!l.canAchieveTargetByReamort&&l.currentRateAtOrBelowMarket&&l.currentPITIAtOrBelowTarget&&pcPct<=30,nodes:[...hn,node("Cannot achieve target",!l.canAchieveTargetByReamort,!l.canAchieveTargetByReamort),node("Rate≤market",l.currentRateAtOrBelowMarket,l.currentRateAtOrBelowMarket),node("PITI≤target",l.currentPITIAtOrBelowTarget,l.currentPITIAtOrBelowTarget),node(`PC(${pcPct}%)≤30%`,pcPct,pcPct<=30)]});
  const cok=pcPct<=30||(l.arrearsExceed30PctLimit&&l.modPaymentLe40PctGMI);
  results.push({option:"FHA-HAMP Combo Loan Modification & Partial Claim",eligible:hb&&!l.canAchieveTargetByReamort&&cok,nodes:[...hn,node("Cannot achieve target",!l.canAchieveTargetByReamort,!l.canAchieveTargetByReamort),node("PC≤30% OR 40% exception",cok,cok)],note:l.arrearsExceed30PctLimit&&l.modPaymentLe40PctGMI?"40% GMI exception applied":null,calc:gmi>0?`40% Cap: $${(gmi*0.40).toFixed(2)} | 31% Target: $${(gmi*0.31).toFixed(2)}`:null});
  results.push({option:"Payment Supplement",eligible:baseEligible&&!l.canAchieveTargetByReamort&&l.unemployed&&l.comboPaymentLe40PctIncome,nodes:[...baseNodes,node("Cannot achieve target",!l.canAchieveTargetByReamort,!l.canAchieveTargetByReamort),node("Unemployed",l.unemployed,l.unemployed),node("Combo pmt≤40% GMI",l.comboPaymentLe40PctIncome,l.comboPaymentLe40PctIncome)]});
  results.push({option:"Repayment Plan",eligible:dlq<=12&&l.canRepayWithin24Months&&!l.failedTPP,nodes:[node("DLQ≤12mo",dlq,dlq<=12),node("Can repay 24mo",l.canRepayWithin24Months,l.canRepayWithin24Months),node("No failed TPP",!l.failedTPP,!l.failedTPP)]});
  results.push({option:"Formal Forbearance",eligible:dlq<12&&(l.canRepayWithin6Months||l.requestedForbearance),nodes:[node("DLQ<12mo",dlq,dlq<12),node("Repay 6mo OR requested",l.canRepayWithin6Months||l.requestedForbearance,l.canRepayWithin6Months||l.requestedForbearance)]});
  results.push({option:"Special Forbearance – Unemployment",eligible:dlq>=3&&dlq<=12&&!l.foreclosureActive&&l.hardshipType==="Unemployment"&&l.occupancyStatus==="Owner Occupied"&&l.propertyDisposition==="Principal Residence"&&l.verifiedUnemployment&&!l.continuousIncome&&l.ineligibleAllRetention&&!l.propertyListedForSale&&!l.assumptionInProcess,nodes:[node("DLQ 3-12mo",dlq,dlq>=3&&dlq<=12),node("Hardship=Unemployment",l.hardshipType,l.hardshipType==="Unemployment"),node("Verified unemployment",l.verifiedUnemployment,l.verifiedUnemployment),node("No continuous income",!l.continuousIncome,!l.continuousIncome),node("Ineligible all retention",l.ineligibleAllRetention,l.ineligibleAllRetention),node("Not listed for sale",!l.propertyListedForSale,!l.propertyListedForSale),node("No assumption",!l.assumptionInProcess,!l.assumptionInProcess)]});
  if (l.meetsPFSRequirements) results.push({option:"Pre-Foreclosure Sale (PFS)",eligible:true,nodes:[node("Meets PFS req","Yes",true)]});
  if (l.outstandingDebtUncurable&&l.meetsDILRequirements) results.push({option:"Deed-in-Lieu (DIL)",eligible:true,nodes:[node("Meets DIL req","Yes",true)]});
  return results;
}
function evaluateUSDA(l) {
  const results=[];
  const dlqD=n(l.delinquencyDays)||n(l.delinquencyMonths)*30, dlqM=n(l.delinquencyMonths), nm=parseInt(l.usdaNumPrevMods)||0;
  const isD=l.hardshipType==="Disaster", ltp=l.hardshipDuration==="Long Term"||l.hardshipDuration==="Permanent";
  const br=l.propertyCondition!=="Condemned"&&l.propertyCondition!=="Uninhabitable"&&!l.occupancyAbandoned&&l.lienPosition==="First";
  const ib=dlqD>0&&dlqD<360&&l.borrowerIntentRetention&&l.hardshipDuration==="Short Term"&&l.usdaHardshipNotExcluded&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.occupancyStatus==="Owner Occupied"&&(l.usdaForbearancePeriodLt12||l.usdaTotalDLQLt12);
  const iN=[node("DLQ>0&<360d",dlqD,dlqD>0&&dlqD<360),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Short Term hardship",l.hardshipDuration,l.hardshipDuration==="Short Term"),node("Not excluded type",l.usdaHardshipNotExcluded,l.usdaHardshipNotExcluded),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("Forbearance or DLQ<12mo",l.usdaForbearancePeriodLt12||l.usdaTotalDLQLt12,l.usdaForbearancePeriodLt12||l.usdaTotalDLQLt12)];
  results.push({option:"USDA Informal Forbearance",eligible:ib&&l.hardshipDuration==="Short Term",nodes:iN});
  results.push({option:"USDA Informal Repayment Plan",eligible:ib&&l.hardshipDuration==="Resolved"&&l.usdaNewPaymentLe200pct&&l.usdaBorrowerPositiveNetIncome,nodes:[...iN,node("Hardship Resolved",l.hardshipDuration,l.hardshipDuration==="Resolved"),node("Payment≤200%",l.usdaNewPaymentLe200pct,l.usdaNewPaymentLe200pct),node("Positive net income",l.usdaBorrowerPositiveNetIncome,l.usdaBorrowerPositiveNetIncome)]});
  results.push({option:"USDA Disaster Forbearance",eligible:isD&&br&&l.occupancyStatus==="Owner Occupied",nodes:[node("Hardship=Disaster",isD,isD),node("Base eligibility",br,br),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied")]});
  results.push({option:"USDA Special Forbearance",eligible:!isD&&br&&l.occupancyStatus==="Owner Occupied"&&dlqM<=12,nodes:[node("Not Disaster",!isD,!isD),node("Base eligibility",br,br),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("DLQ≤12mo",dlqM,dlqM<=12)]});
  const sb=br&&l.borrowerIntentRetention&&l.occupancyStatus==="Owner Occupied"&&nm<2&&!l.usdaPriorFailedStreamlineTPP&&dlqD>=90&&l.usdaUpbGe5000&&l.usdaPaymentsMade12&&l.usdaBankruptcyNotActive&&l.usdaLitigationNotActive&&l.usdaForeclosureSaleGe60Away;
  results.push({option:"USDA Streamline Loan Modification",eligible:sb,nodes:[node("≥90d DLQ",dlqD,dlqD>=90),node("UPB≥$5k",l.usdaUpbGe5000,l.usdaUpbGe5000),node("12+ payments",l.usdaPaymentsMade12,l.usdaPaymentsMade12),node("Bankruptcy≠Active",l.usdaBankruptcyNotActive,l.usdaBankruptcyNotActive),node("Litigation≠Active",l.usdaLitigationNotActive,l.usdaLitigationNotActive),node("No failed Streamline TPP",!l.usdaPriorFailedStreamlineTPP,!l.usdaPriorFailedStreamlineTPP),node("Not Abandoned/Condemned",br,br),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("PrevMods<2",nm,nm<2),node("Foreclosure sale≥60d",l.usdaForeclosureSaleGe60Away,l.usdaForeclosureSaleGe60Away)]});
  results.push({option:"USDA Standalone Mortgage Recovery Advance (MRA)",eligible:l.usdaBorrowerCanResumeCurrent&&(l.usdaHardshipDurationResolved||l.usdaLoanModIneligible)&&l.usdaBorrowerCannotCureDLQWithin12&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&dlqD>=61,nodes:[node("Can resume payment",l.usdaBorrowerCanResumeCurrent,l.usdaBorrowerCanResumeCurrent),node("Resolved OR Mod Ineligible",l.usdaHardshipDurationResolved||l.usdaLoanModIneligible,l.usdaHardshipDurationResolved||l.usdaLoanModIneligible),node("Cannot cure DLQ 12mo",l.usdaBorrowerCannotCureDLQWithin12,l.usdaBorrowerCannotCureDLQWithin12),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("DLQ≥61d",dlqD,dlqD>=61)]});
  results.push({option:"USDA Disaster Term Extension Modification",eligible:l.usdaPriorWorkoutDisasterForbearance&&isD&&l.usdaHardshipNotResolved&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.usdaDLQGe12Contractual&&l.usdaDLQAt30AtDisaster&&l.usdaLoanGe60DLQ&&l.usdaPrevWorkoutForbearance&&l.usdaWorkoutStateActivePassed,nodes:[node("Prior=Disaster Forbearance",l.usdaPriorWorkoutDisasterForbearance,l.usdaPriorWorkoutDisasterForbearance),node("Hardship=Disaster",isD,isD),node("Hardship≠Resolved",l.usdaHardshipNotResolved,l.usdaHardshipNotResolved),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("DLQ≥12 Contractual",l.usdaDLQGe12Contractual,l.usdaDLQGe12Contractual),node("<30d DLQ at Declaration",l.usdaDLQAt30AtDisaster,l.usdaDLQAt30AtDisaster),node("Loan≥60d DLQ",l.usdaLoanGe60DLQ,l.usdaLoanGe60DLQ),node("Prev=Forbearance",l.usdaPrevWorkoutForbearance,l.usdaPrevWorkoutForbearance),node("Workout{Active,Passed}",l.usdaWorkoutStateActivePassed,l.usdaWorkoutStateActivePassed)]});
  results.push({option:"USDA Disaster Modification",eligible:isD&&l.lienPosition==="First"&&l.usdaDLQAt30AtDisaster&&l.hardshipDuration==="Resolved"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.usdaBorrowerCanResumePmtFalse&&l.usdaLoanGe30DaysDLQ&&l.usdaPostModPITILePreMod,nodes:[node("Hardship=Disaster",isD,isD),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("<30d at Declaration",l.usdaDLQAt30AtDisaster,l.usdaDLQAt30AtDisaster),node("Hardship=Resolved",l.hardshipDuration,l.hardshipDuration==="Resolved"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("Cannot resume pmt",l.usdaBorrowerCanResumePmtFalse,l.usdaBorrowerCanResumePmtFalse),node("Loan≥30d DLQ",l.usdaLoanGe30DaysDLQ,l.usdaLoanGe30DaysDLQ),node("Post-Mod PITI≤Pre",l.usdaPostModPITILePreMod,l.usdaPostModPITILePreMod)]});
  results.push({option:"USDA Disaster Mortgage Recovery Advance (MRA)",eligible:!l.usdaEligibleForDisasterExtension&&!l.usdaEligibleForDisasterMod&&isD&&l.lienPosition==="First"&&l.usdaDLQAt30AtDisaster&&l.hardshipDuration==="Resolved"&&l.usdaPriorWorkoutNotMRA&&l.usdaReinstatementLtMRACap&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.usdaBorrowerCanResumePmtFalse&&l.usdaLoanGe30DaysDLQ&&l.usdaPostModPITILePreMod,nodes:[node("DisasterExt=FALSE",!l.usdaEligibleForDisasterExtension,!l.usdaEligibleForDisasterExtension),node("DisasterMod=FALSE",!l.usdaEligibleForDisasterMod,!l.usdaEligibleForDisasterMod),node("Hardship=Disaster",isD,isD),node("Prior≠MRA",l.usdaPriorWorkoutNotMRA,l.usdaPriorWorkoutNotMRA),node("Reinstatement<Cap",l.usdaReinstatementLtMRACap,l.usdaReinstatementLtMRACap),node("<30d at Declaration",l.usdaDLQAt30AtDisaster,l.usdaDLQAt30AtDisaster),node("Hardship=Resolved",l.hardshipDuration,l.hardshipDuration==="Resolved"),node("Cannot resume pmt",l.usdaBorrowerCanResumePmtFalse,l.usdaBorrowerCanResumePmtFalse),node("Post-Mod PITI≤Pre",l.usdaPostModPITILePreMod,l.usdaPostModPITILePreMod)]});
  const cb=(ltp)&&l.usdaDLQGt30&&l.occupancyStatus==="Owner Occupied"&&l.usdaCompleteBRP&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&(l.usdaDLQLe60AndBRP||l.usdaDLQGe60AndDisposition);
  results.push({option:"USDA Compromise Sale",eligible:cb,nodes:[node("Long Term/Perm",l.hardshipDuration,ltp),node("DLQ>30d",l.usdaDLQGt30,l.usdaDLQGt30),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("Complete BRP",l.usdaCompleteBRP,l.usdaCompleteBRP),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("DLQ/BRP/Disposition criteria",l.usdaDLQLe60AndBRP||l.usdaDLQGe60AndDisposition,l.usdaDLQLe60AndBRP||l.usdaDLQGe60AndDisposition)]});
  results.push({option:"USDA Deed-in-Lieu",eligible:cb&&l.usdaPriorWorkoutCompSaleFailed,nodes:[node("Comp Sale criteria met",cb,cb),node("Prior Comp Sale=FAILED",l.usdaPriorWorkoutCompSaleFailed,l.usdaPriorWorkoutCompSaleFailed)]});
  return results;
}
function evaluateVA(l) {
  const results=[];
  const dlqD=n(l.delinquencyDays)||n(l.delinquencyMonths)*30, pcPct=n(l.partialClaimPct);
  // Base eligibility: first lien, not condemned, not abandoned, foreclosure NOT active
  const vb=l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&!l.foreclosureActive;
  const rH=l.hardshipDuration==="Resolved", ltH=l.hardshipDuration==="Long Term"||l.hardshipDuration==="Permanent";
  const sH=STANDARD_HARDSHIPS.includes(l.hardshipType), isD=l.hardshipType==="Disaster";
  const oo=l.occupancyStatus==="Owner Occupied";
  const vN=[node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("Foreclosure≠Active",!l.foreclosureActive,!l.foreclosureActive)];
  if (isD){
    // Disaster forbearance: triggered by disaster declaration, no minimum DLQ threshold
    results.push({option:"VA Disaster Forbearance",eligible:vb&&dlqD>=1&&l.dlqAtDisasterLt30&&(l.forbearancePeriodLt12||l.totalDLQLt12),nodes:[...vN,node("DLQ>0",dlqD,dlqD>=1),node("<30d at Declaration",l.dlqAtDisasterLt30,l.dlqAtDisasterLt30),node("Forbearance/DLQ<12mo",l.forbearancePeriodLt12||l.totalDLQLt12,l.forbearancePeriodLt12||l.totalDLQLt12)]});
    results.push({option:"VA Disaster Modification",eligible:vb&&!l.activeRPP&&l.pmmsLeCurrentPlus1&&l.dlqAtDisasterLt30&&l.loanGe60DaysDLQ&&l.previousWorkoutForbearance&&l.workoutStateActivePassed,nodes:[...vN,node("ActiveRPP=False",!l.activeRPP,!l.activeRPP),node("PMMS≤Rate+1%",l.pmmsLeCurrentPlus1,l.pmmsLeCurrentPlus1),node("<30d at Declaration",l.dlqAtDisasterLt30,l.dlqAtDisasterLt30),node("Loan≥60d DLQ",l.loanGe60DaysDLQ,l.loanGe60DaysDLQ),node("Prev=Forbearance",l.previousWorkoutForbearance,l.previousWorkoutForbearance),node("Workout{Active,Passed}",l.workoutStateActivePassed,l.workoutStateActivePassed)]});
    results.push({option:"VA Disaster Extend Modification",eligible:vb&&l.hardshipDuration!=="Resolved"&&l.dlqGe12ContractualPayments&&l.dlqAtDisasterLt30&&l.loanGe60DaysDLQ&&l.previousWorkoutForbearance&&l.workoutStateActivePassed,nodes:[...vN,node("Hardship≠Resolved",l.hardshipDuration,l.hardshipDuration!=="Resolved"),node("DLQ≥12 Contractual",l.dlqGe12ContractualPayments,l.dlqGe12ContractualPayments),node("<30d at Declaration",l.dlqAtDisasterLt30,l.dlqAtDisasterLt30),node("Loan≥60d DLQ",l.loanGe60DaysDLQ,l.loanGe60DaysDLQ),node("Prev=Forbearance",l.previousWorkoutForbearance,l.previousWorkoutForbearance),node("Workout{Active,Passed}",l.workoutStateActivePassed,l.workoutStateActivePassed)]});
  }
  // ── Waterfall per VA M26-4: Reinstatement → Repayment Plan → Special Forbearance → Modification → VASP → Disposition ──
  // 1. Reinstatement — VA M26-4 §2.A: first option; borrower pays all arrears in one lump sum
  results.push({option:"VA Reinstatement",eligible:vb&&rH&&dlqD>=1&&l.borrowerCanAffordReinstateOrRepay,nodes:[...vN,node("Hardship=Resolved",l.hardshipDuration,rH),node("DLQ>0",dlqD,dlqD>=1),node("Can afford reinstatement",l.borrowerCanAffordReinstateOrRepay,l.borrowerCanAffordReinstateOrRepay)]});
  // 2. Repayment Plan — resolved hardship, borrower can make regular payment + catch-up
  results.push({option:"VA Repayment Plan",eligible:vb&&rH&&dlqD>=61&&l.calculatedRPPGt0&&l.borrowerCanAffordReinstateOrRepay&&l.borrowerIntentRetention&&oo,nodes:[...vN,node("Hardship=Resolved",l.hardshipDuration,rH),node("DLQ≥61d",dlqD,dlqD>=61),node("RPP Plans>0",l.calculatedRPPGt0,l.calculatedRPPGt0),node("Can afford RPP",l.borrowerCanAffordReinstateOrRepay,l.borrowerCanAffordReinstateOrRepay),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Owner Occupied",l.occupancyStatus,oo)]});
  // 3. Special Forbearance — active/temporary hardship (Long Term, not Resolved and not Permanent)
  results.push({option:"VA Special Forbearance",eligible:vb&&l.hardshipDuration==="Long Term"&&sH&&(l.forbearancePeriodLt12||l.totalDLQLt12)&&dlqD>=61&&l.borrowerIntentRetention&&oo,nodes:[...vN,node("Hardship=Long Term (active)",l.hardshipDuration,l.hardshipDuration==="Long Term"),node("Std hardship",l.hardshipType,sH),node("Forbearance/DLQ<12mo",l.forbearancePeriodLt12||l.totalDLQLt12,l.forbearancePeriodLt12||l.totalDLQLt12),node("DLQ≥61d",dlqD,dlqD>=61),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Owner Occupied",l.occupancyStatus,oo)]});
  // 4a. Traditional Modification — negotiated terms, requires VA approval
  results.push({option:"VA Traditional Modification",eligible:vb&&sH&&dlqD>=61&&l.borrowerConfirmedCannotAffordCurrent&&l.borrowerCanAffordModifiedPayment&&l.borrowerIntentRetention&&oo,nodes:[...vN,node("Std hardship",l.hardshipType,sH),node("DLQ≥61d",dlqD,dlqD>=61),node("Confirmed cannot afford current",l.borrowerConfirmedCannotAffordCurrent,l.borrowerConfirmedCannotAffordCurrent),node("CAN afford modified",l.borrowerCanAffordModifiedPayment,l.borrowerCanAffordModifiedPayment),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Owner Occupied",l.occupancyStatus,oo)]});
  // 4b. 30-Year Loan Modification — rate = PMMS, 360-month term
  results.push({option:"VA 30-Year Loan Modification",eligible:vb&&sH&&dlqD>=61&&l.borrowerConfirmedCannotAffordCurrent&&!l.borrowerCanAffordCurrentMonthly&&l.borrowerIntentRetention&&oo,nodes:[...vN,node("Std hardship",l.hardshipType,sH),node("DLQ≥61d",dlqD,dlqD>=61),node("Confirmed cannot afford current",l.borrowerConfirmedCannotAffordCurrent,l.borrowerConfirmedCannotAffordCurrent),node("Cannot afford current monthly",!l.borrowerCanAffordCurrentMonthly,!l.borrowerCanAffordCurrentMonthly),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Owner Occupied",l.occupancyStatus,oo)]});
  // 4c. 40-Year Loan Modification — Circular 26-22-18; rate=PMMS, 480-month term, P&I ≥10% reduction; NO resolved-hardship requirement
  results.push({option:"VA 40-Year Loan Modification",eligible:vb&&sH&&dlqD>=61&&l.borrowerConfirmedCannotAffordCurrent&&oo&&l.modifiedPILe90PctOld&&l.borrowerIntentRetention,nodes:[...vN,node("Std hardship",l.hardshipType,sH),node("DLQ≥61d",dlqD,dlqD>=61),node("Confirmed cannot afford",l.borrowerConfirmedCannotAffordCurrent,l.borrowerConfirmedCannotAffordCurrent),node("Owner Occupied",l.occupancyStatus,oo),node("P&I≤90% old P&I (≥10% reduction)",l.modifiedPILe90PctOld,l.modifiedPILe90PctOld),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention)]});
  // 5. VASP — VA purchases loan; all modification options must be exhausted first
  results.push({option:"VASP (VA Partial Claim)",eligible:vb&&l.continuousIncome&&!l.canAchieveTargetByReamort&&pcPct<=30&&oo&&dlqD>=61&&l.borrowerIntentRetention,nodes:[...vN,node("Continuous income",l.continuousIncome,l.continuousIncome),node("Cannot achieve target by mod",!l.canAchieveTargetByReamort,!l.canAchieveTargetByReamort),node(`PC(${pcPct}%)≤30%`,pcPct,pcPct<=30),node("Owner Occupied",l.occupancyStatus,oo),node("DLQ≥61d",dlqD,dlqD>=61),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention)]});
  // 6. Disposition options
  const ce=ltH&&vb&&((dlqD<=60&&l.completeBRP)||(dlqD>=60&&l.borrowerIntentDisposition));
  results.push({option:"VA Compromise Sale",eligible:ce,nodes:[...vN,node("Long Term/Perm",l.hardshipDuration,ltH),node("DLQ/BRP/Disposition",ce,ce)]});
  results.push({option:"VA Deed-in-Lieu",eligible:ce&&l.priorWorkoutCompromiseSaleFailed,nodes:[...vN,node("Long Term/Perm",l.hardshipDuration,ltH),node("Comp Sale criteria",ce,ce),node("Prior Comp Sale FAILED",l.priorWorkoutCompromiseSaleFailed,l.priorWorkoutCompromiseSaleFailed)]});
  return results;
}

function evaluateFHLMC(l) {
  const results = [];
  const dlq = n(l.delinquencyMonths);
  const loanAge = n(l.fhlmcLoanAge);
  const priorMods = n(l.fhlmcPriorModCount);
  const dlqAtDisaster = n(l.fhlmcDLQAtDisaster);
  const fico = n(l.fhlmcFICO);
  const housingRatio = n(l.fhlmcHousingExpenseRatio);
  const isConventional = l.fhlmcMortgageType === "Conventional";
  const isFirstLien = l.lienPosition === "First";
  const isOwnerOccupied = l.occupancyStatus === "Owner Occupied";
  const isPrimaryRes = l.fhlmcPropertyType === "Primary Residence";
  const propertyOK = l.propertyCondition !== "Condemned" && !l.occupancyAbandoned;
  // Common active-status blockers
  const noActiveLiquidation = !l.fhlmcApprovedLiquidationOption;
  const noActiveTPP = !l.fhlmcActiveTPP;
  const noActiveForbearance = !l.fhlmcActiveForbearance;
  const noActiveRepay = !l.fhlmcActiveRepayPlan;
  const noUnexpiredOffer = !l.fhlmcUnexpiredOffer;
  const noRecourse = !l.fhlmcRecourse;
  // Hard ineligibility (absolute) for Flex Mod
  const hardIneligible = !isConventional || l.fhlmcRecourse;
  // Investment property hard stop only when <60 DLQ
  const investmentHardStop = l.fhlmcPropertyType === "Investment Property" && dlq < 2;
  // Soft ineligibility (exception path exists)
  const softIneligible = priorMods >= 3 || l.fhlmcFailedFlexTPP12Mo || l.fhlmcPriorFlexMod60DLQ;

  // ── 1. Repayment Plan ─────────────────────────────────────────────────────────
  {
    const nodes = [
      node("Hardship resolved (temporary, no longer a problem)", l.fhlmcHardshipResolved?"Yes":"No", l.fhlmcHardshipResolved),
      node("Property not condemned/abandoned", l.propertyCondition, propertyOK),
    ];
    results.push({ option:"FHLMC Repayment Plan", eligible:nodes.every(nd=>nd.pass), nodes, note:"$500 servicer incentive if ≥60 DLQ at plan entry and borrower reinstates/pays off" });
  }
  // ── 2. Payment Deferral ───────────────────────────────────────────────────────
  {
    const eligDlqRange = dlq >= 2 && dlq <= 6;
    const nodes = [
      node("DLQ 2–6 months", dlq+"mo", eligDlqRange),
      node("Hardship resolved", l.fhlmcHardshipResolved?"Yes":"No", l.fhlmcHardshipResolved),
      node("Can resume full contractual payment", l.fhlmcCanResumeFull?"Yes":"No", l.fhlmcCanResumeFull),
      node("Conventional 1st lien", l.lienPosition, isConventional && isFirstLien),
      node("No approved liquidation option active", l.fhlmcApprovedLiquidationOption?"Active":"None", noActiveLiquidation),
      node("No active/performing TPP", l.fhlmcActiveTPP?"Active":"None", noActiveTPP),
      node("No unexpired offer for another workout option", l.fhlmcUnexpiredOffer?"Yes":"No", noUnexpiredOffer),
    ];
    results.push({ option:"FHLMC Payment Deferral", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  // ── 3. Disaster Payment Deferral ─────────────────────────────────────────────
  {
    const eligDlqAtDisaster = dlqAtDisaster < 2;
    const eligDlqRange = dlq >= 1 && dlq <= 12;
    const nodes = [
      node("Disaster-related hardship", l.fhlmcDisasterHardship?"Yes":"No", l.fhlmcDisasterHardship),
      node("Eligible Disaster (FEMA-declared or insured loss)", l.fhlmcFEMADesignation?"Yes":"No", l.fhlmcFEMADesignation),
      node("DLQ at time of disaster < 2 months", dlqAtDisaster+"mo", eligDlqAtDisaster),
      node("Current DLQ 1–12 months", dlq+"mo", eligDlqRange),
      node("Hardship resolved", l.fhlmcHardshipResolved?"Yes":"No", l.fhlmcHardshipResolved),
      node("Can resume full contractual payment", l.fhlmcCanResumeFull?"Yes":"No", l.fhlmcCanResumeFull),
      node("Conventional 1st lien", l.lienPosition, isConventional && isFirstLien),
      node("No approved liquidation option active", l.fhlmcApprovedLiquidationOption?"Active":"None", noActiveLiquidation),
      node("No active/performing TPP", l.fhlmcActiveTPP?"Active":"None", noActiveTPP),
      node("No unexpired offer for another workout option", l.fhlmcUnexpiredOffer?"Yes":"No", noUnexpiredOffer),
    ];
    results.push({ option:"FHLMC Disaster Payment Deferral", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  // ── 4. Forbearance Plan (Unemployment) ───────────────────────────────────────
  {
    const eligUnemployed = l.fhlmcUnemployed || l.hardshipType === "Unemployment";
    const nodes = [
      node("Unemployed borrower (temporary hardship)", eligUnemployed?"Yes":"No", eligUnemployed),
      node("Property not condemned/abandoned", l.propertyCondition, propertyOK),
      node("No approved liquidation option active", l.fhlmcApprovedLiquidationOption?"Active":"None", noActiveLiquidation),
    ];
    results.push({ option:"FHLMC Forbearance Plan", eligible:nodes.every(nd=>nd.pass), nodes, note:"Freddie Mac requires forbearance (not Flex Mod) for unemployed borrowers — §9203.3" });
  }
  // ── 5a. Freddie Mac Flex Modification — Standard (Full BRP) ──────────────────
  {
    const eligHardship = l.fhlmcLongTermHardship && !l.fhlmcUnemployed;
    const eligDLQ = dlq >= 2 || l.fhlmcImminentDefault;
    const eligLoanAge = loanAge >= 12;
    // Imminent default: Rule 1 always required; then Rule 2 OR Rule 3
    const rule1 = l.fhlmcCashReservesLt25k && isPrimaryRes && l.fhlmcLongTermHardship;
    const rule2 = fico <= 620 || l.fhlmcPrior30DayDLQ6Mo || housingRatio > 40;
    const imminentValid = !l.fhlmcImminentDefault || (rule1 && rule2);
    const nodes = [
      node("Conventional mortgage (not FHA/VA/RHS)", l.fhlmcMortgageType, isConventional),
      node("First lien", l.lienPosition, isFirstLien),
      node("No recourse arrangement", l.fhlmcRecourse?"Yes":"No", noRecourse),
      node("Loan age ≥ 12 months", loanAge+"mo", eligLoanAge),
      node("≥ 60 days DLQ OR imminent default determination", dlq+"mo"+(l.fhlmcImminentDefault?" (ID)":""), eligDLQ),
      ...(l.fhlmcImminentDefault ? [node("Imminent default business rules met (Rule 1 + Rule 2/3)", imminentValid?"Pass":"Fail", imminentValid, "Rule 1: primary res + cash <$25k + LT hardship; Rule 2: FICO ≤620 or 2x30DLQ or DTI>40%")] : []),
      node("Long-term/permanent hardship (not unemployment)", l.fhlmcLongTermHardship?"Yes":"No", eligHardship),
      node("Verified income", l.fhlmcVerifiedIncome?"Yes":"No", l.fhlmcVerifiedIncome),
      node("Investment property: current/<60 DLQ hard stop", l.fhlmcPropertyType, !investmentHardStop),
      node("Prior modifications < 3", priorMods, priorMods < 3),
      node("No failed Flex Mod TPP within 12 months", l.fhlmcFailedFlexTPP12Mo?"Yes":"No", !l.fhlmcFailedFlexTPP12Mo),
      node("No prior Flex Mod re-default within 12mo (not cured)", l.fhlmcPriorFlexMod60DLQ?"Yes":"No", !l.fhlmcPriorFlexMod60DLQ),
      node("No approved liquidation option active", l.fhlmcApprovedLiquidationOption?"Active":"None", noActiveLiquidation),
      node("Not under active TPP/forbearance/repayment plan", (l.fhlmcActiveTPP||l.fhlmcActiveForbearance||l.fhlmcActiveRepayPlan)?"Active":"None", noActiveTPP&&noActiveForbearance&&noActiveRepay),
      node("No unexpired offer for another workout option", l.fhlmcUnexpiredOffer?"Yes":"No", noUnexpiredOffer),
    ];
    results.push({ option:"Freddie Mac Flex Modification", eligible:nodes.every(nd=>nd.pass), nodes, note:"Servicer must also confirm modification results in P&I ≤ pre-mod P&I; target is >20% reduction" });
  }
  // ── 5b. Freddie Mac Flex Modification — Streamlined (No BRP) ─────────────────
  {
    const eligStreamlined = dlq >= 3 || (l.fhlmcStepRateMortgage && l.fhlmcRateAdjustedWithin12Mo && dlq >= 2);
    const nodes = [
      node("Conventional mortgage (not FHA/VA/RHS)", l.fhlmcMortgageType, isConventional),
      node("First lien", l.lienPosition, isFirstLien),
      node("No recourse arrangement", l.fhlmcRecourse?"Yes":"No", noRecourse),
      node("Loan age ≥ 12 months", loanAge+"mo", loanAge >= 12),
      node("≥ 90 days DLQ OR Step-Rate 60+ DLQ within 12mo of adjustment", dlq+"mo"+(l.fhlmcStepRateMortgage?" (step-rate)":""), eligStreamlined),
      node("Investment property: current/<60 DLQ hard stop", l.fhlmcPropertyType, !investmentHardStop),
      node("Prior modifications < 3", priorMods, priorMods < 3),
      node("No failed Flex Mod TPP within 12 months", l.fhlmcFailedFlexTPP12Mo?"Yes":"No", !l.fhlmcFailedFlexTPP12Mo),
      node("No prior Flex Mod re-default within 12mo (not cured)", l.fhlmcPriorFlexMod60DLQ?"Yes":"No", !l.fhlmcPriorFlexMod60DLQ),
      node("No approved liquidation option active", l.fhlmcApprovedLiquidationOption?"Active":"None", noActiveLiquidation),
      node("Not under active TPP/forbearance/repayment plan", (l.fhlmcActiveTPP||l.fhlmcActiveForbearance||l.fhlmcActiveRepayPlan)?"Active":"None", noActiveTPP&&noActiveForbearance&&noActiveRepay),
      node("No unexpired offer for another workout option", l.fhlmcUnexpiredOffer?"Yes":"No", noUnexpiredOffer),
    ];
    results.push({ option:"Freddie Mac Flex Modification (Streamlined)", eligible:nodes.every(nd=>nd.pass), nodes, note:"No BRP, hardship, or income verification required for streamlined path" });
  }
  // ── 5c. Freddie Mac Flex Modification — Disaster ──────────────────────────────
  {
    const eligDisaster = l.fhlmcDisasterHardship;
    const eligFEMA = l.fhlmcFEMADesignation;
    const eligDlqAtDisaster = dlqAtDisaster < 2;
    const nodes = [
      node("Disaster-related hardship", l.fhlmcDisasterHardship?"Yes":"No", eligDisaster),
      node("Eligible Disaster (FEMA-declared)", l.fhlmcFEMADesignation?"Yes":"No", eligFEMA),
      node("Conventional mortgage (not FHA/VA/RHS)", l.fhlmcMortgageType, isConventional),
      node("First lien", l.lienPosition, isFirstLien),
      node("No recourse arrangement", l.fhlmcRecourse?"Yes":"No", noRecourse),
      node("Current or <60 days DLQ at time of disaster", dlqAtDisaster+"mo", eligDlqAtDisaster),
      node("Not under active approved liquidation option", l.fhlmcApprovedLiquidationOption?"Active":"None", noActiveLiquidation),
      node("Not under active non-disaster TPP/repayment plan", (l.fhlmcActiveTPP||l.fhlmcActiveRepayPlan)?"Active":"None", noActiveTPP&&noActiveRepay),
      node("No unexpired non-disaster workout offer", l.fhlmcUnexpiredOffer?"Yes":"No", noUnexpiredOffer),
    ];
    results.push({ option:"Freddie Mac Flex Modification (Disaster)", eligible:nodes.every(nd=>nd.pass), nodes, note:"Prior solicitation not required; disaster forbearance plan does NOT disqualify" });
  }
  // ── 6. Short Sale ─────────────────────────────────────────────────────────────
  {
    const eligIntent = !l.borrowerIntentRetention;
    const nodes = [
      node("Borrower intent = Disposition", l.borrowerIntentRetention?"Retain":"Dispose", eligIntent),
      node("Eligible hardship", l.hardshipType, l.hardshipType !== "None"),
      node("Conventional mortgage", l.fhlmcMortgageType, isConventional),
    ];
    results.push({ option:"Freddie Mac Short Sale", eligible:nodes.every(nd=>nd.pass), nodes, note:"$2,200 servicer incentive; Streamlined Short Sale available for eligible borrowers" });
  }
  // ── 7. Deed-in-Lieu ───────────────────────────────────────────────────────────
  {
    const eligIntent = !l.borrowerIntentRetention;
    const nodes = [
      node("Borrower intent = Disposition", l.borrowerIntentRetention?"Retain":"Dispose", eligIntent),
      node("Eligible hardship", l.hardshipType, l.hardshipType !== "None"),
      node("Conventional mortgage", l.fhlmcMortgageType, isConventional),
      node("Meets Deed-in-Lieu requirements", l.meetsDILRequirements?"Yes":"No", l.meetsDILRequirements),
    ];
    results.push({ option:"Freddie Mac Deed-in-Lieu", eligible:nodes.every(nd=>nd.pass), nodes, note:"$1,500 servicer incentive; Streamlined DIL available for eligible borrowers" });
  }
  return results;
}

function evaluateFNMA(l) {
  const results = [];
  const dlq = n(l.delinquencyMonths);
  const loanAge = n(l.fnmaLoanAge);
  const priorModCount = n(l.fnmaPriorModCount);
  const cumulativeDeferred = n(l.fnmaCumulativeDeferredMonths);
  const priorDeferralMonths = n(l.fnmaPriorDeferralMonths);
  const dlqAtDisaster = n(l.fnmaDelinquencyAtDisaster);
  const propertyOK = l.propertyCondition !== "Condemned" && !l.occupancyAbandoned;
  const commonBlockers = [
    node("No recourse/indemnification with FNMA", l.fnmaRecourseArrangement?"Yes":"No", !l.fnmaRecourseArrangement),
    node("No approved liquidation option active", l.fnmaActiveLiquidation?"Active":"None", !l.fnmaActiveLiquidation),
    node("No active/performing repayment plan", l.fnmaActiveRepayPlan?"Active":"None", !l.fnmaActiveRepayPlan),
    node("No pending workout option offer", l.fnmaActivePendingOffer?"Pending":"None", !l.fnmaActivePendingOffer),
    node("No active/performing modification TPP", l.fnmaActiveTPP?"Active":"None", !l.fnmaActiveTPP),
  ];
  // ── 1. Forbearance Plan (D2-3.2-01) ──────────────────────────────────────────
  {
    const isPrincipalRes = l.fnmaPropertyType === "Principal Residence";
    const isDisasterOK = l.fnmaDisasterHardship; // disaster: 2nd home/investment OK
    const eligPropType = isPrincipalRes || isDisasterOK;
    const nodes = [
      node("Eligible hardship", l.hardshipType, l.hardshipType !== "None"),
      node("Property type eligible", l.fnmaPropertyType, eligPropType, isPrincipalRes?"":"(disaster: 2nd home/investment OK)"),
      node("Property not condemned/abandoned", l.propertyCondition, propertyOK),
    ];
    results.push({ option:"FNMA Forbearance Plan", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  // ── 2. Repayment Plan (D2-3.2-02) ────────────────────────────────────────────
  {
    const nodes = [
      node("Hardship appears resolved (temporary, no longer a problem)", l.fnmaHardshipResolved?"Yes":"No", l.fnmaHardshipResolved),
      node("Property not condemned/abandoned", l.propertyCondition, propertyOK),
    ];
    results.push({ option:"FNMA Repayment Plan", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  // ── 3. Payment Deferral (D2-3.2-04) ──────────────────────────────────────────
  {
    const eligLienPos = l.lienPosition === "First";
    const eligLoanAge = loanAge >= 12;
    const eligDlqRange = dlq >= 2 && dlq <= 6;
    const eligCumCap = cumulativeDeferred < 12;
    const eligPriorDeferral = priorDeferralMonths === 0 || priorDeferralMonths >= 12;
    const eligNotNearMaturity = !l.fnmaWithin36MonthsMaturity;
    const eligNoFailedTPP = !l.fnmaFailedTPP12Months;
    const nodes = [
      node("Conventional 1st lien", l.lienPosition, eligLienPos),
      node("Loan age ≥ 12 months", loanAge+"mo", eligLoanAge),
      node("DLQ 2–6 months at evaluation", dlq+"mo", eligDlqRange),
      node("Hardship resolved", l.fnmaHardshipResolved?"Yes":"No", l.fnmaHardshipResolved),
      node("Can resume full contractual payment", l.fnmaCanResumeFull?"Yes":"No", l.fnmaCanResumeFull),
      node("Cannot reinstate or afford repayment plan", l.fnmaCannotReinstate?"Yes":"No", l.fnmaCannotReinstate),
      node("Cumulative deferred months < 12 (lifetime)", cumulativeDeferred+"mo", eligCumCap),
      node("Prior non-disaster deferral ≥ 12 months ago (or never)", priorDeferralMonths===0?"None":priorDeferralMonths+"mo ago", eligPriorDeferral),
      node("Not within 36 months of maturity", l.fnmaWithin36MonthsMaturity?"Within 36mo":"OK", eligNotNearMaturity),
      node("No failed Flex Mod TPP within 12 months", l.fnmaFailedTPP12Months?"Yes":"No", eligNoFailedTPP),
      ...commonBlockers,
    ];
    results.push({ option:"FNMA Payment Deferral", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  // ── 4. Disaster Payment Deferral (D2-3.2-05) ─────────────────────────────────
  {
    const eligDisaster = l.fnmaDisasterHardship;
    const eligFEMA = l.fnmaFEMADesignation || l.fnmaInsuredLoss;
    const eligLienPos = l.lienPosition === "First";
    const eligDlqAtDisaster = dlqAtDisaster < 2;
    const eligDlqRange = dlq >= 1 && dlq <= 12;
    const eligNotSameDisaster = !l.fnmaSameDlisasterPriorDeferral;
    const eligNotNearMaturity = !l.fnmaWithin36MonthsMaturity;
    const nodes = [
      node("Disaster-related hardship", l.fnmaDisasterHardship?"Yes":"No", eligDisaster),
      node("FEMA designation or insured property loss", (l.fnmaFEMADesignation||l.fnmaInsuredLoss)?"Yes":"No", eligFEMA),
      node("Conventional 1st lien", l.lienPosition, eligLienPos),
      node("DLQ at time of disaster < 2 months", dlqAtDisaster+"mo", eligDlqAtDisaster),
      node("Current DLQ 1–12 months at evaluation", dlq+"mo", eligDlqRange),
      node("Hardship resolved", l.fnmaHardshipResolved?"Yes":"No", l.fnmaHardshipResolved),
      node("Can resume full contractual payment", l.fnmaCanResumeFull?"Yes":"No", l.fnmaCanResumeFull),
      node("Cannot reinstate or afford repayment plan", l.fnmaCannotReinstate?"Yes":"No", l.fnmaCannotReinstate),
      node("No prior deferral for this same disaster event", l.fnmaSameDlisasterPriorDeferral?"Yes":"No", eligNotSameDisaster),
      node("Not within 36 months of maturity", l.fnmaWithin36MonthsMaturity?"Within 36mo":"OK", eligNotNearMaturity),
      ...commonBlockers,
    ];
    results.push({ option:"FNMA Disaster Payment Deferral", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  // ── 5. Fannie Mae Flex Modification — Standard (D2-3.2-06) ───────────────────
  {
    const eligLienPos = l.lienPosition === "First";
    const eligLoanAge = loanAge >= 12;
    const eligDLQ = dlq >= 2 || l.fnmaImminentDefault;
    const eligPriorMods = priorModCount < 3;
    const eligNoFailedTPP = !l.fnmaFailedTPP12Months;
    const eligNoReDefault = !l.fnmaReDefaulted12Months;
    const nodes = [
      node("Conventional 1st lien", l.lienPosition, eligLienPos),
      node("Loan age ≥ 12 months", loanAge+"mo", eligLoanAge),
      node("≥ 60 days DLQ OR servicer imminent default determination", dlq+"mo"+(l.fnmaImminentDefault?" (imminent default)":""), eligDLQ),
      node("Prior modifications < 3 (payment deferrals excluded)", priorModCount, eligPriorMods),
      node("No failed Flex Mod TPP within 12 months", l.fnmaFailedTPP12Months?"Yes":"No", eligNoFailedTPP),
      node("No 60-day re-default within 12mo of last Flex Mod", l.fnmaReDefaulted12Months?"Yes":"No", eligNoReDefault),
      ...commonBlockers,
    ];
    results.push({ option:"Fannie Mae Flex Modification", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  // ── 6. Fannie Mae Flex Modification — Disaster (D2-3.2-06) ───────────────────
  {
    const eligDisaster = l.fnmaDisasterHardship;
    const eligFEMA = l.fnmaFEMADesignation || l.fnmaInsuredLoss;
    const eligLienPos = l.lienPosition === "First";
    const eligDlqAtDisaster = dlqAtDisaster < 2;
    const eligCurrentDLQ = dlq >= 3;
    const nodes = [
      node("Disaster-related hardship", l.fnmaDisasterHardship?"Yes":"No", eligDisaster),
      node("FEMA designation or insured property loss", (l.fnmaFEMADesignation||l.fnmaInsuredLoss)?"Yes":"No", eligFEMA),
      node("Conventional 1st lien", l.lienPosition, eligLienPos),
      node("DLQ at time of disaster < 2 months", dlqAtDisaster+"mo", eligDlqAtDisaster),
      node("Current DLQ ≥ 3 months", dlq+"mo", eligCurrentDLQ),
      ...commonBlockers,
    ];
    results.push({ option:"Fannie Mae Flex Modification (Disaster)", eligible:nodes.every(nd=>nd.pass), nodes, note:"Reduced eligibility criteria — prior mod count, failed TPP, and re-default restrictions may not apply" });
  }
  // ── 7. Fannie Mae Short Sale (D2-3.3-01) ─────────────────────────────────────
  {
    const eligIntent = !l.borrowerIntentRetention;
    const nodes = [
      node("Borrower intent = Disposition (not retention)", l.borrowerIntentRetention?"Retain":"Dispose", eligIntent),
      node("Eligible hardship", l.hardshipType, l.hardshipType !== "None"),
    ];
    results.push({ option:"Fannie Mae Short Sale", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  // ── 8. Fannie Mae Mortgage Release / DIL (D2-3.3-02) ─────────────────────────
  {
    const eligIntent = !l.borrowerIntentRetention;
    const nodes = [
      node("Borrower intent = Disposition", l.borrowerIntentRetention?"Retain":"Dispose", eligIntent),
      node("Eligible hardship", l.hardshipType, l.hardshipType !== "None"),
      node("Meets Mortgage Release requirements", l.meetsDILRequirements?"Yes":"No", l.meetsDILRequirements),
    ];
    results.push({ option:"Fannie Mae Mortgage Release (DIL)", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  return results;
}

// ─── UI HELPERS ───────────────────────────────────────────────────────────────
const Sec=({title,children})=>(<div className="mb-5"><div className="flex items-center gap-2 mb-3"><div className="h-3.5 w-0.5 rounded-full bg-blue-400"/><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</span></div><div className="space-y-2.5">{children}</div></div>);
const F=({label,children})=>(<div className="flex flex-col gap-1"><label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>{children}</div>);
const Sel=({value,onChange,options})=>(<select className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow" value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>);
const Tog=({value,onChange,label})=>(<div className="flex items-center justify-between gap-3 py-0.5">{label&&<span className="text-xs text-slate-600 flex-1 leading-snug">{label}</span>}<button onClick={()=>onChange(!value)} className={`relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 focus:outline-none ${value?"bg-blue-500":"bg-slate-200"}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value?"translate-x-5":"translate-x-0"}`}/></button></div>);
const Num=({value,onChange,placeholder,prefix})=>(<div className="flex items-center border border-slate-200 rounded-lg overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent transition-shadow">{prefix&&<span className="bg-slate-50 px-2.5 text-xs text-slate-400 border-r border-slate-200 py-2 font-bold">{prefix}</span>}<input type="number" min="0" step="any" className="flex-1 px-3 py-1.5 text-sm bg-white focus:outline-none" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></div>);
const DateInput=({value,onChange,label})=>(<div className="flex flex-col gap-1"><label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label><input type="date" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow" value={value} onChange={e=>onChange(e.target.value)}/></div>);

// ─── CALCULATED TERMS PANEL ───────────────────────────────────────────────────
function CalcTermsPanel({ optionName, loan }) {
  const terms = useMemo(() => calcApprovalTerms(optionName, loan), [optionName, loan]);
  return (
    <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-700 text-white px-4 py-2 text-xs font-bold flex items-center gap-2">
        <span className="opacity-70">📋</span><span>Approval Terms — {optionName}</span>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {Object.entries(terms).map(([k,v],i) => {
            const isSub = k.startsWith("  → ") || k.startsWith("  ");
            const isPass = String(v).startsWith("✅");
            const isFail = String(v).startsWith("❌");
            const isWarn = String(v).includes("NOT") || String(v).includes("EXCLUDED") || String(v).includes("Enter");
            return (
              <tr key={i} className={`border-b border-slate-100 last:border-0 ${isPass?"bg-emerald-50":isFail?"bg-red-50":i%2===0?"bg-white":"bg-slate-50/60"}`}>
                <td className={`px-4 py-2 w-[48%] ${isSub?"pl-8 text-slate-400 font-normal":"font-semibold text-slate-600"}`}>{k}</td>
                <td className={`px-4 py-2 font-mono ${isPass?"text-emerald-700 font-bold":isFail?"text-red-600 font-bold":isWarn?"text-amber-600":"text-slate-800"}`}>{v}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loan,setLoan]=useState({
    ...initLoan,
    loanType:"FHA",
    upb:"247500", originalUpb:"265000", currentEscrow:"412", currentPI:"1388",
    currentPITI:"1800", grossMonthlyIncome:"5200", currentInterestRate:"6.875",
    pmmsRate:"7.125", arrearagesToCapitalize:"7200", escrowShortage:"824",
    legalFees:"1150", lateFees:"285", priorPartialClaimBalance:"0",
    partialClaimPct:"0", targetPayment:"",
    noteFirstPaymentDate:"2019-02-01", noteTerm:"360",
    originalMaturityDate:"2049-01-01",
    approvalEffectiveDate:"2025-06-01",
    delinquencyMonths:"4", hardshipType:"Reduction in Income",
    hardshipDuration:"Resolved", lienPosition:"First",
    occupancyStatus:"Owner Occupied", propertyCondition:"Standard",
    propertyDisposition:"Principal Residence",
    foreclosureActive:false, occupancyAbandoned:false,
    continuousIncome:true, borrowerIntentRetention:true,
    canAchieveTargetByReamort:true, currentRateAtOrBelowMarket:true,
    currentPITIAtOrBelowTarget:false,
    priorFHAHAMPMonths:"0",
    canRepayWithin24Months:true, failedTPP:false,
  });
  const [tab,setTab]=useState("results");
  const [results,setResults]=useState(()=>{
    const demoLoan={...initLoan,loanType:"FHA",upb:"247500",originalUpb:"265000",currentEscrow:"412",currentPI:"1388",currentPITI:"1800",grossMonthlyIncome:"5200",currentInterestRate:"6.875",pmmsRate:"7.125",arrearagesToCapitalize:"7200",escrowShortage:"824",legalFees:"1150",lateFees:"285",priorPartialClaimBalance:"0",partialClaimPct:"0",noteFirstPaymentDate:"2019-02-01",noteTerm:"360",originalMaturityDate:"2049-01-01",approvalEffectiveDate:"2025-06-01",delinquencyMonths:"4",hardshipType:"Reduction in Income",hardshipDuration:"Resolved",lienPosition:"First",occupancyStatus:"Owner Occupied",propertyCondition:"Standard",propertyDisposition:"Principal Residence",foreclosureActive:false,occupancyAbandoned:false,continuousIncome:true,borrowerIntentRetention:true,canAchieveTargetByReamort:true,currentRateAtOrBelowMarket:true,currentPITIAtOrBelowTarget:false,priorFHAHAMPMonths:"0",canRepayWithin24Months:true,failedTPP:false};
    return evaluateFHA(demoLoan);
  });
  const [evaluated,setEvaluated]=useState(true);
  const [expanded,setExpanded]=useState(null);
  const [expandedAudit,setExpandedAudit]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiResponse,setAiResponse]=useState("");
  const [apiKey,setApiKey]=useState("");
  const [loan2,setLoan2]=useState({...initLoan,loanType:"VA"});
  const [results2,setResults2]=useState([]);
  const [evaluated2,setEvaluated2]=useState(false);
  const set=useCallback((k,v)=>{setLoan(p=>({...p,[k]:v}));setEvaluated(false);},[]);
  const set2=useCallback((k,v)=>{setLoan2(p=>({...p,[k]:v}));setEvaluated2(false);},[]);
  const evalLoan=(l)=>l.loanType==="FHA"?evaluateFHA(l):l.loanType==="USDA"?evaluateUSDA(l):l.loanType==="VA"?evaluateVA(l):l.loanType==="FNMA"?evaluateFNMA(l):evaluateFHLMC(l);
  const evaluate=()=>{setResults(evalLoan(loan));setEvaluated(true);setTab("results");setAiResponse("");};
  const evaluate2=()=>{setResults2(evalLoan(loan2));setEvaluated2(true);};
  const eligible=results.filter(r=>r.eligible), ineligible=results.filter(r=>!r.eligible);
  const gmi=n(loan.grossMonthlyIncome);
  const target31=gmi>0?(gmi*0.31).toFixed(2):null;
  const target40=gmi>0?(gmi*0.40).toFixed(2):null;

  const askAI=async()=>{
    if (!apiKey.trim()) { setAiResponse("⚠️ Enter your Anthropic API key in the field above first."); return; }
    setAiLoading(true);setAiResponse("");
    const summary={loanType:loan.loanType,loanNumber:loan.loanNumber,borrowerName:loan.borrowerName,delinquencyMonths:loan.delinquencyMonths,hardship:loan.hardshipType,hardshipDuration:loan.hardshipDuration,grossMonthlyIncome:loan.grossMonthlyIncome,currentPITI:loan.currentPITI,upb:loan.upb,pmmsRate:loan.pmmsRate,eligibleOptions:eligible.map(r=>r.option),ineligibleOptions:ineligible.map(r=>({option:r.option,failedAt:r.nodes?.find(nd=>!nd.pass)?.question}))};
    try {
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey.trim(),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1200,system:"You are a loss mitigation underwriting expert. Provide: 1) Plain-English borrower situation summary, 2) Recommended waterfall order with rationale, 3) Required documentation checklist, 4) Compliance watch-outs, 5) Next steps. Be concise and practical.",messages:[{role:"user",content:`Loss Mitigation Evaluation:\n${JSON.stringify(summary,null,2)}\n\nProvide expert analysis.`}]})});
      const data=await resp.json();
      if (data.error) { setAiResponse("API Error: "+data.error.message); } else { setAiResponse(data.content?.[0]?.text||"No response."); }
    } catch(e){setAiResponse("Error connecting to AI assistant: "+(e instanceof Error?e.message:String(e)));}
    setAiLoading(false);
  };

  const printReport=()=>{
    const w=window.open("","_blank");
    const calcTermsHTML=(r)=>{const t=calcApprovalTerms(r.option,loan);return`<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12px">${Object.entries(t).map(([k,v],i)=>`<tr style="background:${i%2===0?"#fff":"#f8fafc"};${String(v).startsWith("✅")?"background:#f0fdf4":String(v).startsWith("❌")?"background:#fef2f2":""}"><td style="padding:4px 8px;font-weight:600;color:#374151;width:45%;border:1px solid #e5e7eb">${k}</td><td style="padding:4px 8px;font-family:monospace;border:1px solid #e5e7eb;color:${String(v).startsWith("✅")?"#15803d":String(v).startsWith("❌")?"#dc2626":"#111"}">${v}</td></tr>`).join("")}</table>`;};
    w.document.write(`<html><head><title>LM Report — ${loan.loanType}</title><style>body{font-family:Arial,sans-serif;max-width:860px;margin:40px auto;color:#111;font-size:13px}h1{color:#1e3a5f;border-bottom:3px solid #1e3a5f;padding-bottom:8px}h2{color:#1e3a5f;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:24px}h3{margin:12px 0 4px;color:#1e3a5f}.eligible{background:#f0fdf4;border:1px solid #86efac;padding:12px;border-radius:6px;margin:8px 0}.ineligible{background:#fafafa;border:1px solid #e5e7eb;padding:8px;border-radius:4px;margin:4px 0}.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:12px 0}.stat{background:#f8fafc;border:1px solid #e2e8f0;padding:8px;border-radius:4px;text-align:center}.sl{font-size:11px;color:#64748b}.sv{font-weight:bold;color:#1e293b}.footer{margin-top:40px;font-size:11px;color:#888;border-top:1px solid #e5e7eb;padding-top:12px}</style></head><body>
    <h1>Loss Mitigation Evaluation Report</h1>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString()} &nbsp;|&nbsp; <strong>Loan Type:</strong> ${loan.loanType}${loan.loanNumber?` &nbsp;|&nbsp; <strong>Loan #:</strong> ${loan.loanNumber}`:""}${loan.borrowerName?` &nbsp;|&nbsp; <strong>Borrower:</strong> ${loan.borrowerName}`:""} &nbsp;|&nbsp; <strong>DLQ:</strong> ${loan.delinquencyMonths||"—"} months &nbsp;|&nbsp; <strong>Hardship:</strong> ${loan.hardshipType} (${loan.hardshipDuration})</p>
    <div class="stats">
      <div class="stat"><div class="sl">Current UPB</div><div class="sv">${loan.upb?fmt$(n(loan.upb)):"—"}</div></div>
      <div class="stat"><div class="sl">Gross Monthly Income</div><div class="sv">${gmi>0?"$"+Number(loan.grossMonthlyIncome).toLocaleString():"—"}</div></div>
      <div class="stat"><div class="sl">31% Target Payment</div><div class="sv">${target31?"$"+target31:"—"}</div></div>
      <div class="stat"><div class="sl">PMMS Rate</div><div class="sv">${loan.pmmsRate?loan.pmmsRate+"%":"—"}</div></div>
      <div class="stat"><div class="sl">Eligible Options</div><div class="sv">${eligible.length}</div></div>
    </div>
    <h2>✅ Eligible Options (${eligible.length})</h2>
    ${eligible.length===0?"<p style='color:#dc2626;font-weight:bold'>No eligible options. Refer for adverse action / foreclosure review.</p>":eligible.map(r=>`<div class="eligible"><h3>${r.option}</h3>${r.note?`<p><strong>📌 Note:</strong> ${r.note}</p>`:""}${calcTermsHTML(r)}</div>`).join("")}
    <h2>❌ Ineligible Options (${ineligible.length})</h2>
    <table style="width:100%;border-collapse:collapse"><tr><th style="text-align:left;padding:6px;background:#f3f4f6;border:1px solid #e5e7eb">Option</th><th style="text-align:left;padding:6px;background:#f3f4f6;border:1px solid #e5e7eb">Failed Condition</th><th style="text-align:left;padding:6px;background:#f3f4f6;border:1px solid #e5e7eb">Value</th></tr>${ineligible.map(r=>{const f=r.nodes?.find(nd=>!nd.pass);return`<tr><td style="padding:5px 8px;border:1px solid #e5e7eb">${r.option}</td><td style="padding:5px 8px;border:1px solid #e5e7eb;color:#dc2626">${f?f.question:"—"}</td><td style="padding:5px 8px;border:1px solid #e5e7eb">${f?f.answer:"—"}</td></tr>`;}).join("")}</table>
    ${aiResponse?`<h2>🤖 AI Analysis</h2><div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:6px;white-space:pre-wrap;font-size:12px">${aiResponse}</div>`:""}
    <div class="footer">Decision-support tool only. Final determinations must be confirmed by a qualified loss mitigation underwriter per current HUD, USDA, and VA guidelines.</div>
    </body></html>`);
    w.document.close();w.print();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-lg shadow-lg shadow-blue-900/50">🚀</div>
            <div>
              <h1 className="text-lg font-black tracking-tight">Rocket Mods</h1>
              <p className="text-blue-300 text-xs font-medium">FHA · USDA · VA · FNMA · FHLMC Loss Mitigation Rules Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 rounded-xl p-1 backdrop-blur-sm">
            {LOAN_TYPES.map(t=>(<button key={t} onClick={()=>{set("loanType",t);setEvaluated(false);setResults([]);}} className={`px-4 py-1.5 rounded-lg text-sm font-black transition-all ${loan.loanType===t?"bg-white text-slate-900 shadow-md":"text-blue-200 hover:text-white hover:bg-white/10"}`}>{t}</button>))}
          </div>
        </div>
      </div>
      {/* ── Tab Bar ── */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-1">
          {TABS.map(t=>(<button key={t} onClick={()=>setTab(t)} className={`px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-px ${tab===t?"border-blue-500 text-blue-700":"border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"}`}>{TAB_LABELS[t]}</button>))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-5">
        {/* ── INPUTS ── */}
        {tab==="inputs"&&(
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Col 1 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 overflow-y-auto" style={{maxHeight:"82vh"}}>
              <Sec title="📁 Loan Info">
                <F label="Loan Number"><input className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={loan.loanNumber} onChange={e=>set("loanNumber",e.target.value)} placeholder="e.g. 1234567890"/></F>
                <F label="Borrower Name"><input className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={loan.borrowerName} onChange={e=>set("borrowerName",e.target.value)} placeholder="Last, First"/></F>
              </Sec>
              <Sec title="💰 Financial Data">
                <F label="Current UPB"><Num value={loan.upb} onChange={v=>set("upb",v)} placeholder="e.g. 250000" prefix="$"/></F>
                <F label="Original UPB"><Num value={loan.originalUpb} onChange={v=>set("originalUpb",v)} placeholder="e.g. 275000" prefix="$"/></F>
                <F label="Current Monthly Escrow"><Num value={loan.currentEscrow} onChange={v=>set("currentEscrow",v)} placeholder="e.g. 350" prefix="$"/></F>
                <F label="Current Monthly P&I"><Num value={loan.currentPI} onChange={v=>set("currentPI",v)} placeholder="e.g. 1450" prefix="$"/></F>
                <F label="Current Monthly PITI"><Num value={loan.currentPITI} onChange={v=>set("currentPITI",v)} placeholder="e.g. 1800" prefix="$"/></F>
                <F label="Gross Monthly Income"><Num value={loan.grossMonthlyIncome} onChange={v=>set("grossMonthlyIncome",v)} placeholder="e.g. 5000" prefix="$"/></F>
                <F label="Current Interest Rate (%)"><Num value={loan.currentInterestRate} onChange={v=>set("currentInterestRate",v)} placeholder="e.g. 6.5"/></F>
                <F label="PMMS Rate (%)"><Num value={loan.pmmsRate} onChange={v=>set("pmmsRate",v)} placeholder="e.g. 7.1"/></F>
                {gmi>0&&<div className="bg-blue-50 rounded p-2 text-xs text-blue-800 space-y-0.5 mt-1">
                  <div>31% GMI Target: <strong>${target31}/mo</strong></div>
                  <div>40% GMI Cap: <strong>${target40}/mo</strong></div>
                  {loan.currentPITI&&<div>PITI/GMI Ratio: <strong>{(n(loan.currentPITI)/gmi*100).toFixed(1)}%</strong></div>}
                </div>}
                <F label="Target Payment Override (optional — leave blank to use 31% GMI)"><Num value={loan.targetPayment} onChange={v=>set("targetPayment",v)} placeholder="Auto: 31% GMI" prefix="$"/></F>
              </Sec>
              <Sec title="📐 Amounts to Capitalize">
                <F label="Arrearages (total DLQ P&I + escrow advances)"><Num value={loan.arrearagesToCapitalize} onChange={v=>set("arrearagesToCapitalize",v)} placeholder="e.g. 7200" prefix="$"/></F>
                <F label="Projected Escrow Shortage"><Num value={loan.escrowShortage} onChange={v=>set("escrowShortage",v)} placeholder="e.g. 800" prefix="$"/></F>
                <F label="Legal / Foreclosure Fees (actually performed)"><Num value={loan.legalFees} onChange={v=>set("legalFees",v)} placeholder="e.g. 1200" prefix="$"/></F>
                <F label="Late Fees (EXCLUDED — for reference only)"><Num value={loan.lateFees} onChange={v=>set("lateFees",v)} placeholder="e.g. 300" prefix="$"/></F>
                <F label="Prior Partial Claim / MRA Balance"><Num value={loan.priorPartialClaimBalance} onChange={v=>set("priorPartialClaimBalance",v)} placeholder="e.g. 15000" prefix="$"/></F>
                {loan.loanType!=="USDA"&&<F label="Partial Claim % of Statutory Limit"><Num value={loan.partialClaimPct} onChange={v=>set("partialClaimPct",v)} placeholder="e.g. 20"/></F>}
                {n(loan.arrearagesToCapitalize)>0&&n(loan.escrowShortage)>=0&&<div className="bg-green-50 rounded p-2 text-xs text-green-800 mt-1">
                  <div>Total Capitalizable: <strong>{fmt$(n(loan.arrearagesToCapitalize)+n(loan.escrowShortage)+n(loan.legalFees))}</strong></div>
                  <div className="text-red-600">Late fees excluded: <strong>{fmt$(n(loan.lateFees))}</strong></div>
                  {n(loan.originalUpb)>0&&<div>30% PC Cap: <strong>{fmt$(n(loan.originalUpb)*0.30)}</strong></div>}
                  {n(loan.originalUpb)>0&&<div>25% Arrearage Cap (VA): <strong>{fmt$(n(loan.originalUpb)*0.25)}</strong></div>}
                </div>}
              </Sec>
            </div>
            {/* Col 2 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 overflow-y-auto" style={{maxHeight:"82vh"}}>
              <Sec title="📅 Loan Dates">
                <DateInput label="Note First Payment Date" value={loan.noteFirstPaymentDate} onChange={v=>set("noteFirstPaymentDate",v)}/>
                <F label="Note Term (months)"><Num value={loan.noteTerm} onChange={v=>set("noteTerm",v)} placeholder="e.g. 360"/></F>
                <DateInput label="Original Maturity Date" value={loan.originalMaturityDate} onChange={v=>set("originalMaturityDate",v)}/>
                <DateInput label="Approval / Effective Date" value={loan.approvalEffectiveDate} onChange={v=>set("approvalEffectiveDate",v)}/>
                {loan.noteFirstPaymentDate&&loan.noteTerm&&loan.approvalEffectiveDate&&(()=>{
                  const rem=calcRemainingTerm(loan.noteFirstPaymentDate,loan.noteTerm,loan.approvalEffectiveDate);
                  const mat360=addMonths(loan.approvalEffectiveDate,360);
                  const mat480=addMonths(loan.noteFirstPaymentDate,480);
                  const origMat=loan.originalMaturityDate||calcOriginalMaturity(loan.noteFirstPaymentDate,loan.noteTerm);
                  const mat120=origMat?addMonths(origMat,120):null;
                  const newFirst=calcNewFirstPayment(loan.approvalEffectiveDate);
                  return <div className="bg-purple-50 rounded p-2 text-xs text-purple-800 space-y-0.5 mt-1">
                    <div>Remaining Term: <strong>{rem} months</strong></div>
                    <div>360mo from mod: <strong>{fmtDate(mat360)}</strong></div>
                    <div>120mo past orig maturity: <strong>{fmtDate(mat120)}</strong></div>
                    <div>480mo from note first pmt: <strong>{fmtDate(mat480)}</strong></div>
                    <div>New First Payment Date: <strong>{fmtDate(newFirst)}</strong></div>
                  </div>;
                })()}
              </Sec>
              <Sec title="🏠 Property & Occupancy">
                <F label="Occupancy Status"><Sel value={loan.occupancyStatus} onChange={v=>set("occupancyStatus",v)} options={["Owner Occupied","Non-Owner Occupied","Vacant","Tenant Occupied"]}/></F>
                <F label="Property Disposition"><Sel value={loan.propertyDisposition} onChange={v=>set("propertyDisposition",v)} options={["Principal Residence","Second Home","Investment"]}/></F>
                <F label="Property Condition"><Sel value={loan.propertyCondition} onChange={v=>set("propertyCondition",v)} options={["Standard","Condemned","Uninhabitable"]}/></F>
                <F label="Lien Position"><Sel value={loan.lienPosition} onChange={v=>set("lienPosition",v)} options={["First","Second"]}/></F>
                <Tog label="Foreclosure Active" value={loan.foreclosureActive} onChange={v=>set("foreclosureActive",v)}/>
                <Tog label="Occupancy = Abandoned" value={loan.occupancyAbandoned} onChange={v=>set("occupancyAbandoned",v)}/>
              </Sec>
              <Sec title="⚠️ Hardship">
                <F label="Hardship Type"><Sel value={loan.hardshipType} onChange={v=>set("hardshipType",v)} options={HARDSHIP_TYPES}/></F>
                <F label="Hardship Duration"><Sel value={loan.hardshipDuration} onChange={v=>set("hardshipDuration",v)} options={loan.loanType==="USDA"?["Short Term","Resolved","Long Term","Permanent"]:["Resolved","Long Term","Permanent"]}/></F>
                <F label="Delinquency (months)"><Num value={loan.delinquencyMonths} onChange={v=>set("delinquencyMonths",v)} placeholder="e.g. 4"/></F>
                <F label="Delinquency (days — override)"><Num value={loan.delinquencyDays} onChange={v=>set("delinquencyDays",v)} placeholder="e.g. 120"/></F>
                <Tog label="Continuous Income (1+ borrowers)" value={loan.continuousIncome} onChange={v=>set("continuousIncome",v)}/>
                <Tog label="Borrower Intent = Retention" value={loan.borrowerIntentRetention} onChange={v=>set("borrowerIntentRetention",v)}/>
              </Sec>
            </div>
            {/* Col 3 - loan type specific */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 overflow-y-auto" style={{maxHeight:"82vh"}}>
              <Sec title="🔧 Modification Flags">
                <Tog label="Can achieve target by re-amortizing 360 months" value={loan.canAchieveTargetByReamort} onChange={v=>set("canAchieveTargetByReamort",v)}/>
                <Tog label="Current rate at/below market" value={loan.currentRateAtOrBelowMarket} onChange={v=>set("currentRateAtOrBelowMarket",v)}/>
                <Tog label="Current PITI at/below target payment" value={loan.currentPITIAtOrBelowTarget} onChange={v=>set("currentPITIAtOrBelowTarget",v)}/>
                <Tog label="Borrower confirmed cannot afford current payment" value={loan.borrowerConfirmedCannotAffordCurrent} onChange={v=>set("borrowerConfirmedCannotAffordCurrent",v)}/>
                <Tog label="Borrower can afford modified payment" value={loan.borrowerCanAffordModifiedPayment} onChange={v=>set("borrowerCanAffordModifiedPayment",v)}/>
                <Tog label="Borrower can afford reinstatement/repayment plan" value={loan.borrowerCanAffordReinstateOrRepay} onChange={v=>set("borrowerCanAffordReinstateOrRepay",v)}/>
                <Tog label="Borrower can afford current monthly payment" value={loan.borrowerCanAffordCurrentMonthly} onChange={v=>set("borrowerCanAffordCurrentMonthly",v)}/>
                {loan.loanType==="VA"&&<Tog label="Modified P&I ≤ 90% of old P&I" value={loan.modifiedPILe90PctOld} onChange={v=>set("modifiedPILe90PctOld",v)}/>}
              </Sec>
              {loan.loanType==="FHA"&&(<>
                <Sec title="FHA-HAMP">
                  <F label="Prior FHA-HAMP Agreement (months ago)"><Num value={loan.priorFHAHAMPMonths} onChange={v=>set("priorFHAHAMPMonths",v)} placeholder="0 = none"/></F>
                  <Tog label="Can achieve 31% target via 480-month re-amortization (FHA 40-Year)" value={loan.canAchieveTargetBy480Reamort} onChange={v=>set("canAchieveTargetBy480Reamort",v)}/>
                  <Tog label="Arrears exceed 30% statutory limit" value={loan.arrearsExceed30PctLimit} onChange={v=>set("arrearsExceed30PctLimit",v)}/>
                  {loan.arrearsExceed30PctLimit&&<Tog label="Modified payment ≤ 40% GMI" value={loan.modPaymentLe40PctGMI} onChange={v=>set("modPaymentLe40PctGMI",v)}/>}
                  <Tog label="One+ borrowers unemployed" value={loan.unemployed} onChange={v=>set("unemployed",v)}/>
                  <Tog label="Combo payment ≤ 40% of income" value={loan.comboPaymentLe40PctIncome} onChange={v=>set("comboPaymentLe40PctIncome",v)}/>
                  <Tog label="Failed TPP in current default episode" value={loan.failedTPP} onChange={v=>set("failedTPP",v)}/>
                  <Tog label="Can repay within 24 months" value={loan.canRepayWithin24Months} onChange={v=>set("canRepayWithin24Months",v)}/>
                  <F label="Repayment Plan Term (months, max 24)"><Num value={loan.repayMonths} onChange={v=>set("repayMonths",Math.min(24,Math.max(1,parseInt(v)||24)).toString())} placeholder="24"/></F>
                  <Tog label="Can repay within 6 months" value={loan.canRepayWithin6Months} onChange={v=>set("canRepayWithin6Months",v)}/>
                  <Tog label="Forbearance requested" value={loan.requestedForbearance} onChange={v=>set("requestedForbearance",v)}/>
                  <Tog label="Verified unemployment" value={loan.verifiedUnemployment} onChange={v=>set("verifiedUnemployment",v)}/>
                  <Tog label="Ineligible for all retention options" value={loan.ineligibleAllRetention} onChange={v=>set("ineligibleAllRetention",v)}/>
                  <Tog label="Property listed for sale" value={loan.propertyListedForSale} onChange={v=>set("propertyListedForSale",v)}/>
                  <Tog label="Assumption in process" value={loan.assumptionInProcess} onChange={v=>set("assumptionInProcess",v)}/>
                </Sec>
                <Sec title="FHA Disaster">
                  <Tog label="Verified Disaster Hardship" value={loan.verifiedDisaster} onChange={v=>set("verifiedDisaster",v)}/>
                  {loan.verifiedDisaster&&(<>
                    <Tog label="Property in PDMA" value={loan.propertyInPDMA} onChange={v=>set("propertyInPDMA",v)}/>
                    <Tog label="Principal residence pre-disaster" value={loan.principalResidencePreDisaster} onChange={v=>set("principalResidencePreDisaster",v)}/>
                    <Tog label="≤30 days DLQ at disaster declaration" value={loan.currentOrLe30DaysAtDisaster} onChange={v=>set("currentOrLe30DaysAtDisaster",v)}/>
                    <Tog label="Income ≥ pre-disaster level" value={loan.incomeGePreDisaster} onChange={v=>set("incomeGePreDisaster",v)}/>
                    <Tog label="Income documentation provided" value={loan.incomeDocProvided} onChange={v=>set("incomeDocProvided",v)}/>
                    <Tog label="Property substantially damaged" value={loan.propertySubstantiallyDamaged} onChange={v=>set("propertySubstantiallyDamaged",v)}/>
                    {loan.propertySubstantiallyDamaged&&<Tog label="Repairs completed" value={loan.repairsCompleted} onChange={v=>set("repairsCompleted",v)}/>}
                  </>)}
                </Sec>
              </>)}
              {loan.loanType==="USDA"&&(<>
                <Sec title="USDA – Streamline Mod">
                  <Tog label="UPB ≥ $5,000" value={loan.usdaUpbGe5000} onChange={v=>set("usdaUpbGe5000",v)}/>
                  <Tog label="12+ payments since origination" value={loan.usdaPaymentsMade12} onChange={v=>set("usdaPaymentsMade12",v)}/>
                  <Tog label="Bankruptcy ≠ Active" value={loan.usdaBankruptcyNotActive} onChange={v=>set("usdaBankruptcyNotActive",v)}/>
                  <Tog label="Litigation ≠ Active" value={loan.usdaLitigationNotActive} onChange={v=>set("usdaLitigationNotActive",v)}/>
                  <Tog label="No prior failed Streamline TPP" value={!loan.usdaPriorFailedStreamlineTPP} onChange={v=>set("usdaPriorFailedStreamlineTPP",!v)}/>
                  <F label="# Previous Modifications"><Num value={loan.usdaNumPrevMods} onChange={v=>set("usdaNumPrevMods",v)} placeholder="0"/></F>
                  <Tog label="Foreclosure sale ≥ 60 days away" value={loan.usdaForeclosureSaleGe60Away} onChange={v=>set("usdaForeclosureSaleGe60Away",v)}/>
                  <Tog label="Forbearance period < 12 months" value={loan.usdaForbearancePeriodLt12} onChange={v=>set("usdaForbearancePeriodLt12",v)}/>
                  <Tog label="Total DLQ < 12 months" value={loan.usdaTotalDLQLt12} onChange={v=>set("usdaTotalDLQLt12",v)}/>
                  <Tog label="Hardship type not excluded" value={loan.usdaHardshipNotExcluded} onChange={v=>set("usdaHardshipNotExcluded",v)}/>
                  <Tog label="New RPP payment ≤ 200% of current" value={loan.usdaNewPaymentLe200pct} onChange={v=>set("usdaNewPaymentLe200pct",v)}/>
                  <Tog label="Borrower has positive net income" value={loan.usdaBorrowerPositiveNetIncome} onChange={v=>set("usdaBorrowerPositiveNetIncome",v)}/>
                </Sec>
                <Sec title="USDA – MRA / Disaster">
                  <Tog label="Borrower can resume current payment" value={loan.usdaBorrowerCanResumeCurrent} onChange={v=>set("usdaBorrowerCanResumeCurrent",v)}/>
                  <Tog label="Hardship Duration = Resolved" value={loan.usdaHardshipDurationResolved} onChange={v=>set("usdaHardshipDurationResolved",v)}/>
                  <Tog label="Loan Modification = Ineligible" value={loan.usdaLoanModIneligible} onChange={v=>set("usdaLoanModIneligible",v)}/>
                  <Tog label="Cannot cure DLQ within 12 months" value={loan.usdaBorrowerCannotCureDLQWithin12} onChange={v=>set("usdaBorrowerCannotCureDLQWithin12",v)}/>
                  <Tog label="Prior workout = Disaster Forbearance" value={loan.usdaPriorWorkoutDisasterForbearance} onChange={v=>set("usdaPriorWorkoutDisasterForbearance",v)}/>
                  <Tog label="Hardship Duration ≠ Resolved" value={loan.usdaHardshipNotResolved} onChange={v=>set("usdaHardshipNotResolved",v)}/>
                  <Tog label="DLQ ≥ 12 Contractual Payments" value={loan.usdaDLQGe12Contractual} onChange={v=>set("usdaDLQGe12Contractual",v)}/>
                  <Tog label="< 30 Days DLQ at Disaster Declaration" value={loan.usdaDLQAt30AtDisaster} onChange={v=>set("usdaDLQAt30AtDisaster",v)}/>
                  <Tog label="Loan ≥ 60 Days DLQ" value={loan.usdaLoanGe60DLQ} onChange={v=>set("usdaLoanGe60DLQ",v)}/>
                  <Tog label="Loan ≥ 30 Days DLQ" value={loan.usdaLoanGe30DaysDLQ} onChange={v=>set("usdaLoanGe30DaysDLQ",v)}/>
                  <Tog label="Previous Workout = Forbearance" value={loan.usdaPrevWorkoutForbearance} onChange={v=>set("usdaPrevWorkoutForbearance",v)}/>
                  <Tog label="Workout State IN {Active, Passed}" value={loan.usdaWorkoutStateActivePassed} onChange={v=>set("usdaWorkoutStateActivePassed",v)}/>
                  <Tog label="Eligible Disaster Extension = FALSE" value={!loan.usdaEligibleForDisasterExtension} onChange={v=>set("usdaEligibleForDisasterExtension",!v)}/>
                  <Tog label="Eligible Disaster Mod = FALSE" value={!loan.usdaEligibleForDisasterMod} onChange={v=>set("usdaEligibleForDisasterMod",!v)}/>
                  <Tog label="Prior Workout ≠ MRA" value={loan.usdaPriorWorkoutNotMRA} onChange={v=>set("usdaPriorWorkoutNotMRA",v)}/>
                  <Tog label="Reinstatement < MRA Cap" value={loan.usdaReinstatementLtMRACap} onChange={v=>set("usdaReinstatementLtMRACap",v)}/>
                  <Tog label="Borrower CANNOT resume current payment" value={loan.usdaBorrowerCanResumePmtFalse} onChange={v=>set("usdaBorrowerCanResumePmtFalse",v)}/>
                  <Tog label="Post-modified PITIAS ≤ Pre-modified" value={loan.usdaPostModPITILePreMod} onChange={v=>set("usdaPostModPITILePreMod",v)}/>
                </Sec>
                <Sec title="USDA – Compromise Sale / DIL">
                  <Tog label="DLQ > 30 days" value={loan.usdaDLQGt30} onChange={v=>set("usdaDLQGt30",v)}/>
                  <Tog label="Complete BRP = TRUE" value={loan.usdaCompleteBRP} onChange={v=>set("usdaCompleteBRP",v)}/>
                  <Tog label="DLQ ≤60 & BRP = TRUE" value={loan.usdaDLQLe60AndBRP} onChange={v=>set("usdaDLQLe60AndBRP",v)}/>
                  <Tog label="DLQ ≥60 & Borrower Intent = Disposition" value={loan.usdaDLQGe60AndDisposition} onChange={v=>set("usdaDLQGe60AndDisposition",v)}/>
                  <Tog label="Prior Compromise Sale = FAILED" value={loan.usdaPriorWorkoutCompSaleFailed} onChange={v=>set("usdaPriorWorkoutCompSaleFailed",v)}/>
                </Sec>
              </>)}
              {loan.loanType==="VA"&&(<>
                <Sec title="VA – Forbearance / Repayment">
                  <Tog label="Forbearance period < 12 months" value={loan.forbearancePeriodLt12} onChange={v=>set("forbearancePeriodLt12",v)}/>
                  <Tog label="Total DLQ < 12 months" value={loan.totalDLQLt12} onChange={v=>set("totalDLQLt12",v)}/>
                  <Tog label="Calculated RPP Plans > 0" value={loan.calculatedRPPGt0} onChange={v=>set("calculatedRPPGt0",v)}/>
                </Sec>
                <Sec title="VA – Disaster">
                  <Tog label="PMMS ≤ Current Rate + 1%" value={loan.pmmsLeCurrentPlus1} onChange={v=>set("pmmsLeCurrentPlus1",v)}/>
                  <Tog label="Active RPP = False" value={!loan.activeRPP} onChange={v=>set("activeRPP",!v)}/>
                  <Tog label="< 30 Days DLQ at Disaster Declaration" value={loan.dlqAtDisasterLt30} onChange={v=>set("dlqAtDisasterLt30",v)}/>
                  <Tog label="Loan ≥ 60 Days DLQ" value={loan.loanGe60DaysDLQ} onChange={v=>set("loanGe60DaysDLQ",v)}/>
                  <Tog label="DLQ ≥ 12 Contractual Payments" value={loan.dlqGe12ContractualPayments} onChange={v=>set("dlqGe12ContractualPayments",v)}/>
                  <Tog label="Previous Workout = Forbearance" value={loan.previousWorkoutForbearance} onChange={v=>set("previousWorkoutForbearance",v)}/>
                  <Tog label="Workout State IN {Active, Passed}" value={loan.workoutStateActivePassed} onChange={v=>set("workoutStateActivePassed",v)}/>
                </Sec>
                <Sec title="VA – VASP & Disposition">
                  <F label="VASP PC % of Statutory Limit"><Num value={loan.partialClaimPct} onChange={v=>set("partialClaimPct",v)} placeholder="e.g. 20"/></F>
                  <Tog label="DLQ ≤60 & Complete BRP = TRUE" value={loan.completeBRP} onChange={v=>set("completeBRP",v)}/>
                  <Tog label="DLQ ≥60 & Borrower Intent = Disposition" value={loan.borrowerIntentDisposition} onChange={v=>set("borrowerIntentDisposition",v)}/>
                  <Tog label="Prior Compromise Sale = FAILED" value={loan.priorWorkoutCompromiseSaleFailed} onChange={v=>set("priorWorkoutCompromiseSaleFailed",v)}/>
                </Sec>
              </>)}
              {loan.loanType==="FNMA"&&(<>
                <Sec title="FNMA – Loan Status">
                  <F label="Loan Age (months since origination)"><Num value={loan.fnmaLoanAge} onChange={v=>set("fnmaLoanAge",v)} placeholder="e.g. 36"/></F>
                  <F label="Property Type"><Sel value={loan.fnmaPropertyType} onChange={v=>set("fnmaPropertyType",v)} options={["Principal Residence","Second Home","Investment"]}/></F>
                  <Tog label="Hardship resolved (temporary, no longer a problem)" value={loan.fnmaHardshipResolved} onChange={v=>set("fnmaHardshipResolved",v)}/>
                  <Tog label="Can resume full contractual monthly payment" value={loan.fnmaCanResumeFull} onChange={v=>set("fnmaCanResumeFull",v)}/>
                  <Tog label="Cannot reinstate or afford repayment plan" value={loan.fnmaCannotReinstate} onChange={v=>set("fnmaCannotReinstate",v)}/>
                  <Tog label="Servicer imminent default determination" value={loan.fnmaImminentDefault} onChange={v=>set("fnmaImminentDefault",v)}/>
                  <Tog label="Within 36 months of maturity or projected payoff" value={loan.fnmaWithin36MonthsMaturity} onChange={v=>set("fnmaWithin36MonthsMaturity",v)}/>
                </Sec>
                <Sec title="FNMA – Prior Workout History">
                  <F label="Months since last non-disaster payment deferral (0 = never)"><Num value={loan.fnmaPriorDeferralMonths} onChange={v=>set("fnmaPriorDeferralMonths",v)} placeholder="0 = never"/></F>
                  <F label="Cumulative months deferred (lifetime total)"><Num value={loan.fnmaCumulativeDeferredMonths} onChange={v=>set("fnmaCumulativeDeferredMonths",v)} placeholder="0"/></F>
                  <F label="Prior modifications (count — deferrals excluded from count)"><Num value={loan.fnmaPriorModCount} onChange={v=>set("fnmaPriorModCount",v)} placeholder="0"/></F>
                  <Tog label="Failed Flex Mod TPP within 12 months" value={loan.fnmaFailedTPP12Months} onChange={v=>set("fnmaFailedTPP12Months",v)}/>
                  <Tog label="60+ day re-default within 12 months of last Flex Mod" value={loan.fnmaReDefaulted12Months} onChange={v=>set("fnmaReDefaulted12Months",v)}/>
                </Sec>
                <Sec title="FNMA – Active Status Blockers">
                  <Tog label="Recourse/indemnification arrangement with FNMA" value={loan.fnmaRecourseArrangement} onChange={v=>set("fnmaRecourseArrangement",v)}/>
                  <Tog label="Approved liquidation option active" value={loan.fnmaActiveLiquidation} onChange={v=>set("fnmaActiveLiquidation",v)}/>
                  <Tog label="Active and performing repayment plan" value={loan.fnmaActiveRepayPlan} onChange={v=>set("fnmaActiveRepayPlan",v)}/>
                  <Tog label="Current offer pending for another workout option" value={loan.fnmaActivePendingOffer} onChange={v=>set("fnmaActivePendingOffer",v)}/>
                  <Tog label="Active and performing modification TPP" value={loan.fnmaActiveTPP} onChange={v=>set("fnmaActiveTPP",v)}/>
                </Sec>
                <Sec title="FNMA – Disaster">
                  <Tog label="Disaster-related hardship" value={loan.fnmaDisasterHardship} onChange={v=>set("fnmaDisasterHardship",v)}/>
                  {loan.fnmaDisasterHardship&&(<>
                    <Tog label="Property in FEMA-Declared Disaster Area eligible for IA (or employer's location)" value={loan.fnmaFEMADesignation} onChange={v=>set("fnmaFEMADesignation",v)}/>
                    <Tog label="Property experienced an insured loss" value={loan.fnmaInsuredLoss} onChange={v=>set("fnmaInsuredLoss",v)}/>
                    <F label="DLQ at time of disaster (months — 0 = current)"><Num value={loan.fnmaDelinquencyAtDisaster} onChange={v=>set("fnmaDelinquencyAtDisaster",v)} placeholder="0"/></F>
                    <Tog label="Already received deferral for this same disaster event" value={loan.fnmaSameDlisasterPriorDeferral} onChange={v=>set("fnmaSameDlisasterPriorDeferral",v)}/>
                  </>)}
                </Sec>
              </>)}
              {loan.loanType==="FHLMC"&&(<>
                <Sec title="FHLMC – Loan Status">
                  <F label="Loan Age (months since origination)"><Num value={loan.fhlmcLoanAge} onChange={v=>set("fhlmcLoanAge",v)} placeholder="e.g. 36"/></F>
                  <F label="Mortgage Type"><Sel value={loan.fhlmcMortgageType} onChange={v=>set("fhlmcMortgageType",v)} options={["Conventional","FHA","VA","RHS"]}/></F>
                  <F label="Property Type"><Sel value={loan.fhlmcPropertyType} onChange={v=>set("fhlmcPropertyType",v)} options={["Primary Residence","Second Home","Investment Property"]}/></F>
                  <F label="FM Posted Modification Rate (%)"><Num value={loan.fhlmcPostedModRate} onChange={v=>set("fhlmcPostedModRate",v)} placeholder="e.g. 6.5"/></F>
                  <F label="Estimated Property Value"><Num value={loan.fhlmcPropertyValue} onChange={v=>set("fhlmcPropertyValue",v)} placeholder="e.g. 300000" prefix="$"/></F>
                  {n(loan.fhlmcPropertyValue)>0&&n(loan.upb)>0&&<div className="bg-violet-50 rounded p-2 text-xs text-violet-800 space-y-0.5 mt-1">
                    <div>Current MTMLTV: <strong>{(n(loan.upb)/n(loan.fhlmcPropertyValue)*100).toFixed(1)}%</strong></div>
                    <div>Post-Cap MTMLTV: <strong>{((n(loan.upb)+n(loan.arrearagesToCapitalize)+n(loan.legalFees))/n(loan.fhlmcPropertyValue)*100).toFixed(1)}%</strong></div>
                    <div className="text-slate-500">≥50% → rate relief eligible; &gt;50% → principal forbearance eligible</div>
                  </div>}
                  <Tog label="Hardship resolved (temporary, no longer a problem)" value={loan.fhlmcHardshipResolved} onChange={v=>set("fhlmcHardshipResolved",v)}/>
                  <Tog label="Can resume full contractual monthly payment" value={loan.fhlmcCanResumeFull} onChange={v=>set("fhlmcCanResumeFull",v)}/>
                  <Tog label="Servicer imminent default determination" value={loan.fhlmcImminentDefault} onChange={v=>set("fhlmcImminentDefault",v)}/>
                  <Tog label="Long-term/permanent hardship (NOT unemployment)" value={loan.fhlmcLongTermHardship} onChange={v=>set("fhlmcLongTermHardship",v)}/>
                  <Tog label="Unemployed borrower (→ forbearance, not Flex Mod)" value={loan.fhlmcUnemployed} onChange={v=>set("fhlmcUnemployed",v)}/>
                  <Tog label="Verified income" value={loan.fhlmcVerifiedIncome} onChange={v=>set("fhlmcVerifiedIncome",v)}/>
                  <Tog label="Recourse or indemnification arrangement" value={loan.fhlmcRecourse} onChange={v=>set("fhlmcRecourse",v)}/>
                </Sec>
                <Sec title="FHLMC – Imminent Default (current/&lt;60 DLQ)">
                  <Tog label="Cash Reserves < $25,000" value={loan.fhlmcCashReservesLt25k} onChange={v=>set("fhlmcCashReservesLt25k",v)}/>
                  <F label="FICO Score (middle/lower method)"><Num value={loan.fhlmcFICO} onChange={v=>set("fhlmcFICO",v)} placeholder="e.g. 620"/></F>
                  <F label="Pre-Mod Housing Expense / GMI (%)"><Num value={loan.fhlmcHousingExpenseRatio} onChange={v=>set("fhlmcHousingExpenseRatio",v)} placeholder="e.g. 45"/></F>
                  <Tog label="2+ 30-day DLQ in most recent 6-month period" value={loan.fhlmcPrior30DayDLQ6Mo} onChange={v=>set("fhlmcPrior30DayDLQ6Mo",v)}/>
                </Sec>
                <Sec title="FHLMC – Prior Workout History">
                  <F label="Prior modifications (count)"><Num value={loan.fhlmcPriorModCount} onChange={v=>set("fhlmcPriorModCount",v)} placeholder="0"/></F>
                  <Tog label="Failed Flex Mod TPP within 12 months" value={loan.fhlmcFailedFlexTPP12Mo} onChange={v=>set("fhlmcFailedFlexTPP12Mo",v)}/>
                  <Tog label="Prior Flex Mod → 60+ DLQ within 12mo, not cured" value={loan.fhlmcPriorFlexMod60DLQ} onChange={v=>set("fhlmcPriorFlexMod60DLQ",v)}/>
                  <Tog label="Step-Rate Mortgage" value={loan.fhlmcStepRateMortgage} onChange={v=>set("fhlmcStepRateMortgage",v)}/>
                  {loan.fhlmcStepRateMortgage&&<Tog label="Interest rate adjusted within past 12 months" value={loan.fhlmcRateAdjustedWithin12Mo} onChange={v=>set("fhlmcRateAdjustedWithin12Mo",v)}/>}
                </Sec>
                <Sec title="FHLMC – Active Status Blockers">
                  <Tog label="Approved liquidation option (short sale / DIL) active" value={loan.fhlmcApprovedLiquidationOption} onChange={v=>set("fhlmcApprovedLiquidationOption",v)}/>
                  <Tog label="Active and performing modification TPP" value={loan.fhlmcActiveTPP} onChange={v=>set("fhlmcActiveTPP",v)}/>
                  <Tog label="Active and performing forbearance plan" value={loan.fhlmcActiveForbearance} onChange={v=>set("fhlmcActiveForbearance",v)}/>
                  <Tog label="Active and performing repayment plan" value={loan.fhlmcActiveRepayPlan} onChange={v=>set("fhlmcActiveRepayPlan",v)}/>
                  <Tog label="Unexpired offer for another modification/workout option" value={loan.fhlmcUnexpiredOffer} onChange={v=>set("fhlmcUnexpiredOffer",v)}/>
                </Sec>
                <Sec title="FHLMC – Disaster">
                  <Tog label="Disaster-related hardship" value={loan.fhlmcDisasterHardship} onChange={v=>set("fhlmcDisasterHardship",v)}/>
                  {loan.fhlmcDisasterHardship&&(<>
                    <Tog label="Eligible Disaster (FEMA-declared individual assistance)" value={loan.fhlmcFEMADesignation} onChange={v=>set("fhlmcFEMADesignation",v)}/>
                    <F label="DLQ at time of disaster (months — 0 = current)"><Num value={loan.fhlmcDLQAtDisaster} onChange={v=>set("fhlmcDLQAtDisaster",v)} placeholder="0"/></F>
                  </>)}
                </Sec>
              </>)}
              <Sec title="Home Disposition">
                <Tog label="Meets PFS/Compromise Sale requirements" value={loan.meetsPFSRequirements} onChange={v=>set("meetsPFSRequirements",v)}/>
                <Tog label="Outstanding debt uncurable" value={loan.outstandingDebtUncurable} onChange={v=>set("outstandingDebtUncurable",v)}/>
                <Tog label="Meets Deed-in-Lieu requirements" value={loan.meetsDILRequirements} onChange={v=>set("meetsDILRequirements",v)}/>
              </Sec>
              <button onClick={evaluate} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black py-3 rounded-xl text-sm mt-3 shadow-lg shadow-blue-200 transition-all active:scale-95">🔍 Evaluate Loan →</button>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {tab==="results"&&(
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="overflow-y-auto" style={{maxHeight:"82vh"}}>
              {!evaluated?<div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-400">
                <div className="text-4xl mb-3">🔍</div>
                <div className="font-semibold">Complete the Inputs tab and click Evaluate</div>
              </div>:(<>
                {/* Header row */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="font-black text-slate-800 text-lg">{loan.loanType}</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold">{eligible.length} eligible</span>
                  <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-bold">{ineligible.length} ineligible</span>
                  <button onClick={printReport} className="ml-auto text-xs bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm font-medium transition-all">🖨 Print Report</button>
                </div>
                {/* Waterfall */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Waterfall Sequence</div>
                  <div className="flex flex-wrap gap-1.5">
                    {results.map((r,i)=>(<div key={i} className="flex items-center gap-1">
                      <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all ${r.eligible?"bg-emerald-50 border-emerald-200 text-emerald-800":"bg-slate-50 border-slate-200 text-slate-400 line-through"}`}>
                        <span className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-black flex-shrink-0 ${r.eligible?"bg-emerald-500 text-white":"bg-slate-300 text-slate-500"}`}>{i+1}</span>
                        {r.option.split(" ").slice(-2).join(" ")}
                      </div>
                      {i<results.length-1&&<span className="text-slate-300 text-xs">›</span>}
                    </div>))}
                  </div>
                </div>
                {eligible.length===0&&<div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 font-bold mb-4">⚠️ No eligible options. Review for adverse action / foreclosure referral.</div>}
                {eligible.length>0&&<div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Eligible Options — click to view calculated terms</div>}
                {eligible.map((r,i)=>(
                  <div key={i} className="rounded-xl border border-emerald-200 overflow-hidden shadow-sm mb-3 transition-all hover:shadow-md">
                    <button className="w-full text-left px-4 py-3 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white" onClick={()=>setExpanded(expanded===`e${i}`?null:`e${i}`)}>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">{i+1}</div>
                        <div>
                          <div className="font-bold text-sm text-slate-800">{r.option}</div>
                          {r.note&&<div className="text-xs text-emerald-600 mt-0.5">{r.note}</div>}
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 transition-all ${expanded===`e${i}`?"bg-slate-200 text-slate-600":"bg-emerald-100 text-emerald-700"}`}>{expanded===`e${i}`?"▲ Hide":"View Terms ▼"}</span>
                    </button>
                    {expanded===`e${i}`&&(
                      <div className="px-4 pb-4 bg-white">
                        {r.calc&&<div className="text-xs bg-blue-50 text-blue-700 rounded-lg px-3 py-2 mb-2 border border-blue-100">📊 {r.calc}</div>}
                        <CalcTermsPanel optionName={r.option} loan={loan}/>
                      </div>
                    )}
                  </div>
                ))}
              </>)}
            </div>
            <div className="overflow-y-auto" style={{maxHeight:"82vh"}}>
              {evaluated&&(<>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Ineligible Options</div>
                {ineligible.map((r,i)=>{
                  const fail=r.nodes?.find(nd=>!nd.pass);
                  return(<div key={i} className="bg-white border border-slate-200 rounded-xl mb-2 overflow-hidden shadow-sm">
                    <button className="w-full text-left px-4 py-3 flex items-center justify-between" onClick={()=>setExpanded(expanded===`n${i}`?null:`n${i}`)}>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-[10px] font-black flex-shrink-0 mt-0.5">✗</span>
                        <div>
                          <div className="font-semibold text-xs text-slate-700">{r.option}</div>
                          {fail&&<div className="text-xs text-red-500 mt-0.5">↳ {fail.question}: <em>{fail.answer}</em></div>}
                        </div>
                      </div>
                      <span className="text-slate-400 text-xs ml-2 flex-shrink-0">{expanded===`n${i}`?"▲":"▼"}</span>
                    </button>
                    {expanded===`n${i}`&&<div className="px-4 pb-3 border-t border-slate-100 bg-slate-50/50">
                      <div className="mt-2 space-y-1">
                        {r.nodes?.map((nd,j)=>(<div key={j} className={`flex items-start gap-2 py-0.5 text-xs ${nd.pass?"text-emerald-700":"text-red-600 font-semibold"}`}>
                          <span className="flex-shrink-0">{nd.pass?"✓":"✗"}</span>
                          <span>{nd.question}: <em>{nd.answer}</em></span>
                        </div>))}
                      </div>
                    </div>}
                  </div>);
                })}
              </>)}
            </div>
          </div>
        )}

        {/* ── AUDIT ── */}
        {tab==="audit"&&(
          <div className="overflow-y-auto" style={{maxHeight:"82vh"}}>
            {!evaluated?<div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-400"><div className="text-4xl mb-3">🔍</div><div className="font-semibold">Run evaluation first</div></div>:(
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-black text-slate-800 text-lg">Audit Trail — {loan.loanType}</h2>
                  <span className="text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1 shadow-sm">{results.length} options · {eligible.length} eligible</span>
                </div>
                {results.map((r,i)=>(
                  <div key={i} className={`rounded-xl border overflow-hidden shadow-sm ${r.eligible?"border-emerald-200 bg-emerald-50/30":"border-slate-200 bg-white"}`}>
                    <button className="w-full text-left px-4 py-3 flex items-center justify-between" onClick={()=>setExpandedAudit(expandedAudit===i?null:i)}>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${r.eligible?"bg-emerald-500 text-white":"bg-red-100 text-red-700"}`}>{r.eligible?"ELIGIBLE":"INELIGIBLE"}</span>
                        <span className="font-semibold text-sm text-slate-800">{i+1}. {r.option}</span>
                      </div>
                      <span className="text-slate-400 text-xs flex items-center gap-1">{r.nodes?.length} checks <span>{expandedAudit===i?"▲":"▼"}</span></span>
                    </button>
                    {expandedAudit===i&&(<div className="px-4 pb-4 border-t border-slate-100">
                      <div className="mt-3 space-y-1">
                        {r.nodes?.map((nd,j)=>(<div key={j} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${nd.pass?"bg-emerald-50 text-emerald-800":"bg-red-50 text-red-700 font-semibold"}`}>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 ${nd.pass?"bg-emerald-500 text-white":"bg-red-500 text-white"}`}>{nd.pass?"✓":"✗"}</span>
                          <span className="flex-1">{nd.question}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${nd.pass?"bg-emerald-200 text-emerald-800":"bg-red-200 text-red-800"}`}>{nd.answer}</span>
                        </div>))}
                      </div>
                      {r.eligible&&<CalcTermsPanel optionName={r.option} loan={loan}/>}
                    </div>)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── REPORT ── */}
        {tab==="report"&&(
          <div className="max-w-3xl mx-auto">
            {!evaluated?<div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-400"><div className="text-4xl mb-3">📄</div><div className="font-semibold">Run evaluation first</div></div>:(<>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Loss Mitigation Evaluation</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{new Date().toLocaleDateString()} · {loan.loanType}{loan.loanNumber?" · Loan #"+loan.loanNumber:""}{loan.borrowerName?" · "+loan.borrowerName:""}</p>
                  </div>
                  <button onClick={printReport} className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4 py-2 rounded-lg font-bold shadow-sm transition-all">🖨 Print</button>
                </div>
                <div className="grid grid-cols-5 gap-3 mb-5">
                  {[["DLQ",loan.delinquencyMonths?loan.delinquencyMonths+"mo":"—","bg-orange-50 border-orange-200"],["UPB",loan.upb?fmt$(n(loan.upb)):"—","bg-blue-50 border-blue-200"],["GMI",gmi>0?"$"+Number(loan.grossMonthlyIncome).toLocaleString():"—","bg-purple-50 border-purple-200"],["31% Target",target31?"$"+target31:"—","bg-indigo-50 border-indigo-200"],["Eligible",eligible.length,eligible.length>0?"bg-emerald-50 border-emerald-200":"bg-red-50 border-red-200"]].map(([k,v,cls])=>(<div key={k} className={`rounded-xl p-3 text-center border ${cls}`}><div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{k}</div><div className="font-black text-sm text-slate-800">{v}</div></div>))}
                </div>
                <div className="mb-5">
                  <h3 className="font-black text-slate-700 mb-3 flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-black">✓</span> Eligible Options</h3>
                  {eligible.length===0?<p className="text-sm text-red-600 font-bold bg-red-50 border border-red-200 rounded-xl p-4">No eligible options. Adverse action / foreclosure referral required.</p>:
                    eligible.map((r,i)=>(<div key={i} className="border border-slate-200 rounded-xl mb-3 overflow-hidden shadow-sm"><div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white px-4 py-2 text-sm font-bold">{i+1}. {r.option}</div>{r.note&&<div className="px-4 py-1.5 text-xs bg-amber-50 text-amber-800 border-b border-amber-100">📌 {r.note}</div>}<CalcTermsPanel optionName={r.option} loan={loan}/></div>))}
                </div>
                <div>
                  <h3 className="font-black text-slate-700 mb-3 flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-red-400 text-white text-[10px] flex items-center justify-center font-black">✗</span> Ineligible ({ineligible.length})</h3>
                  <div className="space-y-1.5">
                    {ineligible.map((r,i)=>{const f=r.nodes?.find(nd=>!nd.pass);return<div key={i} className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 flex items-start gap-2"><span className="text-slate-400 font-bold flex-shrink-0">✗</span><span className="font-semibold text-slate-700">{r.option}</span>{f&&<span className="text-red-500 ml-1">— {f.question}: {f.answer}</span>}</div>;})}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div><h3 className="font-black text-slate-800">🤖 AI Underwriting Assistant</h3><p className="text-xs text-slate-400 mt-0.5">Powered by Claude — expert waterfall analysis</p></div>
                  <button onClick={askAI} disabled={aiLoading} className={`text-sm px-4 py-2 rounded-xl font-bold shadow-sm transition-all ${aiLoading?"bg-slate-200 text-slate-400 cursor-not-allowed":"bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"}`}>{aiLoading?"⏳ Analyzing...":"✨ Get AI Analysis"}</button>
                </div>
                <div className="mb-4"><label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">Anthropic API Key (not stored)</label><input type="password" className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-ant-..."/></div>
                {aiLoading&&<div className="text-sm text-slate-500 italic animate-pulse py-4 text-center">Analyzing loan data...</div>}
                {aiResponse&&<div className="text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-200 leading-relaxed">{aiResponse}</div>}
                {!aiResponse&&!aiLoading&&<p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3 border border-slate-100">Enter your API key and click Analyze to get expert waterfall recommendations, documentation checklists, and compliance notes.</p>}
              </div>
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800"><strong>Disclaimer:</strong> Decision-support tool only. Final determinations must be confirmed by a qualified loss mitigation underwriter per current HUD, USDA, and VA guidelines.</div>
            </>)}
          </div>
        )}

        {/* ── COMPARE ── */}
        {tab==="compare"&&(
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Loan A card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-black">A</div>
                    <h3 className="font-bold text-slate-800">Loan A — {loan.loanType}</h3>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${evaluated?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-400"}`}>{evaluated?`${eligible.length} eligible`:"Not evaluated"}</span>
                </div>
                <div className="space-y-1.5">
                  {[["DLQ",loan.delinquencyMonths?loan.delinquencyMonths+" mo":"—"],["Hardship",loan.hardshipType+" ("+loan.hardshipDuration+")"],["UPB",loan.upb?fmt$(n(loan.upb)):"—"],["GMI",gmi>0?"$"+Number(loan.grossMonthlyIncome).toLocaleString():"—"]].map(([k,v])=>(
                    <div key={k} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                      <span className="text-xs text-slate-400 font-medium">{k}</span>
                      <span className="text-xs font-semibold text-slate-700">{v}</span>
                    </div>
                  ))}
                </div>
                {!evaluated&&<p className="text-xs text-amber-600 italic mt-3 bg-amber-50 rounded-lg px-3 py-2">Evaluate on Inputs tab first.</p>}
              </div>
              {/* Loan B card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-y-auto" style={{maxHeight:"60vh"}}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-black">B</div>
                    <h3 className="font-bold text-slate-800">Loan B — {loan2.loanType}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${evaluated2?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-400"}`}>{evaluated2?`${results2.filter(r=>r.eligible).length} eligible`:"Not evaluated"}</span>
                    <button onClick={evaluate2} className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors">Evaluate B</button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2 mt-3"><div className="h-3.5 w-0.5 rounded-full bg-slate-300"/><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loan Details</span></div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[["Loan Type","loanType",LOAN_TYPES],["Hardship Type","hardshipType",HARDSHIP_TYPES],["Hardship Duration","hardshipDuration",["Resolved","Long Term","Permanent","Short Term"]]].map(([label,key,opts])=><div key={key} className="col-span-1"><label className="text-xs text-slate-500 mb-0.5 block">{label}</label><Sel value={loan2[key]} onChange={v=>set2(key,v)} options={opts}/></div>)}
                  <div><label className="text-xs text-slate-500 mb-0.5 block">DLQ (months)</label><Num value={loan2.delinquencyMonths} onChange={v=>set2("delinquencyMonths",v)} placeholder="e.g. 6"/></div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">GMI</label><Num value={loan2.grossMonthlyIncome} onChange={v=>set2("grossMonthlyIncome",v)} placeholder="e.g. 5000" prefix="$"/></div>
                </div>
                <div className="flex items-center gap-2 mb-2 mt-3"><div className="h-3.5 w-0.5 rounded-full bg-slate-300"/><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Financials</span></div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div><label className="text-xs text-slate-500 mb-0.5 block">Current UPB</label><Num value={loan2.upb} onChange={v=>set2("upb",v)} placeholder="e.g. 250000" prefix="$"/></div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">Original UPB</label><Num value={loan2.originalUpb} onChange={v=>set2("originalUpb",v)} placeholder="e.g. 275000" prefix="$"/></div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">Monthly Escrow</label><Num value={loan2.currentEscrow} onChange={v=>set2("currentEscrow",v)} placeholder="e.g. 400" prefix="$"/></div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">Monthly P&I</label><Num value={loan2.currentPI} onChange={v=>set2("currentPI",v)} placeholder="e.g. 1400" prefix="$"/></div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">Monthly PITI</label><Num value={loan2.currentPITI} onChange={v=>set2("currentPITI",v)} placeholder="e.g. 1800" prefix="$"/></div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">PMMS Rate (%)</label><Num value={loan2.pmmsRate} onChange={v=>set2("pmmsRate",v)} placeholder="e.g. 7.1"/></div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">Current Rate (%)</label><Num value={loan2.currentInterestRate} onChange={v=>set2("currentInterestRate",v)} placeholder="e.g. 6.5"/></div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">Arrearages</label><Num value={loan2.arrearagesToCapitalize} onChange={v=>set2("arrearagesToCapitalize",v)} placeholder="e.g. 7000" prefix="$"/></div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">Escrow Shortage</label><Num value={loan2.escrowShortage} onChange={v=>set2("escrowShortage",v)} placeholder="e.g. 800" prefix="$"/></div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">Legal Fees</label><Num value={loan2.legalFees} onChange={v=>set2("legalFees",v)} placeholder="e.g. 1200" prefix="$"/></div>
                </div>
                <div className="flex items-center gap-2 mb-2 mt-3"><div className="h-3.5 w-0.5 rounded-full bg-slate-300"/><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loan Dates</span></div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div><label className="text-xs text-slate-500 mb-0.5 block">Note First Payment</label><input type="date" className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400" value={loan2.noteFirstPaymentDate} onChange={e=>set2("noteFirstPaymentDate",e.target.value)}/></div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">Note Term (months)</label><Num value={loan2.noteTerm} onChange={v=>set2("noteTerm",v)} placeholder="360"/></div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">Original Maturity</label><input type="date" className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400" value={loan2.originalMaturityDate} onChange={e=>set2("originalMaturityDate",e.target.value)}/></div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">Effective Date</label><input type="date" className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400" value={loan2.approvalEffectiveDate} onChange={e=>set2("approvalEffectiveDate",e.target.value)}/></div>
                </div>
                <div className="flex items-center gap-2 mb-2 mt-3"><div className="h-3.5 w-0.5 rounded-full bg-slate-300"/><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Eligibility Flags</span></div>
                <div className="space-y-1">
                  <Tog label="Continuous Income" value={loan2.continuousIncome} onChange={v=>set2("continuousIncome",v)}/>
                  <Tog label="Target achievable by re-amortizing" value={loan2.canAchieveTargetByReamort} onChange={v=>set2("canAchieveTargetByReamort",v)}/>
                  <Tog label="Foreclosure Active" value={loan2.foreclosureActive} onChange={v=>set2("foreclosureActive",v)}/>
                  <Tog label="Owner Occupied" value={loan2.occupancyStatus==="Owner Occupied"} onChange={v=>set2("occupancyStatus",v?"Owner Occupied":"Non-Owner Occupied")}/>
                  <Tog label="Lien = First" value={loan2.lienPosition==="First"} onChange={v=>set2("lienPosition",v?"First":"Second")}/>
                  <Tog label="Borrower Intent = Retention" value={loan2.borrowerIntentRetention} onChange={v=>set2("borrowerIntentRetention",v)}/>
                  <Tog label="Property ≠ Condemned/Abandoned" value={loan2.propertyCondition!=="Condemned"&&!loan2.occupancyAbandoned} onChange={v=>{set2("propertyCondition",v?"Standard":"Condemned");set2("occupancyAbandoned",!v);}}/>
                </div>
              </div>
            </div>
            {evaluated&&evaluated2&&(()=>{
              const all=[...new Set([...results.map(r=>r.option),...results2.map(r=>r.option)])];
              const a=Object.fromEntries(results.map(r=>[r.option,r.eligible]));
              const b=Object.fromEntries(results2.map(r=>[r.option,r.eligible]));
              const aCount=results.filter(r=>r.eligible).length;
              const bCount=results2.filter(r=>r.eligible).length;
              return(<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-5 py-3 flex items-center justify-between">
                  <span className="text-sm font-bold tracking-tight">Side-by-Side Comparison</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center font-black text-[10px]">A</span><span className="text-slate-300">{aCount} eligible</span></span>
                    <span className="text-slate-500">vs</span>
                    <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center font-black text-[10px]">B</span><span className="text-slate-300">{bCount} eligible</span></span>
                  </div>
                </div>
                <div className="overflow-x-auto"><table className="w-full text-xs">
                  <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="text-left px-4 py-2.5 font-semibold text-slate-600">Option</th><th className="text-center px-4 py-2.5 w-28 text-blue-700 font-semibold">A ({loan.loanType})</th><th className="text-center px-4 py-2.5 w-28 text-violet-700 font-semibold">B ({loan2.loanType})</th><th className="text-center px-4 py-2.5 w-24 text-slate-500 font-semibold">Delta</th></tr></thead>
                  <tbody>{all.map((opt,i)=>{const aV=a[opt],bV=b[opt];return(<tr key={i} className={`border-b border-slate-100 ${aV&&bV?"bg-emerald-50/60":(!aV&&!bV)?"":"bg-amber-50/60"}`}><td className="px-4 py-2.5 font-medium text-slate-700">{opt}</td><td className="px-4 py-2.5 text-center">{aV===undefined?"—":aV?<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[10px]">✓</span>:<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 font-black text-[10px]">✗</span>}</td><td className="px-4 py-2.5 text-center">{bV===undefined?"—":bV?<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[10px]">✓</span>:<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 font-black text-[10px]">✗</span>}</td><td className="px-4 py-2.5 text-center">{aV&&bV?<span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Both</span>:(!aV&&!bV)?<span className="text-slate-300">Neither</span>:(aV&&!bV)?<span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">A only</span>:<span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold">B only</span>}</td></tr>);})}</tbody>
                  <tfoot><tr className="bg-slate-50 border-t-2 border-slate-200"><td className="px-4 py-3 font-bold text-slate-700">Total Eligible</td><td className="px-4 py-3 text-center font-black text-blue-700 text-sm">{aCount}</td><td className="px-4 py-3 text-center font-black text-violet-700 text-sm">{bCount}</td><td className="px-4 py-3 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${aCount>bCount?"bg-blue-100 text-blue-700":bCount>aCount?"bg-violet-100 text-violet-700":"bg-slate-100 text-slate-500"}`}>{aCount>bCount?"A wins":bCount>aCount?"B wins":"Tied"}</span></td></tr></tfoot>
                </table></div>
              </div>);
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
