import React, { useState, useCallback, useMemo, useEffect } from "react";
import { supabase, supabaseConfigured } from "./supabase";
import resolutionIQLogo from "../ResolutionIQ_logo.svg";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LOAN_TYPES = ["FHA","USDA","VA","FNMA","FHLMC"];
const GUIDELINE_VERSIONS: Record<string, {version: string, lastVerified: string, url: string}> = {
  FHA:   { version: "ML 2025-06 / ML 2025-12", lastVerified: "2026-03-01", url: "https://www.hud.gov/program_offices/housing/sfh/nsc/memos" },
  USDA:  { version: "RD Instruction 3555-C, Final Rule Feb 2025", lastVerified: "2026-03-01", url: "https://www.rd.usda.gov/resources/directives/instructions" },
  VA:    { version: "M26-4, Circular 26-25-2 (eff. May 1 2025)", lastVerified: "2026-03-01", url: "https://www.benefits.va.gov/homeloans/servicer.asp" },
  FHLMC: { version: "Single-Family Guide Ch. 9200, Bulletin 2026-2", lastVerified: "2026-03-01", url: "https://guide.freddiemac.com" },
  FNMA:  { version: "Servicing Guide D2-3.2, updated 2025", lastVerified: "2026-03-01", url: "https://servicing-guide.fanniemae.com" },
};
const guidelineDaysOld = (loanType: string): number => {
  const gv = GUIDELINE_VERSIONS[loanType];
  if (!gv) return 0;
  return Math.floor((Date.now() - new Date(gv.lastVerified).getTime()) / 86400000);
};
const TABS = ["dashboard","inputs","results","audit","report","compare","portfolio","settings"];
const TAB_LABELS = { dashboard:"📊 Dashboard", inputs:"📋 Inputs", results:"✅ Results", audit:"🔍 Audit Trail", report:"📄 Report", compare:"⚖️ Compare", portfolio:"📦 Portfolio", settings:"⚙️ Settings" };
const HARDSHIP_TYPES = ["Reduction in Income","Unemployment","Business Failure","Increase in Housing Expenses","Property Problem","Unknown","Disaster"];

// ─── OPTION DOCUMENTS ─────────────────────────────────────────────────────────
const OPTION_DOCS: Record<string, {required: string[], conditional: {doc: string, condition: string}[], timeline: string}> = {
  // FHA
  "FHA Reinstatement": {
    required: ["Payoff/reinstatement quote from servicer","Certified funds (cashier's check or wire)"],
    conditional: [],
    timeline: "Prior to foreclosure sale date"
  },
  "FHA Standalone Partial Claim": {
    required: ["Hardship affidavit","Verification of income (paystubs, tax returns, or SSA letter)","Executed Partial Claim Note and Subordinate Mortgage"],
    conditional: [{doc:"BRP (Budget/Financial Statement)", condition:"Required if arrears > 6 months"}],
    timeline: "45 days from approval"
  },
  "FHA Payment Deferral": {
    required: ["Hardship affidavit","COVID/hardship resolution documentation"],
    conditional: [],
    timeline: "45 days from approval"
  },
  "FHA 30-Year Standalone Modification": {
    required: ["Hardship affidavit","Verification of income (most recent 30-day paystubs + 2yr W-2s or tax returns)","Bank statements (2 most recent months)","Signed Loan Modification Agreement"],
    conditional: [{doc:"Trial Payment Plan completion", condition:"Required if income docs not provided upfront"}],
    timeline: "Trial: 3 months; Permanent mod: 45 days after TPP"
  },
  "FHA 40-Year Combination Modification + Partial Claim": {
    required: ["Hardship affidavit","Verification of income","Bank statements (2 months)","Signed Loan Modification Agreement","Executed Partial Claim Note and Subordinate Mortgage"],
    conditional: [],
    timeline: "Trial: 3 months; Permanent mod: 45 days after TPP"
  },
  "Payment Supplement": {
    required: ["Hardship affidavit","Verification of income","Bank statements (2 months)"],
    conditional: [],
    timeline: "45 days from approval; supplement paid monthly for up to 36 months"
  },
  "Repayment Plan": {
    required: ["Signed Repayment Plan Agreement"],
    conditional: [{doc:"Income verification", condition:"Recommended for plans > 6 months"}],
    timeline: "Plan term: per agreement (max 24 months)"
  },
  "Formal Forbearance": {
    required: ["Hardship affidavit","Signed Forbearance Agreement"],
    conditional: [],
    timeline: "Up to 6 months; must exit within 12 months of delinquency"
  },
  "Special Forbearance – Unemployment": {
    required: ["Proof of unemployment benefits or termination letter","Hardship affidavit","Signed Forbearance Agreement"],
    conditional: [],
    timeline: "Initial 6 months; extend up to 12 months total if still unemployed"
  },
  "FHA Disaster Loan Modification": {
    required: ["FEMA disaster declaration reference","Proof of damage or insurance claim","Hardship affidavit"],
    conditional: [{doc:"Income documentation + TPP", condition:"Required if income has NOT been restored to pre-disaster level"}],
    timeline: "45 days from approval"
  },
  "FHA Disaster Standalone Partial Claim": {
    required: ["FEMA disaster declaration reference","Hardship affidavit","Executed Partial Claim Note and Subordinate Mortgage"],
    conditional: [],
    timeline: "45 days from approval"
  },
  // USDA
  "USDA Reinstatement": {
    required: ["Payoff/reinstatement quote","Certified funds"],
    conditional: [],
    timeline: "Prior to foreclosure sale"
  },
  "USDA Informal Forbearance": {
    required: ["Hardship letter","Signed forbearance agreement"],
    conditional: [],
    timeline: "Up to 180 days"
  },
  "USDA Informal Repayment Plan": {
    required: ["Signed Repayment Plan Agreement","Verification of income"],
    conditional: [],
    timeline: "Per plan agreement"
  },
  "USDA Streamline Modification": {
    required: ["Signed Loan Modification Agreement"],
    conditional: [{doc:"Income verification", condition:"If borrower requests income-based review"}],
    timeline: "90-day Trial Payment Plan; permanent mod after successful completion"
  },
  "USDA Modification + MRA Servicing Plan": {
    required: ["Signed Loan Modification Agreement","MRA Note and Subordinate Mortgage"],
    conditional: [],
    timeline: "90-day TPP; permanent mod + MRA recorded after"
  },
  "USDA Standalone Mortgage Recovery Advance (MRA)": {
    required: ["Hardship affidavit","Verification of income","MRA Note and Subordinate Mortgage"],
    conditional: [],
    timeline: "45 days from approval"
  },
  "USDA Compromise Sale": {
    required: ["Hardship affidavit","BRP (Budget/Financial Statement)","Listing agreement","Purchase contract (when available)","Property valuation (BPO or appraisal)"],
    conditional: [],
    timeline: "120 days typical marketing period"
  },
  "USDA Deed-in-Lieu": {
    required: ["Hardship affidavit","BRP","Property clear title evidence","Signed DIL Agreement"],
    conditional: [],
    timeline: "45–90 days"
  },
  // VA
  "VA Reinstatement": {
    required: ["Certified funds for full reinstatement amount"],
    conditional: [],
    timeline: "Prior to foreclosure"
  },
  "VA Repayment Plan": {
    required: ["Signed Repayment Plan Agreement","Income verification"],
    conditional: [],
    timeline: "Per plan (max 12 months typical)"
  },
  "VA Special Forbearance": {
    required: ["Hardship documentation","Signed Forbearance Agreement"],
    conditional: [],
    timeline: "Up to 12 months"
  },
  "VA Traditional Modification": {
    required: ["Hardship affidavit","Income verification (paystubs + W-2s)","Bank statements","Signed Loan Modification Agreement","VA prior approval (VA Form 26-8923)"],
    conditional: [],
    timeline: "VA approval required before execution; allow 30–60 days"
  },
  "VA 30-Year Loan Modification": {
    required: ["Hardship affidavit","Income verification","Signed Loan Modification Agreement"],
    conditional: [],
    timeline: "45 days from approval"
  },
  "VA 40-Year Loan Modification": {
    required: ["Hardship affidavit","Income verification","Signed Loan Modification Agreement"],
    conditional: [],
    timeline: "45 days from approval"
  },
  "VA Compromise Sale": {
    required: ["Hardship affidavit","BRP","Listing agreement","Purchase contract","VA appraisal or BPO","Signed VA Compromise Sale Agreement"],
    conditional: [],
    timeline: "VA prior approval required; 120-day marketing period"
  },
  "VA Deed-in-Lieu": {
    required: ["Hardship affidavit","BRP","Property title report","Signed DIL Agreement","VA prior approval"],
    conditional: [],
    timeline: "VA prior approval required; 45–90 days"
  },
  // FHLMC
  "FHLMC Reinstatement": {
    required: ["Certified funds for reinstatement amount"],
    conditional: [],
    timeline: "Prior to foreclosure"
  },
  "FHLMC Repayment Plan": {
    required: ["Signed Repayment Plan Agreement"],
    conditional: [{doc:"Income verification", condition:"Required if plan exceeds 3 months"}],
    timeline: "Per plan agreement"
  },
  "FHLMC Payment Deferral": {
    required: ["Hardship affidavit"],
    conditional: [],
    timeline: "45 days from approval"
  },
  "Freddie Mac Flex Modification": {
    required: ["Hardship affidavit","Verification of income (BRP)","Bank statements (2 months)","Signed Loan Modification Agreement"],
    conditional: [],
    timeline: "3-month TPP; permanent mod 45 days after"
  },
  "Freddie Mac Streamlined Flex Modification": {
    required: ["Signed Loan Modification Agreement"],
    conditional: [],
    timeline: "3-month TPP; no income docs required"
  },
  "Freddie Mac Short Sale": {
    required: ["Hardship affidavit","BRP","Listing agreement","Executed purchase contract","BPO or appraisal"],
    conditional: [],
    timeline: "120-day marketing period; Freddie Mac approval required"
  },
  "Freddie Mac Deed-in-Lieu": {
    required: ["Hardship affidavit","BRP","Title report","Signed DIL Agreement"],
    conditional: [],
    timeline: "45–90 days; Freddie Mac approval required"
  },
  // FNMA
  "FNMA Reinstatement": {
    required: ["Certified funds"],
    conditional: [],
    timeline: "Prior to foreclosure"
  },
  "FNMA Repayment Plan": {
    required: ["Signed Repayment Plan Agreement"],
    conditional: [{doc:"Income verification", condition:"Required if plan > 3 months"}],
    timeline: "Per plan agreement"
  },
  "FNMA Payment Deferral": {
    required: ["Hardship affidavit"],
    conditional: [],
    timeline: "45 days from approval"
  },
  "Fannie Mae Flex Modification": {
    required: ["Hardship affidavit","Verification of income (BRP)","Bank statements (2 months)","Signed Loan Modification Agreement"],
    conditional: [],
    timeline: "3-month TPP; permanent mod 45 days after"
  },
  "Fannie Mae Flex Modification — Streamlined": {
    required: ["Signed Loan Modification Agreement"],
    conditional: [],
    timeline: "3-month TPP; no income docs required for streamlined"
  },
  "FNMA Short Sale / Mortgage Release": {
    required: ["Hardship affidavit","BRP","Listing agreement","Purchase contract","BPO or appraisal"],
    conditional: [],
    timeline: "120-day marketing period"
  },
  "FNMA Deed-in-Lieu": {
    required: ["Hardship affidavit","BRP","Title report","Signed DIL Agreement"],
    conditional: [],
    timeline: "45–90 days"
  },
};

// ─── OPTION CITATIONS ─────────────────────────────────────────────────────────
const OPTION_CITATIONS: Record<string, string> = {
  // FHA
  "FHA Reinstatement": "ML 2025-06 §IV.A; 24 C.F.R. §203.605",
  "FHA Standalone Partial Claim": "ML 2025-06 §IV.D; 24 C.F.R. §203.414",
  "FHA Payment Deferral": "ML 2025-06 §IV.C; ML 2025-12",
  "FHA 30-Year Standalone Modification": "ML 2025-06 §IV.E; 24 C.F.R. §203.616",
  "FHA 40-Year Combination Modification + Partial Claim": "ML 2025-06 §IV.F; ML 2025-12",
  "Payment Supplement": "ML 2025-06 §IV.G; ML 2025-12",
  "Repayment Plan": "ML 2025-06 §IV.A; HUD Handbook 4000.1 §III.A.2.m",
  "Formal Forbearance": "ML 2025-06 §IV.A; HUD Handbook 4000.1 §III.A.2.l",
  "Special Forbearance – Unemployment": "ML 2025-06 §IV.A; HUD Handbook 4000.1 §III.A.2.n",
  "FHA Disaster Loan Modification": "ML 2025-06 §V; 24 C.F.R. §203.616",
  "FHA Disaster Standalone Partial Claim": "ML 2025-06 §V; 24 C.F.R. §203.414",
  // USDA
  "USDA Informal Forbearance": "RD Instruction 3555-C §3555.302; Final Rule Feb 2025",
  "USDA Informal Repayment Plan": "RD Instruction 3555-C §3555.303",
  "USDA Streamline Modification": "RD Instruction 3555-C §3555.304; Final Rule Feb 2025",
  "USDA Modification + MRA Servicing Plan": "RD Instruction 3555-C §3555.304(d); Final Rule Feb 2025",
  "USDA Standalone Mortgage Recovery Advance (MRA)": "RD Instruction 3555-C §3555.306",
  "USDA Compromise Sale": "RD Instruction 3555-C §3555.307",
  "USDA Deed-in-Lieu": "RD Instruction 3555-C §3555.308",
  // VA
  "VA Reinstatement": "VA M26-4 Ch. 5 §2.A",
  "VA Repayment Plan": "VA M26-4 Ch. 5 §2.B; 38 C.F.R. §36.4319",
  "VA Special Forbearance": "VA M26-4 Ch. 5 §2.C; Circular 26-25-2",
  "VA Traditional Modification": "VA M26-4 Ch. 5 §2.D; 38 C.F.R. §36.4315",
  "VA 30-Year Loan Modification": "VA M26-4 Ch. 5 §2.E; Circular 26-25-2",
  "VA 40-Year Loan Modification": "Circular 26-22-18; Circular 26-25-2 (10% req removed)",
  "VA Compromise Sale": "VA M26-4 Ch. 5 §3.A; 38 C.F.R. §36.4324",
  "VA Deed-in-Lieu": "VA M26-4 Ch. 5 §3.B; 38 C.F.R. §36.4327",
  // FHLMC
  "FHLMC Reinstatement": "Freddie Mac Guide §9202.2",
  "FHLMC Repayment Plan": "Freddie Mac Guide §9203.1",
  "FHLMC Payment Deferral": "Freddie Mac Guide §9204.3; Bulletin 2019-15",
  "Freddie Mac Flex Modification": "Freddie Mac Guide §9206; Bulletin 2026-2",
  "Freddie Mac Streamlined Flex Modification": "Freddie Mac Guide §9206.7",
  "Freddie Mac Short Sale": "Freddie Mac Guide §9208; Bulletin 2026-2",
  "Freddie Mac Deed-in-Lieu": "Freddie Mac Guide §9209",
  // FNMA
  "FNMA Reinstatement": "Fannie Mae Servicing Guide D2-3.2-01",
  "FNMA Repayment Plan": "Fannie Mae Servicing Guide D2-3.2-02",
  "FNMA Payment Deferral": "Fannie Mae Servicing Guide D2-3.2-04; LL 2021-07",
  "Fannie Mae Flex Modification": "Fannie Mae Servicing Guide D2-3.2-06",
  "Fannie Mae Flex Modification — Streamlined": "Fannie Mae Servicing Guide D2-3.2-06 (Streamlined)",
  "FNMA Short Sale / Mortgage Release": "Fannie Mae Servicing Guide D2-3.3-01",
  "FNMA Deed-in-Lieu": "Fannie Mae Servicing Guide D2-3.3-02",
  "FNMA Forbearance Plan": "Fannie Mae Servicing Guide D2-3.2-01",
};
const STANDARD_HARDSHIPS = ["Unemployment","Business Failure","Increase in Housing Expenses","Property Problem","Reduction in Income","Unknown"];

// ─── INITIAL STATE ────────────────────────────────────────────────────────────
const initLoan = {
  loanType:"FHA",
  loanNumber:"", borrowerName:"",
  repayMonths:"24",
  // Financials
  upb:"", originalUpb:"", currentEscrow:"", currentPI:"", currentPITI:"",
  grossMonthlyIncome:"", monthlyExpenses:"", cashReservesAmount:"",
  currentInterestRate:"", pmmsRate:"", modifiedPI:"",
  arrearagesToCapitalize:"", escrowShortage:"", legalFees:"", lateFees:"",
  escrowAdvanceBalance:"", accruedDelinquentInterest:"", suspenseBalance:"",
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
  fhaBorrowerCanResumePreHardship:false, fhaHardshipResolved:false,
  fhaCumulativeDeferredMonths:"0", fhaPriorDeferralMonths:"0",
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
  usdaStep3DeferralRequired:false,
  // FNMA
  fnmaLoanAge:"24",
  fnmaPriorDeferredUPB:"0",
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
  fnmaMortgageType:"Fixed Rate",   // "Fixed Rate" or "ARM"
  fnmaCurrentIndex:"",             // current index rate % (ARM only, e.g. SOFR)
  fnmaMargin:"",                   // margin % (ARM only)
  fnmaQRPCAchieved:false,          // Qualified Right Party Contact achieved
  fnmaFICO:"",                     // FICO score for imminent default Rule 2
  fnmaHousingRatio:"",             // pre-mod housing expense / GMI % for ID Rule 2
  fnmaCashReservesLt3Mo:false,     // cash reserves < 3 months PITIA (ID Rule 1)
  fnmaLongTermHardship:false,      // long-term/permanent hardship (ID Rule 1)
  fnmaPrior30DLQ12Mo:false,        // 2+ 30-day DLQ in past 12 months (ID Rule 2)
  // FHLMC
  fhlmcHardshipResolved:false,
  fhlmcCanResumeFull:false,
  fhlmcImminentDefault:false,
  fhlmcPriorDeferredUPB:"0",
  fhlmcCumulativeDeferredMonths:"0",
  fhlmcPriorDeferralMonths:"0",
  fhlmcLoanAge:"24",
  fhlmcMortgageType:"Conventional", // Conventional, FHA, VA, RHS
  fhlmcRateType:"Fixed Rate",       // "Fixed Rate" or "ARM"
  fhlmcCurrentIndex:"",             // current index rate % (ARM only, e.g. SOFR)
  fhlmcMarginRate:"",               // margin % (ARM only)
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
  const escrowAdv = n(l.escrowAdvanceBalance);
  const accruedInterest = n(l.accruedDelinquentInterest);
  const suspense = n(l.suspenseBalance);
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
  const mat360FromMod = addMonths(newFirstPmt, 360);
  const mat480FromOrig = noteFirstPmt ? addMonths(noteFirstPmt, 480) : null;
  const mat120PastOrig = origMaturity ? addMonths(origMaturity, 120) : null;

  // Target payment
  const target = n(l.targetPayment) || (gmi > 0 ? gmi * 0.31 : 0);

  // 30% statutory PC limit
  const maxPCAmount = originalUpb > 0 ? originalUpb * 0.30 : null;
  const remainingPCAvailable = maxPCAmount != null ? Math.max(0, maxPCAmount - priorPC) : null;

  const opt = optionName;

  // ── Reinstatement ──
  if (opt === "FNMA Reinstatement" || opt === "FHLMC Reinstatement" || opt === "USDA Reinstatement" || opt === "FHA Reinstatement") {
    const totalDue = arrears + legal + lateFees + accruedInterest;
    const netDue = Math.max(0, totalDue - suspense);
    return {
      "Reinstatement Amount (Est.)": fmt$(netDue),
      "  → Past-Due Arrearages": fmt$(arrears),
      "  → Legal / Foreclosure Fees": legal > 0 ? fmt$(legal) : "None",
      "  → Late Fees": lateFees > 0 ? fmt$(lateFees) : "None",
      "  → Accrued Interest": accruedInterest > 0 ? fmt$(accruedInterest) : "None",
      "  → Suspense Offset": suspense > 0 ? fmt$(suspense) : "None",
      "Effect on Loan": "Loan returned to current status — no change to rate, term, or payment",
      "Deadline": "Any time prior to foreclosure sale",
      "Post-Reinstatement": "Borrower retains original loan terms",
    };
  }

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

  // ── FHA 30-Year Standalone Modification (ML 2025-06) ──
  if (opt === "FHA 30-Year Standalone Modification") {
    const fhaModRate = pmms > 0 ? Math.round((pmms + 0.25) / 0.125) * 0.125 : 0;
    const currentPI_calc = n(l.currentPI);
    const target25pct = currentPI_calc > 0 ? (currentPI_calc * 0.75) + currentEscrow : 0;
    const fhaTarget = n(l.targetPayment) || target25pct || target;
    const newMat = mat360FromMod;
    const newPI = fhaModRate > 0 && newUPB > 0 ? calcMonthlyPI(newUPB, fhaModRate, 360) : null;
    const newPITI = newPI != null ? newPI + currentEscrow : null;
    const piReduction = currentPI_calc > 0 && newPI != null ? ((currentPI_calc - newPI) / currentPI_calc * 100).toFixed(1) : null;
    const targetMet = fhaTarget > 0 && newPITI != null ? newPITI <= fhaTarget : null;
    return {
      "Modified Loan Amount (New UPB)": fmt$(newUPB),
      "Capitalized Amount": fmt$(capAmount),
      "  → Arrearages": fmt$(arrears),
      "  → Escrow Shortage": fmt$(escShortage),
      "  → Legal / Foreclosure Fees": fmt$(legal),
      "  → Late Fees (EXCLUDED)": lateFees > 0 ? `${fmt$(lateFees)} — NOT capitalized` : "None",
      "New Interest Rate": fhaModRate > 0 ? fmtPct(fhaModRate)+` (PMMS ${fmtPct(pmms)} + 25bps, rounded to nearest 0.125%)` : "Enter PMMS rate",
      "New Loan Term": "360 months (30 years)",
      "New Monthly P&I": fmt$(newPI),
      "New Monthly Escrow": fmt$(currentEscrow || null),
      "New Monthly PITI": fmt$(newPITI),
      "P&I Reduction": piReduction != null ? `${piReduction}% (${fmt$(currentPI_calc)} → ${fmt$(newPI)})` : "Enter current P&I",
      "Target (25% P&I Reduction)": currentPI_calc > 0 ? `${fmt$(currentPI_calc * 0.75)} P&I + ${fmt$(currentEscrow)} escrow = ${fmt$(target25pct)} PITI` : "Enter current P&I",
      "Target Met?": targetMet == null ? "Enter PMMS rate & current P&I" : targetMet ? "✅ Yes — 25% reduction achieved" : "❌ No — consider 40-Year Combo Mod+PC",
      "New Maturity Date": fmtDate(newMat),
      "New First Payment Date": fmtDate(newFirstPmt),
      "Trial Payment Plan": "3-month TPP at new PITI amount",
      "No Financial Documentation Required": "ML 2025-06 — streamlined review",
      "Authority": "HUD ML 2025-06 / ML 2025-12 — effective October 1, 2025",
    };
  }

  // ── FHA Standalone Partial Claim (ML 2025-06, step 3) ──
  if (opt === "FHA Standalone Partial Claim") {
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
      "First Mortgage Rate": "UNCHANGED — "+fmtPct(currentRate || null),
      "First Mortgage Term": "UNCHANGED",
      "First Mortgage Payment": "UNCHANGED — borrower resumes pre-hardship payment",
      "PC Lien Type": "Non-interest bearing subordinate lien",
      "PC Payoff Trigger": "Due upon sale, refinance, or payoff of first mortgage",
      "Trial Payment Plan": "Not required for Standalone PC",
      "No Financial Documentation Required": "ML 2025-06 — streamlined review",
      "Authority": "HUD ML 2025-06 / ML 2025-12 — effective October 1, 2025",
    };
  }

  // ── FHA Payment Deferral (ML 2025-06, step 4) ──
  if (opt === "FHA Payment Deferral") {
    const currentPITI_calc = n(l.currentPITI);
    const deferMonths = Math.min(Math.max(2, n(l.delinquencyMonths)), 6);
    const cumUsed = n(l.fhaCumulativeDeferredMonths);
    const cumRemaining = Math.max(0, 12 - cumUsed);
    const effectiveDefer = Math.min(deferMonths, cumRemaining);
    const estPIDeferred = n(l.currentPI) > 0 ? effectiveDefer * n(l.currentPI) : null;
    const cumulativeAfter = cumUsed + effectiveDefer;
    return {
      "Deferred Amount (Est.)": estPIDeferred != null ? fmt$(estPIDeferred) : "Enter current P&I",
      "  → Months Deferred": `${effectiveDefer} months (DLQ: ${n(l.delinquencyMonths)}mo; cap remaining: ${cumRemaining}mo)`,
      "  → Escrow Shortage": n(l.escrowShortage) > 0 ? `${fmt$(n(l.escrowShortage))} — NOT deferred; resolved separately` : "None",
      "Cumulative FHA Deferral Cap": `${cumUsed}mo used → ${cumulativeAfter}mo after this deferral / 12-month lifetime cap`,
      "Deferral Per Event": "2–6 months",
      "Spacing Requirement": "≥12 months between FHA deferral events",
      "First Mortgage Rate": "UNCHANGED — "+fmtPct(currentRate || null),
      "First Mortgage Term": "UNCHANGED",
      "Payment After Deferral": currentPITI_calc > 0 ? fmt$(currentPITI_calc)+" — full contractual payment resumes" : "Full contractual payment — no change",
      "Interest on Deferred Balance": "None — non-interest-bearing",
      "Deferred Balance Due": "At maturity, sale, refinance, or payoff",
      "No Financial Documentation Required": "ML 2025-06 — streamlined review",
      "Authority": "HUD ML 2025-06 / ML 2025-12 — effective October 1, 2025",
    };
  }

  // ── FHA 40-Year Combination Modification + Partial Claim (ML 2025-06, step 6) ──
  if (opt === "FHA 40-Year Combination Modification + Partial Claim") {
    const fhaModRate = pmms > 0 ? Math.round((pmms + 0.25) / 0.125) * 0.125 : 0;
    const currentPI_calc = n(l.currentPI);
    const target25pct = currentPI_calc > 0 ? (currentPI_calc * 0.75) + currentEscrow : 0;
    const fhaTarget = n(l.targetPayment) || target25pct || target;
    // Step 1: Capitalize all permissible costs
    const fullNewUPB = upb + capAmount;
    // Step 2: PC deferral to close gap — residual amortized 360 months at mod rate
    const monthlyRate = fhaModRate > 0 ? fhaModRate / 100 / 12 : 0;
    const targetPI = fhaTarget > 0 && currentEscrow >= 0 ? fhaTarget - currentEscrow : null;
    const targetUPB = targetPI != null && targetPI > 0 && monthlyRate > 0
      ? targetPI * ((1 - Math.pow(1 + monthlyRate, -360)) / monthlyRate) : null;
    const pcDeferral = targetUPB != null ? Math.max(0, fullNewUPB - targetUPB) : 0;
    const pcTotal = remainingPCAvailable != null ? Math.min(pcDeferral, remainingPCAvailable) : pcDeferral;
    const pcPctOfOrigUpb = originalUpb > 0 ? ((priorPC + pcTotal) / originalUpb * 100).toFixed(1) : null;
    const pcWithinCap = maxPCAmount != null ? (priorPC + pcTotal) <= maxPCAmount : null;
    // Step 3: Final modified UPB over 480 months at mod rate
    const finalModUPB = fullNewUPB - pcTotal;
    const newMat480 = newFirstPmt ? addMonths(newFirstPmt, 480) : null;
    const newPI = fhaModRate > 0 && finalModUPB > 0 ? calcMonthlyPI(finalModUPB, fhaModRate, 480) : null;
    const newPITI = newPI != null ? newPI + currentEscrow : null;
    const piReduction = currentPI_calc > 0 && newPI != null ? ((currentPI_calc - newPI) / currentPI_calc * 100).toFixed(1) : null;
    const targetMet = fhaTarget > 0 && newPITI != null ? newPITI <= fhaTarget : null;
    return {
      "── Step 1: Capitalize All Permissible Costs ──": "——",
      "Full New UPB (pre-deferral)": fmt$(fullNewUPB),
      "  → Arrearages": fmt$(arrears),
      "  → Escrow Shortage": fmt$(escShortage),
      "  → Legal / Foreclosure Fees": fmt$(legal),
      "  → Late Fees (EXCLUDED)": lateFees > 0 ? `${fmt$(lateFees)} — NOT capitalized` : "None",
      "── Step 2: Partial Claim (Principal Deferral) ──": "——",
      "Target (25% P&I Reduction)": currentPI_calc > 0 ? `${fmt$(currentPI_calc * 0.75)} P&I → target PITI ${fmt$(fhaTarget)}` : fhaTarget > 0 ? `Manual target: ${fmt$(fhaTarget)}` : "Enter current P&I",
      "Target UPB to Achieve Affordability (360mo)": targetUPB != null ? fmt$(targetUPB) : "Enter PMMS rate & current P&I",
      "Principal Deferral Required": pcDeferral > 0 ? fmt$(pcDeferral) : "$0.00 — UPB already at or below target",
      "Prior Partial Claim Balance": fmt$(priorPC),
      "30% Statutory Cap (30% of Orig. UPB)": maxPCAmount != null ? fmt$(maxPCAmount) : "Enter Original UPB",
      "Remaining PC Capacity": remainingPCAvailable != null ? fmt$(remainingPCAvailable) : "Enter Original UPB",
      "Partial Claim Amount": fmt$(pcTotal),
      "Total PC as % of Original UPB": pcPctOfOrigUpb ? pcPctOfOrigUpb+"%" : "Enter Original UPB",
      "PC Within 30% Cap?": pcWithinCap == null ? "Enter Original UPB" : pcWithinCap ? `✅ Yes — ${pcPctOfOrigUpb}% ≤ 30%` : `❌ No — ${pcPctOfOrigUpb}% exceeds 30% cap`,
      "── Step 3: Final Modified Loan Terms ──": "——",
      "Final Modified Loan Amount (New UPB)": fmt$(finalModUPB),
      "New Interest Rate": fhaModRate > 0 ? fmtPct(fhaModRate)+` (PMMS ${fmtPct(pmms)} + 25bps, rounded to nearest 0.125%)` : "Enter PMMS rate",
      "New Loan Term": "480 months (40 years)",
      "New Monthly P&I": fmt$(newPI),
      "New Monthly Escrow": fmt$(currentEscrow || null),
      "New Monthly PITI": fmt$(newPITI),
      "P&I Reduction": piReduction != null ? `${piReduction}% (${fmt$(currentPI_calc)} → ${fmt$(newPI)})` : "Enter current P&I",
      "Target Met?": targetMet == null ? "Enter inputs" : targetMet ? "✅ Yes — 25% reduction achieved" : "❌ No — PC cap insufficient to reach target",
      "New Maturity Date": fmtDate(newMat480),
      "New First Payment Date": fmtDate(newFirstPmt),
      "PC Lien Type": "Non-interest bearing subordinate lien",
      "PC Payoff Trigger": "Due upon sale, refinance, or payoff of first mortgage",
      "Trial Payment Plan": "3-month TPP at new PITI (4 months if imminent default; 6 months if successor-in-interest)",
      "No Financial Documentation Required": "ML 2025-06 — streamlined review",
      "Authority": "HUD ML 2025-06 / ML 2025-12 — effective October 1, 2025",
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

  // ── Payment Supplement (ML 2025-06) ──
  if (opt === "Payment Supplement") {
    const currentPITI = n(l.currentPITI);
    const currentPI_ps = n(l.currentPI);
    const target25pct_ps = currentPI_ps > 0 ? (currentPI_ps * 0.75) + n(l.currentEscrow) : 0;
    const fhaTarget_ps = n(l.targetPayment) || target25pct_ps || (gmi > 0 ? gmi * 0.31 : null);
    const supplementNeeded = fhaTarget_ps != null && currentPITI > 0 ? Math.max(0, currentPITI - fhaTarget_ps) : null;
    const moPR = supplementNeeded != null ? Math.max(20, supplementNeeded) : null; // $20 minimum
    const pctGMI = gmi > 0 && currentPITI > 0 ? (currentPITI / gmi * 100).toFixed(1) : null;
    return {
      "Purpose": "Bridges gap between borrower's affordable payment and full PITI — ML 2025-06",
      "Eligible Borrowers": "All eligible delinquent FHA borrowers (not limited to unemployed)",
      "Current Monthly PITI": fmt$(currentPITI || null),
      "Target (25% P&I Reduction)": currentPI_ps > 0 ? `${fmt$(currentPI_ps * 0.75)} P&I + ${fmt$(n(l.currentEscrow))} escrow = ${fmt$(target25pct_ps)} PITI` : "Enter current P&I",
      "Estimated Monthly Supplement (MoPR)": supplementNeeded != null ? `${fmt$(supplementNeeded)} (min $20.00)` : "Enter PITI & current P&I",
      "Minimum Monthly MoPR": "$20.00",
      "Current PITI as % of GMI": pctGMI ? pctGMI+"%" : "Enter GMI & PITI",
      "Combo Payment ≤ 40% GMI?": gmi > 0 && currentPITI > 0 ? (currentPITI/gmi <= 0.40 ? "✅ Yes" : "❌ No — exceeds 40% cap") : "Enter inputs",
      "Supplement Source": "FHA — paid directly to servicer as monthly partial claim",
      "Maximum Duration": "Up to 36 months",
      "Follow-On": "Permanent loss mitigation option required at or before end of supplement period",
      "Authority": "HUD ML 2025-06 / ML 2025-12 — effective October 1, 2025",
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


  // ── USDA Streamline Loan Modification ──
  if (opt === "USDA Streamline Loan Modification") {
    // Per HB-1-3555 §18.7: rate = lesser of PMMS or current note rate
    const newRate = pmms > 0 && currentRate > 0 ? Math.min(pmms, currentRate) : pmms;
    const rateLabel = newRate > 0
      ? fmtPct(newRate) + (currentRate > 0 && currentRate < pmms ? " (Current Note Rate — below PMMS)" : " (PMMS)")
      : "Enter PMMS rate";
    const newMat480 = newFirstPmt ? addMonths(newFirstPmt, 480) : null;
    // Step 1: re-amortize at new rate over remaining term
    const matStep1 = newFirstPmt && remainingTerm ? addMonths(newFirstPmt, remainingTerm) : null;
    const newPI_existing = newRate > 0 && newUPB > 0 && remainingTerm ? calcMonthlyPI(newUPB, newRate, remainingTerm) : null;
    // Step 2: extend to 480 months
    const newPI_extended = newRate > 0 && newUPB > 0 ? calcMonthlyPI(newUPB, newRate, 480) : null;
    const newPITI_existing = newPI_existing != null ? newPI_existing + currentEscrow : null;
    const newPITI_extended = newPI_extended != null ? newPI_extended + currentEscrow : null;
    const targetMet_existing = target > 0 && newPITI_existing != null ? newPITI_existing <= target : null;
    const targetMet_extended = target > 0 && newPITI_extended != null ? newPITI_extended <= target : null;
    const pctGMI = gmi > 0 && newPITI_extended != null ? (newPITI_extended/gmi*100).toFixed(1) : null;
    // Step 3: principal deferral — defer enough UPB so 480-month P&I hits target
    let step3 = {};
    if (target > 0 && newPITI_extended != null && !targetMet_extended && newRate > 0) {
      const targetPI = Math.max(0, target - currentEscrow);
      const r = newRate / 100 / 12;
      const affordableUPB = r > 0 ? targetPI * (Math.pow(1+r,480) - 1) / (r * Math.pow(1+r,480)) : targetPI * 480;
      const deferralAmt = Math.max(0, newUPB - affordableUPB);
      const step3PI = calcMonthlyPI(affordableUPB, newRate, 480);
      const step3PITI = step3PI != null ? step3PI + currentEscrow : null;
      step3 = {
        "Step 3 — Principal Deferral Required": fmt$(deferralAmt),
        "Step 3 — Modified UPB (after deferral)": fmt$(affordableUPB),
        "Step 3 — New P&I (480mo on reduced balance)": fmt$(step3PI),
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
      "New Interest Rate": rateLabel,
      "  → PMMS Rate": pmms > 0 ? fmtPct(pmms) : "Enter PMMS rate",
      "  → Current Note Rate": currentRate > 0 ? fmtPct(currentRate) : "Enter current rate",
      "  → Rate Applied (lesser)": newRate > 0 ? fmtPct(newRate) : "Enter rates",
      "Step 1 — Existing Term Re-amortization": "——",
      "Step 1 — Remaining Term": remainingTerm ? `${remainingTerm} months` : "Enter Note dates",
      "Step 1 — New P&I / PITI": newPI_existing != null ? fmt$(newPI_existing)+" P&I / "+fmt$(newPITI_existing)+" PITI" : "Enter inputs",
      "Step 1 — Target Met?": targetMet_existing == null ? "Enter inputs" : targetMet_existing ? "✅ Yes — use existing term" : "❌ No — proceed to Step 2",
      "Step 1 — Maturity Date": matStep1 ? fmtDate(matStep1) : "Enter Note dates",
      "Step 2 — Extend to 480 Months": "——",
      "Step 2 — New P&I / PITI (480mo)": newPI_extended != null ? fmt$(newPI_extended)+" P&I / "+fmt$(newPITI_extended)+" PITI" : "Enter inputs",
      "Step 2 — Target Met (480mo)?": target > 0 && newPITI_extended != null ? (targetMet_extended ? "✅ Yes" : "❌ No — proceed to Step 3 (principal deferral)") : "Enter inputs",
      "Step 2 — Maturity Date": fmtDate(newMat480),
      ...step3,
      "Maximum Term": "480 months from First Installment Date of Modification",
      "Final Maturity Date": targetMet_existing ? fmtDate(matStep1)+" (Step 1)" : fmtDate(newMat480)+" (Step 2/3)",
      "New First Payment Date": fmtDate(newFirstPmt),
      "PITI as % of GMI": pctGMI ? pctGMI+"% (target ≤ 31%)" : "Enter GMI",
      "Target Payment (31% GMI)": gmi > 0 ? fmt$(gmi*0.31) : "Enter GMI",
      "Trial Payment Plan": "3 months (4 months if imminent default)",
      "Approval Notification": "2-day mail with enclosed 2-day return envelope",
      "Authority": "HB-1-3555 §18.7; 40-year term authority confirmed by USDA RD Final Rule (eff. Feb 11, 2025)",
    };
  }

  // ── USDA Modification + MRA Servicing Plan (Final Rule — eff. Feb 11, 2025) ──
  if (opt === "USDA Modification + MRA Servicing Plan") {
    const newRate = pmms > 0 && currentRate > 0 ? Math.min(pmms, currentRate) : pmms;
    const rateLabel = newRate > 0
      ? fmtPct(newRate) + (currentRate > 0 && currentRate < pmms ? " (Current Note Rate — below PMMS)" : " (PMMS)")
      : "Enter PMMS rate";
    const newMat480 = newFirstPmt ? addMonths(newFirstPmt, 480) : null;
    const newPI_extended = newRate > 0 && newUPB > 0 ? calcMonthlyPI(newUPB, newRate, 480) : null;
    const newPITI_extended = newPI_extended != null ? newPI_extended + currentEscrow : null;
    // MRA deferral amount: difference between full new UPB and affordable UPB at 480 months
    const targetPI = target > 0 ? Math.max(0, target - currentEscrow) : null;
    const r = newRate > 0 ? newRate / 100 / 12 : 0;
    const affordableUPB = targetPI != null && r > 0 ? targetPI * (Math.pow(1+r,480) - 1) / (r * Math.pow(1+r,480)) : null;
    const mraDeferred = affordableUPB != null ? Math.max(0, newUPB - affordableUPB) : null;
    const maxMRA = originalUpb > 0 ? originalUpb * 0.30 : null;
    const mraCapOK = maxMRA != null && mraDeferred != null ? (priorPC + mraDeferred) <= maxMRA : null;
    const finalModUPB = affordableUPB;
    const finalPI = finalModUPB != null && newRate > 0 ? calcMonthlyPI(finalModUPB, newRate, 480) : null;
    const finalPITI = finalPI != null ? finalPI + currentEscrow : null;
    return {
      "Purpose": "Loan modification cannot achieve PITI target alone — MRA defers principal to close gap (Step 3)",
      "── Step 1–2: Modification ──": "——",
      "Modified Loan Amount (New UPB)": fmt$(newUPB),
      "New Interest Rate": rateLabel,
      "Step 2 — 480mo P&I / PITI (before deferral)": newPI_extended != null ? `${fmt$(newPI_extended)} / ${fmt$(newPITI_extended)}` : "Enter inputs",
      "Target (31% GMI)": gmi > 0 ? fmt$(gmi*0.31) : "Enter GMI",
      "Target Met at 480mo without MRA?": newPITI_extended != null && target > 0 ? (newPITI_extended <= target ? "✅ Yes — use Streamline Mod instead" : "❌ No — proceed to MRA deferral") : "Enter inputs",
      "── Step 3: MRA Principal Deferral ──": "——",
      "Affordable UPB at Target Payment (480mo)": affordableUPB != null ? fmt$(affordableUPB) : "Enter rate, GMI/target",
      "MRA Principal Deferral Required": mraDeferred != null ? fmt$(mraDeferred) : "Enter inputs",
      "Prior MRA Balance": fmt$(priorPC),
      "Maximum MRA (30% of Original UPB)": maxMRA != null ? fmt$(maxMRA) : "Enter Original UPB",
      "MRA Within 30% Cap?": mraCapOK == null ? "Enter Original UPB" : mraCapOK ? "✅ Yes" : "❌ No — exceeds cap",
      "── Final Modified Loan ──": "——",
      "Final Modified UPB (after MRA deferral)": finalModUPB != null ? fmt$(finalModUPB) : "Enter inputs",
      "New Loan Term": "480 months (40 years)",
      "Final P&I / PITI": finalPI != null ? `${fmt$(finalPI)} / ${fmt$(finalPITI)}` : "Enter inputs",
      "New Maturity Date": fmtDate(newMat480),
      "New First Payment Date": fmtDate(newFirstPmt),
      "MRA Lien Type": "Non-interest bearing subordinate lien; due on sale, refinance, or payoff",
      "Trial Payment Plan": "3 months (4 months if imminent default)",
      "Authority": "HB-1-3555 §18.7; USDA RD Final Rule (eff. Feb 11, 2025) — Modification MRA Servicing Plan",
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
    // Per HB-1-3555: rate = lesser of PMMS or current note rate
    const newRate = pmms > 0 && currentRate > 0 ? Math.min(pmms, currentRate) : pmms;
    const rateLabel = newRate > 0
      ? fmtPct(newRate) + (currentRate > 0 && currentRate < pmms ? " (Current Note Rate — below PMMS)" : " (PMMS)")
      : "Enter PMMS rate";
    const newMat480 = newFirstPmt ? addMonths(newFirstPmt, 480) : null;
    const newPI_360 = newRate > 0 && newUPB > 0 ? calcMonthlyPI(newUPB, newRate, 360) : null;
    const newPI_480 = newRate > 0 && newUPB > 0 ? calcMonthlyPI(newUPB, newRate, 480) : null;
    const newPITI_360 = newPI_360 != null ? newPI_360 + currentEscrow : null;
    const newPITI_480 = newPI_480 != null ? newPI_480 + currentEscrow : null;
    const targetMet_360 = target > 0 && newPITI_360 != null ? newPITI_360 <= target : null;
    return {
      "Modified Loan Amount (New UPB)": fmt$(newUPB),
      "Capitalized Amount": fmt$(capAmount),
      "  → All Arrearages": fmt$(arrears),
      "  → Escrow Shortage": fmt$(escShortage),
      "  → Legal / Foreclosure Fees": fmt$(legal),
      "  → Late Fees (EXCLUDED)": lateFees > 0 ? `${fmt$(lateFees)} — NOT capitalized` : "None",
      "New Interest Rate": rateLabel,
      "New Loan Term — 360mo P&I / PITI": newPI_360 != null ? fmt$(newPI_360)+" / "+fmt$(newPITI_360) : "Enter inputs",
      "360mo Target Met?": targetMet_360 == null ? "Enter inputs" : targetMet_360 ? "✅ Yes — use 360mo term" : "❌ No — extend to 480mo",
      "New Loan Term — 480mo P&I / PITI": newPI_480 != null ? fmt$(newPI_480)+" / "+fmt$(newPITI_480) : "Enter inputs",
      "New Maturity Date": targetMet_360 ? fmtDate(mat360FromMod)+" (360mo)" : fmtDate(newMat480)+" (480mo)",
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
    const rppMonths = Math.min(12, Math.max(1, n(l.repayMonths) || 6));
    const catchUp = totalArrears > 0 ? totalArrears / rppMonths : null;
    const total = catchUp != null ? currentPITI + catchUp : null;
    return {
      "Current Monthly PITI": fmt$(currentPITI || null),
      "Total Arrearages": fmt$(totalArrears || null),
      "Plan Length": `${rppMonths} months (max 12 per HB-1-3555 §18.4)`,
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
      "Forbearance Duration": opt === "USDA Disaster Forbearance" ? "3-month increments, reviewed monthly" : "Up to 12 months total (HB-1-3555 §18.5); extended in 3-month increments",
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
    const totalDue = totalArrears + legal + lateFees + accruedInterest;
    const netDue = Math.max(0, totalDue - suspense);
    return {
      "Reinstatement Amount (Est. Total Due)": fmt$(netDue),
      "  → Past-Due Arrearages (P&I + Escrow)": fmt$(totalArrears || null),
      "  → Legal / Foreclosure Fees": legal > 0 ? fmt$(legal) : "None",
      "  → Late Fees": lateFees > 0 ? fmt$(lateFees)+" (per servicer policy)" : "None",
      "  → Accrued Delinquent Interest": accruedInterest > 0 ? fmt$(accruedInterest) : "None",
      "  → Suspense / Unapplied Funds Offset": suspense > 0 ? fmt$(suspense) : "None",
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
      "Note": "Servicer determines plan length; confirm affordability per VA M26-4 §5.02",
      "First Post-Plan Payment": fmtDate(addMonths(effDate, planMonths + 1)),
    };
  }

  // ── VA Traditional / 30-Year / 40-Year Mod ──
  if (opt === "VA Traditional Modification" || opt === "VA 30-Year Loan Modification" || opt === "VA 40-Year Loan Modification") {
    const is40yr = opt === "VA 40-Year Loan Modification";
    const isTraditional = opt === "VA Traditional Modification";
    const termMonths = is40yr ? 480 : 360;
    // Per Circular 26-21-12: PMMS rounded UP to nearest 0.125% for all VA modifications
    const roundedPMMS = pmms > 0 ? Math.ceil(pmms * 8) / 8 : pmms;
    const rateToUse = isTraditional ? currentRate : roundedPMMS;

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

    // Use only the explicitly entered original UPB — never fall back to current UPB for VA cap checks
    const enteredOrigUpb = n(l.originalUpb);

    // Arrearages 25% cap — applies to 30-year and Traditional only (Circular 26-22-18 removes this for 40-year)
    const arrearsPct = enteredOrigUpb > 0 ? (capAmount / enteredOrigUpb * 100).toFixed(1) : null;
    const arrearsCheck = arrearsPct != null ? parseFloat(arrearsPct) <= 25 : null;

    // UPB cap — 30-year/Traditional: new UPB must not exceed original UPB
    // 40-year: no restriction — Circular 26-22-18 explicitly allows new UPB to exceed original
    const ubpCheck = enteredOrigUpb > 0 ? newUPB <= enteredOrigUpb : null;

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
        : { "  UPB ≤ Original UPB?": ubpCheck == null ? "Enter Original UPB" : (ubpCheck ? `✅ Yes — ${fmt$(newUPB)} ≤ ${fmt$(enteredOrigUpb)}` : `❌ No — ${fmt$(newUPB)} exceeds ${fmt$(enteredOrigUpb)}`) }
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
        ? fmtPct(rateToUse) + (isTraditional ? " (negotiated — VA approval required)" : " (PMMS rounded up to nearest 0.125% — Circular 26-21-12)")
        : (isTraditional ? "Enter negotiated rate" : "Enter PMMS rate"),
      ...(!isTraditional && pmms > 0 ? {"  → PMMS (raw)": fmtPct(pmms), "  → PMMS (rounded up ⅛%)": fmtPct(roundedPMMS)} : {}),
      "New Loan Term": termMonths+" months ("+(termMonths/12)+" years)",
      "New Monthly P&I": fmt$(newPI),
      "New Monthly Escrow": fmt$(currentEscrow || null),
      "New Monthly PITI": fmt$(newPITI),
      ...(is40yr
        ? {
            "P&I Reduction (Informational)": piReductionPct != null ? piReductionPct.toFixed(1)+"% reduction — note: 10% minimum removed by Circular 26-25-2" : "Enter current P&I",
            "Payment Relief Achieved?": piReductionPct != null ? (piReductionPct > 0 ? `✅ Yes — ${piReductionPct.toFixed(1)}% reduction (${fmt$(currentPI_val)} → ${fmt$(newPI)})` : `⚠️ No reduction — review terms`) : "Enter current P&I",
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
      "⚠️ Program Status": "VASP DISCONTINUED May 1, 2025 (Circular 26-25-2). Historical reference only.",
      "New Partial Claim Authority": "VA Home Loan Program Reform Act (signed July 30, 2025) authorized a new VA partial claim program. Implementation guidance PENDING — do not use until VA issues regulatory/guidance update.",
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
    const currentPI_val = n(l.currentPI);
    const fhlmcDeferMonths = Math.min(dlqMonths, 6);
    const estPIForbearance = currentPI_val > 0 ? fhlmcDeferMonths * currentPI_val : null;
    const estTotalForbearance = estPIForbearance != null ? estPIForbearance + escrowAdv : null;
    const estNetForbearance = estTotalForbearance != null ? Math.max(0, estTotalForbearance - suspense) : null;
    return {
      "Deferred Amount (Est.)": estTotalForbearance != null ? fmt$(estTotalForbearance) : fmt$(arrears),
      "  → Est. P&I Payments Deferred": estPIForbearance != null ? `${fmt$(estPIForbearance)} (${fhlmcDeferMonths} months × ${fmt$(currentPI_val)})` : `Up to ${fhlmcDeferMonths} months`,
      "  → Escrow Advances (servicer third-party)": escrowAdv > 0 ? fmt$(escrowAdv) : "$0.00 — enter escrow advance balance if applicable",
      "  → Suspense / Unapplied Funds": suspense > 0 ? `${fmt$(suspense)} offset → net ${estNetForbearance != null ? fmt$(estNetForbearance) : "N/A"}` : "$0.00",
      "  → Escrow Shortage": escShortage > 0 ? `${fmt$(escShortage)} — NOT deferred; spread over escrow analysis` : "None",
      "Cumulative Cap (Non-Disaster)": `12-month lifetime cap (non-disaster); ${n(l.fhlmcCumulativeDeferredMonths)}mo used + ${Math.min(dlqMonths, 6)}mo this deferral = ${n(l.fhlmcCumulativeDeferredMonths) + Math.min(dlqMonths, 6)}mo total; prior non-disaster deferral must be ≥ 12 months ago`,
      "Interest on Deferred Balance": "None — non-interest-bearing",
      "Deferred Balance Due": "At maturity, sale/transfer, refinance, or payoff",
      "First Payment After Deferral": "Full contractual monthly payment",
      "Late Charges": "Waived upon completion",
      "Administrative Fees": "None",
      "Servicer Compensation": "$500 incentive (subject to $1,000 combined cap per mortgage)",
      "Authority": "Freddie Mac Single-Family Guide §9203.4 (02/11/26)",
    };
  }
  // ── FHLMC Disaster Payment Deferral ──
  if (opt === "FHLMC Disaster Payment Deferral") {
    const currentPI_val = n(l.currentPI);
    const fhlmcDisDeferMonths = Math.min(dlqMonths, 12);
    const estPIForbearance = currentPI_val > 0 ? fhlmcDisDeferMonths * currentPI_val : null;
    const estTotalForbearance = estPIForbearance != null ? estPIForbearance + escrowAdv : null;
    const estNetForbearance = estTotalForbearance != null ? Math.max(0, estTotalForbearance - suspense) : null;
    return {
      "Deferred Amount (Est.)": estTotalForbearance != null ? fmt$(estTotalForbearance) : fmt$(arrears),
      "  → Est. P&I Payments Deferred": estPIForbearance != null ? `${fmt$(estPIForbearance)} (${fhlmcDisDeferMonths} months × ${fmt$(currentPI_val)})` : `Up to ${fhlmcDisDeferMonths} months`,
      "  → Escrow Advances (servicer third-party)": escrowAdv > 0 ? fmt$(escrowAdv) : "$0.00",
      "  → Suspense / Unapplied Funds": suspense > 0 ? `${fmt$(suspense)} offset → net ${estNetForbearance != null ? fmt$(estNetForbearance) : "N/A"}` : "$0.00",
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
    const fhlmcPriorDeferred = n(l.fhlmcPriorDeferredUPB);
    const fhlmcPreWorkoutUPB = upb + fhlmcPriorDeferred;
    const flexNewUPB = fhlmcPreWorkoutUPB + arrears + legal;
    const currentPI_val = n(l.currentPI);
    const propValue = n(l.fhlmcPropertyValue);
    const fmModRate = n(l.fhlmcPostedModRate) || n(l.pmmsRate); // FM posted mod rate
    // MTMLTV with post-capitalized UPB
    const mtmltv = propValue > 0 && flexNewUPB > 0 ? (flexNewUPB / propValue * 100) : null;
    // Step 2: Preliminary Rate (§9206.6)
    // Fixed-rate: preliminary rate = current note rate (no change)
    // ARM: preliminary rate = lower of current note rate OR fully-indexed rate (index + margin, nearest 0.125%)
    const fhlmcIsARM = (l.fhlmcRateType || "Fixed Rate") === "ARM";
    const fhlmcIndex = n(l.fhlmcCurrentIndex);
    const fhlmcMarginVal = n(l.fhlmcMarginRate);
    const fhlmcFullyIndexed = fhlmcIsARM && fhlmcIndex > 0 && fhlmcMarginVal > 0 ? Math.round((fhlmcIndex + fhlmcMarginVal) * 8) / 8 : null;
    const fhlmcPrelimRate = fhlmcIsARM && fhlmcFullyIndexed != null ? Math.min(currentRate, fhlmcFullyIndexed) : currentRate;
    // Escrow shortage 60-month spread (§9206.6: not capitalizable, spread over analysis period)
    const fhlmcEscShortageSpread = escShortage > 0 ? escShortage / 60 : 0;
    // Step 3: Interest rate relief — per §9206.6, only if MTMLTV ≥ 80%
    const canReduceRate = mtmltv == null || mtmltv >= 80;
    const rateFloor = fmModRate > 0 ? fmModRate : null;
    // Step 4: Term extension to 480 months from modification effective date
    // Step 5: Principal forbearance — per §9206.6, only if MTMLTV > 80%, up to 30% of post-cap UPB
    const canForbearPrincipal = mtmltv == null || mtmltv > 80;
    const maxForbearance = flexNewUPB * 0.30;
    // Target: P&I reduction EXCEEDING 20%
    const target20Plus = currentPI_val > 0 ? currentPI_val * 0.799 : null; // just under 80% = just over 20% reduction
    // Step 1 → re-amortize at preliminary rate for remaining term
    const step1PI = remainingTerm && fhlmcPrelimRate > 0 && flexNewUPB > 0 ? calcMonthlyPI(flexNewUPB, fhlmcPrelimRate, remainingTerm) : null;
    // Step 3 → rate reduced to floor, remaining term (compare against preliminary rate, not note rate)
    const step3PI = remainingTerm && rateFloor && rateFloor < fhlmcPrelimRate && flexNewUPB > 0 ? calcMonthlyPI(flexNewUPB, rateFloor, remainingTerm) : null;
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
      stepApplied2 = fhlmcIsARM ? "Step 1 (re-amortize at preliminary rate — lower of note/fully-indexed, remaining term) — >20% target met" : "Step 1 (re-amortize at current rate, remaining term) — >20% target met";
      achievedPI = step1PI; achievedRate2 = fhlmcPrelimRate; achievedTerm2 = remainingTerm || 360;
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
    const achievedPITI2 = achievedPI != null ? achievedPI + escrow + fhlmcEscShortageSpread : null;
    const piReductionPct2 = currentPI_val > 0 && achievedPI != null ? (currentPI_val - achievedPI) / currentPI_val * 100 : null;
    // Per §9206.6: 480-month term measured from modification effective date (not original note date)
    const newMat480fhlmc = addMonths(effDate, 480);
    const newMatFHLMC = achievedTerm2 === 480 ? newMat480fhlmc : addMonths(effDate, achievedTerm2);
    const piEligible = achievedPI != null && currentPI_val > 0 && achievedPI <= currentPI_val;
    const isStreamlined = opt.includes("Streamlined");
    const isDisaster = opt.includes("Disaster");
    return {
      "Modification Type": `Freddie Mac Flex Modification® — ${isStreamlined ? "Streamlined (No BRP)" : isDisaster ? "Disaster Eligibility" : "Standard (Full BRP)"}`,
      "Step Applied": stepApplied2 || "—",
      "Pre-Workout UPB": fhlmcPriorDeferred > 0 ? `${fmt$(fhlmcPreWorkoutUPB)} (servicer UPB ${fmt$(upb)} + prior deferred ${fmt$(fhlmcPriorDeferred)})` : fmt$(upb),
      "Capitalized Amount": fmt$(arrears + legal),
      "  → Delinquent Accrued Interest / Arrearages": fmt$(arrears),
      "  → Foreclosure/Legal Costs": fmt$(legal),
      "  → Escrow Shortage (NOT capitalizable)": escShortage > 0 ? `${fmt$(escShortage)} — spread over 60 months (min 12 months)` : "None",
      "  → Late Fees (NOT capitalizable)": lateFees > 0 ? `${fmt$(lateFees)} — NOT capitalized` : "None",
      "New UPB (Post-Capitalization)": fmt$(flexNewUPB),
      "Post-Mod MTMLTV": mtmltv != null ? `${mtmltv.toFixed(1)}% (${fmt$(flexNewUPB)} / ${fmt$(propValue)})` : "Enter property value for MTMLTV",
      "FM Posted Modification Rate (Floor)": rateFloor != null ? fmtPct(rateFloor) : "Enter FM posted mod rate",
      "Loan Type": fhlmcIsARM ? "Adjustable Rate Mortgage (ARM)" : "Fixed Rate Mortgage",
      ...(fhlmcIsARM ? {
        "  → ARM Current Index Rate": fhlmcIndex > 0 ? fmtPct(fhlmcIndex) : "Enter current index rate",
        "  → ARM Margin": fhlmcMarginVal > 0 ? fmtPct(fhlmcMarginVal) : "Enter margin",
        "  → ARM Fully-Indexed Rate (nearest 0.125%)": fhlmcFullyIndexed != null ? fmtPct(fhlmcFullyIndexed) : "Enter index and margin",
      } : {}),
      "Step 2 (Preliminary Rate)": fhlmcIsARM
        ? `${fmtPct(fhlmcPrelimRate)} — ${fhlmcFullyIndexed != null && fhlmcFullyIndexed < currentRate ? "fully-indexed rate (lower than note rate)" : "current note rate (lower than fully-indexed)"}`
        : "Fixed-rate loan — preliminary rate equals current note rate (no change in Step 2)",
      "Rate Relief Applied? (Step 3)": canReduceRate ? (rateFloor && rateFloor < currentRate ? `✅ Yes — MTMLTV ${mtmltv != null ? mtmltv.toFixed(1)+"%" : "(unknown)"} ≥ 80% (§9206.6)` : "Rate already at or below FM posted rate") : `❌ No — MTMLTV ${mtmltv != null ? mtmltv.toFixed(1)+"%" : "unknown"} < 80% required (§9206.6)`,
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
      ...(fhlmcEscShortageSpread > 0 ? { "  → Escrow Shortage Monthly Spread (÷60)": fmt$(fhlmcEscShortageSpread) + ` — from ${fmt$(escShortage)} shortage spread over 60 months` } : {}),
      "  → Total Monthly Escrow (incl. shortage spread)": fhlmcEscShortageSpread > 0 ? fmt$(escrow + fhlmcEscShortageSpread) : "No shortage",
      "New Monthly PITI": fmt$(achievedPITI2),
      "P&I Reduction": piReductionPct2 != null ? `${piReductionPct2.toFixed(1)}% (${fmt$(currentPI_val)} → ${fmt$(achievedPI)})` : "Enter current P&I",
      "P&I Reduction > 20%? (Target)": piReductionPct2 != null ? (piReductionPct2 > 20 ? `✅ Yes — ${piReductionPct2.toFixed(1)}%` : `⚠️ No (${piReductionPct2.toFixed(1)}%) — still offer if new P&I ≤ pre-mod P&I`) : "Enter current P&I",
      "New P&I ≤ Pre-Mod P&I? (Minimum Requirement)": piEligible ? `✅ Yes — eligible to offer` : (achievedPI != null && currentPI_val > 0 ? `❌ No — modification cannot be offered` : "Enter current P&I"),
      "New Maturity Date": fmtDate(newMatFHLMC),
      "  → Maturity Basis": achievedTerm2 === 480 ? "480 months from modification effective date (§9206.6)" : "Re-amortized over remaining loan term",
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
      "Prior Retention Evaluation": "NOT required — Bulletin 2026-2 eliminated the requirement to evaluate home retention options before approving a short sale",
      "Borrower Deficiency": "May be waived per Freddie Mac guidelines",
      "Relocation Assistance": "May be available per current Freddie Mac guidelines",
      "MI Claim": "Servicer provides claim documentation to MI within 60 days of short sale",
      "Servicer Compensation": "$2,200 incentive",
      "Authority": "Freddie Mac Single-Family Guide §9208; Bulletin 2026-2 (prior retention evaluation requirement removed)",
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
      "QRPC Status": l.fnmaQRPCAchieved ? "✅ Achieved — proceed with standard forbearance plan" : "⚠️ Not yet achieved — disaster forbearance (≤3mo) may proceed without QRPC per D2-3.2-01; standard plans require QRPC",
      "QRPC Requirement": "Qualified Right Party Contact required before establishing non-disaster forbearance plans > 3 months",
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
    const currentPI_val = n(l.currentPI);
    const deferMonths = Math.min(n(l.delinquencyMonths), 6);
    const cumUsed = n(l.fnmaCumulativeDeferredMonths);
    const cumRemaining = Math.max(0, 12 - cumUsed);
    const effectiveDeferMonths = Math.min(deferMonths, cumRemaining);
    // Estimated total P&I forbearance = delinquent months × P&I (SMDU approach)
    const estPIForbearance = currentPI_val > 0 ? effectiveDeferMonths * currentPI_val : null;
    // Total forbearance = P&I payments + escrow advances
    const estTotalForbearance = estPIForbearance != null ? estPIForbearance + escrowAdv : null;
    // Net deferred amount after any suspense/unapplied funds offset
    const estNetForbearance = estTotalForbearance != null ? Math.max(0, estTotalForbearance - suspense) : null;
    // Post-workout UPB = UPB minus the principal component of deferred P&I payments
    const monthlyRate = currentRate > 0 ? currentRate / 100 / 12 : 0;
    let estDeferredPrincipal = 0;
    let runningUPB = upb;
    for (let i = 0; i < effectiveDeferMonths; i++) {
      const intPortion = runningUPB * monthlyRate;
      const prinPortion = currentPI_val > 0 ? Math.max(0, currentPI_val - intPortion) : 0;
      estDeferredPrincipal += prinPortion;
      runningUPB -= prinPortion;
    }
    const estDeferredInterest = estPIForbearance != null ? estPIForbearance - estDeferredPrincipal : null;
    const estPostWorkoutUPB = upb - estDeferredPrincipal;
    const cumulativeAfter = cumUsed + effectiveDeferMonths;
    const hasPI = currentPI_val > 0 && currentRate > 0;
    return {
      "Deferred Amount — Est. Total Forbearance": estTotalForbearance != null ? fmt$(estTotalForbearance) : "Enter current P&I",
      "  → Est. Deferred P&I": estPIForbearance != null ? `${fmt$(estPIForbearance)} (${effectiveDeferMonths} months × ${fmt$(currentPI_val)})` : "Enter current P&I",
      "  → Est. Deferred Principal": hasPI ? fmt$(estDeferredPrincipal) : "Enter P&I and rate",
      "  → Est. Deferred Interest": hasPI && estDeferredInterest != null ? fmt$(estDeferredInterest) : "Enter P&I and rate",
      "  → Escrow Advances Deferred": escrowAdv > 0 ? fmt$(escrowAdv) : "$0.00 — enter escrow advance balance if applicable",
      "  → Suspense / Unapplied Funds": suspense > 0 ? `${fmt$(suspense)} offset → net forbearance ${estNetForbearance != null ? fmt$(estNetForbearance) : "N/A"}` : "$0.00",
      "  → Months Deferred": `${effectiveDeferMonths} months (DLQ: ${deferMonths}mo; cap remaining: ${cumRemaining}mo)`,
      "  → Escrow Shortage": escShortage > 0 ? `${fmt$(escShortage)} — repaid over 60-month escrow analysis (NOT deferred)` : "None",
      "Post-Workout UPB (Est.)": hasPI ? fmt$(estPostWorkoutUPB) : "Enter P&I and rate",
      "P&I Payment After Deferral": currentPI_val > 0 ? `${fmt$(currentPI_val)} — UNCHANGED (no modification to rate, term, or payment)` : "Full contractual monthly payment — no change",
      "Cumulative Cap": `${cumUsed} months used → ${cumulativeAfter} after this deferral / 12-month lifetime cap (disaster deferrals excluded)`,
      "Interest on Deferred Balance": "None — non-interest-bearing balance",
      "Deferred Balance Due": "At maturity, sale/transfer, refinance, or payoff of interest-bearing UPB",
      "Late Charges": "All waived upon completion",
      "Post-Deferral Default Risk": "If 60-day DLQ within 6 months → evaluate for Flex Modification by 75th DLQ day",
      "Authority": "Fannie Mae Servicing Guide D2-3.2-04 (08/13/2025)",
    };
  }
  // ── FNMA Disaster Payment Deferral ──
  if (opt === "FNMA Disaster Payment Deferral") {
    const currentPI_val = n(l.currentPI);
    const deferMonths = Math.min(n(l.delinquencyMonths), 12);
    const estPIForbearance = currentPI_val > 0 ? deferMonths * currentPI_val : null;
    const estTotalForbearance = estPIForbearance != null ? estPIForbearance + escrowAdv : null;
    const estNetForbearance = estTotalForbearance != null ? Math.max(0, estTotalForbearance - suspense) : null;
    return {
      "Deferred Amount (Est.)": estTotalForbearance != null ? fmt$(estTotalForbearance) : fmt$(arrears),
      "  → Est. P&I Payments Deferred": estPIForbearance != null ? `${fmt$(estPIForbearance)} (${deferMonths} months × ${fmt$(currentPI_val)})` : `Up to ${deferMonths} months`,
      "  → Escrow Advances Deferred": escrowAdv > 0 ? fmt$(escrowAdv) : "$0.00",
      "  → Suspense / Unapplied Funds": suspense > 0 ? `${fmt$(suspense)} offset → net ${estNetForbearance != null ? fmt$(estNetForbearance) : "N/A"}` : "$0.00",
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
  if (opt === "Fannie Mae Flex Modification" || opt === "Fannie Mae Flex Modification (Disaster)" || opt === "Fannie Mae Flex Modification (Streamlined)") {
    // Flex Mod: prior deferred balance + servicer UPB = SMDU pre-workout UPB; arrearages + legal fees capitalized; escrow shortage NOT capitalized
    const priorDeferredUPB = n(l.fnmaPriorDeferredUPB);
    const preWorkoutUPB = upb + priorDeferredUPB; // SMDU pre-workout UPB (servicer UPB + prior deferred balance)
    const flexNewUPB = preWorkoutUPB + arrears + legal; // post-capitalization UPB
    const currentPI_val = n(l.currentPI);
    // ARM Preliminary Rate (Step 1 per D2-3.2-06): For ARMs, use lower of current note rate or fully-indexed rate (index + margin, nearest 0.125%)
    const fnmaMortgageType = l.fnmaMortgageType || "Fixed Rate";
    const isARM = fnmaMortgageType === "ARM";
    const fnmaIndex = n(l.fnmaCurrentIndex);
    const fnmaMarginVal = n(l.fnmaMargin);
    const fullyIndexedRate = isARM && fnmaIndex > 0 && fnmaMarginVal > 0 ? Math.round((fnmaIndex + fnmaMarginVal) * 8) / 8 : null;
    const preliminaryRate = isARM && fullyIndexedRate != null ? Math.min(currentRate, fullyIndexedRate) : currentRate;
    // Escrow shortage 60-month spread (per D2-3.2-06: spread over escrow analysis, not capitalized)
    const escShortageMonthlySpread = escShortage > 0 ? escShortage / 60 : 0;
    const floorRate = pmms > 0 ? Math.max(pmms - 0.50, 4.625) : 4.625;
    // Rate can only be REDUCED — never increased. If current rate < floor, rate stays at current.
    const effectiveRate = currentRate > 0 ? Math.min(floorRate, currentRate) : floorRate;
    const rateAtFloor = currentRate > 0 && currentRate <= floorRate;
    // Step 1: Re-amortize at preliminary rate for remaining term (for ARMs: lower of note rate / fully-indexed rate)
    const step1PI = remainingTerm && preliminaryRate > 0 && flexNewUPB > 0 ? calcMonthlyPI(flexNewUPB, preliminaryRate, remainingTerm) : null;
    // Step 2: Rate reduced to effective rate (min of floor and current), same remaining term
    const step2PI = remainingTerm && effectiveRate > 0 && flexNewUPB > 0 ? calcMonthlyPI(flexNewUPB, effectiveRate, remainingTerm) : null;
    // Step 3: Extend term to 480 months at effective rate
    const step3PI = effectiveRate > 0 && flexNewUPB > 0 ? calcMonthlyPI(flexNewUPB, effectiveRate, 480) : null;
    // Target: 20% reduction from pre-mod P&I
    const targetPI20 = currentPI_val > 0 ? currentPI_val * 0.80 : null;
    // Step 4: Principal Forbearance — applied when steps 1–3 fail to achieve 20% reduction
    // Forbearance = UPB needed to reach target at step3 terms; capped at 30% of post-cap UPB
    const r480 = effectiveRate / 100 / 12;
    const factor480 = r480 > 0 ? (r480 * Math.pow(1+r480, 480)) / (Math.pow(1+r480, 480) - 1) : (1/480);
    const targetUPBForPF = targetPI20 != null && factor480 > 0 ? targetPI20 / factor480 : null;
    const rawForbearance = targetUPBForPF != null ? Math.max(0, flexNewUPB - targetUPBForPF) : null;
    const maxForbearance = flexNewUPB * 0.30;
    const principalForbearance = rawForbearance != null ? Math.min(rawForbearance, maxForbearance) : null;
    const step4UPB = principalForbearance != null ? flexNewUPB - principalForbearance : null;
    const step4PI = step4UPB != null && effectiveRate > 0 ? calcMonthlyPI(step4UPB, effectiveRate, 480) : null;
    // Determine which step is applied
    let stepApplied = "", achievedRate = currentRate, achievedTerm = remainingTerm || 360, achievedPI = step1PI;
    let appliedForbearance = 0;
    let interestBearingUPB = flexNewUPB;
    if (step1PI != null && targetPI20 != null && step1PI <= targetPI20) {
      stepApplied = isARM ? "Step 1: Re-amortize at preliminary rate (lower of note rate/fully-indexed) — 20% target met" : "Step 1: Re-amortize at current rate — 20% target met";
      achievedRate = preliminaryRate; achievedTerm = remainingTerm || 360; achievedPI = step1PI;
    } else if (step2PI != null && targetPI20 != null && step2PI <= targetPI20) {
      stepApplied = rateAtFloor ? "Step 2: Rate stays at current (already at/below floor) — 20% target met" : "Step 2: Rate reduced to floor rate — 20% target met";
      achievedRate = effectiveRate; achievedTerm = remainingTerm || 360; achievedPI = step2PI;
    } else if (step3PI != null && targetPI20 != null && step3PI <= targetPI20) {
      stepApplied = "Step 3: Term extended to 480 months — 20% target met";
      achievedRate = effectiveRate; achievedTerm = 480; achievedPI = step3PI;
    } else if (step4PI != null) {
      achievedRate = effectiveRate; achievedTerm = 480;
      appliedForbearance = principalForbearance ?? 0;
      interestBearingUPB = step4UPB ?? flexNewUPB;
      achievedPI = step4PI;
      if (rawForbearance != null && principalForbearance != null && rawForbearance > maxForbearance) {
        stepApplied = "Step 4: Principal Forbearance (30% cap applied — full 20% target may not be achieved)";
      } else {
        stepApplied = "Step 4: Principal Forbearance applied — 20% target met";
      }
    } else {
      stepApplied = "Enter loan data for step analysis";
      achievedRate = effectiveRate; achievedTerm = 480; achievedPI = step3PI;
    }
    const achievedPITI = achievedPI != null ? achievedPI + escrow + escShortageMonthlySpread : null;
    const piReductionPct = currentPI_val > 0 && achievedPI != null ? (currentPI_val - achievedPI) / currentPI_val * 100 : null;
    // Per D2-3.2-06: 480-month term is measured from the modified loan's first payment due date
    const newMat480 = addMonths(newFirstPmt, 480);
    const newMatStd = addMonths(effDate, achievedTerm);
    const newMaturity = achievedTerm === 480 ? newMat480 : newMatStd;
    const tppMonths = dlqMonths >= 1 ? "3-month TPP (31+ days DLQ)" : "4-month TPP (current or <31 DLQ)";
    return {
      "Modification Type": `Fannie Mae Flex Modification${opt.includes("Streamlined") ? " (Streamlined — No BRP/Hardship Doc Required)" : opt.includes("Disaster") ? " (Disaster)" : ""} — ${isARM ? "Adjustable Rate Mortgage (ARM)" : "Fixed Rate"}`,
      "Step Applied": stepApplied || "Enter loan data for step analysis",
      "Pre-Workout UPB": priorDeferredUPB > 0 ? `${fmt$(preWorkoutUPB)} (servicer UPB ${fmt$(upb)} + prior deferred ${fmt$(priorDeferredUPB)})` : fmt$(upb),
      "Capitalized Amount": fmt$(arrears + legal),
      "  → Arrearages": fmt$(arrears),
      "  → Legal Fees": fmt$(legal),
      "  → Escrow Shortage (EXCLUDED)": escShortage > 0 ? `${fmt$(escShortage)} — NOT capitalized per D2-3.2-06` : "None",
      "  → Late Fees (EXCLUDED)": lateFees > 0 ? `${fmt$(lateFees)} — NOT capitalized` : "None",
      "Post-Cap UPB": fmt$(flexNewUPB),
      ...(isARM ? {
        "Loan Type": "Adjustable Rate Mortgage (ARM)",
        "ARM Current Index Rate": fnmaIndex > 0 ? fmtPct(fnmaIndex) : "Enter current index rate",
        "ARM Margin": fnmaMarginVal > 0 ? fmtPct(fnmaMarginVal) : "Enter margin",
        "ARM Fully-Indexed Rate (nearest 0.125%)": fullyIndexedRate != null ? fmtPct(fullyIndexedRate) : "Enter index and margin",
        "Step 1 Preliminary Rate": fmtPct(preliminaryRate) + (isARM && fullyIndexedRate != null && fullyIndexedRate < currentRate ? " (fully-indexed rate — lower than note rate)" : " (current note rate — lower than fully-indexed)"),
      } : { "Loan Type": "Fixed Rate Mortgage" }),
      "Floor Rate (PMMS−50bps, min 4.625%)": pmms > 0 ? fmtPct(floorRate) : "Enter PMMS rate",
      "Rate Note": rateAtFloor && currentRate > 0 ? `Current rate ${fmtPct(currentRate)} is at or below floor — rate stays unchanged (rate can only be reduced, not increased)` : `Current rate ${currentRate > 0 ? fmtPct(currentRate) : "N/A"} → reduced to floor if needed`,
      "New Interest Rate": achievedRate > 0 ? fmtPct(achievedRate) : "N/A",
      "New Term": achievedTerm ? `${achievedTerm} months (${(achievedTerm/12).toFixed(1)} years)` : "N/A",
      "Principal Forbearance (Step 4)": appliedForbearance > 0 ? `${fmt$(appliedForbearance)} — non-interest-bearing; due at payoff/sale/maturity/refinance` : "Not required (target met in Steps 1–3)",
      "  → Interest-Bearing UPB": appliedForbearance > 0 ? fmt$(interestBearingUPB) : "N/A",
      "  → Total Mod UPB (interest + forbearance)": appliedForbearance > 0 ? fmt$(flexNewUPB) : "N/A",
      "  → 30% Forbearance Cap": appliedForbearance > 0 ? fmt$(maxForbearance) : "N/A",
      "New Monthly P&I": fmt$(achievedPI),
      "New Monthly Escrow": fmt$(escrow || null),
      ...(escShortageMonthlySpread > 0 ? { "  → Escrow Shortage Monthly Spread (÷60)": fmt$(escShortageMonthlySpread) + ` — from ${fmt$(escShortage)} shortage spread over 60 months` } : {}),
      "  → Total Monthly Escrow (incl. shortage spread)": escShortageMonthlySpread > 0 ? fmt$(escrow + escShortageMonthlySpread) : "No shortage",
      "New Monthly PITI": fmt$(achievedPITI),
      "P&I Reduction": piReductionPct != null ? `${piReductionPct.toFixed(1)}% (${fmt$(currentPI_val)} → ${fmt$(achievedPI)})` : "Enter current P&I",
      "P&I Reduction ≥ 20%?": piReductionPct != null ? (piReductionPct >= 20 ? `✅ Yes — ${piReductionPct.toFixed(1)}%` : `❌ No — ${piReductionPct.toFixed(1)}%`) : "Enter current P&I",
      "New Maturity Date": fmtDate(newMaturity),
      "  → Maturity Basis": achievedTerm === 480 ? "480 months from modified first payment date (D2-3.2-06)" : "Re-amortized over remaining loan term",
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
  const dlq=n(l.delinquencyMonths), priorHR=n(l.priorFHAHAMPMonths), gmi=n(l.grossMonthlyIncome);
  const origUpbFHA = n(l.originalUpb);
  const origUpbEntered = origUpbFHA > 0;
  const capAmtFHA = n(l.arrearagesToCapitalize) + n(l.escrowShortage) + n(l.legalFees);
  const newUPBFHA = n(l.upb) + capAmtFHA;
  const upbWithinOrig = !origUpbEntered || newUPBFHA <= origUpbFHA;
  const upbWithinOrigLabel = !origUpbEntered ? "Enter Original UPB to verify" : (newUPBFHA <= origUpbFHA ? `✅ ${newUPBFHA.toFixed(2)} ≤ ${origUpbFHA.toFixed(2)}` : `❌ ${newUPBFHA.toFixed(2)} > ${origUpbFHA.toFixed(2)}`);

  const isDisaster = l.hardshipType === "Disaster";
  const baseNodes=[node("Occupancy=Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("Foreclosure≠Active",!l.foreclosureActive,!l.foreclosureActive),node("Property≠Condemned/Uninhabitable",l.propertyCondition,l.propertyCondition!=="Condemned"&&l.propertyCondition!=="Uninhabitable"),node("Property=Principal Residence",l.propertyDisposition,l.propertyDisposition==="Principal Residence"),node("Lien=First",l.lienPosition,l.lienPosition==="First")];
  const baseEligible=baseNodes.every(nd=>nd.pass);

  // ML 2025-06/ML 2025-12: mod rate = PMMS + 25bps, rounded to nearest 0.125%
  const fhaPmms = n(l.pmmsRate);
  const fhaModRate = fhaPmms > 0 ? Math.round((fhaPmms + 0.25) / 0.125) * 0.125 : 0;
  const fhaEscrow = n(l.currentEscrow);

  // ML 2025-06: target = 25% P&I reduction (replaces 31% GMI target)
  const currentPI_fha = n(l.currentPI);
  const targetPITI_25pct = currentPI_fha > 0 ? (currentPI_fha * 0.75) + fhaEscrow : 0;
  const fhaTarget = n(l.targetPayment) || targetPITI_25pct;

  // Re-amortization achievability (using new mod rate)
  const fhaHasInputs = fhaModRate > 0 && fhaTarget > 0 && newUPBFHA > 0;
  const fhaPITI360 = fhaHasInputs ? (calcMonthlyPI(newUPBFHA, fhaModRate, 360) ?? 0) + fhaEscrow : null;
  const fhaPITI480 = fhaHasInputs ? (calcMonthlyPI(newUPBFHA, fhaModRate, 480) ?? 0) + fhaEscrow : null;
  const canAchieve360 = fhaPITI360 != null ? fhaPITI360 <= fhaTarget : l.canAchieveTargetByReamort;
  const canAchieve480 = fhaPITI480 != null ? fhaPITI480 <= fhaTarget : l.canAchieveTargetBy480Reamort;
  const achieve360Label = fhaHasInputs ? `PITI $${fhaPITI360!.toFixed(2)} ${canAchieve360?"≤":">"} target $${fhaTarget.toFixed(2)}` : `Manual: ${canAchieve360?"Yes":"No"}`;
  const achieve480Label = fhaHasInputs ? `PITI $${fhaPITI480!.toFixed(2)} ${canAchieve480?"≤":">"} target $${fhaTarget.toFixed(2)}` : `Manual: ${canAchieve480?"Yes":"No"}`;

  // Combo achievability: PC closes gap, residual amortized 360 months at new rate
  const fhaMonthlyRate = fhaModRate > 0 ? fhaModRate / 100 / 12 : 0;
  const targetPI_combo = fhaTarget > 0 && fhaEscrow >= 0 ? fhaTarget - fhaEscrow : null;
  const targetUPB_combo = targetPI_combo != null && targetPI_combo > 0 && fhaMonthlyRate > 0
    ? targetPI_combo * ((1 - Math.pow(1 + fhaMonthlyRate, -360)) / fhaMonthlyRate) : null;
  const fhaPriorPC = n(l.priorPartialClaimBalance);
  const fhaMaxPC = origUpbEntered ? origUpbFHA * 0.30 : (n(l.upb) * 0.30);
  const fhaPCAvailable = Math.max(0, fhaMaxPC - fhaPriorPC);
  const pcNeeded = targetUPB_combo != null ? Math.max(0, newUPBFHA - targetUPB_combo) : null;
  const comboWithinCap = pcNeeded != null ? pcNeeded <= fhaPCAvailable : null;
  const comboCapPass = comboWithinCap != null ? comboWithinCap : (n(l.partialClaimPct) <= 30);
  // 2a: auto-compute arrearsExceed30PctLimit
  const arrearsAuto = origUpbEntered ? (n(l.arrearagesToCapitalize) / origUpbFHA) > 0.30 : l.arrearsExceed30PctLimit;
  // 2b: auto-compute modPaymentLe40PctGMI (using fhaTarget as target payment, vs 40% GMI)
  const modPmt40Auto = gmi > 0 && fhaTarget > 0 ? fhaTarget / gmi <= 0.40 : l.modPaymentLe40PctGMI;
  const cok = comboCapPass || (arrearsAuto && modPmt40Auto);
  const comboCapLabel = comboWithinCap != null
    ? `PC needed $${(pcNeeded??0).toFixed(2)} ${comboWithinCap?"≤":">"} available $${fhaPCAvailable.toFixed(2)}`
    : `Manual: PC% ${n(l.partialClaimPct).toFixed(1)}% ${n(l.partialClaimPct)<=30?"≤":">"} 30%`;

  // Auto-check for standalone PC: current PITI already at/below target
  const fhaCurrentPITI = n(l.currentPITI);
  const pitiAtOrBelowTarget = fhaCurrentPITI > 0 && fhaTarget > 0 ? fhaCurrentPITI <= fhaTarget : l.currentPITIAtOrBelowTarget;

  // Phase 1: auto-compute affordability checks from entered financial data
  const fhaArrears = n(l.arrearagesToCapitalize);
  const _rpp24Pct = fhaArrears > 0 && fhaCurrentPITI > 0 && gmi > 0 ? (fhaCurrentPITI + fhaArrears/24) / gmi : null;
  const canRepayWithin24 = _rpp24Pct !== null ? _rpp24Pct <= 0.40 : l.canRepayWithin24Months;
  const _rpp6Pct = fhaArrears > 0 && fhaCurrentPITI > 0 && gmi > 0 ? (fhaCurrentPITI + fhaArrears/6) / gmi : null;
  const canRepayWithin6 = _rpp6Pct !== null ? _rpp6Pct <= 0.40 : l.canRepayWithin6Months;
  const _comboPct = fhaCurrentPITI > 0 && gmi > 0 ? fhaCurrentPITI / gmi : null;
  const comboPayLe40 = _comboPct !== null ? _comboPct <= 0.40 : l.comboPaymentLe40PctIncome;

  // FHA Reinstatement
  results.push({option:"FHA Reinstatement",eligible:dlq>0,nodes:[node("Past-due amounts exist",dlq+"mo DLQ",dlq>0)],note:"Borrower pays all past-due P&I, escrow, fees, and charges to restore current status"});

  if (l.verifiedDisaster) {
    const dn=[...baseNodes,node("In PDMA",l.propertyInPDMA,l.propertyInPDMA),node("Principal Residence pre-disaster",l.principalResidencePreDisaster,l.principalResidencePreDisaster),node("DLQ<12mo",dlq,dlq<12),node("Not damaged OR repairs done",l.propertySubstantiallyDamaged?l.repairsCompleted:"N/A",!l.propertySubstantiallyDamaged||l.repairsCompleted)];
    const db=dn.every(nd=>nd.pass);
    results.push({option:"FHA Disaster Loan Modification",eligible:db&&canAchieve360&&(l.currentOrLe30DaysAtDisaster||l.incomeGePreDisaster||l.incomeDocProvided),nodes:[...dn,node("Target achievable by re-amortization",achieve360Label,canAchieve360),node("Income/DLQ condition",l.currentOrLe30DaysAtDisaster||l.incomeGePreDisaster||l.incomeDocProvided,l.currentOrLe30DaysAtDisaster||l.incomeGePreDisaster||l.incomeDocProvided)],note:!l.incomeDocProvided?"3-mo trial plan available":null});
    results.push({option:"FHA Disaster Standalone Partial Claim",eligible:db&&!canAchieve360&&comboCapPass,nodes:[...dn,node("Target NOT achievable by re-amortization",achieve360Label,!canAchieve360),node("PC within 30% cap",comboCapLabel,comboCapPass)]});
  }

  // Repayment Plan
  results.push({option:"Repayment Plan",eligible:!isDisaster&&dlq<=12&&canRepayWithin24&&!l.failedTPP,nodes:[node("Non-disaster hardship",l.hardshipType,!isDisaster),node("DLQ≤12mo",dlq,dlq<=12),node("Can repay 24mo",canRepayWithin24,canRepayWithin24),node("No failed TPP",!l.failedTPP,!l.failedTPP)]});

  // Formal Forbearance
  results.push({option:"Formal Forbearance",eligible:!isDisaster&&dlq<12&&(canRepayWithin6||l.requestedForbearance),nodes:[node("Non-disaster hardship",l.hardshipType,!isDisaster),node("DLQ<12mo",dlq,dlq<12),node("Repay 6mo OR requested",canRepayWithin6||l.requestedForbearance,canRepayWithin6||l.requestedForbearance)]});

  // ML 2025-12: home retention base — no continuousIncome req; 24-month cooldown
  const cooldownOK = priorHR === 0 || priorHR >= 24;
  const hb = baseEligible && cooldownOK && dlq > 0 && STANDARD_HARDSHIPS.includes(l.hardshipType) && l.borrowerIntentRetention;
  const hn = [...baseNodes,
    node("Std hardship",l.hardshipType,STANDARD_HARDSHIPS.includes(l.hardshipType)),
    node("DLQ>0",dlq,dlq>0),
    node("Prior home retention option ≥24mo ago or none (ML 2025-12)",priorHR===0?"None":priorHR+"mo",cooldownOK),
    node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention)
  ];

  // FHA Standalone Partial Claim (step 3: borrower resumes pre-hardship payment; PC covers arrears)
  results.push({option:"FHA Standalone Partial Claim",eligible:hb&&l.fhaBorrowerCanResumePreHardship&&comboCapPass,nodes:[...hn,node("Borrower can resume pre-hardship payment without modification",l.fhaBorrowerCanResumePreHardship?"Yes":"No",l.fhaBorrowerCanResumePreHardship),node("PC within 30% cap",comboCapLabel,comboCapPass)],note:"PC covers arrears only; no modification to rate, term, or payment — ML 2025-06"});

  // FHA Payment Deferral (step 4: 3–12 months DLQ, hardship resolved, 12-month lifetime cap)
  const fhaDeferCumUsed = n(l.fhaCumulativeDeferredMonths);
  const fhaDeferPrior = n(l.fhaPriorDeferralMonths);
  const fhaDeferDlqOK = dlq >= 3 && dlq <= 12;
  const fhaDeferCumOK = fhaDeferCumUsed < 12;
  const fhaDeferSpacingOK = fhaDeferPrior === 0 || fhaDeferPrior >= 12;
  results.push({option:"FHA Payment Deferral",eligible:!isDisaster&&baseEligible&&fhaDeferDlqOK&&l.fhaHardshipResolved&&fhaDeferCumOK&&fhaDeferSpacingOK,nodes:[node("Non-disaster hardship",l.hardshipType,!isDisaster),...baseNodes,node("DLQ 3–12 months",dlq+"mo",fhaDeferDlqOK),node("Hardship resolved",l.fhaHardshipResolved?"Yes":"No",l.fhaHardshipResolved),node("Cumulative FHA deferrals < 12 months",fhaDeferCumUsed+"mo",fhaDeferCumOK),node("Prior FHA deferral ≥12 months ago (or never)",fhaDeferPrior===0?"None":fhaDeferPrior+"mo ago",fhaDeferSpacingOK)],note:"2–6 months per event; ≥12 months between events; 12-month lifetime cap — ML 2025-06"});

  // FHA 30-Year Standalone Modification (step 5: 25% P&I reduction, PMMS+25bps, 360 months)
  results.push({option:"FHA 30-Year Standalone Modification",eligible:hb&&canAchieve360,nodes:[...hn,node("25% P&I reduction achievable by 360mo re-amortization",achieve360Label,canAchieve360)],note:fhaPmms>0?`Rate: PMMS ${fhaPmms.toFixed(3)}% + 25bps = ${fhaModRate.toFixed(3)}% — ML 2025-06`:null});

  // FHA 40-Year Combination Modification + Partial Claim (step 6: 25% reduction with PC + 480 months)
  results.push({option:"FHA 40-Year Combination Modification + Partial Claim",eligible:hb&&!canAchieve360&&cok&&canAchieve480&&upbWithinOrig,nodes:[...hn,node("25% reduction NOT achievable by 360mo re-amortization",achieve360Label,!canAchieve360),node("PC within 30% cap",comboCapLabel,cok),node("25% reduction achievable by 480mo re-amortization",achieve480Label,canAchieve480),node("New UPB ≤ Original UPB",upbWithinOrigLabel,upbWithinOrig)],note:"ML 2025-06 — rate: PMMS+25bps; term: 480 months"});

  // Payment Supplement (step 7: all eligible delinquent borrowers, not unemployed-only — ML 2025-06)
  results.push({option:"Payment Supplement",eligible:!isDisaster&&baseEligible&&dlq>0&&!canAchieve360&&comboPayLe40,nodes:[node("Non-disaster hardship",l.hardshipType,!isDisaster),...baseNodes,node("DLQ>0",dlq,dlq>0),node("25% P&I reduction NOT achievable by re-amortization",achieve360Label,!canAchieve360),node("Combo pmt≤40% GMI",comboPayLe40,comboPayLe40)],note:"ML 2025-06: Open to all eligible delinquent borrowers (not unemployed-only)"});

  // Special Forbearance – Unemployment
  results.push({option:"Special Forbearance – Unemployment",eligible:dlq<=12&&!l.foreclosureActive&&l.hardshipType==="Unemployment"&&l.occupancyStatus==="Owner Occupied"&&l.propertyDisposition==="Principal Residence"&&l.verifiedUnemployment&&!l.continuousIncome&&l.ineligibleAllRetention&&!l.propertyListedForSale&&!l.assumptionInProcess,nodes:[node("DLQ≤12mo",dlq,dlq<=12),node("Hardship=Unemployment",l.hardshipType,l.hardshipType==="Unemployment"),node("Verified unemployment",l.verifiedUnemployment,l.verifiedUnemployment),node("No continuous income",!l.continuousIncome,!l.continuousIncome),node("Ineligible all retention",l.ineligibleAllRetention,l.ineligibleAllRetention),node("Not listed for sale",!l.propertyListedForSale,!l.propertyListedForSale),node("No assumption",!l.assumptionInProcess,!l.assumptionInProcess)]});

  // PFS / DIL
  {
    const pfsIntentOK = !l.borrowerIntentRetention;
    const pfsHardshipOK = STANDARD_HARDSHIPS.includes(l.hardshipType) || l.hardshipType === "Disaster";
    const pfsDlqOK = dlq > 0;
    const pfsPropOK = l.propertyDisposition === "Principal Residence" || l.propertyListedForSale;
    const pfsNodes = [
      node("Borrower intent = Disposition", pfsIntentOK?"Disposition":"Retention — switch intent", pfsIntentOK),
      node("Documented hardship", l.hardshipType, pfsHardshipOK),
      node("Loan is delinquent", dlq+"mo", pfsDlqOK),
      node("Principal Residence (or listed for sale)", pfsPropOK?"Yes":"No", pfsPropOK),
      node("Meets all other PFS criteria (HUD 4000.1 III.A.2.m)", l.meetsPFSRequirements?"Yes":"No — toggle when verified", l.meetsPFSRequirements),
    ];
    results.push({option:"Pre-Foreclosure Sale (PFS)",eligible:pfsNodes.every(nd=>nd.pass),nodes:pfsNodes,note:"Appraisal required; minimum net proceeds must equal FHA Net Value (88% of appraised value)"});
  }
  {
    const dilPFSFailed = l.outstandingDebtUncurable;
    const dilPropOK = l.propertyCondition !== "Condemned" && !l.occupancyAbandoned;
    const dilHardshipOK = STANDARD_HARDSHIPS.includes(l.hardshipType) || l.hardshipType === "Disaster";
    const dilNodes = [
      node("PFS attempted and failed / borrower ineligible for PFS", dilPFSFailed?"Yes":"No", dilPFSFailed),
      node("Documented hardship", l.hardshipType, dilHardshipOK),
      node("Property not condemned/abandoned", l.propertyCondition, dilPropOK),
      node("Meets all other DIL criteria (HUD 4000.1 III.A.2.n)", l.meetsDILRequirements?"Yes":"No — toggle when verified", l.meetsDILRequirements),
    ];
    results.push({option:"Deed-in-Lieu (DIL)",eligible:dilNodes.every(nd=>nd.pass),nodes:dilNodes,note:"Clear title required; borrower must vacate prior to deed conveyance"});
  }
  return results;
}
function evaluateUSDA(l) {
  const results=[];
  const dlqD=n(l.delinquencyDays)||n(l.delinquencyMonths)*30, dlqM=n(l.delinquencyMonths), nm=parseInt(l.usdaNumPrevMods)||0;
  const isD=l.hardshipType==="Disaster", ltp=l.hardshipDuration==="Long Term"||l.hardshipDuration==="Permanent";
  const br=l.propertyCondition!=="Condemned"&&l.propertyCondition!=="Uninhabitable"&&!l.occupancyAbandoned&&l.lienPosition==="First";
  // 1b: auto-compute usdaUpbGe5000
  const usdaUpb5k = n(l.upb) > 0 ? n(l.upb) >= 5000 : l.usdaUpbGe5000;
  // 1c: auto-compute usdaPaymentsMade12 (loan age >= 12 months)
  const _usdaToday = new Date().toISOString().split("T")[0];
  const _usdaEff = l.approvalEffectiveDate || _usdaToday;
  const _usdaLoanAge = l.noteFirstPaymentDate ? monthsBetween(l.noteFirstPaymentDate, _usdaEff) : null;
  const usdaPayments12 = _usdaLoanAge !== null ? _usdaLoanAge >= 12 : l.usdaPaymentsMade12;
  // 1g: auto-compute usdaForbearancePeriodLt12 and usdaTotalDLQLt12
  const usdaFbLt12 = dlqM > 0 ? dlqM < 12 : l.usdaForbearancePeriodLt12;
  const usdaDLQLt12 = dlqM > 0 ? dlqM < 12 : l.usdaTotalDLQLt12;
  // Informal Forbearance base: allows pre-default (dlqD >= 0) per HB-1-3555 §18.4
  const ib=!isD&&dlqD>=0&&dlqD<360&&l.borrowerIntentRetention&&l.hardshipDuration==="Short Term"&&l.usdaHardshipNotExcluded&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.occupancyStatus==="Owner Occupied"&&(usdaFbLt12||usdaDLQLt12);
  const iN=[node("Non-disaster hardship",l.hardshipType,!isD),node("DLQ<360d",dlqD,dlqD>=0&&dlqD<360),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Short Term hardship",l.hardshipDuration,l.hardshipDuration==="Short Term"),node("Not excluded type",l.usdaHardshipNotExcluded,l.usdaHardshipNotExcluded),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("Forbearance or DLQ<12mo",usdaFbLt12||usdaDLQLt12,usdaFbLt12||usdaDLQLt12)];
  // Repayment Plan base: hardship resolved (separate from forbearance base) per HB-1-3555 §18.4
  const rb=!isD&&dlqD>0&&dlqD<360&&l.borrowerIntentRetention&&l.hardshipDuration==="Resolved"&&l.usdaHardshipNotExcluded&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.occupancyStatus==="Owner Occupied";
  const rN=[node("Non-disaster hardship",l.hardshipType,!isD),node("DLQ>0&<360d",dlqD,dlqD>0&&dlqD<360),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Hardship=Resolved",l.hardshipDuration,l.hardshipDuration==="Resolved"),node("Not excluded type",l.usdaHardshipNotExcluded,l.usdaHardshipNotExcluded),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied")];
  // Issue 1: Add USDA Reinstatement
  results.push({option:"USDA Reinstatement",eligible:dlqD>0,nodes:[node("Past-due amounts exist",dlqD+"d DLQ",dlqD>0)],note:"Borrower pays all past-due amounts to restore current status — HB-1-3555 §18.3"});

  results.push({option:"USDA Informal Forbearance",eligible:ib,nodes:iN});

  // Issue 4: Auto-compute 200% PITI cap for Repayment Plan
  const usdaCurrentPITI = n(l.currentPITI);
  const usdaGMI = n(l.grossMonthlyIncome);
  const usdaMonthlyExp = n(l.monthlyExpenses);
  const _usdaNet = usdaGMI > 0 && usdaCurrentPITI > 0 && l.monthlyExpenses !== "" ? usdaGMI - usdaCurrentPITI - usdaMonthlyExp : null;
  const posNetIncome = _usdaNet !== null ? _usdaNet > 0 : l.usdaBorrowerPositiveNetIncome;
  const usdaArrears = n(l.arrearagesToCapitalize);
  const usdaRepayMos = Math.min(12, Math.max(1, n(l.repayMonths) || 6));
  const usdaRppPayment = usdaCurrentPITI > 0 && usdaArrears > 0 ? usdaCurrentPITI + (usdaArrears / usdaRepayMos) : null;
  const rppWithin200 = usdaRppPayment != null ? usdaRppPayment <= usdaCurrentPITI * 2 : l.usdaNewPaymentLe200pct;
  const rppCapLabel = usdaRppPayment != null
    ? `$${usdaRppPayment.toFixed(2)} ${rppWithin200?"≤":">"} 200% cap $${(usdaCurrentPITI*2).toFixed(2)}`
    : `Manual: ${l.usdaNewPaymentLe200pct?"Yes":"No"}`;
  results.push({option:"USDA Informal Repayment Plan",eligible:rb&&rppWithin200&&posNetIncome,nodes:[...rN,node("RPP payment ≤ 200% current PITI",rppCapLabel,rppWithin200),node("Positive net income",posNetIncome,posNetIncome)]});

  // Issue 2: Add DLQ-at-disaster gate to Disaster Forbearance
  results.push({option:"USDA Disaster Forbearance",eligible:isD&&br&&l.occupancyStatus==="Owner Occupied"&&l.usdaDLQAt30AtDisaster,nodes:[node("Hardship=Disaster",isD,isD),node("Base eligibility",br,br),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("Current or <30d DLQ at disaster declaration",l.usdaDLQAt30AtDisaster,l.usdaDLQAt30AtDisaster)]});
  results.push({option:"USDA Special Forbearance",eligible:!isD&&br&&l.occupancyStatus==="Owner Occupied"&&dlqM<=12,nodes:[node("Not Disaster",!isD,!isD),node("Base eligibility",br,br),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("DLQ≤12mo",dlqM,dlqM<=12)]});

  // Issue 3: Add propertyListedForSale check; Issue 6: clarify prior mod count label
  const notListedForSale = !l.propertyListedForSale;
  const sb=!isD&&br&&l.borrowerIntentRetention&&l.occupancyStatus==="Owner Occupied"&&nm<2&&!l.usdaPriorFailedStreamlineTPP&&dlqD>=90&&usdaUpb5k&&usdaPayments12&&l.usdaBankruptcyNotActive&&l.usdaLitigationNotActive&&l.usdaForeclosureSaleGe60Away&&notListedForSale;
  results.push({option:"USDA Streamline Loan Modification",eligible:sb,nodes:[node("Non-disaster hardship",l.hardshipType,!isD),node("≥90d DLQ",dlqD,dlqD>=90),node("UPB≥$5k",usdaUpb5k,usdaUpb5k),node("12+ payments since origination (loan age)",usdaPayments12,usdaPayments12),node("Bankruptcy≠Active",l.usdaBankruptcyNotActive,l.usdaBankruptcyNotActive),node("Litigation≠Active",l.usdaLitigationNotActive,l.usdaLitigationNotActive),node("No failed Streamline TPP",!l.usdaPriorFailedStreamlineTPP,!l.usdaPriorFailedStreamlineTPP),node("Not Abandoned/Condemned",br,br),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Prior mods < 2 (max 1 Streamline mod lifetime — HB-1-3555 §18.7)",nm,nm<2),node("Foreclosure sale≥60d",l.usdaForeclosureSaleGe60Away,l.usdaForeclosureSaleGe60Away),node("Property not listed for sale",notListedForSale?"No":"Listed for sale",notListedForSale)]});
  // USDA Modification + MRA Servicing Plan (Final Rule eff. Feb 11, 2025): when 480mo mod alone can't achieve target
  results.push({option:"USDA Modification + MRA Servicing Plan",eligible:sb&&l.usdaStep3DeferralRequired,nodes:[node("≥90d DLQ",dlqD,dlqD>=90),node("Streamline Mod base eligible",sb,sb),node("480mo re-amortization alone cannot achieve PITI target (Step 3 required)",l.usdaStep3DeferralRequired?"Yes":"No",l.usdaStep3DeferralRequired)],note:"Step 3: MRA principal deferral closes gap when mod + 480mo term still can't reach target — USDA RD Final Rule (Feb 11, 2025)"});
  results.push({option:"USDA Standalone Mortgage Recovery Advance (MRA)",eligible:!isD&&l.usdaBorrowerCanResumeCurrent&&(l.usdaHardshipDurationResolved||l.usdaLoanModIneligible)&&l.usdaBorrowerCannotCureDLQWithin12&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&dlqD>=30,nodes:[node("Non-disaster hardship",l.hardshipType,!isD),node("Can resume payment",l.usdaBorrowerCanResumeCurrent,l.usdaBorrowerCanResumeCurrent),node("Resolved OR Mod Ineligible",l.usdaHardshipDurationResolved||l.usdaLoanModIneligible,l.usdaHardshipDurationResolved||l.usdaLoanModIneligible),node("Cannot cure DLQ 12mo",l.usdaBorrowerCannotCureDLQWithin12,l.usdaBorrowerCannotCureDLQWithin12),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("DLQ≥30d (≥1 installment)",dlqD,dlqD>=30)]});
  results.push({option:"USDA Disaster Term Extension Modification",eligible:l.usdaPriorWorkoutDisasterForbearance&&isD&&l.usdaHardshipNotResolved&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.usdaDLQGe12Contractual&&l.usdaDLQAt30AtDisaster&&l.usdaLoanGe60DLQ&&l.usdaPrevWorkoutForbearance&&l.usdaWorkoutStateActivePassed,nodes:[node("Prior=Disaster Forbearance",l.usdaPriorWorkoutDisasterForbearance,l.usdaPriorWorkoutDisasterForbearance),node("Hardship=Disaster",isD,isD),node("Hardship≠Resolved",l.usdaHardshipNotResolved,l.usdaHardshipNotResolved),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("DLQ≥12 Contractual",l.usdaDLQGe12Contractual,l.usdaDLQGe12Contractual),node("<30d DLQ at Declaration",l.usdaDLQAt30AtDisaster,l.usdaDLQAt30AtDisaster),node("Loan≥60d DLQ",l.usdaLoanGe60DLQ,l.usdaLoanGe60DLQ),node("Prev=Forbearance",l.usdaPrevWorkoutForbearance,l.usdaPrevWorkoutForbearance),node("Workout{Active,Passed}",l.usdaWorkoutStateActivePassed,l.usdaWorkoutStateActivePassed)]});
  results.push({option:"USDA Disaster Modification",eligible:isD&&l.lienPosition==="First"&&l.usdaDLQAt30AtDisaster&&l.hardshipDuration==="Resolved"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.usdaBorrowerCanResumePmtFalse&&l.usdaLoanGe30DaysDLQ&&l.usdaPostModPITILePreMod,nodes:[node("Hardship=Disaster",isD,isD),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("<30d at Declaration",l.usdaDLQAt30AtDisaster,l.usdaDLQAt30AtDisaster),node("Hardship=Resolved",l.hardshipDuration,l.hardshipDuration==="Resolved"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("Cannot resume pmt",l.usdaBorrowerCanResumePmtFalse,l.usdaBorrowerCanResumePmtFalse),node("Loan≥30d DLQ",l.usdaLoanGe30DaysDLQ,l.usdaLoanGe30DaysDLQ),node("Post-Mod PITI≤Pre",l.usdaPostModPITILePreMod,l.usdaPostModPITILePreMod)]});
  results.push({option:"USDA Disaster Mortgage Recovery Advance (MRA)",eligible:!l.usdaEligibleForDisasterExtension&&!l.usdaEligibleForDisasterMod&&isD&&l.lienPosition==="First"&&l.usdaDLQAt30AtDisaster&&l.hardshipDuration==="Resolved"&&l.usdaPriorWorkoutNotMRA&&l.usdaReinstatementLtMRACap&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.usdaBorrowerCanResumePmtFalse&&l.usdaLoanGe30DaysDLQ&&l.usdaPostModPITILePreMod,nodes:[node("DisasterExt=FALSE",!l.usdaEligibleForDisasterExtension,!l.usdaEligibleForDisasterExtension),node("DisasterMod=FALSE",!l.usdaEligibleForDisasterMod,!l.usdaEligibleForDisasterMod),node("Hardship=Disaster",isD,isD),node("Prior≠MRA",l.usdaPriorWorkoutNotMRA,l.usdaPriorWorkoutNotMRA),node("Reinstatement<Cap",l.usdaReinstatementLtMRACap,l.usdaReinstatementLtMRACap),node("<30d at Declaration",l.usdaDLQAt30AtDisaster,l.usdaDLQAt30AtDisaster),node("Hardship=Resolved",l.hardshipDuration,l.hardshipDuration==="Resolved"),node("Cannot resume pmt",l.usdaBorrowerCanResumePmtFalse,l.usdaBorrowerCanResumePmtFalse),node("Post-Mod PITI≤Pre",l.usdaPostModPITILePreMod,l.usdaPostModPITILePreMod)]});

  // Issue 5: Add explicit disposition intent check to Compromise Sale / DIL
  const usdaDispositionIntent = !l.borrowerIntentRetention;
  const cb=ltp&&usdaDispositionIntent&&l.usdaDLQGt30&&l.occupancyStatus==="Owner Occupied"&&l.usdaCompleteBRP&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&(l.usdaDLQLe60AndBRP||l.usdaDLQGe60AndDisposition);
  results.push({option:"USDA Compromise Sale",eligible:cb,nodes:[node("Long Term/Perm hardship",l.hardshipDuration,ltp),node("Borrower intent = Disposition",usdaDispositionIntent?"Disposition":"Retention — switch intent",usdaDispositionIntent),node("DLQ>30d",l.usdaDLQGt30,l.usdaDLQGt30),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("Complete BRP",l.usdaCompleteBRP,l.usdaCompleteBRP),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("DLQ/BRP/Disposition criteria",l.usdaDLQLe60AndBRP||l.usdaDLQGe60AndDisposition,l.usdaDLQLe60AndBRP||l.usdaDLQGe60AndDisposition)]});
  results.push({option:"USDA Deed-in-Lieu",eligible:cb&&l.usdaPriorWorkoutCompSaleFailed,nodes:[node("Comp Sale criteria met",cb,cb),node("Prior Comp Sale=FAILED",l.usdaPriorWorkoutCompSaleFailed,l.usdaPriorWorkoutCompSaleFailed)]});
  return results;
}
function evaluateVA(l) {
  const results=[];
  const dlqD=n(l.delinquencyDays)||n(l.delinquencyMonths)*30, pcPct=n(l.partialClaimPct);
  // Base eligibility: first lien, not condemned, not abandoned, foreclosure NOT active
  const vb=l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&!l.foreclosureActive;
  // Pre-compute cap checks for 30-Year / Traditional mod eligibility gates
  const origUpbVA = n(l.originalUpb);
  const capAmtVA = n(l.arrearagesToCapitalize) + n(l.escrowShortage) + n(l.legalFees);
  const newUPBVA = n(l.upb) + capAmtVA;
  const vaArrearsPct = origUpbVA > 0 ? (capAmtVA / origUpbVA * 100) : null;
  const vaArrearsWithin25 = vaArrearsPct != null ? vaArrearsPct <= 25 : true;
  const vaUPBWithinOrig = origUpbVA === 0 || newUPBVA <= origUpbVA;
  const rH=l.hardshipDuration==="Resolved", ltH=l.hardshipDuration==="Long Term"||l.hardshipDuration==="Permanent";
  const sH=STANDARD_HARDSHIPS.includes(l.hardshipType), isD=l.hardshipType==="Disaster";
  const oo=l.occupancyStatus==="Owner Occupied";
  const vN=[node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("Foreclosure≠Active",!l.foreclosureActive,!l.foreclosureActive)];
  // 1d: auto-compute pmmsLeCurrentPlus1
  const vaPmms = n(l.pmmsRate), vaCurrentRate = n(l.currentInterestRate);
  const vapmmsLeCurrentPlus1 = vaPmms > 0 && vaCurrentRate > 0 ? vaPmms <= vaCurrentRate + 1 : l.pmmsLeCurrentPlus1;
  // 1e: auto-compute modifiedPILe90PctOld (computed here, vaModPI declared below in Phase 1)
  const vaOldPI_90 = n(l.currentPI);
  const vaModPI_90check = n(l.modifiedPI);
  const vaModPI90 = vaModPI_90check > 0 && vaOldPI_90 > 0 ? vaModPI_90check <= vaOldPI_90 * 0.90 : l.modifiedPILe90PctOld;
  // Phase 1: auto-compute VA affordability from financial data (VA standard: 41% total DTI)
  const vaGMI = n(l.grossMonthlyIncome);
  const vaPITI = n(l.currentPITI);
  const vaModPI = n(l.modifiedPI);
  const vaEscrow = n(l.currentEscrow);
  const vaArrears = n(l.arrearagesToCapitalize);
  const vaMonthlyExp = n(l.monthlyExpenses);
  const vaRepayMo = Math.min(24, Math.max(1, n(l.repayMonths) || 12));
  const _vaRPP = vaArrears > 0 && vaPITI > 0 && vaGMI > 0 ? (vaPITI + vaArrears/vaRepayMo + vaMonthlyExp) / vaGMI : null;
  const borrowerCanAffordRPP = _vaRPP !== null ? _vaRPP <= 0.41 : l.borrowerCanAffordReinstateOrRepay;
  const vaModPITI = vaModPI > 0 ? vaModPI + vaEscrow : 0;
  const _vaModDTI = vaModPITI > 0 && vaGMI > 0 && l.monthlyExpenses !== "" ? (vaModPITI + vaMonthlyExp) / vaGMI : null;
  const borrowerCanAffordMod = _vaModDTI !== null ? _vaModDTI <= 0.41 : l.borrowerCanAffordModifiedPayment;
  const _vaCurrDTI = vaPITI > 0 && vaGMI > 0 && l.monthlyExpenses !== "" ? (vaPITI + vaMonthlyExp) / vaGMI : null;
  const borrowerCanAffordCurrent = _vaCurrDTI !== null ? _vaCurrDTI <= 0.41 : l.borrowerCanAffordCurrentMonthly;
  if (isD){
    // Disaster forbearance: triggered by disaster declaration, no minimum DLQ threshold
    results.push({option:"VA Disaster Forbearance",eligible:vb&&l.dlqAtDisasterLt30&&(l.forbearancePeriodLt12||l.totalDLQLt12),nodes:[...vN,node("<30d DLQ at Declaration",l.dlqAtDisasterLt30,l.dlqAtDisasterLt30),node("Forbearance/DLQ<12mo",l.forbearancePeriodLt12||l.totalDLQLt12,l.forbearancePeriodLt12||l.totalDLQLt12)]});
    results.push({option:"VA Disaster Modification",eligible:vb&&!l.activeRPP&&vapmmsLeCurrentPlus1&&l.dlqAtDisasterLt30&&l.loanGe60DaysDLQ&&l.previousWorkoutForbearance&&l.workoutStateActivePassed,nodes:[...vN,node("ActiveRPP=False",!l.activeRPP,!l.activeRPP),node("PMMS≤Rate+1%",vapmmsLeCurrentPlus1,vapmmsLeCurrentPlus1),node("<30d at Declaration",l.dlqAtDisasterLt30,l.dlqAtDisasterLt30),node("Loan≥60d DLQ",l.loanGe60DaysDLQ,l.loanGe60DaysDLQ),node("Prev=Forbearance",l.previousWorkoutForbearance,l.previousWorkoutForbearance),node("Workout{Active,Passed}",l.workoutStateActivePassed,l.workoutStateActivePassed)]});
    results.push({option:"VA Disaster Extend Modification",eligible:vb&&l.hardshipDuration!=="Resolved"&&l.dlqGe12ContractualPayments&&l.dlqAtDisasterLt30&&l.loanGe60DaysDLQ&&l.previousWorkoutForbearance&&l.workoutStateActivePassed,nodes:[...vN,node("Hardship≠Resolved",l.hardshipDuration,l.hardshipDuration!=="Resolved"),node("DLQ≥12 Contractual",l.dlqGe12ContractualPayments,l.dlqGe12ContractualPayments),node("<30d at Declaration",l.dlqAtDisasterLt30,l.dlqAtDisasterLt30),node("Loan≥60d DLQ",l.loanGe60DaysDLQ,l.loanGe60DaysDLQ),node("Prev=Forbearance",l.previousWorkoutForbearance,l.previousWorkoutForbearance),node("Workout{Active,Passed}",l.workoutStateActivePassed,l.workoutStateActivePassed)]});
  }
  // ── VA M26-4 Chapter 5 options — NOTE: Home Retention Waterfall (Appendix F) RESCINDED May 1, 2025 per Circular 26-25-2.
  //    Servicers must offer best option for borrower's circumstances per 38 C.F.R. §36.4319; preferred order still considered. ──
  // 1. Reinstatement — VA M26-4 §2.A: first option; borrower pays all arrears in one lump sum
  results.push({option:"VA Reinstatement",eligible:vb&&dlqD>=1&&borrowerCanAffordRPP,nodes:[...vN,node("DLQ>0",dlqD,dlqD>=1),node("Can afford reinstatement",borrowerCanAffordRPP,borrowerCanAffordRPP)]});
  // 2. Repayment Plan — resolved hardship, borrower can make regular payment + catch-up
  results.push({option:"VA Repayment Plan",eligible:vb&&sH&&rH&&dlqD>=30&&l.calculatedRPPGt0&&borrowerCanAffordRPP&&l.borrowerIntentRetention&&oo,nodes:[...vN,node("Non-disaster hardship",l.hardshipType,sH),node("Hardship=Resolved",l.hardshipDuration,rH),node("DLQ≥30d (≥1 installment)",dlqD,dlqD>=30),node("RPP Plans>0",l.calculatedRPPGt0,l.calculatedRPPGt0),node("Can afford RPP",borrowerCanAffordRPP,borrowerCanAffordRPP),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Owner Occupied",l.occupancyStatus,oo)]});
  // 3. Special Forbearance — active/temporary hardship (Long Term, not Resolved and not Permanent)
  results.push({option:"VA Special Forbearance",eligible:vb&&l.hardshipDuration==="Long Term"&&sH&&(l.forbearancePeriodLt12||l.totalDLQLt12)&&l.borrowerIntentRetention&&oo,nodes:[...vN,node("Hardship=Long Term (active)",l.hardshipDuration,l.hardshipDuration==="Long Term"),node("Std hardship",l.hardshipType,sH),node("Forbearance/DLQ<12mo",l.forbearancePeriodLt12||l.totalDLQLt12,l.forbearancePeriodLt12||l.totalDLQLt12),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Owner Occupied",l.occupancyStatus,oo)]});
  // 4a. Traditional Modification — negotiated terms, requires VA approval
  results.push({option:"VA Traditional Modification",eligible:vb&&sH&&dlqD>=61&&l.borrowerConfirmedCannotAffordCurrent&&borrowerCanAffordMod&&l.borrowerIntentRetention&&oo&&vaArrearsWithin25&&vaUPBWithinOrig,nodes:[...vN,node("Std hardship",l.hardshipType,sH),node("DLQ≥61d",dlqD,dlqD>=61),node("Confirmed cannot afford current",l.borrowerConfirmedCannotAffordCurrent,l.borrowerConfirmedCannotAffordCurrent),node("CAN afford modified",borrowerCanAffordMod,borrowerCanAffordMod),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Owner Occupied",l.occupancyStatus,oo),node("Arrearages ≤25% of orig UPB",vaArrearsPct!=null?vaArrearsPct.toFixed(1)+"%":"N/A",vaArrearsWithin25),node("New UPB ≤ Orig UPB",vaUPBWithinOrig?"Yes":"No — exceeds cap",vaUPBWithinOrig)]});
  // 4b. 30-Year Loan Modification — rate = PMMS rounded up to nearest 0.125%, 360-month term
  results.push({option:"VA 30-Year Loan Modification",eligible:vb&&sH&&dlqD>=61&&l.borrowerConfirmedCannotAffordCurrent&&!borrowerCanAffordCurrent&&l.borrowerIntentRetention&&oo&&vaArrearsWithin25&&vaUPBWithinOrig,nodes:[...vN,node("Std hardship",l.hardshipType,sH),node("DLQ≥61d",dlqD,dlqD>=61),node("Confirmed cannot afford current",l.borrowerConfirmedCannotAffordCurrent,l.borrowerConfirmedCannotAffordCurrent),node("Cannot afford current monthly",!borrowerCanAffordCurrent,!borrowerCanAffordCurrent),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Owner Occupied",l.occupancyStatus,oo),node("Arrearages ≤25% of orig UPB",vaArrearsPct!=null?vaArrearsPct.toFixed(1)+"%":"N/A",vaArrearsWithin25),node("New UPB ≤ Orig UPB",vaUPBWithinOrig?"Yes":"No — exceeds cap",vaUPBWithinOrig)]});
  // 4c. 40-Year Loan Modification — Circular 26-22-18; rate=PMMS, 480-month term
  //     NOTE: 10% P&I reduction requirement REMOVED by Circular 26-25-2 (effective May 1, 2025)
  results.push({option:"VA 40-Year Loan Modification",eligible:vb&&sH&&dlqD>=61&&l.borrowerConfirmedCannotAffordCurrent&&oo&&l.borrowerIntentRetention,nodes:[...vN,node("Std hardship",l.hardshipType,sH),node("DLQ≥61d",dlqD,dlqD>=61),node("Confirmed cannot afford",l.borrowerConfirmedCannotAffordCurrent,l.borrowerConfirmedCannotAffordCurrent),node("Owner Occupied",l.occupancyStatus,oo),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention)]});
  // 5. VASP — DISCONTINUED May 1, 2025 per Circular 26-25-2.
  //    VA Home Loan Program Reform Act (signed July 30, 2025) authorized a NEW partial claim program;
  //    implementation guidance from VA is PENDING — no new submissions until guidance issued.
  results.push({option:"VASP (VA Partial Claim)",eligible:false,nodes:[node("Program status","Discontinued — VA rescinded VASP effective May 1, 2025 (Circular 26-25-2). No new submissions accepted.",false)],note:"VASP ended May 1, 2025. New VA partial claim authorized by VA Home Loan Program Reform Act (July 30, 2025) — implementation guidance PENDING. Use 40-Year Modification for current defaults."});
  // 6. Disposition options
  const vaDispositionIntent = !l.borrowerIntentRetention;
  const vaDispositionBRP = dlqD<=60 ? l.completeBRP : true;
  const ce=ltH&&vb&&vaDispositionIntent&&vaDispositionBRP&&((dlqD<=60&&l.completeBRP)||(dlqD>=60&&l.borrowerIntentDisposition));
  const ceNodes=[...vN,node("Long Term/Perm hardship",l.hardshipDuration,ltH),node("Borrower intent = Disposition",vaDispositionIntent?"Disposition":"Retention — switch intent",vaDispositionIntent),node(dlqD<=60?"Complete BRP (DLQ≤60d)":"DLQ≥60d + Disposition intent",dlqD<=60?l.completeBRP:l.borrowerIntentDisposition,dlqD<=60?l.completeBRP:l.borrowerIntentDisposition)];
  results.push({option:"VA Compromise Sale",eligible:ce,nodes:ceNodes});
  results.push({option:"VA Deed-in-Lieu",eligible:ce&&l.priorWorkoutCompromiseSaleFailed,nodes:[...ceNodes,node("Prior Comp Sale FAILED",l.priorWorkoutCompromiseSaleFailed,l.priorWorkoutCompromiseSaleFailed)]});
  return results;
}

function evaluateFHLMC(l) {
  const results = [];
  const dlq = n(l.delinquencyMonths);
  const _todayFHLMC = new Date().toISOString().split("T")[0];
  const _fhlmcEff = l.approvalEffectiveDate || _todayFHLMC;
  const _fhlmcAutoAge = l.noteFirstPaymentDate ? monthsBetween(l.noteFirstPaymentDate, _fhlmcEff) : null;
  const loanAge = _fhlmcAutoAge !== null ? _fhlmcAutoAge : n(l.fhlmcLoanAge);
  const priorMods = n(l.fhlmcPriorModCount);
  const dlqAtDisaster = n(l.fhlmcDLQAtDisaster);
  const fico = n(l.fhlmcFICO);
  const fhlmcCash = n(l.cashReservesAmount);
  const fhlmcGMI = n(l.grossMonthlyIncome);
  const fhlmcPITI = n(l.currentPITI);
  const fhlmcCashLt25k = fhlmcCash > 0 ? fhlmcCash < 25000 : l.fhlmcCashReservesLt25k;
  const housingRatioCalc = fhlmcPITI > 0 && fhlmcGMI > 0 ? fhlmcPITI / fhlmcGMI * 100 : null;
  const housingRatio = housingRatioCalc ?? n(l.fhlmcHousingExpenseRatio);
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
  const isDisaster = l.hardshipType === "Disaster";
  // Hard ineligibility (absolute) for Flex Mod
  const hardIneligible = !isConventional || l.fhlmcRecourse;
  // Investment property hard stop only when <60 DLQ
  const investmentHardStop = l.fhlmcPropertyType === "Investment Property" && dlq < 2;
  // Soft ineligibility (exception path exists)
  const softIneligible = priorMods >= 3 || l.fhlmcFailedFlexTPP12Mo || l.fhlmcPriorFlexMod60DLQ;
  // 2e: auto-derive imminent default
  const fhlmcHousingRatioCalc2 = fhlmcPITI > 0 && fhlmcGMI > 0 ? fhlmcPITI / fhlmcGMI * 100 : null;
  const fhlmcHousingRatio2 = fhlmcHousingRatioCalc2 ?? n(l.fhlmcHousingExpenseRatio);
  const fhlmcIDHasInputs = fhlmcCash > 0 && fhlmcPITI > 0 && fhlmcGMI > 0 && fico > 0;
  const fhlmcIDRule1 = fhlmcCashLt25k && isPrimaryRes && l.fhlmcLongTermHardship;
  const fhlmcIDRule2 = fico <= 620 || l.fhlmcPrior30DayDLQ6Mo || fhlmcHousingRatio2 > 40;
  const fhlmcImminentDefaultAuto = fhlmcIDHasInputs ? (fhlmcIDRule1 && fhlmcIDRule2) : l.fhlmcImminentDefault;

  // ── 0. Reinstatement ─────────────────────────────────────────────────────────
  {
    const hasArrears = n(l.arrearagesToCapitalize) > 0 || dlq > 0;
    const nodes = [
      node("Past-due amounts exist", dlq+"mo DLQ", hasArrears),
    ];
    results.push({ option:"FHLMC Reinstatement", eligible:hasArrears, nodes, note:"Borrower pays all past-due amounts to restore current status — §9202" });
  }
  // ── 1. Repayment Plan ─────────────────────────────────────────────────────────
  {
    const nodes = [
      node("Non-disaster hardship", l.hardshipType, !isDisaster),
      node("Conventional 1st lien", l.lienPosition, isConventional && isFirstLien),
      node("Hardship resolved (temporary, no longer a problem)", l.fhlmcHardshipResolved?"Yes":"No", l.fhlmcHardshipResolved),
      node("Property not condemned/abandoned", l.propertyCondition, propertyOK),
    ];
    results.push({ option:"FHLMC Repayment Plan", eligible:nodes.every(nd=>nd.pass), nodes, note:"$500 servicer incentive if ≥60 DLQ at plan entry and borrower reinstates/pays off" });
  }
  // ── 2. Payment Deferral ───────────────────────────────────────────────────────
  {
    const eligDlqRange = dlq >= 2 && dlq <= 6;
    const eligLoanAge = loanAge >= 12;
    const fhlmcCumDeferred = n(l.fhlmcCumulativeDeferredMonths);
    const fhlmcPriorDeferral = n(l.fhlmcPriorDeferralMonths);
    const eligCumCap = fhlmcCumDeferred < 12;
    const eligPriorDeferral = fhlmcPriorDeferral === 0 || fhlmcPriorDeferral >= 12;
    const nodes = [
      node("Non-disaster hardship", l.hardshipType, !isDisaster),
      node("Conventional 1st lien", l.lienPosition, isConventional && isFirstLien),
      node("Loan age ≥ 12 months", loanAge+"mo", eligLoanAge),
      node("DLQ 2–6 months", dlq+"mo", eligDlqRange),
      node("Hardship resolved", l.fhlmcHardshipResolved?"Yes":"No", l.fhlmcHardshipResolved),
      node("Can resume full contractual payment", l.fhlmcCanResumeFull?"Yes":"No", l.fhlmcCanResumeFull),
      node("Cumulative deferred months < 12 (lifetime, non-disaster)", fhlmcCumDeferred+"mo", eligCumCap),
      node("Prior non-disaster deferral ≥ 12 months ago (or never)", fhlmcPriorDeferral===0?"None":fhlmcPriorDeferral+"mo ago", eligPriorDeferral),
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
  // ── 4. Forbearance Plan (§9203.3) ────────────────────────────────────────────
  {
    const isUnemployed = l.fhlmcUnemployed || l.hardshipType === "Unemployment";
    const isTemporary = !l.fhlmcLongTermHardship; // short-term / not permanent
    const eligForbearance = isUnemployed || isTemporary;
    const nodes = [
      node("Non-disaster hardship", l.hardshipType, !isDisaster),
      node("Temporary hardship or unemployment", eligForbearance ? (isUnemployed ? "Unemployment" : "Temporary hardship") : "Long-term/permanent — use Flex Mod", eligForbearance),
      node("Property not condemned/abandoned", l.propertyCondition, propertyOK),
      node("No approved liquidation option active", l.fhlmcApprovedLiquidationOption?"Active":"None", noActiveLiquidation),
    ];
    results.push({ option:"FHLMC Forbearance Plan", eligible:nodes.every(nd=>nd.pass), nodes, note:isUnemployed?"⚠️ Unemployment: servicer MUST offer forbearance before Flex Mod (§9203.3)":"Available for any temporary hardship — §9203.3" });
  }
  // ── 5a. Freddie Mac Flex Modification — Standard (Full BRP) ──────────────────
  {
    const eligHardship = l.fhlmcLongTermHardship; // unemployment OK if forbearance completed or not appropriate
    const eligDLQ = dlq >= 2 || fhlmcImminentDefaultAuto;
    const eligLoanAge = loanAge >= 12;
    const imminentValid = !fhlmcImminentDefaultAuto || (fhlmcIDRule1 && fhlmcIDRule2);
    const nodes = [
      node("Non-disaster hardship", l.hardshipType, !isDisaster),
      node("Conventional mortgage (not FHA/VA/RHS)", l.fhlmcMortgageType, isConventional),
      node("First lien", l.lienPosition, isFirstLien),
      node("No recourse arrangement", l.fhlmcRecourse?"Yes":"No", noRecourse),
      node("Loan age ≥ 12 months", loanAge+"mo", eligLoanAge),
      node("≥ 60 days DLQ OR imminent default determination", dlq+"mo"+(fhlmcImminentDefaultAuto?" (ID)":""), eligDLQ),
      ...(fhlmcImminentDefaultAuto ? [node("Imminent default business rules met (Rule 1 + Rule 2/3)", imminentValid?"Pass":"Fail", imminentValid, "Rule 1: primary res + cash <$25k + LT hardship; Rule 2: FICO ≤620 or 2x30DLQ or DTI>40%")] : []),
      node("Long-term/permanent hardship (unemployment OK post-forbearance)", l.fhlmcLongTermHardship?"Yes":"No", eligHardship),
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
      node("Non-disaster hardship", l.hardshipType, !isDisaster),
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
    results.push({ option:"Freddie Mac Short Sale", eligible:nodes.every(nd=>nd.pass), nodes, note:"$2,200 servicer incentive; Streamlined Short Sale available for eligible borrowers. Per Bulletin 2026-2: prior home retention evaluation no longer required before short sale approval." });
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
  const isDisaster = l.hardshipType === "Disaster";
  const dlq = n(l.delinquencyMonths);
  const _today = new Date().toISOString().split("T")[0];
  const _fnmaEff = l.approvalEffectiveDate || _today;
  const _fnmaAutoAge = l.noteFirstPaymentDate ? monthsBetween(l.noteFirstPaymentDate, _fnmaEff) : null;
  const loanAge = _fnmaAutoAge !== null ? _fnmaAutoAge : n(l.fnmaLoanAge);
  // 1a: auto-compute fnmaWithin36MonthsMaturity
  const _fnmaOrigMat = l.originalMaturityDate || (l.noteFirstPaymentDate && l.noteTerm ? calcOriginalMaturity(l.noteFirstPaymentDate, l.noteTerm) : null);
  const _fnmaMoToMat = _fnmaOrigMat ? monthsBetween(_fnmaEff, _fnmaOrigMat) : null;
  const fnmaWithin36Mo = _fnmaMoToMat !== null ? _fnmaMoToMat <= 36 : l.fnmaWithin36MonthsMaturity;
  const priorModCount = n(l.fnmaPriorModCount);
  const cumulativeDeferred = n(l.fnmaCumulativeDeferredMonths);
  const priorDeferralMonths = n(l.fnmaPriorDeferralMonths);
  const dlqAtDisaster = n(l.fnmaDelinquencyAtDisaster);
  const propertyOK = l.propertyCondition !== "Condemned" && !l.occupancyAbandoned;
  const fnmaCash = n(l.cashReservesAmount);
  const fnmaPITI = n(l.currentPITI);
  const fnmaGMI = n(l.grossMonthlyIncome);
  const fnmaCashLt3Mo = fnmaCash > 0 && fnmaPITI > 0 ? fnmaCash < fnmaPITI * 3 : l.fnmaCashReservesLt3Mo;
  const fnmaHousingRatioCalc = fnmaPITI > 0 && fnmaGMI > 0 ? fnmaPITI / fnmaGMI * 100 : null;
  // 2e: auto-derive FNMA imminent default
  const fnmaIDHasInputs = fnmaCash > 0 && fnmaPITI > 0 && fnmaGMI > 0 && n(l.fnmaFICO) > 0;
  const fnmaIDRule1 = l.fnmaPropertyType === "Principal Residence" && l.fnmaLongTermHardship && fnmaCashLt3Mo;
  const fnmaIDRule2 = n(l.fnmaFICO) <= 620 || l.fnmaPrior30DLQ12Mo || (fnmaHousingRatioCalc ?? n(l.fnmaHousingRatio)) > 55;
  const fnmaImminentDefaultAuto = fnmaIDHasInputs ? (fnmaIDRule1 && fnmaIDRule2) : l.fnmaImminentDefault;
  const commonBlockers = [
    node("No recourse/indemnification with FNMA", l.fnmaRecourseArrangement?"Yes":"No", !l.fnmaRecourseArrangement),
    node("No approved liquidation option active", l.fnmaActiveLiquidation?"Active":"None", !l.fnmaActiveLiquidation),
    node("No active/performing repayment plan", l.fnmaActiveRepayPlan?"Active":"None", !l.fnmaActiveRepayPlan),
    node("No pending workout option offer", l.fnmaActivePendingOffer?"Pending":"None", !l.fnmaActivePendingOffer),
    node("No active/performing modification TPP", l.fnmaActiveTPP?"Active":"None", !l.fnmaActiveTPP),
  ];
  // ── 0. Reinstatement ─────────────────────────────────────────────────────────
  {
    const hasArrears = n(l.arrearagesToCapitalize) > 0 || dlq > 0;
    const nodes = [
      node("Past-due amounts exist", dlq+"mo DLQ", hasArrears),
    ];
    results.push({ option:"FNMA Reinstatement", eligible:hasArrears, nodes, note:"Borrower pays all past-due P&I, escrow, fees, and charges to restore current status" });
  }
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
      node("Non-disaster hardship", l.hardshipType, !isDisaster),
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
    const eligNotNearMaturity = !fnmaWithin36Mo;
    const eligNoFailedTPP = !l.fnmaFailedTPP12Months;
    const eligHardship = l.fnmaHardshipResolved || fnmaImminentDefaultAuto;
    const nodes = [
      node("Non-disaster hardship", l.hardshipType, !isDisaster),
      node("Conventional 1st lien", l.lienPosition, eligLienPos),
      node("Loan age ≥ 12 months", loanAge+"mo", eligLoanAge),
      node("DLQ 2–6 months at evaluation", dlq+"mo", eligDlqRange),
      node("Hardship resolved OR servicer imminent default determination", l.fnmaHardshipResolved?"Resolved":fnmaImminentDefaultAuto?"Imminent Default":"Neither", eligHardship),
      node("Can resume full contractual payment", l.fnmaCanResumeFull?"Yes":"No", l.fnmaCanResumeFull),
      node("Cannot reinstate or afford repayment plan", l.fnmaCannotReinstate?"Yes":"No", l.fnmaCannotReinstate),
      node("Cumulative deferred months < 12 (lifetime)", cumulativeDeferred+"mo", eligCumCap),
      node("Prior non-disaster deferral ≥ 12 months ago (or never)", priorDeferralMonths===0?"None":priorDeferralMonths+"mo ago", eligPriorDeferral),
      node("Not within 36 months of maturity", fnmaWithin36Mo?"Within 36mo":"OK", eligNotNearMaturity),
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
    const eligNotNearMaturity = !fnmaWithin36Mo;
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
      node("Not within 36 months of maturity", fnmaWithin36Mo?"Within 36mo":"OK", eligNotNearMaturity),
      ...commonBlockers,
    ];
    results.push({ option:"FNMA Disaster Payment Deferral", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  // ── 5. Fannie Mae Flex Modification — Standard (D2-3.2-06) ───────────────────
  {
    const eligLienPos = l.lienPosition === "First";
    const eligLoanAge = loanAge >= 12;
    const eligDLQ = dlq >= 2 || fnmaImminentDefaultAuto;
    const fnmaImminentValid = !fnmaImminentDefaultAuto || (fnmaIDRule1 && fnmaIDRule2);
    const eligPriorMods = priorModCount < 3;
    const eligNoFailedTPP = !l.fnmaFailedTPP12Months;
    const eligNoReDefault = !l.fnmaReDefaulted12Months;
    const nodes = [
      node("Non-disaster hardship", l.hardshipType, !isDisaster),
      node("Conventional 1st lien", l.lienPosition, eligLienPos),
      node("Loan age ≥ 12 months", loanAge+"mo", eligLoanAge),
      node("≥ 60 days DLQ OR servicer imminent default determination", dlq+"mo"+(fnmaImminentDefaultAuto?" (imminent default)":""), eligDLQ),
      ...(fnmaImminentDefaultAuto ? [node("Imminent default business rules met (Rule 1 + Rule 2)", fnmaImminentValid?"Pass":"Fail", fnmaImminentValid, "Rule 1: primary res + LT hardship + cash <3mo PITIA; Rule 2: FICO ≤620 or 2x30DLQ or DTI>55%")] : []),
      node("Prior modifications < 3 (payment deferrals excluded)", priorModCount, eligPriorMods),
      node("No failed Flex Mod TPP within 12 months", l.fnmaFailedTPP12Months?"Yes":"No", eligNoFailedTPP),
      node("No 60-day re-default within 12mo of last Flex Mod", l.fnmaReDefaulted12Months?"Yes":"No", eligNoReDefault),
      ...commonBlockers,
    ];
    results.push({ option:"Fannie Mae Flex Modification", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  // ── 5b. Fannie Mae Flex Modification — Streamlined (D2-3.2-06) ───────────────
  // 90+ days DLQ; no BRP, hardship documentation, or income verification required
  {
    const eligLienPos = l.lienPosition === "First";
    const eligLoanAge = loanAge >= 12;
    const eligDLQ = dlq >= 3;
    const eligPriorMods = priorModCount < 3;
    const eligNoFailedTPP = !l.fnmaFailedTPP12Months;
    const eligNoReDefault = !l.fnmaReDefaulted12Months;
    const nodes = [
      node("Non-disaster hardship", l.hardshipType, !isDisaster),
      node("Conventional 1st lien", l.lienPosition, eligLienPos),
      node("Loan age ≥ 12 months", loanAge+"mo", eligLoanAge),
      node("≥ 90 days (3 months) DLQ", dlq+"mo", eligDLQ),
      node("Prior modifications < 3 (payment deferrals excluded)", priorModCount, eligPriorMods),
      node("No failed Flex Mod TPP within 12 months", l.fnmaFailedTPP12Months?"Yes":"No", eligNoFailedTPP),
      node("No 60-day re-default within 12mo of last Flex Mod", l.fnmaReDefaulted12Months?"Yes":"No", eligNoReDefault),
      ...commonBlockers,
    ];
    results.push({ option:"Fannie Mae Flex Modification (Streamlined)", eligible:nodes.every(nd=>nd.pass), nodes, note:"No BRP, hardship documentation, or income verification required — 90+ days DLQ path per D2-3.2-06" });
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

// ─── WATERFALL ENGINE ─────────────────────────────────────────────────────────
const WATERFALL_ORDER = {
  FHA: [
    "FHA Reinstatement",
    "FHA Standalone Partial Claim",
    "FHA Payment Deferral",
    "FHA 30-Year Standalone Modification",
    "FHA 40-Year Combination Modification + Partial Claim",
    "Payment Supplement",
    "Repayment Plan",
    "Formal Forbearance",
    "Special Forbearance – Unemployment",
  ],
  USDA: [
    "USDA Reinstatement",
    "USDA Informal Forbearance",
    "USDA Informal Repayment Plan",
    "USDA Streamline Loan Modification",
    "USDA Modification + MRA Servicing Plan",
    "USDA Standalone Mortgage Recovery Advance (MRA)",
  ],
  VA: [
    "VA Reinstatement",
    "VA Repayment Plan",
    "VA Special Forbearance",
    "VA Traditional Modification",
    "VA 30-Year Loan Modification",
    "VA 40-Year Loan Modification",
  ],
  FHLMC: [
    "FHLMC Reinstatement",
    "FHLMC Repayment Plan",
    "FHLMC Payment Deferral",
    "FHLMC Disaster Payment Deferral",
    "Freddie Mac Flex Modification",
    "Freddie Mac Flex Modification (Streamlined)",
  ],
  FNMA: [
    "FNMA Reinstatement",
    "FNMA Repayment Plan",
    "FNMA Payment Deferral",
    "FNMA Disaster Payment Deferral",
    "Fannie Mae Flex Modification",
    "Fannie Mae Flex Modification (Streamlined)",
  ],
};

function computeWaterfall(loanType, eligibleResults) {
  const order = WATERFALL_ORDER[loanType] || [];
  const eligibleSet = new Set(eligibleResults.map(r => r.option));
  const waterfallEligible = order
    .filter(opt => eligibleSet.has(opt))
    .map(opt => eligibleResults.find(r => r.option === opt))
    .filter(Boolean);
  // Also include eligible options not in waterfall order (disaster, disposition, etc.)
  const inWaterfall = new Set(order);
  const extras = eligibleResults.filter(r => !inWaterfall.has(r.option));
  return { waterfallEligible, extras, topOption: waterfallEligible[0] || eligibleResults[0] || null };
}

function generateWaterfallReason(topOption, loan, calcTerms) {
  if (!topOption) return "No eligible options found. Review loan for adverse action or foreclosure referral.";
  const opt = topOption.option;
  const dlqMo = n(loan.delinquencyMonths);
  const arrears = n(loan.arrearagesToCapitalize);
  const currentPI = n(loan.currentPI);
  const currentPITI = n(loan.currentPITI);
  const gmi = n(loan.grossMonthlyIncome);

  if (opt.includes("Reinstatement")) {
    return `Borrower's hardship appears resolved and they have funds to pay all past-due amounts in one lump sum to restore current status.`;
  }
  if (opt.includes("Forbearance") && !opt.includes("Modification")) {
    return `Borrower has an active or temporary hardship; forbearance provides time to recover without modifying loan terms, avoiding penalties during the hardship period.`;
  }
  if (opt.includes("Repayment Plan")) {
    const repayMos = Math.min(24, Math.max(1, n(loan.repayMonths) || 24));
    const catchUp = arrears > 0 && repayMos > 0 ? (arrears / repayMos).toFixed(2) : null;
    return `Borrower can resume regular payments${catchUp ? ` plus a monthly catch-up of ~$${catchUp}` : ""} over ${repayMos} months to resolve the arrears without modifying loan terms.`;
  }
  if (opt.includes("Payment Deferral")) {
    const deferAmt = currentPI > 0 ? (dlqMo * currentPI).toFixed(2) : null;
    return `${dlqMo} month(s) of arrears${deferAmt ? ` (~$${deferAmt})` : ""} can be deferred to loan maturity, keeping the monthly payment unchanged and giving the borrower immediate payment relief.`;
  }
  if (opt.includes("Partial Claim") && !opt.includes("Combination")) {
    return `A partial claim covers the arrears via a non-interest-bearing subordinate lien, allowing the borrower to resume the pre-hardship payment without a modification.`;
  }
  if (opt.includes("Combination Modification + Partial Claim")) {
    const pmms = n(loan.pmmsRate);
    const modRate = pmms > 0 ? Math.round((pmms + 0.25) / 0.125) * 0.125 : 0;
    return `A combination modification (${modRate > 0 ? modRate.toFixed(3) + "% rate" : "at PMMS+25bps"}, 480-month term) paired with a partial claim achieves the required 25% P&I payment reduction.`;
  }
  if (opt.includes("Modification") || opt.includes("Flex Modification") || opt.includes("Streamline Loan Modification")) {
    const pmms = n(loan.pmmsRate);
    return `A loan modification at the ${pmms > 0 ? pmms.toFixed(3) + "% PMMS" : "current market"} rate with extended term achieves a meaningful reduction in monthly payment to an affordable level.`;
  }
  if (opt.includes("Payment Supplement")) {
    const piti = currentPITI, tgt = n(loan.targetPayment) || (currentPI > 0 ? currentPI * 0.75 + n(loan.currentEscrow) : 0);
    const gap = piti > 0 && tgt > 0 ? Math.max(0, piti - tgt).toFixed(2) : null;
    return `FHA will supplement the payment gap${gap ? ` of ~$${gap}/mo` : ""} for up to 36 months, bridging the shortfall while the borrower recovers financially.`;
  }
  if (opt.includes("MRA") || opt.includes("Mortgage Recovery Advance")) {
    return `A Mortgage Recovery Advance (MRA) covers the past-due arrears via a non-interest-bearing subordinate lien, allowing the borrower to resume the current payment.`;
  }
  if (opt.includes("Short Sale") || opt.includes("Compromise Sale")) {
    return `Borrower intends to dispose of the property; a short sale/compromise sale avoids foreclosure while providing a more orderly exit.`;
  }
  return `This is the highest-priority eligible option per the ${loan.loanType} loss mitigation waterfall guidelines.`;
}

// ─── UI HELPERS ───────────────────────────────────────────────────────────────
const SrcBadge = ({type}:{type:"los"|"borrower"|"calc"}) => {
  const cfg = {
    los: {bg:"bg-green-100", text:"text-green-700", label:"📋 LOS"},
    borrower: {bg:"bg-blue-100", text:"text-blue-700", label:"💬 Borrower"},
    calc: {bg:"bg-slate-100", text:"text-slate-500", label:"🔢 Calc"},
  }[type];
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text} ml-1`}>{cfg.label}</span>;
};
const Sec=({title,children})=>(<div className="mb-5"><div className="flex items-center gap-2 mb-3"><div className="h-3.5 w-0.5 rounded-full bg-emerald-500"/><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</span></div><div className="space-y-2.5">{children}</div></div>);
const F=({label,children})=>(<div className="flex flex-col gap-1"><label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>{children}</div>);
const Sel=({value,onChange,options})=>(<select className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-shadow" value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>);
const Tog=({value,onChange,label})=>(<div className="flex items-center justify-between gap-3 py-0.5">{label&&<span className="text-xs text-slate-600 flex-1 leading-snug">{label}</span>}<button onClick={()=>onChange(!value)} className={`relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 focus:outline-none ${value?"bg-emerald-600":"bg-slate-200"}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value?"translate-x-5":"translate-x-0"}`}/></button></div>);
const Num=({value,onChange,placeholder,prefix})=>(<div className="flex items-center border border-slate-200 rounded-lg overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-emerald-400 focus-within:border-transparent transition-shadow">{prefix&&<span className="bg-slate-50 px-2.5 text-xs text-slate-400 border-r border-slate-200 py-2 font-bold">{prefix}</span>}<input type="number" min="0" step="any" className="flex-1 px-3 py-1.5 text-sm bg-white focus:outline-none" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></div>);
const DateInput=({value,onChange,label})=>(<div className="flex flex-col gap-1"><label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label><input type="date" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-shadow" value={value} onChange={e=>onChange(e.target.value)}/></div>);

// ─── CALCULATED TERMS PANEL ───────────────────────────────────────────────────
function TermsTable({ optionName, terms }: { optionName: string; terms: Record<string, string> }) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
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

function CalcTermsPanel({ optionName, loan }) {
  const terms = useMemo(() => calcApprovalTerms(optionName, loan), [optionName, loan]);
  const comboTerms = useMemo(() => {
    if (optionName === "FHA 30-Year Standalone Modification" && String(terms["Target Met?"]).startsWith("❌")) {
      return calcApprovalTerms("FHA 40-Year Combination Modification + Partial Claim", loan);
    }
    return null;
  }, [optionName, terms, loan]);

  return (
    <div className="mt-3 space-y-3">
      <TermsTable optionName={optionName} terms={terms} />
      {comboTerms && (
        <div>
          <div className="flex items-center gap-2 px-1 py-2">
            <div className="flex-1 h-px bg-emerald-200" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 whitespace-nowrap">↓ Next Step — 31% Target Not Met</span>
            <div className="flex-1 h-px bg-emerald-200" />
          </div>
          <TermsTable optionName="FHA 40-Year Combination Modification + Partial Claim" terms={comboTerms} />
        </div>
      )}
    </div>
  );
}

// ─── VALIDATION ───────────────────────────────────────────────────────────────
function validateLoan(l): string[] {
  const warnings: string[] = [];
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

// ─── JSON IMPORT FIELD MAP ─────────────────────────────────────────────────────
const FIELD_MAP: Record<string, string|null> = {
  "LoanNumber": "loanNumber",
  "loan_number": "loanNumber",
  "BorrowerLastName": null,
  "BorrowerFirstName": null,
  "borrower_name": "borrowerName",
  "CurrentUPB": "upb",
  "current_upb": "upb",
  "OriginalLoanAmount": "originalUpb",
  "original_upb": "originalUpb",
  "MonthlyEscrow": "currentEscrow",
  "monthly_escrow": "currentEscrow",
  "PIPayment": "currentPI",
  "monthly_pi": "currentPI",
  "PITIPayment": "currentPITI",
  "monthly_piti": "currentPITI",
  "GrossMonthlyIncome": "grossMonthlyIncome",
  "gross_monthly_income": "grossMonthlyIncome",
  "InterestRate": "currentInterestRate",
  "interest_rate": "currentInterestRate",
  "DelinquencyMonths": "delinquencyMonths",
  "months_delinquent": "delinquencyMonths",
  "LoanType": "loanType",
  "loan_type": "loanType",
  "PropertyType": "propertyDisposition",
  "OccupancyType": "occupancyStatus",
  "NoteDate": "noteFirstPaymentDate",
  "first_payment_date": "noteFirstPaymentDate",
  "MaturityDate": "originalMaturityDate",
  "OriginalTerm": "noteTerm",
  "HardshipReason": "hardshipType",
};

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: string}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || "Unknown error" };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="text-xl font-black text-slate-800 mb-2">Something went wrong</div>
            <div className="text-sm text-slate-500 mb-4">{this.state.error}</div>
            <button onClick={() => { this.setState({ hasError: false, error: "" }); window.location.reload(); }}
              className="bg-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-emerald-800">
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
interface Profile { id:string; email:string; full_name:string; approved:boolean; role:string; }

function MainApp({profile,onSignOut}:{profile:Profile;onSignOut:()=>void}) {
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
  const [showAdmin,setShowAdmin]=useState(false);
  // Validation warnings
  const [validationWarnings,setValidationWarnings]=useState<string[]>([]);
  // DB Setup modal
  const [showDbSetup,setShowDbSetup]=useState(false);
  // JSON import modal
  const [showImportModal,setShowImportModal]=useState(false);
  const [importJson,setImportJson]=useState("");
  const [importMsg,setImportMsg]=useState("");
  // Auto-computed section collapse state
  const [fhaCalcExpanded,setFhaCalcExpanded]=useState(true);
  const [fhlmcIDExpanded,setFhlmcIDExpanded]=useState(true);
  const [fnmaIDExpanded,setFnmaIDExpanded]=useState(true);
  // Dashboard state
  const [dashCases,setDashCases]=useState<any[]>([]);
  const [dashLoading,setDashLoading]=useState(false);
  const [dashSearch,setDashSearch]=useState("");
  const [dashFilter,setDashFilter]=useState("all");
  const [dashStatus,setDashStatus]=useState("all");
  // Offline state
  const [isOffline,setIsOffline]=useState(!navigator.onLine);
  // Share toast
  const [shareToast,setShareToast]=useState(false);
  // Quick LOS Import state
  const [losLoanNum,setLosLoanNum]=useState("");
  const [losUpb,setLosUpb]=useState("");
  const [losDlq,setLosDlq]=useState("");
  const [losPiti,setLosPiti]=useState("");
  const [losGmi,setLosGmi]=useState("");
  // Save/Load state
  const [caseNotes,setCaseNotes]=useState("");
  const [saveToast,setSaveToast]=useState("");
  const [showLoadModal,setShowLoadModal]=useState(false);
  const [savedCases,setSavedCases]=useState<any[]>([]);
  const [pendingUsers,setPendingUsers]=useState<{id:string;email:string;full_name:string;requested_at:string}[]>([]);
  const [adminMsg,setAdminMsg]=useState("");
  // Document checklist state
  const [checkedDocs,setCheckedDocs]=useState<Record<string, boolean>>({});
  const [selectedDocOption,setSelectedDocOption]=useState<string>("");
  // Portfolio state
  const [portfolioFile,setPortfolioFile]=useState<File|null>(null);
  const [portfolioResults,setPortfolioResults]=useState<any[]>([]);
  const [portfolioRunning,setPortfolioRunning]=useState(false);
  const [portfolioProgress,setPortfolioProgress]=useState(0);
  // Team/assignment state
  const [assigneeEmail,setAssigneeEmail]=useState("");
  const [assigneeFilter,setAssigneeFilter]=useState("mine");
  // Servicer overlay state
  const [overlays, setOverlays] = useState({
    minFICO: "",
    maxDLQMonths: "",
    requireBorrowerInterview: true,
    requireIncomeVerification: true,
    excludedHardshipTypes: [] as string[],
    excludedOptions: [] as string[],
    customNote: "",
  });
  // Notifications state
  const [notifications, setNotifications] = useState<{id:string, message:string, type:"info"|"success"|"warning", read:boolean, createdAt:string}[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  useEffect(()=>{
    if(showAdmin&&profile.role==="admin"){
      supabase.rpc("get_pending_users").then(({data})=>setPendingUsers((data||[]) as any));
    }
  },[showAdmin]);
  const approveUser=async(id:string)=>{
    await supabase.rpc("approve_user",{target_id:id});
    setPendingUsers(p=>p.filter(u=>u.id!==id));
    setAdminMsg("User approved — they can now log in.");
    setTimeout(()=>setAdminMsg(""),4000);
  };
  const denyUser=async(id:string)=>{
    await supabase.rpc("deny_user",{target_id:id});
    setPendingUsers(p=>p.filter(u=>u.id!==id));
    setAdminMsg("Request denied and account removed.");
    setTimeout(()=>setAdminMsg(""),4000);
  };
  // Overlay persistence
  useEffect(() => {
    const saved = localStorage.getItem("riq_overlays");
    if (saved) try { setOverlays(JSON.parse(saved)); } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem("riq_overlays", JSON.stringify(overlays));
  }, [overlays]);
  // Offline detection
  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // URL param: load shared case on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const caseParam = params.get("case");
    if (caseParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(caseParam)));
        setLoan((prev: any) => ({ ...prev, ...decoded }));
        setTab("results");
        // auto-evaluate after state settles
        setTimeout(() => {
          setResults(evalLoan({ ...initLoan, ...decoded }));
          setValidationWarnings(validateLoan({ ...initLoan, ...decoded }));
          setEvaluated(true);
        }, 50);
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dashboard loader
  const loadDashboard = useCallback(async () => {
    if (!supabaseConfigured) return;
    setDashLoading(true);
    const { data } = await supabase
      .from("evaluations")
      .select("id, loan_number, borrower_name, loan_type, created_at, notes, results, status, loan_data")
      .order("created_at", { ascending: false })
      .limit(200);
    setDashCases(data || []);
    setDashLoading(false);
  }, []);

  useEffect(() => { if (tab === "dashboard") loadDashboard(); }, [tab, loadDashboard]);

  const loadNotifications = useCallback(async () => {
    if (!supabaseConfigured || !profile) return;
    const { data } = await supabase
      .from("evaluations")
      .select("id, loan_number, borrower_name, status, created_at, assignee_email")
      .eq("assignee_email", profile.email)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) {
      const notifs = data.map(c => ({
        id: c.id,
        message: `Case ${c.loan_number || c.borrower_name || "unknown"} assigned to you — status: ${c.status || "open"}`,
        type: "info" as const,
        read: false,
        createdAt: c.created_at,
      }));
      setNotifications(notifs);
    }
  }, [profile]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const updateCaseStatus = async (id: string, status: string) => {
    await supabase.from("evaluations").update({ status }).eq("id", id);
    setDashCases(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const shareEvaluation = () => {
    try {
      const encoded = btoa(encodeURIComponent(JSON.stringify(loan)));
      const url = `${window.location.origin}${window.location.pathname}?case=${encoded}`;
      navigator.clipboard.writeText(url);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    } catch {}
  };

  const set=useCallback((k,v)=>{setLoan(p=>({...p,[k]:v}));setEvaluated(false);},[]);
  const set2=useCallback((k,v)=>{setLoan2(p=>({...p,[k]:v}));setEvaluated2(false);},[]);
  const evalLoan=(l)=>l.loanType==="FHA"?evaluateFHA(l):l.loanType==="USDA"?evaluateUSDA(l):l.loanType==="VA"?evaluateVA(l):l.loanType==="FNMA"?evaluateFNMA(l):evaluateFHLMC(l);
  const applyOverlays = (evalResults: any[], loanData: any, ov: any) => {
    return evalResults.map(r => {
      if (!r.eligible) return r;
      const blocks: string[] = [];
      if (ov.minFICO && loanData.fhlmcFICO && Number(loanData.fhlmcFICO) < Number(ov.minFICO)) {
        blocks.push(`Servicer overlay: FICO ${loanData.fhlmcFICO} below minimum ${ov.minFICO}`);
      }
      if (ov.maxDLQMonths && Number(loanData.delinquencyMonths) > Number(ov.maxDLQMonths)) {
        blocks.push(`Servicer overlay: DLQ ${loanData.delinquencyMonths}mo exceeds servicer max ${ov.maxDLQMonths}mo`);
      }
      if (ov.excludedOptions.includes(r.option)) {
        blocks.push(`Servicer overlay: ${r.option} excluded by servicer policy`);
      }
      if (blocks.length > 0) {
        return { ...r, eligible: false, overlayBlocked: true, overlayReasons: blocks, nodes: [...(r.nodes||[]), ...blocks.map(b => ({question:"Servicer Overlay", answer:b, pass:false}))] };
      }
      return r;
    });
  };
  const evaluate=()=>{
    try {
      const rawResults = evalLoan(loan);
      setResults(applyOverlays(rawResults, loan, overlays));
      setValidationWarnings(validateLoan(loan));
      setEvaluated(true);
      setTab("results");
      setAiResponse("");
    } catch(e:any) {
      setSaveToast("Evaluation error: "+(e?.message||String(e)));
      setTimeout(()=>setSaveToast(""),4000);
    }
  };
  const evaluate2=()=>{setResults2(evalLoan(loan2));setEvaluated2(true);};

  const saveCase=async()=>{
    if(!supabaseConfigured){setSaveToast("Supabase not configured.");setTimeout(()=>setSaveToast(""),3000);return;}
    try{
      const topElig=results.filter(r=>r.eligible)[0];
      const session = await supabase.auth.getSession();
      const userId = session.data.session?.user?.id;
      await supabase.from("evaluations").insert({
        loan_number:loan.loanNumber||null,
        borrower_name:loan.borrowerName||null,
        loan_type:loan.loanType,
        loan_data:loan,
        results:results,
        notes:caseNotes||null,
        guideline_version:GUIDELINE_VERSIONS[loan.loanType as keyof typeof GUIDELINE_VERSIONS]?.version||null,
        evaluated_at:new Date().toISOString(),
        status:"evaluated",
        checked_docs:checkedDocs,
        assignee_email:assigneeEmail||null,
        ...(userId ? { user_id: userId } : {}),
      });
      setSaveToast("✅ Case saved!");
      setTimeout(()=>setSaveToast(""),3000);
    }catch(e:any){setSaveToast("Error saving: "+(e?.message||String(e)));setTimeout(()=>setSaveToast(""),4000);}
  };

  const loadCases=async()=>{
    if(!supabaseConfigured){return;}
    try{
      const {data}=await supabase.from("evaluations").select("*").order("created_at",{ascending:false}).limit(20);
      setSavedCases(data||[]);
      setShowLoadModal(true);
    }catch(e:any){setSaveToast("Error loading: "+(e?.message||String(e)));setTimeout(()=>setSaveToast(""),4000);}
  };

  const loadCase=(savedCase:any)=>{
    setLoan({...initLoan,...savedCase.loan_data});
    setResults(savedCase.results||[]);
    setEvaluated(true);
    setCaseNotes(savedCase.notes||"");
    setCheckedDocs(savedCase.checked_docs||{});
    setAssigneeEmail(savedCase.assignee_email||"");
    setShowLoadModal(false);
    setTab("results");
  };

  const importLoanData=()=>{
    try {
      const raw = JSON.parse(importJson);
      const mapped: Record<string,any> = {};
      let imported = 0, unrecognized = 0;
      // Handle BorrowerFirstName + BorrowerLastName combination
      const firstName = raw["BorrowerFirstName"] || "";
      const lastName = raw["BorrowerLastName"] || "";
      if (firstName || lastName) {
        mapped["borrowerName"] = [lastName, firstName].filter(Boolean).join(", ");
        imported++;
      }
      for (const [key, val] of Object.entries(raw)) {
        if (key === "BorrowerFirstName" || key === "BorrowerLastName") continue;
        if (key in FIELD_MAP) {
          const appKey = FIELD_MAP[key];
          if (appKey) { mapped[appKey] = String(val); imported++; }
        } else {
          unrecognized++;
        }
      }
      setLoan(prev => ({...prev, ...mapped}));
      setImportMsg(`✅ ${imported} fields imported, ${unrecognized} fields not recognized`);
      setEvaluated(false);
      setTimeout(() => { setShowImportModal(false); setImportMsg(""); setImportJson(""); }, 2500);
    } catch(e) {
      setImportMsg("❌ Invalid JSON — please check your input");
    }
  };
  const eligible=results.filter(r=>r.eligible), ineligible=results.filter(r=>!r.eligible);
  const filteredCases = dashCases.filter(c => {
    const matchSearch = !dashSearch ||
      c.loan_number?.toLowerCase().includes(dashSearch.toLowerCase()) ||
      c.borrower_name?.toLowerCase().includes(dashSearch.toLowerCase());
    const matchType = dashFilter === "all" || c.loan_type === dashFilter;
    const matchStatus = dashStatus === "all" || (c.status || "open") === dashStatus;
    const matchAssignee = assigneeFilter === "mine" ? (c.assignee_email === profile?.email || !c.assignee_email) : true;
    return matchSearch && matchType && matchStatus && matchAssignee;
  });

  // CSV parser
  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] || ""]));
    });
  };

  const runPortfolio = async () => {
    if (!portfolioFile) return;
    setPortfolioRunning(true);
    setPortfolioProgress(0);
    const text = await portfolioFile.text();
    const rows = parseCSV(text);
    const res: any[] = [];
    for (let i = 0; i < rows.length; i++) {
      const loanData: any = { ...initLoan };
      const row = rows[i];
      Object.entries(row).forEach(([k, v]) => {
        const mapped = FIELD_MAP[k];
        if (mapped && v) loanData[mapped] = v;
      });
      Object.keys(loanData).forEach(field => {
        if (row[field] !== undefined && row[field] !== "") loanData[field] = row[field];
      });
      let evalResults: any[] = [];
      try {
        const lt = loanData.loanType;
        if (lt === "FHA") evalResults = evaluateFHA(loanData);
        else if (lt === "USDA") evalResults = evaluateUSDA(loanData);
        else if (lt === "VA") evalResults = evaluateVA(loanData);
        else if (lt === "FHLMC") evalResults = evaluateFHLMC(loanData);
        else if (lt === "FNMA") evalResults = evaluateFNMA(loanData);
      } catch {}
      const eligibleOpts = evalResults.filter(r => r.eligible).map(r => r.option);
      const topOption = eligibleOpts[0] || "None";
      res.push({
        loanNumber: loanData.loanNumber || `Row ${i+1}`,
        borrowerName: loanData.borrowerName,
        loanType: loanData.loanType,
        delinquencyMonths: loanData.delinquencyMonths,
        upb: loanData.upb,
        eligibleCount: eligibleOpts.length,
        topOption,
        eligible: eligibleOpts.join("; "),
        hardshipType: loanData.hardshipType,
        _loan: loanData,
      });
      setPortfolioProgress(Math.round((i + 1) / rows.length * 100));
      if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
    }
    setPortfolioResults(res);
    setPortfolioRunning(false);
  };

  const exportPortfolioCSV = () => {
    const headers = ["Loan Number","Borrower","Loan Type","DLQ Months","UPB","Eligible Count","Top Option","All Eligible Options","Hardship"];
    const rows = portfolioResults.map(r => [
      r.loanNumber, r.borrowerName, r.loanType, r.delinquencyMonths,
      r.upb, r.eligibleCount, r.topOption, r.eligible, r.hardshipType
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v||""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "portfolio_evaluation.csv"; a.click();
    URL.revokeObjectURL(url);
  };
  const gmi=n(loan.grossMonthlyIncome);
  const target31=gmi>0?(gmi*0.31).toFixed(2):null;
  const target40=gmi>0?(gmi*0.40).toFixed(2):null;

  // Analytics computed from dashCases
  const analytics = useMemo(() => {
    if (dashCases.length === 0) return null;
    const byType = Object.fromEntries(["FHA","USDA","VA","FNMA","FHLMC"].map(t => [t, dashCases.filter(c=>c.loan_type===t).length]));
    const byStatus = Object.fromEntries(["open","evaluated","recommended","approved","implemented"].map(s => [s, dashCases.filter(c=>(c.status||"open")===s).length]));
    const optionCounts: Record<string,number> = {};
    dashCases.forEach(c => {
      const top = c.results?.find((r:any)=>r.eligible)?.option;
      if (top) optionCounts[top] = (optionCounts[top]||0) + 1;
    });
    const topOptions = Object.entries(optionCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const avgDlq = dashCases.reduce((s,c)=>s+(Number(c.loan_data?.delinquencyMonths)||0),0)/dashCases.length;
    return { byType, byStatus, topOptions, avgDlq, total: dashCases.length };
  }, [dashCases]);

  const askAI=async()=>{
    if (!apiKey.trim()) { setAiResponse("⚠️ Enter your Anthropic API key in the field above first."); return; }
    setAiLoading(true);setAiResponse("");
    const summary={loanType:loan.loanType,loanNumber:loan.loanNumber,borrowerName:loan.borrowerName,delinquencyMonths:loan.delinquencyMonths,hardship:loan.hardshipType,hardshipDuration:loan.hardshipDuration,grossMonthlyIncome:loan.grossMonthlyIncome,currentPITI:loan.currentPITI,upb:loan.upb,pmmsRate:loan.pmmsRate,eligibleOptions:eligible.map(r=>r.option),ineligibleOptions:ineligible.map(r=>({option:r.option,failedAt:r.nodes?.find(nd=>!nd.pass)?.question}))};
    try {
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey.trim(),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1200,system:"You are a loss mitigation underwriting expert. Provide: 1) Plain-English borrower situation summary, 2) Recommended waterfall order with rationale, 3) Required documentation checklist, 4) Compliance watch-outs, 5) Next steps. Be concise and practical.",messages:[{role:"user",content:`Loss Mitigation Evaluation:\n${JSON.stringify(summary,null,2)}\n\nProvide expert analysis.`}]})});
      const data=await resp.json();
      if (data.error) { setAiResponse("API Error: "+data.error.message); } else { setAiResponse(data.content?.[0]?.text||"No response."); }
    } catch(e){setAiResponse("Error connecting to AI assistant: "+(e instanceof Error?e.message:String(e)));}
    setAiLoading(false);
  };

  const printReport=()=>{
    const w=window.open("","_blank");
    const calcTermsHTML=(r)=>{const t=calcApprovalTerms(r.option,loan);return`<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12px">${Object.entries(t).map(([k,v],i)=>`<tr style="background:${i%2===0?"#fff":"#f8fafc"};${String(v).startsWith("✅")?"background:#f0fdf4":String(v).startsWith("❌")?"background:#fef2f2":""}"><td style="padding:4px 8px;font-weight:600;color:#374151;width:45%;border:1px solid #e5e7eb">${k}</td><td style="padding:4px 8px;font-family:monospace;border:1px solid #e5e7eb;color:${String(v).startsWith("✅")?"#15803d":String(v).startsWith("❌")?"#dc2626":"#111"}">${v}</td></tr>`).join("")}</table>`;};
    // Key ratios for report
    const _rptGMI=n(loan.grossMonthlyIncome),_rptPITI=n(loan.currentPITI),_rptCash=n(loan.cashReservesAmount),_rptArr=n(loan.arrearagesToCapitalize),_rptUpb=n(loan.upb),_rptExp=n(loan.monthlyExpenses);
    const _housingRatio=_rptGMI>0&&_rptPITI>0?(_rptPITI/_rptGMI*100).toFixed(1)+"% ("+fmt$(_rptPITI)+" / "+fmt$(_rptGMI)+")":null;
    const _totalDTI=_rptGMI>0&&_rptPITI>0&&loan.monthlyExpenses?(_rptPITI+_rptExp)/_rptGMI*100>0?((_rptPITI+_rptExp)/_rptGMI*100).toFixed(1)+"% ("+"P&I+Escrow "+fmt$(_rptPITI)+" + other "+fmt$(_rptExp)+")":null:null;
    const _cashCoverage=_rptCash>0&&_rptPITI>0?(_rptCash/_rptPITI).toFixed(1)+" months PITI ("+fmt$(_rptCash)+")":null;
    const _arrPct=_rptUpb>0&&_rptArr>0?(_rptArr/_rptUpb*100).toFixed(1)+"% of current UPB ("+fmt$(_rptArr)+")":null;
    const ratiosHTML=`<h2>📊 Key Calculated Ratios</h2><table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px"><tbody>${_housingRatio?`<tr style="background:#f8fafc"><td style="padding:6px 10px;font-weight:600;color:#374151;width:40%;border:1px solid #e5e7eb">Housing Expense Ratio (PITI/GMI)</td><td style="padding:6px 10px;font-family:monospace;border:1px solid #e5e7eb;color:#1e293b">${_housingRatio}</td></tr>`:""}${_totalDTI?`<tr style="background:#fff"><td style="padding:6px 10px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Total DTI (PITI+Non-Housing/GMI)</td><td style="padding:6px 10px;font-family:monospace;border:1px solid #e5e7eb;color:#1e293b">${_totalDTI}</td></tr>`:""}${_cashCoverage?`<tr style="background:#f8fafc"><td style="padding:6px 10px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Cash Reserves</td><td style="padding:6px 10px;font-family:monospace;border:1px solid #e5e7eb;color:#1e293b">${_cashCoverage}</td></tr>`:""}${_arrPct?`<tr style="background:#fff"><td style="padding:6px 10px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Arrears as % of Current UPB</td><td style="padding:6px 10px;font-family:monospace;border:1px solid #e5e7eb;color:#1e293b">${_arrPct}</td></tr>`:""}${!_housingRatio&&!_totalDTI&&!_cashCoverage&&!_arrPct?"<tr><td colspan='2' style='padding:8px 10px;color:#94a3b8;font-style:italic;border:1px solid #e5e7eb'>Enter financial data to compute ratios</td></tr>":""}</tbody></table>`;
    // Top recommendation plain-English
    const _topRec=eligible.length>0?eligible[0]:null;
    const _recReason=_topRec&&_housingRatio?`borrower's ${_housingRatio} housing ratio${_arrPct?" and "+_arrPct+" arrears":""}`:null;
    const topRecHTML=_topRec?`<div style="background:#f0fdf4;border:2px solid #86efac;border-radius:8px;padding:14px;margin:12px 0"><p style="font-size:14px;font-weight:bold;color:#166534;margin:0 0 4px">Recommended: ${_topRec.option}</p><p style="font-size:12px;color:#15803d;margin:0">Because: ${_recReason?"the "+_recReason+" qualify them for this option per "+loan.loanType+" guidelines":"this is the highest-priority eligible option per "+loan.loanType+" loss mitigation waterfall"}${_topRec.note?" — "+_topRec.note:""}</p></div>`:eligible.length===0?`<div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:14px;margin:12px 0"><p style="font-size:14px;font-weight:bold;color:#991b1b;margin:0">No Eligible Options — Adverse Action Required</p><p style="font-size:12px;color:#dc2626;margin:4px 0 0">Borrower does not qualify for any loss mitigation option under current ${loan.loanType} guidelines. Refer for foreclosure review.</p></div>`:"";
    w.document.write(`<html><head><title>LM Report — ${loan.loanType}</title><style>body{font-family:Arial,sans-serif;max-width:860px;margin:40px auto;color:#111;font-size:13px}h1{color:#1e3a5f;border-bottom:3px solid #1e3a5f;padding-bottom:8px}h2{color:#1e3a5f;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:24px}h3{margin:12px 0 4px;color:#1e3a5f}.eligible{background:#f0fdf4;border:1px solid #86efac;padding:12px;border-radius:6px;margin:8px 0}.ineligible{background:#fafafa;border:1px solid #e5e7eb;padding:8px;border-radius:4px;margin:4px 0}.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:12px 0}.stat{background:#f8fafc;border:1px solid #e2e8f0;padding:8px;border-radius:4px;text-align:center}.sl{font-size:11px;color:#64748b}.sv{font-weight:bold;color:#1e293b}.footer{margin-top:40px;font-size:11px;color:#888;border-top:1px solid #e5e7eb;padding-top:12px}</style></head><body>
    <h1>Loss Mitigation Evaluation Report</h1>
    <p><strong>Evaluated:</strong> ${new Date().toLocaleString()} &nbsp;|&nbsp; <strong>Loan Type:</strong> ${loan.loanType}${loan.loanNumber?` &nbsp;|&nbsp; <strong>Loan #:</strong> ${loan.loanNumber}`:""}${loan.borrowerName?` &nbsp;|&nbsp; <strong>Borrower:</strong> ${loan.borrowerName}`:""} &nbsp;|&nbsp; <strong>DLQ:</strong> ${loan.delinquencyMonths||"—"} months &nbsp;|&nbsp; <strong>Hardship:</strong> ${loan.hardshipType} (${loan.hardshipDuration})</p>
    <p style="font-size:11px;color:#64748b;margin:4px 0"><strong>Guidelines:</strong> ${GUIDELINE_VERSIONS[loan.loanType as keyof typeof GUIDELINE_VERSIONS]?.version||loan.loanType}</p>
    ${topRecHTML}
    <div class="stats">
      <div class="stat"><div class="sl">Current UPB</div><div class="sv">${loan.upb?fmt$(n(loan.upb)):"—"}</div></div>
      <div class="stat"><div class="sl">Gross Monthly Income</div><div class="sv">${gmi>0?"$"+Number(loan.grossMonthlyIncome).toLocaleString():"—"}</div></div>
      <div class="stat"><div class="sl">31% Target Payment</div><div class="sv">${target31?"$"+target31:"—"}</div></div>
      <div class="stat"><div class="sl">PMMS Rate</div><div class="sv">${loan.pmmsRate?loan.pmmsRate+"%":"—"}</div></div>
      <div class="stat"><div class="sl">Eligible Options</div><div class="sv">${eligible.length}</div></div>
    </div>
    ${ratiosHTML}
    <h2>✅ Eligible Options (${eligible.length})</h2>
    ${eligible.length===0?"<p style='color:#dc2626;font-weight:bold'>No eligible options. Refer for adverse action / foreclosure review.</p>":eligible.map(r=>`<div class="eligible"><h3>${r.option}${OPTION_CITATIONS[r.option]?" ("+OPTION_CITATIONS[r.option]+")":""}</h3>${r.note?`<p><strong>📌 Note:</strong> ${r.note}</p>`:""}${calcTermsHTML(r)}</div>`).join("")}
    <h2>❌ Ineligible Options (${ineligible.length})</h2>
    <table style="width:100%;border-collapse:collapse"><tr><th style="text-align:left;padding:6px;background:#f3f4f6;border:1px solid #e5e7eb">Option</th><th style="text-align:left;padding:6px;background:#f3f4f6;border:1px solid #e5e7eb">Failed Condition</th><th style="text-align:left;padding:6px;background:#f3f4f6;border:1px solid #e5e7eb">Value</th></tr>${ineligible.map(r=>{const f=r.nodes?.find(nd=>!nd.pass);return`<tr><td style="padding:5px 8px;border:1px solid #e5e7eb">${r.option}</td><td style="padding:5px 8px;border:1px solid #e5e7eb;color:#dc2626">${f?f.question:"—"}</td><td style="padding:5px 8px;border:1px solid #e5e7eb">${f?f.answer:"—"}</td></tr>`;}).join("")}</table>
    ${aiResponse?`<h2>🤖 AI Analysis</h2><div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:6px;white-space:pre-wrap;font-size:12px">${aiResponse}</div>`:""}
    <div class="footer">Decision-support tool only. Final determinations must be confirmed by a qualified loss mitigation underwriter per current HUD, USDA, and VA guidelines.</div>
    </body></html>`);
    w.document.close();w.print();
  };

  if(showAdmin&&profile.role==="admin") return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-white">User Access Requests</h2>
            <p className="text-slate-400 text-sm mt-0.5">Approve or deny pending sign-up requests</p>
          </div>
          <button onClick={()=>setShowAdmin(false)} className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition-all">← Back to App</button>
        </div>
        {adminMsg&&<div className="bg-emerald-900/60 border border-emerald-700 text-emerald-300 text-sm px-4 py-3 rounded-xl mb-4">{adminMsg}</div>}
        {pendingUsers.length===0
          ? <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center text-slate-400">No pending requests</div>
          : <div className="space-y-3">
              {pendingUsers.map(u=>(
                <div key={u.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white font-semibold">{u.full_name||"—"}</p>
                    <p className="text-slate-400 text-sm">{u.email}</p>
                    <p className="text-slate-600 text-xs mt-0.5">Requested {new Date(u.requested_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={()=>approveUser(u.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-lg transition-all">Approve</button>
                    <button onClick={()=>denyUser(u.id)} className="bg-red-900/60 hover:bg-red-800 text-red-300 text-sm font-semibold px-4 py-2 rounded-lg transition-all">Deny</button>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ── Load Case Modal ── */}
      {showLoadModal&&(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={()=>setShowLoadModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between">
              <span className="font-black text-base">📂 Load Saved Case</span>
              <button onClick={()=>setShowLoadModal(false)} className="text-slate-400 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="overflow-y-auto" style={{maxHeight:"60vh"}}>
              {savedCases.length===0
                ? <div className="p-10 text-center text-slate-400">No saved cases found</div>
                : savedCases.map((c,i)=>(
                    <button key={i} onClick={()=>loadCase(c)} className="w-full text-left px-5 py-4 border-b border-slate-100 hover:bg-emerald-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{c.borrower_name||"(No Name)"} {c.loan_number?"· #"+c.loan_number:""}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{c.loan_type} · {new Date(c.created_at).toLocaleDateString()}</div>
                          {c.results&&Array.isArray(c.results)&&(()=>{const top=c.results.find((r:any)=>r.eligible);return top?<div className="text-xs text-emerald-600 font-semibold mt-0.5">Top eligible: {top.option}</div>:null;})()}
                          {c.notes&&<div className="text-xs text-slate-400 italic mt-0.5 truncate max-w-sm">{c.notes}</div>}
                        </div>
                        <span className="text-emerald-600 text-xs font-bold px-3 py-1 bg-emerald-50 rounded-lg">Load →</span>
                      </div>
                    </button>
                  ))
              }
            </div>
          </div>
        </div>
      )}
      {/* ── DB Setup Modal ── */}
      {showDbSetup&&(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={()=>setShowDbSetup(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between">
              <span className="font-black text-base">⚙️ Database Setup SQL</span>
              <button onClick={()=>setShowDbSetup(false)} className="text-slate-400 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600 mb-3">Run this in your Supabase SQL Editor to enable Save/Load:</p>
              <pre className="bg-slate-900 text-green-300 text-xs rounded-xl p-4 overflow-x-auto whitespace-pre-wrap font-mono">{`-- Run this in your Supabase SQL Editor to enable Save/Load:
CREATE TABLE IF NOT EXISTS evaluations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_number text,
  borrower_name text,
  loan_type text,
  created_at timestamptz DEFAULT now(),
  loan_data jsonb NOT NULL,
  results jsonb,
  notes text,
  guideline_version text,
  evaluated_at timestamptz,
  status text DEFAULT 'open',
  user_id uuid REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Users see only their own cases
CREATE POLICY "Users see own cases" ON evaluations
  FOR ALL USING (auth.uid() = user_id);`}</pre>
              <button onClick={()=>{navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS evaluations (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  loan_number text,\n  borrower_name text,\n  loan_type text,\n  created_at timestamptz DEFAULT now(),\n  loan_data jsonb NOT NULL,\n  results jsonb,\n  notes text,\n  guideline_version text,\n  evaluated_at timestamptz,\n  status text DEFAULT 'open',\n  user_id uuid REFERENCES auth.users(id)\n);\n\nALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY "Users see own cases" ON evaluations\n  FOR ALL USING (auth.uid() = user_id);`);}} className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all">📋 Copy SQL</button>
            </div>
          </div>
        </div>
      )}
      {/* ── JSON Import Modal ── */}
      {showImportModal&&(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={()=>setShowImportModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between">
              <span className="font-black text-base">📥 Import Loan Data (JSON)</span>
              <button onClick={()=>setShowImportModal(false)} className="text-slate-400 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500 mb-3">Paste JSON from BytePro or your LOS. Recognized fields: LoanNumber, CurrentUPB, GrossMonthlyIncome, InterestRate, DelinquencyMonths, LoanType, and more.</p>
              <textarea className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" rows={10} value={importJson} onChange={e=>setImportJson(e.target.value)} placeholder={'{\n  "LoanNumber": "1234567890",\n  "CurrentUPB": "247500",\n  "GrossMonthlyIncome": "5200"\n}'}/>
              {importMsg&&<div className={`mt-2 text-xs font-semibold px-3 py-2 rounded-lg ${importMsg.startsWith("✅")?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700"}`}>{importMsg}</div>}
              <div className="flex gap-2 mt-3">
                <button onClick={importLoanData} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded-lg transition-all">📥 Import</button>
                <button onClick={()=>setShowImportModal(false)} className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold py-2 rounded-lg transition-all">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white px-6 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={resolutionIQLogo} alt="ResolutionIQ" className="h-9 w-auto" />
            <div>
              <h1 className="text-lg font-black tracking-tight">ResolutionIQ</h1>
              <p className="text-emerald-300 text-xs font-medium">FHA · USDA · VA · FNMA · FHLMC Loss Mitigation Rules Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/10 rounded-xl p-1 backdrop-blur-sm">
              {LOAN_TYPES.map(t=>(<button key={t} onClick={()=>{set("loanType",t);setEvaluated(false);setResults([]);}} className={`px-4 py-1.5 rounded-lg text-sm font-black transition-all ${loan.loanType===t?"bg-white text-slate-900 shadow-md":"text-emerald-200 hover:text-white hover:bg-white/10"}`}>{t}</button>))}
            </div>
            {profile.role==="admin"&&<button onClick={()=>setShowAdmin(p=>!p)} className="text-emerald-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all">Users</button>}
            {supabaseConfigured && profile && (
              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)}
                  className="relative text-slate-400 hover:text-slate-600 px-2 py-1">
                  🔔
                  {notifications.filter(n=>!n.read).length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {notifications.filter(n=>!n.read).length}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 top-8 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50">
                    <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">Notifications</span>
                      <button onClick={() => setNotifications(n => n.map(x=>({...x,read:true})))} className="text-xs text-emerald-600">Mark all read</button>
                    </div>
                    {notifications.length === 0
                      ? <div className="p-4 text-xs text-slate-400 text-center">No notifications</div>
                      : notifications.slice(0,8).map(n => (
                        <div key={n.id} className={`p-3 border-b border-slate-50 text-xs ${n.read?"text-slate-400":"text-slate-700 font-semibold"}`}>
                          {n.message}
                          <div className="text-slate-400 font-normal mt-0.5">{new Date(n.createdAt).toLocaleDateString()}</div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            )}
            <button onClick={onSignOut} className="text-emerald-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all" title="Sign out">Sign out</button>
          </div>
        </div>
      </div>
      {/* ── Offline Banner ── */}
      {isOffline && (
        <div className="bg-amber-500 text-white text-xs text-center py-1 font-bold">
          ⚠️ No internet connection — evaluation works offline, save/load unavailable
        </div>
      )}
      {/* ── Share Toast ── */}
      {shareToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-lg">
          🔗 Link copied!
        </div>
      )}
      {/* ── Tab Bar ── */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-1 flex-wrap">
          {TABS.map(t=>(<button key={t} onClick={()=>setTab(t)} className={`px-2 py-1.5 sm:px-3 sm:py-2 text-xs font-bold transition-all border-b-2 -mb-px ${tab===t?"border-emerald-600 text-emerald-700":"border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"}`}><span className="hidden sm:inline">{TAB_LABELS[t as keyof typeof TAB_LABELS]}</span><span className="sm:hidden">{TAB_LABELS[t as keyof typeof TAB_LABELS].split(" ")[0]}</span></button>))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-5">
        {/* ── DASHBOARD ── */}
        {tab==="dashboard"&&(
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="text-xl font-black text-slate-800">Case Dashboard</div>
              <button onClick={loadDashboard} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg">🔄 Refresh</button>
              <button onClick={() => setTab("inputs")} className="text-xs bg-emerald-700 text-white hover:bg-emerald-800 px-3 py-1.5 rounded-lg ml-auto">+ New Evaluation</button>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              {Object.entries(GUIDELINE_VERSIONS).map(([type, gv]) => {
                const days = guidelineDaysOld(type);
                const color = days <= 90 ? "bg-emerald-400" : days <= 180 ? "bg-amber-400" : "bg-red-400";
                return (
                  <div key={type} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className={`w-2 h-2 rounded-full ${color}`}/>
                    <span className="font-bold">{type}</span>
                    <span className="text-slate-400">verified {days}d ago</span>
                  </div>
                );
              })}
            </div>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <input className="border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-48" placeholder="Search loan # or borrower..." value={dashSearch} onChange={e=>setDashSearch(e.target.value)}/>
              <select className="border rounded-lg px-3 py-1.5 text-sm" value={dashFilter} onChange={e=>setDashFilter(e.target.value)}>
                <option value="all">All Types</option>
                {["FHA","USDA","VA","FNMA","FHLMC"].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
              <select className="border rounded-lg px-3 py-1.5 text-sm" value={dashStatus} onChange={e=>setDashStatus(e.target.value)}>
                {["all","open","evaluated","recommended","approved","implemented"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
              {profile && (
                <div className="flex rounded-lg overflow-hidden border border-slate-200">
                  {["mine","all"].map(v => (
                    <button key={v} onClick={() => setAssigneeFilter(v)}
                      className={`px-3 py-1.5 text-xs font-bold transition-colors ${assigneeFilter===v?"bg-emerald-700 text-white":"bg-white text-slate-500 hover:bg-slate-50"}`}>
                      {v === "mine" ? "👤 My Cases" : "👥 All Cases"}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Stats row */}
            {dashCases.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {(()=>{
                  const statusList = ["open","evaluated","recommended","approved","implemented"];
                  const counts: Record<string,number> = {};
                  dashCases.forEach(c => { const s = c.status || "open"; counts[s] = (counts[s]||0)+1; });
                  const colorMap: Record<string,string> = {open:"bg-slate-100 text-slate-600",evaluated:"bg-blue-100 text-blue-700",recommended:"bg-amber-100 text-amber-700",approved:"bg-emerald-100 text-emerald-700",implemented:"bg-purple-100 text-purple-700"};
                  return [<div key="total" className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-center"><div className="text-xs text-slate-400 font-semibold">Total</div><div className="text-lg font-black text-slate-700">{dashCases.length}</div></div>,
                    ...statusList.filter(s=>counts[s]).map(s=><div key={s} className={`${colorMap[s]} rounded-xl px-4 py-2 text-center`}><div className="text-xs font-semibold capitalize">{s}</div><div className="text-lg font-black">{counts[s]}</div></div>)];
                })()}
              </div>
            )}
            {/* Table */}
            {!supabaseConfigured
              ? <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-700 text-sm">Supabase not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable the dashboard.</div>
              : dashLoading
                ? <div className="text-center py-10 text-slate-400">Loading...</div>
                : (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          {["Loan #","Borrower","Type","DLQ","Top Option","Status","Date","Actions"].map(h=>(
                            <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCases.map(c => {
                          const topOption = c.results?.find((r:any) => r.eligible)?.option || "—";
                          const dlq = c.loan_data?.delinquencyMonths || "—";
                          const statusColors: Record<string,string> = {open:"bg-slate-100 text-slate-600",evaluated:"bg-blue-100 text-blue-700",recommended:"bg-amber-100 text-amber-700",approved:"bg-emerald-100 text-emerald-700",implemented:"bg-purple-100 text-purple-700"};
                          const sc = statusColors[c.status as string] || statusColors.open;
                          return (
                            <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="px-4 py-3 font-mono text-xs">{c.loan_number || "—"}</td>
                              <td className="px-4 py-3">{c.borrower_name || "—"}</td>
                              <td className="px-4 py-3"><span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded">{c.loan_type}</span></td>
                              <td className="px-4 py-3">{dlq}{dlq !== "—" ? "mo" : ""}</td>
                              <td className="px-4 py-3 text-xs text-emerald-700 font-semibold max-w-32 truncate">{topOption}</td>
                              <td className="px-4 py-3">
                                <select className={`text-xs font-bold px-2 py-0.5 rounded border-0 cursor-pointer ${sc}`} value={c.status || "open"} onChange={e=>updateCaseStatus(c.id, e.target.value)}>
                                  {["open","evaluated","recommended","approved","implemented"].map(s=><option key={s} value={s}>{s}</option>)}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</td>
                              <td className="px-4 py-3">
                                <button className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold" onClick={()=>{ loadCase(c); setTab("inputs"); }}>Open →</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {filteredCases.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">No cases found{dashSearch ? ` matching "${dashSearch}"` : ""}</div>}
                  </div>
                )
            }
            {analytics && (
              <div className="mt-6">
                <div className="text-sm font-black text-slate-700 mb-3">📊 Portfolio Analytics</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* By loan type */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-3">Cases by Type</div>
                    {Object.entries(analytics.byType).filter(([,v])=>v>0).map(([type, count]) => (
                      <div key={type} className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs text-slate-600 w-12">{type}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div className="bg-emerald-500 h-2 rounded-full" style={{width:`${(count as number)/analytics.total*100}%`}}/>
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-6 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                  {/* By status */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-3">Cases by Status</div>
                    {Object.entries(analytics.byStatus).filter(([,v])=>v>0).map(([status, count]) => {
                      const colors: Record<string,string> = {open:"bg-slate-400",evaluated:"bg-blue-400",recommended:"bg-amber-400",approved:"bg-emerald-500",implemented:"bg-purple-500"};
                      return (
                        <div key={status} className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs text-slate-600 w-24 capitalize">{status}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-2">
                            <div className={`${colors[status]} h-2 rounded-full`} style={{width:`${(count as number)/analytics.total*100}%`}}/>
                          </div>
                          <span className="text-xs font-bold text-slate-700 w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Top options */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-3">Top Eligible Options</div>
                    {analytics.topOptions.map(([option, count]) => (
                      <div key={option} className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs text-slate-600 flex-1 truncate" title={option}>{option}</span>
                        <span className="text-xs font-bold text-emerald-700">{count}</span>
                      </div>
                    ))}
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      Avg DLQ: <strong>{analytics.avgDlq.toFixed(1)} months</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── INPUTS ── */}
        {tab==="inputs"&&(
          <div>
          {/* Quick LOS Import bar */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
            <div className="text-xs font-black text-blue-700 uppercase tracking-wide mb-2">📋 Quick LOS Import</div>
            <div className="flex flex-wrap gap-2 items-end">
              <div><div className="text-[10px] text-blue-600 font-semibold mb-0.5">Loan #</div><input className="border border-blue-200 rounded-lg px-2 py-1.5 text-xs w-28" value={losLoanNum} onChange={e=>setLosLoanNum(e.target.value)} placeholder="1234567890"/></div>
              <div><div className="text-[10px] text-blue-600 font-semibold mb-0.5">UPB ($)</div><input className="border border-blue-200 rounded-lg px-2 py-1.5 text-xs w-24" value={losUpb} onChange={e=>setLosUpb(e.target.value)} placeholder="250000"/></div>
              <div><div className="text-[10px] text-blue-600 font-semibold mb-0.5">DLQ (mo)</div><input className="border border-blue-200 rounded-lg px-2 py-1.5 text-xs w-16" value={losDlq} onChange={e=>setLosDlq(e.target.value)} placeholder="4"/></div>
              <div><div className="text-[10px] text-blue-600 font-semibold mb-0.5">PITI ($)</div><input className="border border-blue-200 rounded-lg px-2 py-1.5 text-xs w-20" value={losPiti} onChange={e=>setLosPiti(e.target.value)} placeholder="1800"/></div>
              <div><div className="text-[10px] text-blue-600 font-semibold mb-0.5">GMI ($)</div><input className="border border-blue-200 rounded-lg px-2 py-1.5 text-xs w-20" value={losGmi} onChange={e=>setLosGmi(e.target.value)} placeholder="5200"/></div>
              <button onClick={()=>{
                if(losLoanNum) set("loanNumber",losLoanNum);
                if(losUpb) set("upb",losUpb);
                if(losDlq) set("delinquencyMonths",losDlq);
                if(losPiti) set("currentPITI",losPiti);
                if(losGmi) set("grossMonthlyIncome",losGmi);
                setLosLoanNum(""); setLosUpb(""); setLosDlq(""); setLosPiti(""); setLosGmi("");
              }} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-all">Apply →</button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-5">
            {/* Col 1 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 overflow-y-auto" style={{maxHeight:"82vh"}}>
              <Sec title="📁 Loan Info">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1"><SrcBadge type="los"/><span className="text-[10px] text-slate-400 ml-1">Pull from servicing system</span></div>
                  <button onClick={()=>setShowImportModal(true)} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all border border-blue-100">📥 Import JSON</button>
                </div>
                <F label="Loan Number"><input className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={loan.loanNumber} onChange={e=>set("loanNumber",e.target.value)} placeholder="e.g. 1234567890"/></F>
                <F label="Borrower Name"><input className="border border-gray-300 rounded px-2 py-1 text-sm w-full" value={loan.borrowerName} onChange={e=>set("borrowerName",e.target.value)} placeholder="Last, First"/></F>
              </Sec>
              <Sec title="💰 Financial Data">
                <div className="flex items-center gap-1 mb-1"><SrcBadge type="los"/><span className="text-[10px] text-slate-400 ml-1">Pull from servicing system</span></div>
                <F label="Current UPB"><Num value={loan.upb} onChange={v=>set("upb",v)} placeholder="e.g. 250000" prefix="$"/></F>
                <F label="Original UPB"><Num value={loan.originalUpb} onChange={v=>set("originalUpb",v)} placeholder="e.g. 275000" prefix="$"/></F>
                <F label="Current Monthly Escrow"><Num value={loan.currentEscrow} onChange={v=>set("currentEscrow",v)} placeholder="e.g. 350" prefix="$"/></F>
                <F label="Current Monthly P&I"><Num value={loan.currentPI} onChange={v=>set("currentPI",v)} placeholder="e.g. 1450" prefix="$"/></F>
                <F label="Current Monthly PITI"><Num value={loan.currentPITI} onChange={v=>set("currentPITI",v)} placeholder="e.g. 1800" prefix="$"/></F>
                <F label="Gross Monthly Income"><Num value={loan.grossMonthlyIncome} onChange={v=>set("grossMonthlyIncome",v)} placeholder="e.g. 5000" prefix="$"/></F>
                <F label="Monthly Non-Housing Expenses"><Num value={loan.monthlyExpenses} onChange={v=>set("monthlyExpenses",v)} placeholder="e.g. 500 (car, CC min, student loans)" prefix="$"/></F>
                <F label="Cash Reserves (Liquid Assets)"><Num value={loan.cashReservesAmount} onChange={v=>set("cashReservesAmount",v)} placeholder="e.g. 8000" prefix="$"/></F>
                <F label="Current Interest Rate (%)"><Num value={loan.currentInterestRate} onChange={v=>set("currentInterestRate",v)} placeholder="e.g. 6.5"/></F>
                {loan.loanType !== "FHLMC" && <F label="PMMS Rate (%)"><Num value={loan.pmmsRate} onChange={v=>set("pmmsRate",v)} placeholder="e.g. 7.1"/></F>}
                {gmi>0&&(loan.loanType === "FHA" || loan.loanType === "USDA")&&<div className="bg-emerald-50 rounded p-2 text-xs text-emerald-800 space-y-0.5 mt-1">
                  {loan.loanType==="FHA"&&n(loan.currentPI)>0&&<div>FHA 25% P&I Target: <strong>{fmt$(n(loan.currentPI)*0.75)} P&I + {fmt$(n(loan.currentEscrow))} escrow</strong></div>}
                  {loan.loanType==="USDA"&&<div>31% GMI Target: <strong>${target31}/mo</strong></div>}
                  <div>40% GMI Cap: <strong>${target40}/mo</strong></div>
                  {loan.currentPITI&&<div>PITI/GMI Ratio: <strong>{(n(loan.currentPITI)/gmi*100).toFixed(1)}%</strong></div>}
                </div>}
                {loan.loanType === "FHA" && <F label="Target PITI Override (optional — leave blank to use 25% P&I reduction)"><Num value={loan.targetPayment} onChange={v=>set("targetPayment",v)} placeholder="Auto: 25% P&I reduction" prefix="$"/></F>}
                {loan.loanType === "USDA" && <F label="Target Payment Override (optional — leave blank to use 31% GMI)"><Num value={loan.targetPayment} onChange={v=>set("targetPayment",v)} placeholder="Auto: 31% GMI" prefix="$"/></F>}
              </Sec>
              <Sec title="📐 Amounts to Capitalize / Defer">
                <F label="Arrearages (past-due P&I + escrow advances — total for capitalization)"><Num value={loan.arrearagesToCapitalize} onChange={v=>set("arrearagesToCapitalize",v)} placeholder="e.g. 7200" prefix="$"/></F>
                <F label="Escrow Advance Balance (servicer-paid taxes/insurance — included in Payment Deferral)"><Num value={loan.escrowAdvanceBalance} onChange={v=>set("escrowAdvanceBalance",v)} placeholder="e.g. 0" prefix="$"/></F>
                <F label="Accrued Delinquent Interest"><Num value={loan.accruedDelinquentInterest} onChange={v=>set("accruedDelinquentInterest",v)} placeholder="e.g. 0" prefix="$"/></F>
                <F label="Suspense / Unapplied Funds (offsets deferred amount)"><Num value={loan.suspenseBalance} onChange={v=>set("suspenseBalance",v)} placeholder="e.g. 0" prefix="$"/></F>
                <F label="Projected Escrow Shortage (NOT capitalized — spread over 60 months)"><Num value={loan.escrowShortage} onChange={v=>set("escrowShortage",v)} placeholder="e.g. 800" prefix="$"/></F>
                <F label="Legal / Foreclosure Fees (actually performed)"><Num value={loan.legalFees} onChange={v=>set("legalFees",v)} placeholder="e.g. 1200" prefix="$"/></F>
                <F label="Late Fees (NOT capitalizable — for reference only)"><Num value={loan.lateFees} onChange={v=>set("lateFees",v)} placeholder="e.g. 300" prefix="$"/></F>
                {(loan.loanType === "FHA" || loan.loanType === "USDA" || loan.loanType === "VA") && <F label="Prior Partial Claim / MRA Balance"><Num value={loan.priorPartialClaimBalance} onChange={v=>set("priorPartialClaimBalance",v)} placeholder="e.g. 15000" prefix="$"/></F>}
                {loan.loanType==="FHA"&&<F label="Partial Claim % of Statutory Limit"><Num value={loan.partialClaimPct} onChange={v=>set("partialClaimPct",v)} placeholder="e.g. 20"/></F>}
                {n(loan.arrearagesToCapitalize)>0&&<div className="bg-green-50 rounded p-2 text-xs text-green-800 mt-1 space-y-0.5">
                  <div>Total Capitalizable (arrears + legal): <strong>{fmt$(n(loan.arrearagesToCapitalize)+n(loan.legalFees))}</strong></div>
                  {n(loan.escrowAdvanceBalance)>0&&<div>Est. Payment Deferral Total: <strong>{fmt$(n(loan.arrearagesToCapitalize)+n(loan.escrowAdvanceBalance)-n(loan.suspenseBalance))}</strong></div>}
                  {n(loan.suspenseBalance)>0&&<div className="text-emerald-700">Suspense offset: <strong>−{fmt$(n(loan.suspenseBalance))}</strong></div>}
                  <div className="text-red-600">Late fees excluded: <strong>{fmt$(n(loan.lateFees))}</strong></div>
                  {n(loan.originalUpb)>0&&(loan.loanType === "FHA" || loan.loanType === "USDA" || loan.loanType === "VA")&&<div>30% PC Cap: <strong>{fmt$(n(loan.originalUpb)*0.30)}</strong></div>}
                  {n(loan.originalUpb)>0&&loan.loanType === "VA"&&<div>25% Arrearage Cap (VA): <strong>{fmt$(n(loan.originalUpb)*0.25)}</strong></div>}
                </div>}
              </Sec>
            </div>
            {/* Col 2 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 overflow-y-auto" style={{maxHeight:"82vh"}}>
              <Sec title="📅 Loan Dates">
                <div className="flex items-center gap-1 mb-1"><SrcBadge type="los"/><span className="text-[10px] text-slate-400 ml-1">Pull from servicing system</span></div>
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
                  return <div className="bg-emerald-50 rounded p-2 text-xs text-emerald-800 space-y-0.5 mt-1">
                    <div>Remaining Term: <strong>{rem} months</strong></div>
                    <div>360mo from mod: <strong>{fmtDate(mat360)}</strong></div>
                    <div>120mo past orig maturity: <strong>{fmtDate(mat120)}</strong></div>
                    <div>480mo from note first pmt: <strong>{fmtDate(mat480)}</strong></div>
                    <div>New First Payment Date: <strong>{fmtDate(newFirst)}</strong></div>
                  </div>;
                })()}
              </Sec>
              <Sec title="🏠 Property & Occupancy">
                <div className="flex items-center gap-1 mb-1"><SrcBadge type="borrower"/><span className="text-[10px] text-slate-400 ml-1">Requires borrower interview/docs</span></div>
                <F label="Occupancy Status"><Sel value={loan.occupancyStatus} onChange={v=>set("occupancyStatus",v)} options={["Owner Occupied","Non-Owner Occupied","Vacant","Tenant Occupied"]}/></F>
                {loan.loanType === "FHA" && <F label="Property Disposition"><Sel value={loan.propertyDisposition} onChange={v=>set("propertyDisposition",v)} options={["Principal Residence","Second Home","Investment"]}/></F>}
                <F label="Property Condition"><Sel value={loan.propertyCondition} onChange={v=>set("propertyCondition",v)} options={["Standard","Condemned","Uninhabitable"]}/></F>
                <F label="Lien Position"><Sel value={loan.lienPosition} onChange={v=>set("lienPosition",v)} options={["First","Second"]}/></F>
                <Tog label="Foreclosure Active" value={loan.foreclosureActive} onChange={v=>set("foreclosureActive",v)}/>
                <Tog label="Occupancy = Abandoned" value={loan.occupancyAbandoned} onChange={v=>set("occupancyAbandoned",v)}/>
              </Sec>
              <Sec title="⚠️ Hardship">
                <div className="flex items-center gap-1 mb-1"><SrcBadge type="los"/><span className="text-[10px] text-slate-400 ml-1">Pull from servicing system</span></div>
                <F label="Hardship Type"><Sel value={loan.hardshipType} onChange={v=>set("hardshipType",v)} options={HARDSHIP_TYPES}/></F>
                <F label="Hardship Duration"><Sel value={loan.hardshipDuration} onChange={v=>set("hardshipDuration",v)} options={["Short Term","Long Term","Permanent","Unknown","Resolved"]}/></F>
                <F label="Delinquency (months)"><Num value={loan.delinquencyMonths} onChange={v=>set("delinquencyMonths",v)} placeholder="e.g. 4"/></F>
                <F label="Delinquency (days — override)">
                  {loan.delinquencyMonths && !loan.delinquencyDays
                    ? <div className="flex items-center gap-2"><Num value={loan.delinquencyDays} onChange={v=>set("delinquencyDays",v)} placeholder="e.g. 120"/><span className="text-xs text-blue-600 whitespace-nowrap font-semibold">auto: {n(loan.delinquencyMonths)*30}d</span></div>
                    : <Num value={loan.delinquencyDays} onChange={v=>set("delinquencyDays",v)} placeholder="e.g. 120"/>}
                </F>
              </Sec>
            </div>
            {/* Col 3 - loan type specific */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 overflow-y-auto" style={{maxHeight:"82vh"}}>
              <Sec title="🔧 Modification Flags">
                <div className="flex items-center gap-1 mb-1"><SrcBadge type="borrower"/><span className="text-[10px] text-slate-400 ml-1">Requires borrower interview/docs</span></div>
                <div className="mb-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Borrower Intent</div>
                  <div className="flex rounded-lg overflow-hidden border border-slate-200">
                    <button onClick={() => set("borrowerIntentRetention", true)}
                      className={`flex-1 py-2 text-sm font-bold transition-colors ${loan.borrowerIntentRetention ? "bg-emerald-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                      🏠 Retain Home
                    </button>
                    <button onClick={() => set("borrowerIntentRetention", false)}
                      className={`flex-1 py-2 text-sm font-bold transition-colors ${!loan.borrowerIntentRetention ? "bg-red-500 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                      🔑 Sell / Deed Back
                    </button>
                  </div>
                </div>
                {loan.loanType==="VA"&&(n(loan.modifiedPI)>0&&n(loan.currentPI)>0
                  ? <div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Modified P&amp;I ≤ 90% of old P&amp;I</span><span className={`font-semibold ${n(loan.modifiedPI)<=n(loan.currentPI)*0.90?"text-emerald-600":"text-red-500"}`}>{n(loan.modifiedPI)<=n(loan.currentPI)*0.90?"✅ Yes":"❌ No"} — auto (mod {fmt$(n(loan.modifiedPI))} vs 90% {fmt$(n(loan.currentPI)*0.90)})</span></div>
                  : <Tog label="Modified P&I ≤ 90% of old P&I (manual — enter Modified P&I & Current P&I to auto-compute)" value={loan.modifiedPILe90PctOld} onChange={v=>set("modifiedPILe90PctOld",v)}/>)}
                {(()=>{const _r=n(loan.currentInterestRate),_p=n(loan.pmmsRate);const _auto=_r>0&&_p>0?_r<=_p+0.25:null;return _auto!==null?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Current rate at or below market (rate+25bps)</span><span className={`font-semibold ${_auto?"text-emerald-600":"text-red-500"}`}>{_auto?"✅ Yes":"❌ No"} — auto ({_r.toFixed(3)}% ≤ {(_p+0.25).toFixed(3)}%)</span></div>:<Tog label="Current rate at or below market (manual — enter rates to auto-compute)" value={loan.currentRateAtOrBelowMarket} onChange={v=>set("currentRateAtOrBelowMarket",v)}/>;})()}
              </Sec>
              {loan.loanType==="FHA"&&(()=>{
                const _pmms=n(loan.pmmsRate), _esc=n(loan.currentEscrow), _pi=n(loan.currentPI);
                const _modRate=_pmms>0?Math.round((_pmms+0.25)/0.125)*0.125:0;
                const _tgtPITI=_pi>0?(_pi*0.75)+_esc:0;
                const _tgt=n(loan.targetPayment)||_tgtPITI;
                const _upb=n(loan.upb)+n(loan.arrearagesToCapitalize)+n(loan.escrowShortage)+n(loan.legalFees);
                const _hasInputs=_modRate>0&&_tgt>0&&_upb>0;
                const _pi360=_hasInputs?calcMonthlyPI(_upb,_modRate,360):null;
                const _piti360=_pi360!=null?_pi360+_esc:null;
                const _pi480=_hasInputs?calcMonthlyPI(_upb,_modRate,480):null;
                const _piti480=_pi480!=null?_pi480+_esc:null;
                const _can360=_piti360!=null?_piti360<=_tgt:loan.canAchieveTargetByReamort;
                const _can480=_piti480!=null?_piti480<=_tgt:loan.canAchieveTargetBy480Reamort;
                const _piti=n(loan.currentPITI), _gmi=n(loan.grossMonthlyIncome), _arr=n(loan.arrearagesToCapitalize);
                const _rpp24=_arr>0&&_piti>0&&_gmi>0?(_piti+_arr/24)/_gmi:null;
                const _rpp6=_arr>0&&_piti>0&&_gmi>0?(_piti+_arr/6)/_gmi:null;
                const _combo=_piti>0&&_gmi>0?_piti/_gmi:null;
                return (<>
                <Sec title="FHA Home Retention (ML 2025-06)">
                  <div className="flex items-center gap-1 mb-1"><SrcBadge type="borrower"/><SrcBadge type="calc"/><span className="text-[10px] text-slate-400 ml-1">Mixed: borrower docs + auto-computed</span></div>
                  <F label="Prior Home Retention Option (months ago — 24-month cooldown)"><Num value={loan.priorFHAHAMPMonths} onChange={v=>set("priorFHAHAMPMonths",v)} placeholder="0 = none"/></F>
                  {_pmms>0&&<div className="bg-blue-50 rounded p-2 text-xs text-blue-800 mt-1">Mod rate: PMMS {_pmms.toFixed(3)}% + 25bps = <strong>{_modRate.toFixed(3)}%</strong> (rounded to nearest 0.125%)</div>}
                  {_pi>0&&<div className="bg-emerald-50 rounded p-2 text-xs text-emerald-800 mt-0.5">25% P&I target: {fmt$(_pi*0.75)} + {fmt$(_esc)} escrow = <strong>{fmt$(_tgtPITI)}</strong> PITI</div>}
                  {_hasInputs
                    ? <div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">25% P&I reduction achievable (360mo re-amortization)</span><span className={`font-semibold ${_can360?"text-emerald-600":"text-red-500"}`}>{_can360?"✅ Yes":"❌ No"} — auto (PITI {fmt$(_piti360)} vs {fmt$(_tgt)})</span></div>
                    : <Tog label="Can achieve 25% P&I reduction by re-amortizing 360 months (manual — enter PMMS & current P&I to auto-compute)" value={loan.canAchieveTargetByReamort} onChange={v=>set("canAchieveTargetByReamort",v)}/>}
                  {_hasInputs
                    ? <div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">25% P&I reduction achievable (480mo re-amortization)</span><span className={`font-semibold ${_can480?"text-emerald-600":"text-red-500"}`}>{_can480?"✅ Yes":"❌ No"} — auto (PITI {fmt$(_piti480)} vs {fmt$(_tgt)})</span></div>
                    : <Tog label="Can achieve 25% P&I reduction via 480-month re-amortization (40-Year Combo) (manual — enter PMMS & current P&I to auto-compute)" value={loan.canAchieveTargetBy480Reamort} onChange={v=>set("canAchieveTargetBy480Reamort",v)}/>}
                  <Tog label="Borrower can resume pre-hardship payment without modification (Standalone PC)" value={loan.fhaBorrowerCanResumePreHardship} onChange={v=>set("fhaBorrowerCanResumePreHardship",v)}/>
                  <Tog label="Hardship resolved (FHA Payment Deferral)" value={loan.fhaHardshipResolved} onChange={v=>set("fhaHardshipResolved",v)}/>
                  <F label="Cumulative FHA Deferred Months (lifetime cap: 12)"><Num value={loan.fhaCumulativeDeferredMonths} onChange={v=>set("fhaCumulativeDeferredMonths",v)} placeholder="0"/></F>
                  <F label="Months since prior FHA deferral (0 = never)"><Num value={loan.fhaPriorDeferralMonths} onChange={v=>set("fhaPriorDeferralMonths",v)} placeholder="0 = never"/></F>
                  {(()=>{const _origUpb=n(loan.originalUpb),_arr=n(loan.arrearagesToCapitalize);const _auto=_origUpb>0&&_arr>0?(_arr/_origUpb)>0.30:null;return _auto!==null?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Arrears exceed 30% statutory limit</span><span className={`font-semibold ${_auto?"text-red-500":"text-emerald-600"}`}>{_auto?"⚠️ Yes":"✅ No"} — auto ({((_arr/_origUpb)*100).toFixed(1)}% of orig UPB)</span></div>:<Tog label="Arrears exceed 30% statutory limit (manual — enter Original UPB & Arrears to auto-compute)" value={loan.arrearsExceed30PctLimit} onChange={v=>set("arrearsExceed30PctLimit",v)}/>;})()}
                  {(()=>{const _origUpb=n(loan.originalUpb),_arr=n(loan.arrearagesToCapitalize),_gmi=n(loan.grossMonthlyIncome);const _arrearsAuto=_origUpb>0&&_arr>0?(_arr/_origUpb)>0.30:loan.arrearsExceed30PctLimit;if(!_arrearsAuto)return null;const _pmms=n(loan.pmmsRate),_esc=n(loan.currentEscrow),_pi=n(loan.currentPI);const _modRate=_pmms>0?Math.round((_pmms+0.25)/0.125)*0.125:0;const _tgtPITI=_pi>0?(_pi*0.75)+_esc:0;const _tgt=n(loan.targetPayment)||_tgtPITI;const _auto=_gmi>0&&_tgt>0?_tgt/_gmi<=0.40:null;return _auto!==null?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Modified payment ≤ 40% GMI (arrears exceed 30% override)</span><span className={`font-semibold ${_auto?"text-emerald-600":"text-red-500"}`}>{_auto?"✅ Yes":"❌ No"} — auto (target {fmt$(_tgt)}, {(_tgt/_gmi*100).toFixed(1)}% GMI)</span></div>:<Tog label="Modified payment ≤ 40% GMI (manual)" value={loan.modPaymentLe40PctGMI} onChange={v=>set("modPaymentLe40PctGMI",v)}/>;})()}
                  <div className="border border-slate-200 rounded-lg overflow-hidden mt-1">
                    <button type="button" onClick={()=>setFhaCalcExpanded(p=>!p)} className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-1.5"><SrcBadge type="calc"/><span className="text-[10px] font-bold text-slate-500">Auto-Computed (from financial data)</span></div>
                      <span className="text-[10px] text-slate-400">{fhaCalcExpanded?"▲":"▼"}</span>
                    </button>
                    {fhaCalcExpanded&&<div className="px-3 py-2 space-y-1 bg-white">
                      {_combo!==null?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Combo payment ≤ 40% of income (Payment Supplement)</span><span className={`font-semibold ${_combo<=0.40?"text-emerald-600":"text-red-500"}`}>{_combo<=0.40?"✅ Yes":"❌ No"} — auto ({(_combo*100).toFixed(1)}% GMI)</span></div>:<Tog label="Combo payment ≤ 40% of income (Payment Supplement) (manual)" value={loan.comboPaymentLe40PctIncome} onChange={v=>set("comboPaymentLe40PctIncome",v)}/>}
                      {_rpp24!==null?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Can repay within 24 months (RPP ≤ 40% GMI)</span><span className={`font-semibold ${_rpp24<=0.40?"text-emerald-600":"text-red-500"}`}>{_rpp24<=0.40?"✅ Yes":"❌ No"} — auto (pmt {fmt$(_piti+_arr/24)}, {(_rpp24*100).toFixed(1)}% GMI)</span></div>:<Tog label="Can repay within 24 months (manual)" value={loan.canRepayWithin24Months} onChange={v=>set("canRepayWithin24Months",v)}/>}
                      {_rpp6!==null?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Can repay within 6 months (RPP ≤ 40% GMI)</span><span className={`font-semibold ${_rpp6<=0.40?"text-emerald-600":"text-red-500"}`}>{_rpp6<=0.40?"✅ Yes":"❌ No"} — auto (pmt {fmt$(_piti+_arr/6)}, {(_rpp6*100).toFixed(1)}% GMI)</span></div>:<Tog label="Can repay within 6 months (manual)" value={loan.canRepayWithin6Months} onChange={v=>set("canRepayWithin6Months",v)}/>}
                    </div>}
                  </div>
                  <Tog label="Forbearance requested" value={loan.requestedForbearance} onChange={v=>set("requestedForbearance",v)}/>
                  <Tog label="Verified unemployment (Special Forbearance)" value={loan.verifiedUnemployment} onChange={v=>set("verifiedUnemployment",v)}/>
                  <Tog label="No continuous income (Special Forbearance)" value={!loan.continuousIncome} onChange={v=>set("continuousIncome",!v)}/>
                  <Tog label="Ineligible for all retention options" value={loan.ineligibleAllRetention} onChange={v=>set("ineligibleAllRetention",v)}/>
                  <Tog label="Property listed for sale" value={loan.propertyListedForSale} onChange={v=>set("propertyListedForSale",v)}/>
                  <Tog label="Assumption in process" value={loan.assumptionInProcess} onChange={v=>set("assumptionInProcess",v)}/>
                </Sec>
                <Sec title="FHA Disaster">
                  <div className="flex items-center gap-1 mb-1"><SrcBadge type="borrower"/><span className="text-[10px] text-slate-400 ml-1">Requires borrower docs / FEMA verification</span></div>
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
              </>);})()}
              {loan.loanType==="USDA"&&(<>
                <Sec title="USDA – Streamline Mod">
                  {n(loan.upb)>0
                    ? <div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">UPB ≥ $5,000</span><span className={`font-semibold ${n(loan.upb)>=5000?"text-emerald-600":"text-red-500"}`}>{n(loan.upb)>=5000?"✅ Yes":"❌ No"} — auto ({fmt$(n(loan.upb))})</span></div>
                    : <Tog label="UPB ≥ $5,000 (manual — enter UPB above to auto-compute)" value={loan.usdaUpbGe5000} onChange={v=>set("usdaUpbGe5000",v)}/>}
                  {(()=>{const _today=new Date().toISOString().split("T")[0];const _eff=loan.approvalEffectiveDate||_today;const _age=loan.noteFirstPaymentDate?monthsBetween(loan.noteFirstPaymentDate,_eff):null;return _age!==null?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">12+ payments since origination (loan age)</span><span className={`font-semibold ${_age>=12?"text-emerald-600":"text-red-500"}`}>{_age>=12?"✅ Yes":"❌ No"} — auto ({_age} months)</span></div>:<Tog label="12+ payments since origination (manual — enter Note First Payment Date to auto-compute)" value={loan.usdaPaymentsMade12} onChange={v=>set("usdaPaymentsMade12",v)}/>;})()}
                  <Tog label="Bankruptcy ≠ Active" value={loan.usdaBankruptcyNotActive} onChange={v=>set("usdaBankruptcyNotActive",v)}/>
                  <Tog label="Litigation ≠ Active" value={loan.usdaLitigationNotActive} onChange={v=>set("usdaLitigationNotActive",v)}/>
                  <Tog label="No prior failed Streamline TPP" value={!loan.usdaPriorFailedStreamlineTPP} onChange={v=>set("usdaPriorFailedStreamlineTPP",!v)}/>
                  <F label="# Previous Modifications"><Num value={loan.usdaNumPrevMods} onChange={v=>set("usdaNumPrevMods",v)} placeholder="0"/></F>
                  <Tog label="Foreclosure sale ≥ 60 days away" value={loan.usdaForeclosureSaleGe60Away} onChange={v=>set("usdaForeclosureSaleGe60Away",v)}/>
                  <Tog label="Property not listed for sale" value={!loan.propertyListedForSale} onChange={v=>set("propertyListedForSale",!v)}/>
                  {n(loan.delinquencyMonths)>0
                    ? <div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Forbearance period &lt; 12 months</span><span className={`font-semibold ${n(loan.delinquencyMonths)<12?"text-emerald-600":"text-red-500"}`}>{n(loan.delinquencyMonths)<12?"✅ Yes":"❌ No"} — auto ({n(loan.delinquencyMonths)} mo DLQ)</span></div>
                    : <Tog label="Forbearance period < 12 months (manual — enter Delinquency Months to auto-compute)" value={loan.usdaForbearancePeriodLt12} onChange={v=>set("usdaForbearancePeriodLt12",v)}/>}
                  {n(loan.delinquencyMonths)>0
                    ? <div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Total DLQ &lt; 12 months</span><span className={`font-semibold ${n(loan.delinquencyMonths)<12?"text-emerald-600":"text-red-500"}`}>{n(loan.delinquencyMonths)<12?"✅ Yes":"❌ No"} — auto ({n(loan.delinquencyMonths)} mo DLQ)</span></div>
                    : <Tog label="Total DLQ < 12 months (manual — enter Delinquency Months to auto-compute)" value={loan.usdaTotalDLQLt12} onChange={v=>set("usdaTotalDLQLt12",v)}/>}
                  <Tog label="Hardship type not excluded" value={loan.usdaHardshipNotExcluded} onChange={v=>set("usdaHardshipNotExcluded",v)}/>
                  <Tog label="New RPP payment ≤ 200% of current" value={loan.usdaNewPaymentLe200pct} onChange={v=>set("usdaNewPaymentLe200pct",v)}/>
                  {(()=>{const _g=n(loan.grossMonthlyIncome),_p=n(loan.currentPITI),_e=n(loan.monthlyExpenses);const _net=_g>0&&_p>0&&loan.monthlyExpenses!==""?_g-_p-_e:null;return _net!==null?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Borrower has positive net income</span><span className={`font-semibold ${_net>0?"text-emerald-600":"text-red-500"}`}>{_net>0?"✅ Yes":"❌ No"} — auto (GMI {fmt$(_g)} − PITI {fmt$(_p)} − exp {fmt$(_e)} = {fmt$(_net)})</span></div>:<Tog label="Borrower has positive net income (manual)" value={loan.usdaBorrowerPositiveNetIncome} onChange={v=>set("usdaBorrowerPositiveNetIncome",v)}/>;})()}
                  <Tog label="480-mo re-amortization alone cannot achieve PITI target (Step 3 MRA required)" value={loan.usdaStep3DeferralRequired} onChange={v=>set("usdaStep3DeferralRequired",v)}/>
                </Sec>
                <Sec title="USDA – MRA / Disaster">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 mb-1">These fields reflect current workout status — pull from servicing system</div>
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
                  {(()=>{const _g=n(loan.grossMonthlyIncome),_p=n(loan.currentPITI),_a=n(loan.arrearagesToCapitalize),_e=n(loan.monthlyExpenses),_rm=Math.min(24,Math.max(1,n(loan.repayMonths)||12));const _r=_a>0&&_p>0&&_g>0?(_p+_a/_rm+_e)/_g:null;return _r!==null?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Can afford reinstatement or RPP (41% DTI)</span><span className={`font-semibold ${_r<=0.41?"text-emerald-600":"text-red-500"}`}>{_r<=0.41?"✅ Yes":"❌ No"} — auto ({(_r*100).toFixed(1)}% total DTI)</span></div>:<Tog label="Borrower can afford reinstatement or repayment plan (manual)" value={loan.borrowerCanAffordReinstateOrRepay} onChange={v=>set("borrowerCanAffordReinstateOrRepay",v)}/>;})()}
                  <Tog label="Borrower confirmed cannot afford current payment" value={loan.borrowerConfirmedCannotAffordCurrent} onChange={v=>set("borrowerConfirmedCannotAffordCurrent",v)}/>
                  {(()=>{const _g=n(loan.grossMonthlyIncome),_mp=n(loan.modifiedPI),_esc=n(loan.currentEscrow),_e=n(loan.monthlyExpenses);const _mPITI=_mp>0?_mp+_esc:0;const _d=_mPITI>0&&_g>0&&loan.monthlyExpenses!==""?(_mPITI+_e)/_g:null;return _d!==null?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Can afford modified payment (41% DTI)</span><span className={`font-semibold ${_d<=0.41?"text-emerald-600":"text-red-500"}`}>{_d<=0.41?"✅ Yes":"❌ No"} — auto (mod PITI {fmt$(_mPITI)} + exp {fmt$(_e)}, {(_d*100).toFixed(1)}% DTI)</span></div>:<Tog label="Borrower can afford modified payment (manual)" value={loan.borrowerCanAffordModifiedPayment} onChange={v=>set("borrowerCanAffordModifiedPayment",v)}/>;})()}
                  {(()=>{const _g=n(loan.grossMonthlyIncome),_p=n(loan.currentPITI),_e=n(loan.monthlyExpenses);const _d=_p>0&&_g>0&&loan.monthlyExpenses!==""?(_p+_e)/_g:null;return _d!==null?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Can afford current monthly (41% DTI)</span><span className={`font-semibold ${_d<=0.41?"text-emerald-600":"text-red-500"}`}>{_d<=0.41?"✅ Yes":"❌ No"} — auto ({(_d*100).toFixed(1)}% total DTI)</span></div>:<Tog label="Borrower can afford current monthly payment (manual)" value={loan.borrowerCanAffordCurrentMonthly} onChange={v=>set("borrowerCanAffordCurrentMonthly",v)}/>;})()}
                  <Tog label="Forbearance period < 12 months" value={loan.forbearancePeriodLt12} onChange={v=>set("forbearancePeriodLt12",v)}/>
                  <Tog label="Total DLQ < 12 months" value={loan.totalDLQLt12} onChange={v=>set("totalDLQLt12",v)}/>
                  <Tog label="Calculated RPP Plans > 0" value={loan.calculatedRPPGt0} onChange={v=>set("calculatedRPPGt0",v)}/>
                </Sec>
                <Sec title="VA – Disaster">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 mb-1">These fields reflect current workout status — pull from servicing system</div>
                  {n(loan.pmmsRate)>0&&n(loan.currentInterestRate)>0
                    ? <div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">PMMS ≤ Current Rate + 1%</span><span className={`font-semibold ${n(loan.pmmsRate)<=n(loan.currentInterestRate)+1?"text-emerald-600":"text-red-500"}`}>{n(loan.pmmsRate)<=n(loan.currentInterestRate)+1?"✅ Yes":"❌ No"} — auto (PMMS {n(loan.pmmsRate).toFixed(3)}% ≤ {(n(loan.currentInterestRate)+1).toFixed(3)}%)</span></div>
                    : <Tog label="PMMS ≤ Current Rate + 1% (manual — enter both rates to auto-compute)" value={loan.pmmsLeCurrentPlus1} onChange={v=>set("pmmsLeCurrentPlus1",v)}/>}
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
                  <F label="Mortgage Type"><Sel value={loan.fnmaMortgageType} onChange={v=>set("fnmaMortgageType",v)} options={["Fixed Rate","ARM"]}/></F>
                  {loan.fnmaMortgageType === "ARM" && (<>
                    <F label="Current Index Rate (%)"><Num value={loan.fnmaCurrentIndex} onChange={v=>set("fnmaCurrentIndex",v)} placeholder="e.g. 5.32 (SOFR)"/></F>
                    <F label="Margin (%)"><Num value={loan.fnmaMargin} onChange={v=>set("fnmaMargin",v)} placeholder="e.g. 2.25"/></F>
                    {n(loan.fnmaCurrentIndex) > 0 && n(loan.fnmaMargin) > 0 && <div className="bg-teal-50 rounded p-2 text-xs text-teal-800 mt-1">
                      <div>Fully-Indexed Rate: <strong>{(Math.round((n(loan.fnmaCurrentIndex) + n(loan.fnmaMargin)) * 8) / 8).toFixed(4)}%</strong> (nearest 0.125%)</div>
                      <div>Preliminary Rate (Step 1): <strong>{Math.min(n(loan.fnmaCurrentIndex) + n(loan.fnmaMargin), n(loan.currentInterestRate)).toFixed(4)}%</strong> (lower of note rate / fully-indexed)</div>
                    </div>}
                  </>)}
                  {(()=>{const _today=new Date().toISOString().split("T")[0];const _eff=loan.approvalEffectiveDate||_today;const _auto=loan.noteFirstPaymentDate?monthsBetween(loan.noteFirstPaymentDate,_eff):null;return _auto!==null?<div className="space-y-1"><div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Loan Age (months since origination)</span><span className="font-semibold text-blue-700">Auto: {_auto} months {_auto<12?"⚠️ <12mo":""}</span></div>{_auto<12&&<div className="bg-amber-50 rounded p-2 text-xs text-amber-700">⚠️ Loan age &lt; 12 months — ineligible for Payment Deferral and Flex Modification</div>}</div>:<div><F label="Loan Age (months since origination — enter Note First Payment Date to auto-compute)"><Num value={loan.fnmaLoanAge} onChange={v=>set("fnmaLoanAge",v)} placeholder="e.g. 36"/></F>{n(loan.fnmaLoanAge)>0&&n(loan.fnmaLoanAge)<12&&<div className="bg-amber-50 rounded p-2 text-xs text-amber-700 mt-1">⚠️ Loan age &lt; 12 months — ineligible for Payment Deferral and Flex Modification</div>}</div>;})()}
                  <F label="Property Type"><Sel value={loan.fnmaPropertyType} onChange={v=>set("fnmaPropertyType",v)} options={["Principal Residence","Second Home","Investment"]}/></F>
                  <Tog label="Hardship resolved (temporary, no longer a problem)" value={loan.fnmaHardshipResolved} onChange={v=>set("fnmaHardshipResolved",v)}/>
                  <Tog label="Can resume full contractual monthly payment" value={loan.fnmaCanResumeFull} onChange={v=>set("fnmaCanResumeFull",v)}/>
                  <Tog label="Cannot reinstate or afford repayment plan" value={loan.fnmaCannotReinstate} onChange={v=>set("fnmaCannotReinstate",v)}/>
                  {(()=>{const _cash=n(loan.cashReservesAmount),_piti=n(loan.currentPITI),_gmi=n(loan.grossMonthlyIncome),_fico=n(loan.fnmaFICO);const _hr=_piti>0&&_gmi>0?_piti/_gmi*100:n(loan.fnmaHousingRatio);const _hasInputs=_cash>0&&_piti>0&&_gmi>0&&_fico>0&&loan.fnmaPropertyType!=="";const _cashLt3Mo=_cash>0&&_piti>0?_cash<_piti*3:loan.fnmaCashReservesLt3Mo;const _isPrimary=loan.fnmaPropertyType==="Principal Residence";const _r1=_isPrimary&&loan.fnmaLongTermHardship&&_cashLt3Mo;const _r2=_fico<=620||loan.fnmaPrior30DLQ12Mo||_hr>55;const _autoID=_hasInputs?(_r1&&_r2):null;return _autoID!==null?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Servicer imminent default determination</span><span className={`font-semibold ${_autoID?"text-amber-600":"text-emerald-600"}`}>{_autoID?"⚠️ Yes (auto)":"✅ No (auto)"} — R1:{_r1?"✓":"✗"} R2:{_r2?"✓":"✗"}</span></div>:<Tog label="Servicer imminent default determination (manual — enter cash, PITI, GMI, FICO to auto-compute)" value={loan.fnmaImminentDefault} onChange={v=>set("fnmaImminentDefault",v)}/>;})()}
                  {(()=>{const _today=new Date().toISOString().split("T")[0];const _eff=loan.approvalEffectiveDate||_today;const _origMat=loan.originalMaturityDate||(loan.noteFirstPaymentDate&&loan.noteTerm?calcOriginalMaturity(loan.noteFirstPaymentDate,loan.noteTerm):null);const _mo=_origMat?monthsBetween(_eff,_origMat):null;return _mo!==null?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Within 36 months of maturity</span><span className={`font-semibold ${_mo<=36?"text-red-500":"text-emerald-600"}`}>{_mo<=36?"⚠️ Yes — within 36mo":"✅ No"} — auto ({_mo} mo remaining)</span></div>:<Tog label="Within 36 months of maturity or projected payoff (manual — enter Maturity Date to auto-compute)" value={loan.fnmaWithin36MonthsMaturity} onChange={v=>set("fnmaWithin36MonthsMaturity",v)}/>;})()}
                  <Tog label="QRPC (Qualified Right Party Contact) achieved" value={loan.fnmaQRPCAchieved} onChange={v=>set("fnmaQRPCAchieved",v)}/>
                </Sec>
                {loan.fnmaImminentDefault && (
                  <Sec title="FNMA – Imminent Default Business Rules">
                    <div className="flex items-center gap-1 mb-1"><SrcBadge type="calc"/><span className="text-[10px] text-slate-400 ml-1">Auto-derived from financial inputs</span></div>
                    <div className="bg-amber-50 rounded p-2 text-xs text-amber-700 mb-2">Required when servicer marks borrower as Imminent Default (current/&lt;60 DLQ)</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Rule 1 (all required)</div>
                    <div className="flex items-center justify-between gap-3 py-0.5"><span className="text-xs text-slate-600 flex-1 leading-snug">Primary Residence (from Property Type above)</span><span className={`text-xs font-bold px-2 py-0.5 rounded ${loan.fnmaPropertyType === "Principal Residence" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{loan.fnmaPropertyType === "Principal Residence" ? "✅ Yes" : "❌ No"}</span></div>
                    <Tog label="Long-term or permanent hardship" value={loan.fnmaLongTermHardship} onChange={v=>set("fnmaLongTermHardship",v)}/>
                    {n(loan.cashReservesAmount)>0&&n(loan.currentPITI)>0?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Cash reserves &lt; 3 months PITIA</span><span className={`font-semibold ${n(loan.cashReservesAmount)<n(loan.currentPITI)*3?"text-emerald-600":"text-red-500"}`}>{n(loan.cashReservesAmount)<n(loan.currentPITI)*3?"✅ Yes":"❌ No"} — auto ({fmt$(n(loan.cashReservesAmount))} vs 3-mo {fmt$(n(loan.currentPITI)*3)})</span></div>:<Tog label="Cash reserves < 3 months PITIA (manual — enter Cash Reserves & PITI above to auto-compute)" value={loan.fnmaCashReservesLt3Mo} onChange={v=>set("fnmaCashReservesLt3Mo",v)}/>}
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 mt-2">Rule 2 (any one required)</div>
                    <F label="FICO Score (middle/lower method)"><Num value={loan.fnmaFICO} onChange={v=>set("fnmaFICO",v)} placeholder="e.g. 620"/></F>
                    <Tog label="2+ 30-day DLQ in past 12 months" value={loan.fnmaPrior30DLQ12Mo} onChange={v=>set("fnmaPrior30DLQ12Mo",v)}/>
                    {n(loan.currentPITI)>0&&n(loan.grossMonthlyIncome)>0?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Pre-Mod Housing Expense / GMI (%)</span><span className="font-semibold text-blue-700">Auto: {(n(loan.currentPITI)/n(loan.grossMonthlyIncome)*100).toFixed(1)}% {n(loan.currentPITI)/n(loan.grossMonthlyIncome)*100>55?"⚠️ >55% (Rule 2 met)":"— ≤55%"}</span></div>:<F label="Pre-Mod Housing Expense / GMI (%)"><Num value={loan.fnmaHousingRatio} onChange={v=>set("fnmaHousingRatio",v)} placeholder="e.g. 55"/></F>}
                    {(n(loan.fnmaFICO) > 0 || loan.fnmaPrior30DLQ12Mo || n(loan.fnmaHousingRatio) > 0 || (n(loan.currentPITI)>0&&n(loan.grossMonthlyIncome)>0)) && <div className="bg-emerald-50 rounded p-2 text-xs text-emerald-800 mt-1">
                      {(()=>{const _hr=n(loan.currentPITI)>0&&n(loan.grossMonthlyIncome)>0?n(loan.currentPITI)/n(loan.grossMonthlyIncome)*100:n(loan.fnmaHousingRatio);return <span>Rule 2: <strong>{n(loan.fnmaFICO) <= 620 && n(loan.fnmaFICO) > 0 ? "✅ FICO ≤ 620" : loan.fnmaPrior30DLQ12Mo ? "✅ 2x30 DLQ" : _hr > 55 ? "✅ DTI > 55%" : "❌ No Rule 2 criteria met"}</strong></span>;})()}
                    </div>}
                  </Sec>
                )}
                <Sec title="FNMA – Prior Workout History">
                  <div className="flex items-center gap-1 mb-1"><SrcBadge type="los"/><span className="text-[10px] text-slate-400 ml-1">Pull from servicing system</span></div>
                  <F label="Prior deferred balance (non-interest-bearing forbearance from prior deferrals — added to UPB for Flex Mod)"><Num value={loan.fnmaPriorDeferredUPB} onChange={v=>set("fnmaPriorDeferredUPB",v)} placeholder="0" prefix="$"/></F>
                  <F label="Months since last non-disaster payment deferral (0 = never)"><Num value={loan.fnmaPriorDeferralMonths} onChange={v=>set("fnmaPriorDeferralMonths",v)} placeholder="0 = never"/></F>
                  <F label="Cumulative months deferred (lifetime total, prior to this evaluation)"><Num value={loan.fnmaCumulativeDeferredMonths} onChange={v=>set("fnmaCumulativeDeferredMonths",v)} placeholder="0"/></F>
                  <F label="Prior modifications (count — deferrals excluded from count)"><Num value={loan.fnmaPriorModCount} onChange={v=>set("fnmaPriorModCount",v)} placeholder="0"/></F>
                  <Tog label="Failed Flex Mod TPP within 12 months" value={loan.fnmaFailedTPP12Months} onChange={v=>set("fnmaFailedTPP12Months",v)}/>
                  <Tog label="60+ day re-default within 12 months of last Flex Mod" value={loan.fnmaReDefaulted12Months} onChange={v=>set("fnmaReDefaulted12Months",v)}/>
                </Sec>
                <Sec title="FNMA – Active Status Blockers">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 mb-1">These fields reflect current workout status — pull from servicing system</div>
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
                  {(()=>{const _today=new Date().toISOString().split("T")[0];const _eff=loan.approvalEffectiveDate||_today;const _auto=loan.noteFirstPaymentDate?monthsBetween(loan.noteFirstPaymentDate,_eff):null;return _auto!==null?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Loan Age (months since origination)</span><span className="font-semibold text-blue-700">Auto: {_auto} months {_auto<12?"⚠️ <12mo":""}</span></div>:<F label="Loan Age (months since origination — enter Note First Payment Date to auto-compute)"><Num value={loan.fhlmcLoanAge} onChange={v=>set("fhlmcLoanAge",v)} placeholder="e.g. 36"/></F>;})()}
                  <F label="Mortgage Program"><Sel value={loan.fhlmcMortgageType} onChange={v=>set("fhlmcMortgageType",v)} options={["Conventional","FHA","VA","RHS"]}/></F>
                  <F label="Rate Type"><Sel value={loan.fhlmcRateType} onChange={v=>set("fhlmcRateType",v)} options={["Fixed Rate","ARM"]}/></F>
                  {loan.fhlmcRateType === "ARM" && (<>
                    <F label="Current Index Rate (%)"><Num value={loan.fhlmcCurrentIndex} onChange={v=>set("fhlmcCurrentIndex",v)} placeholder="e.g. 5.32 (SOFR)"/></F>
                    <F label="Margin (%)"><Num value={loan.fhlmcMarginRate} onChange={v=>set("fhlmcMarginRate",v)} placeholder="e.g. 2.25"/></F>
                    {n(loan.fhlmcCurrentIndex) > 0 && n(loan.fhlmcMarginRate) > 0 && <div className="bg-teal-50 rounded p-2 text-xs text-teal-800 mt-1">
                      <div>Fully-Indexed Rate: <strong>{(Math.round((n(loan.fhlmcCurrentIndex) + n(loan.fhlmcMarginRate)) * 8) / 8).toFixed(4)}%</strong> (nearest 0.125%)</div>
                      <div>Preliminary Rate (Step 2): <strong>{Math.min(n(loan.fhlmcCurrentIndex) + n(loan.fhlmcMarginRate), n(loan.currentInterestRate)).toFixed(4)}%</strong> (lower of note rate / fully-indexed)</div>
                    </div>}
                  </>)}
                  <F label="Property Type"><Sel value={loan.fhlmcPropertyType} onChange={v=>set("fhlmcPropertyType",v)} options={["Primary Residence","Second Home","Investment Property"]}/></F>
                  <F label="FM Posted Modification Rate (%)"><Num value={loan.fhlmcPostedModRate} onChange={v=>set("fhlmcPostedModRate",v)} placeholder="e.g. 6.5"/></F>
                  <F label="Estimated Property Value"><Num value={loan.fhlmcPropertyValue} onChange={v=>set("fhlmcPropertyValue",v)} placeholder="e.g. 300000" prefix="$"/></F>
                  {n(loan.fhlmcPropertyValue)>0&&n(loan.upb)>0&&<div className="bg-teal-50 rounded p-2 text-xs text-teal-800 space-y-0.5 mt-1">
                    <div>Current MTMLTV: <strong>{(n(loan.upb)/n(loan.fhlmcPropertyValue)*100).toFixed(1)}%</strong></div>
                    <div>Post-Cap MTMLTV: <strong>{((n(loan.upb)+n(loan.arrearagesToCapitalize)+n(loan.legalFees))/n(loan.fhlmcPropertyValue)*100).toFixed(1)}%</strong></div>
                    <div className="text-slate-500">≥80% → rate relief eligible (§9206.6); &gt;80% → principal forbearance eligible</div>
                  </div>}
                  <Tog label="Hardship resolved (temporary, no longer a problem)" value={loan.fhlmcHardshipResolved} onChange={v=>set("fhlmcHardshipResolved",v)}/>
                  <Tog label="Can resume full contractual monthly payment" value={loan.fhlmcCanResumeFull} onChange={v=>set("fhlmcCanResumeFull",v)}/>
                  {(()=>{const _cash=n(loan.cashReservesAmount),_piti=n(loan.currentPITI),_gmi=n(loan.grossMonthlyIncome),_fico=n(loan.fhlmcFICO);const _hr=_piti>0&&_gmi>0?_piti/_gmi*100:n(loan.fhlmcHousingExpenseRatio);const _hasInputs=_cash>0&&_piti>0&&_gmi>0&&_fico>0&&loan.fhlmcPropertyType!=="";const _cashLt25k=_cash>0?_cash<25000:loan.fhlmcCashReservesLt25k;const _isPrimary=loan.fhlmcPropertyType==="Primary Residence";const _r1=_cashLt25k&&_isPrimary&&loan.fhlmcLongTermHardship;const _r2=_fico<=620||loan.fhlmcPrior30DayDLQ6Mo||_hr>40;const _autoID=_hasInputs?(_r1&&_r2):null;return _autoID!==null?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Servicer imminent default determination</span><span className={`font-semibold ${_autoID?"text-amber-600":"text-emerald-600"}`}>{_autoID?"⚠️ Yes (auto)":"✅ No (auto)"} — R1:{_r1?"✓":"✗"} R2:{_r2?"✓":"✗"}</span></div>:<Tog label="Servicer imminent default determination (manual — enter cash, PITI, GMI, FICO to auto-compute)" value={loan.fhlmcImminentDefault} onChange={v=>set("fhlmcImminentDefault",v)}/>;})()}
                  <Tog label="Long-term/permanent hardship (NOT unemployment)" value={loan.fhlmcLongTermHardship} onChange={v=>set("fhlmcLongTermHardship",v)}/>
                  <Tog label="Unemployed borrower (→ forbearance, not Flex Mod)" value={loan.fhlmcUnemployed} onChange={v=>set("fhlmcUnemployed",v)}/>
                  <Tog label="Verified income" value={loan.fhlmcVerifiedIncome} onChange={v=>set("fhlmcVerifiedIncome",v)}/>
                  <Tog label="Recourse or indemnification arrangement" value={loan.fhlmcRecourse} onChange={v=>set("fhlmcRecourse",v)}/>
                </Sec>
                <Sec title="FHLMC – Imminent Default (current/&lt;60 DLQ)">
                  <div className="flex items-center gap-1 mb-1"><SrcBadge type="calc"/><span className="text-[10px] text-slate-400 ml-1">Auto-derived from financial inputs</span></div>
                  {n(loan.cashReservesAmount)>0?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Cash Reserves &lt; $25,000</span><span className={`font-semibold ${n(loan.cashReservesAmount)<25000?"text-emerald-600":"text-red-500"}`}>{n(loan.cashReservesAmount)<25000?"✅ Yes":"❌ No"} — auto ({fmt$(n(loan.cashReservesAmount))})</span></div>:<Tog label="Cash Reserves < $25,000 (manual — enter Cash Reserves above to auto-compute)" value={loan.fhlmcCashReservesLt25k} onChange={v=>set("fhlmcCashReservesLt25k",v)}/>}
                  <F label="FICO Score (middle/lower method)"><Num value={loan.fhlmcFICO} onChange={v=>set("fhlmcFICO",v)} placeholder="e.g. 620"/></F>
                  {n(loan.currentPITI)>0&&n(loan.grossMonthlyIncome)>0?<div className="flex items-center justify-between py-1 text-xs"><span className="text-slate-600">Pre-Mod Housing Expense / GMI (%)</span><span className="font-semibold text-blue-700">Auto: {(n(loan.currentPITI)/n(loan.grossMonthlyIncome)*100).toFixed(1)}% {n(loan.currentPITI)/n(loan.grossMonthlyIncome)*100>40?"⚠️ >40% (Rule 2 met)":"— ≤40%"}</span></div>:<F label="Pre-Mod Housing Expense / GMI (%)"><Num value={loan.fhlmcHousingExpenseRatio} onChange={v=>set("fhlmcHousingExpenseRatio",v)} placeholder="e.g. 45"/></F>}
                  <Tog label="2+ 30-day DLQ in most recent 6-month period" value={loan.fhlmcPrior30DayDLQ6Mo} onChange={v=>set("fhlmcPrior30DayDLQ6Mo",v)}/>
                </Sec>
                <Sec title="FHLMC – Prior Workout History">
                  <div className="flex items-center gap-1 mb-1"><SrcBadge type="los"/><span className="text-[10px] text-slate-400 ml-1">Pull from servicing system</span></div>
                  <F label="Prior deferred balance (non-interest-bearing forbearance from prior deferrals — added to UPB for Flex Mod)"><Num value={loan.fhlmcPriorDeferredUPB} onChange={v=>set("fhlmcPriorDeferredUPB",v)} placeholder="0" prefix="$"/></F>
                  <F label="Cumulative months deferred (lifetime total, prior to this evaluation)"><Num value={loan.fhlmcCumulativeDeferredMonths} onChange={v=>set("fhlmcCumulativeDeferredMonths",v)} placeholder="0"/></F>
                  <F label="Months since last non-disaster payment deferral (0 = never)"><Num value={loan.fhlmcPriorDeferralMonths} onChange={v=>set("fhlmcPriorDeferralMonths",v)} placeholder="0 = never"/></F>
                  <F label="Prior modifications (count)"><Num value={loan.fhlmcPriorModCount} onChange={v=>set("fhlmcPriorModCount",v)} placeholder="0"/></F>
                  <Tog label="Failed Flex Mod TPP within 12 months" value={loan.fhlmcFailedFlexTPP12Mo} onChange={v=>set("fhlmcFailedFlexTPP12Mo",v)}/>
                  <Tog label="Prior Flex Mod → 60+ DLQ within 12mo, not cured" value={loan.fhlmcPriorFlexMod60DLQ} onChange={v=>set("fhlmcPriorFlexMod60DLQ",v)}/>
                  <Tog label="Step-Rate Mortgage" value={loan.fhlmcStepRateMortgage} onChange={v=>set("fhlmcStepRateMortgage",v)}/>
                  {loan.fhlmcStepRateMortgage&&<Tog label="Interest rate adjusted within past 12 months" value={loan.fhlmcRateAdjustedWithin12Mo} onChange={v=>set("fhlmcRateAdjustedWithin12Mo",v)}/>}
                </Sec>
                <Sec title="FHLMC – Active Status Blockers">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 mb-1">These fields reflect current workout status — pull from servicing system</div>
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
              {(()=>{
                const _lt=loan.loanType;
                const _fields=[
                  {label:"UPB",key:"upb",val:loan.upb,group:"Core financials",all:true},
                  {label:"GMI",key:"grossMonthlyIncome",val:loan.grossMonthlyIncome,group:"Core financials",all:true},
                  {label:"Current PITI",key:"currentPITI",val:loan.currentPITI,group:"Core financials",all:true},
                  {label:"Current P&I",key:"currentPI",val:loan.currentPI,group:"Core financials",types:["FHA","VA"]},
                  {label:"Delinquency (months)",key:"delinquencyMonths",val:loan.delinquencyMonths,group:"Core financials",all:true},
                  {label:"Arrearages",key:"arrearagesToCapitalize",val:loan.arrearagesToCapitalize,group:"Arrears",all:true},
                  {label:"Cash Reserves",key:"cashReservesAmount",val:loan.cashReservesAmount,group:"Cash reserves",types:["FHLMC","FNMA"]},
                  {label:"Monthly Non-Housing Expenses",key:"monthlyExpenses",val:loan.monthlyExpenses,group:"Non-housing expenses",types:["VA","USDA","FHA"]},
                  {label:"PMMS Rate",key:"pmmsRate",val:loan.pmmsRate,group:"PMMS rate",types:["FHA","VA","FNMA"]},
                  {label:"Note First Payment Date",key:"noteFirstPaymentDate",val:loan.noteFirstPaymentDate,group:"Loan age",types:["FNMA","FHLMC"]},
                  {label:"Original UPB",key:"originalUpb",val:loan.originalUpb,group:"Original UPB",types:["FHA","VA","USDA"]},
                ];
                const relevant=_fields.filter(f=>f.all||(f.types&&f.types.includes(_lt)));
                const filled=relevant.filter(f=>f.val&&String(f.val).trim()!=="");
                const missing=relevant.filter(f=>!f.val||String(f.val).trim()==="");
                const score=filled.length, total=relevant.length;
                const pct=total>0?Math.round(score/total*100):100;
                return(<div className="mt-3 mb-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data Completeness</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pct>=80?"bg-emerald-100 text-emerald-700":pct>=50?"bg-amber-100 text-amber-700":"bg-red-100 text-red-700"}`}>{score}/{total} fields — {pct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2"><div className={`h-1.5 rounded-full transition-all ${pct>=80?"bg-emerald-500":pct>=50?"bg-amber-400":"bg-red-400"}`} style={{width:pct+"%"}}/></div>
                  {missing.length>0&&<div className="space-y-0.5">{missing.map((f,i)=><div key={i} className="flex items-center gap-1.5 text-[10px] text-amber-700"><span>⚠️</span><span><strong>{f.label}</strong> ({f.group}) — will fall back to manual toggle</span></div>)}</div>}
                  {missing.length===0&&<div className="text-[10px] text-emerald-600 font-semibold">✅ All key fields entered — full auto-compute active</div>}
                </div>);
              })()}
              <button onClick={evaluate} className="w-full bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-black py-3 rounded-xl text-sm mt-3 shadow-lg shadow-emerald-200 transition-all active:scale-95">🔍 Evaluate Loan →</button>
              {supabaseConfigured
                ? <button onClick={loadCases} className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl text-sm mt-2 shadow-sm transition-all">📂 Load Case</button>
                : <div className="mt-2 text-xs text-slate-400 text-center bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">Supabase not configured — set up .env to enable save/load</div>}
              <button onClick={()=>setShowDbSetup(true)} className="w-full mt-2 text-xs text-slate-400 hover:text-slate-600 border border-dashed border-slate-200 hover:border-slate-300 py-2 rounded-xl transition-all">📋 View Setup SQL</button>
            </div>
          </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {tab==="results"&&(
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
                  <button onClick={shareEvaluation} className="ml-auto text-xs bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm font-medium transition-all">🔗 Share</button>
                  <button onClick={printReport} className="text-xs bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm font-medium transition-all">🖨 Print Report</button>
                  {supabaseConfigured
                    ? <button onClick={saveCase} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 px-3 py-1.5 rounded-lg shadow-sm font-medium transition-all">💾 Save Case</button>
                    : null}
                </div>
                {saveToast&&<div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-3 py-2 rounded-xl mb-3 font-semibold">{saveToast}</div>}
                {validationWarnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                    <div className="text-sm font-bold text-amber-800 mb-2">⚠️ Input Validation Warnings</div>
                    {validationWarnings.map((w, i) => (
                      <div key={i} className="text-xs text-amber-700 flex gap-2 py-0.5">
                        <span>•</span><span>{w}</span>
                      </div>
                    ))}
                    <div className="text-xs text-amber-500 mt-2">These are warnings only — evaluation results are shown below</div>
                  </div>
                )}
                {(() => {
                  const daysOld = guidelineDaysOld(loan.loanType);
                  const gv = GUIDELINE_VERSIONS[loan.loanType];
                  if (!gv || daysOld <= 90) return null;
                  return (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-3 flex items-start gap-2">
                      <span className="text-orange-500 text-lg">📅</span>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-orange-800">Guideline Currency Warning</div>
                        <div className="text-xs text-orange-700 mt-0.5">
                          {loan.loanType} guidelines last verified {daysOld} days ago ({gv.lastVerified}).
                          Verify <strong>{gv.version}</strong> is still current before issuing decisions.
                        </div>
                        <a href={gv.url} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 underline mt-1 inline-block">
                          Check {loan.loanType} guidelines →
                        </a>
                      </div>
                    </div>
                  );
                })()}
                {/* Recommended Path */}
                {(()=>{
                  const {waterfallEligible,extras,topOption}=computeWaterfall(loan.loanType,eligible);
                  const reason=generateWaterfallReason(topOption,loan,null);
                  if(eligible.length===0)return null;
                  return(
                    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-2xl p-5 mb-5">
                      <div className="text-sm font-black text-emerald-800 mb-3">🎯 Recommended Waterfall Path</div>
                      {topOption&&(
                        <div className="bg-white rounded-xl p-4 border border-emerald-300 mb-3">
                          <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Best Option</div>
                          <div className="text-lg font-black text-emerald-700">{topOption.option}</div>
                          <div className="text-sm text-slate-600 mt-1">{reason}</div>
                          {topOption.note&&<div className="text-xs text-emerald-600 mt-1.5 italic">{topOption.note}</div>}
                        </div>
                      )}
                      {waterfallEligible.length>1&&(<>
                        <div className="text-xs font-bold text-slate-500 uppercase mb-2">Full eligible waterfall</div>
                        {waterfallEligible.map((opt,i)=>(
                          <div key={i} className="flex items-center gap-2 py-1 text-sm">
                            <span className="text-slate-400 w-5 text-right">{i+1}.</span>
                            <span className="text-emerald-700 font-semibold">{opt.option}</span>
                          </div>
                        ))}
                      </>)}
                      {extras.length>0&&(
                        <div className="mt-2 pt-2 border-t border-emerald-100">
                          <div className="text-xs font-bold text-slate-400 uppercase mb-1">Also eligible (disaster/disposition)</div>
                          {extras.map((opt,i)=>(
                            <div key={i} className="flex items-center gap-2 py-0.5 text-xs">
                              <span className="text-slate-400">•</span>
                              <span className="text-blue-700 font-medium">{opt.option}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                          {OPTION_CITATIONS[r.option] && <div className="text-xs text-slate-400 mt-0.5">📖 {OPTION_CITATIONS[r.option]}</div>}
                          {r.note&&<div className="text-xs text-emerald-600 mt-0.5">{r.note}</div>}
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 transition-all ${expanded===`e${i}`?"bg-slate-200 text-slate-600":"bg-emerald-100 text-emerald-700"}`}>{expanded===`e${i}`?"▲ Hide":"View Terms ▼"}</span>
                    </button>
                    {expanded===`e${i}`&&(
                      <div className="px-4 pb-4 bg-white">
                        {r.calc&&<div className="text-xs bg-emerald-50 text-emerald-700 rounded-lg px-3 py-2 mb-2 border border-emerald-100">📊 {r.calc}</div>}
                        <CalcTermsPanel optionName={r.option} loan={loan}/>
                      </div>
                    )}
                  </div>
                ))}
              </>)}
            </div>
            <div className="overflow-y-auto" style={{maxHeight:"82vh"}}>
              {evaluated&&(<>
                {supabaseConfigured&&(
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Case Notes</div>
                    <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" rows={3} value={caseNotes} onChange={e=>setCaseNotes(e.target.value)} placeholder="Add underwriting notes, documentation status, etc."/>
                    <div className="mt-2">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Assign To (email)</div>
                      <input className="border border-slate-200 rounded px-2 py-1 text-sm w-full" value={assigneeEmail} onChange={e=>setAssigneeEmail(e.target.value)} placeholder="colleague@company.com"/>
                    </div>
                    <button onClick={saveCase} className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition-all">💾 Save Case</button>
                    {saveToast&&<div className="mt-1.5 text-xs text-emerald-700 font-semibold">{saveToast}</div>}
                  </div>
                )}
                {/* Trial Payment Plan Calculator */}
                {(()=>{
                  const eligibleMods = eligible.filter(r => r.option.includes("Modification") || r.option.includes("Mod"));
                  if (eligibleMods.length === 0) return null;
                  const topMod = eligibleMods[0];
                  const terms = calcApprovalTerms(topMod.option, loan);
                  const newPITI = terms?.["New Monthly PITI"];
                  if (!newPITI || newPITI === "N/A" || String(newPITI).startsWith("Enter")) return null;
                  const effDate = loan.approvalEffectiveDate || new Date().toISOString().split("T")[0];
                  // Get first of month 2 months after effective date
                  const firstOfNextMonth = calcNewFirstPayment(effDate);
                  const pmt1 = firstOfNextMonth;
                  const pmt2 = addMonths(firstOfNextMonth, 1);
                  const pmt3 = addMonths(firstOfNextMonth, 2);
                  const modEffDate = addMonths(firstOfNextMonth, 3);
                  const needsIncomeDoc = !topMod.option.includes("Streamlined") && !topMod.option.includes("Payment Deferral");
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                      <div className="text-sm font-black text-blue-800 mb-3">📅 Trial Payment Plan — {topMod.option}</div>
                      <div className="bg-white rounded-lg p-3 border border-blue-100 mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-slate-500 font-semibold">Trial Payment (new PITI)</span>
                          <span className="text-sm font-black text-blue-700">{newPITI}/mo</span>
                        </div>
                        <div className="space-y-1">
                          {[["Payment 1",pmt1],["Payment 2",pmt2],["Payment 3",pmt3]].map(([label,date])=>(
                            <div key={label} className="flex justify-between items-center text-xs">
                              <span className="text-slate-500">{label}</span>
                              <span className="font-semibold text-slate-700">{fmtDate(date)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex gap-2"><span className="text-emerald-600 font-semibold">If Successful:</span><span className="text-slate-700">Modification effective {fmtDate(modEffDate)} — loan permanently modified</span></div>
                        <div className="flex gap-2"><span className="text-red-500 font-semibold">If Failed:</span><span className="text-slate-700">Borrower returns to default — servicer must re-evaluate options</span></div>
                        <div className="flex gap-2"><span className="text-slate-500 font-semibold">Income Doc:</span><span className="text-slate-700">{needsIncomeDoc ? "Required prior to permanent modification" : "Not required — streamlined review"}</span></div>
                      </div>
                    </div>
                  );
                })()}
                {results.filter(r=>r.eligible).length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 mt-4 mb-4">
                    <div className="text-sm font-black text-slate-700 mb-3">📋 Document Checklist</div>
                    <select className="border rounded-lg px-2 py-1.5 text-sm w-full mb-3"
                      value={selectedDocOption} onChange={e=>setSelectedDocOption(e.target.value)}>
                      <option value="">Select option to view docs...</option>
                      {results.filter(r=>r.eligible).map(r=>(
                        <option key={r.option} value={r.option}>{r.option}</option>
                      ))}
                    </select>
                    {selectedDocOption && OPTION_DOCS[selectedDocOption] && (() => {
                      const docs = OPTION_DOCS[selectedDocOption];
                      return (
                        <div>
                          {docs.required.map(doc => {
                            const key = `${selectedDocOption}::${doc}`;
                            return (
                              <label key={key} className="flex items-start gap-2 py-1.5 cursor-pointer group">
                                <input type="checkbox" className="mt-0.5 accent-emerald-600"
                                  checked={!!checkedDocs[key]}
                                  onChange={e => setCheckedDocs(prev => ({...prev, [key]: e.target.checked}))}/>
                                <span className={`text-sm ${checkedDocs[key] ? "line-through text-slate-400" : "text-slate-700"}`}>{doc}</span>
                                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded ml-auto font-bold flex-shrink-0">Required</span>
                              </label>
                            );
                          })}
                          {docs.conditional.map(({doc, condition}) => {
                            const key = `${selectedDocOption}::cond::${doc}`;
                            return (
                              <label key={key} className="flex items-start gap-2 py-1.5 cursor-pointer">
                                <input type="checkbox" className="mt-0.5 accent-amber-500"
                                  checked={!!checkedDocs[key]}
                                  onChange={e => setCheckedDocs(prev => ({...prev, [key]: e.target.checked}))}/>
                                <div className="flex-1">
                                  <span className={`text-sm ${checkedDocs[key] ? "line-through text-slate-400" : "text-slate-700"}`}>{doc}</span>
                                  <div className="text-xs text-amber-600">{condition}</div>
                                </div>
                                <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded ml-auto font-bold flex-shrink-0">Conditional</span>
                              </label>
                            );
                          })}
                          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                            ⏱️ <strong>Timeline:</strong> {docs.timeline}
                          </div>
                          {(() => {
                            const allDocs = [...docs.required.map(d=>`${selectedDocOption}::${d}`), ...docs.conditional.map(d=>`${selectedDocOption}::cond::${d.doc}`)];
                            const checked = allDocs.filter(k=>checkedDocs[k]).length;
                            return checked > 0 && (
                              <div className="mt-2 text-xs text-emerald-600 font-semibold">{checked}/{allDocs.length} documents received</div>
                            );
                          })()}
                        </div>
                      );
                    })()}
                  </div>
                )}
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Ineligible Options</div>
                {ineligible.map((r,i)=>{
                  const fail=r.nodes?.find(nd=>!nd.pass);
                  const isOverlay = r.overlayBlocked;
                  return(<div key={i} className={`border rounded-xl mb-2 overflow-hidden shadow-sm ${isOverlay?"bg-red-50 border-red-200":"bg-white border-slate-200"}`}>
                    <button className="w-full text-left px-4 py-3 flex items-center justify-between" onClick={()=>setExpanded(expanded===`n${i}`?null:`n${i}`)}>
                      <div className="flex items-start gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 ${isOverlay?"bg-red-200 text-red-700":"bg-slate-200 text-slate-500"}`}>{isOverlay?"🚫":"✗"}</span>
                        <div>
                          <div className="font-semibold text-xs text-slate-700 flex items-center gap-2">{r.option}{isOverlay&&<span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">🚫 Servicer Overlay</span>}</div>
                          {isOverlay&&r.overlayReasons&&<div className="text-xs text-red-600 mt-0.5">{r.overlayReasons[0]}</div>}
                          {!isOverlay&&fail&&<div className="text-xs text-red-500 mt-0.5">↳ {fail.question}: <em>{fail.answer}</em></div>}
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
                      {OPTION_CITATIONS[r.option] && (
                        <div className="text-xs text-slate-400 italic mb-2 mt-2">Regulatory basis: {OPTION_CITATIONS[r.option]}</div>
                      )}
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
                  <div className="flex gap-2">
                    <button onClick={printReport} className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4 py-2 rounded-lg font-bold shadow-sm transition-all">📄 Print Report</button>
                    <button onClick={()=>{
                      const txt=[
                        `LOSS MITIGATION EVALUATION REPORT`,
                        `Date: ${new Date().toLocaleDateString()} | Loan Type: ${loan.loanType}${loan.loanNumber?" | Loan #: "+loan.loanNumber:""}${loan.borrowerName?" | Borrower: "+loan.borrowerName:""}`,
                        `DLQ: ${loan.delinquencyMonths||"—"} months | Hardship: ${loan.hardshipType} (${loan.hardshipDuration})`,
                        `UPB: ${loan.upb?fmt$(n(loan.upb)):"—"} | GMI: ${gmi>0?"$"+Number(loan.grossMonthlyIncome).toLocaleString():"—"}`,
                        "",
                        `ELIGIBLE OPTIONS (${eligible.length}):`,
                        ...eligible.map((r,i)=>`  ${i+1}. ${r.option}${r.note?" — "+r.note:""}`),
                        "",
                        `INELIGIBLE OPTIONS (${ineligible.length}):`,
                        ...ineligible.map(r=>{const f=r.nodes?.find((nd:any)=>!nd.pass);return`  ✗ ${r.option}${f?" — Failed: "+f.question+" ("+f.answer+")":""}`;})
                      ].join("\n");
                      navigator.clipboard.writeText(txt).then(()=>{setSaveToast("✅ Copied to clipboard!");setTimeout(()=>setSaveToast(""),3000);});
                    }} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs px-4 py-2 rounded-lg font-bold shadow-sm transition-all">💾 Copy as Text</button>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3 mb-5">
                  {[["DLQ",loan.delinquencyMonths?loan.delinquencyMonths+"mo":"—","bg-orange-50 border-orange-200"],["UPB",loan.upb?fmt$(n(loan.upb)):"—","bg-emerald-50 border-emerald-200"],["GMI",gmi>0?"$"+Number(loan.grossMonthlyIncome).toLocaleString():"—","bg-teal-50 border-teal-200"],["31% Target",target31?"$"+target31:"—","bg-emerald-50 border-emerald-200"],["Eligible",eligible.length,eligible.length>0?"bg-emerald-50 border-emerald-200":"bg-red-50 border-red-200"]].map(([k,v,cls])=>(<div key={k} className={`rounded-xl p-3 text-center border ${cls}`}><div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{k}</div><div className="font-black text-sm text-slate-800">{v}</div></div>))}
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
                  <button onClick={askAI} disabled={aiLoading} className={`text-sm px-4 py-2 rounded-xl font-bold shadow-sm transition-all ${aiLoading?"bg-slate-200 text-slate-400 cursor-not-allowed":"bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white"}`}>{aiLoading?"⏳ Analyzing...":"✨ Get AI Analysis"}</button>
                </div>
                <div className="mb-4"><label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">Anthropic API Key (not stored)</label><input type="password" className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-ant-..."/></div>
                {aiLoading&&<div className="text-sm text-slate-500 italic animate-pulse py-4 text-center">Analyzing loan data...</div>}
                {aiResponse&&<div className="text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-200 leading-relaxed">{aiResponse}</div>}
                {!aiResponse&&!aiLoading&&<p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3 border border-slate-100">Enter your API key and click Analyze to get expert waterfall recommendations, documentation checklists, and compliance notes.</p>}
              </div>
              {saveToast&&<div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded-xl font-semibold">{saveToast}</div>}
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800"><strong>Disclaimer:</strong> Decision-support tool only. Final determinations must be confirmed by a qualified loss mitigation underwriter per current HUD, USDA, and VA guidelines.</div>
            </>)}
          </div>
        )}

        {/* ── COMPARE ── */}
        {tab==="compare"&&(
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Loan A card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-black">A</div>
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
                    <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-black">B</div>
                    <h3 className="font-bold text-slate-800">Loan B — {loan2.loanType}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${evaluated2?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-400"}`}>{evaluated2?`${results2.filter(r=>r.eligible).length} eligible`:"Not evaluated"}</span>
                    <button onClick={evaluate2} className="text-xs bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors">Evaluate B</button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2 mt-3"><div className="h-3.5 w-0.5 rounded-full bg-slate-300"/><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loan Details</span></div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[["Loan Type","loanType",LOAN_TYPES],["Hardship Type","hardshipType",HARDSHIP_TYPES],["Hardship Duration","hardshipDuration",["Short Term","Long Term","Permanent","Unknown","Resolved"]]].map(([label,key,opts])=><div key={key} className="col-span-1"><label className="text-xs text-slate-500 mb-0.5 block">{label}</label><Sel value={loan2[key]} onChange={v=>set2(key,v)} options={opts}/></div>)}
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
                  <div><label className="text-xs text-slate-500 mb-0.5 block">Note First Payment</label><input type="date" className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-400" value={loan2.noteFirstPaymentDate} onChange={e=>set2("noteFirstPaymentDate",e.target.value)}/></div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">Note Term (months)</label><Num value={loan2.noteTerm} onChange={v=>set2("noteTerm",v)} placeholder="360"/></div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">Original Maturity</label><input type="date" className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-400" value={loan2.originalMaturityDate} onChange={e=>set2("originalMaturityDate",e.target.value)}/></div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">Effective Date</label><input type="date" className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-400" value={loan2.approvalEffectiveDate} onChange={e=>set2("approvalEffectiveDate",e.target.value)}/></div>
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
                    <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center font-black text-[10px]">A</span><span className="text-slate-300">{aCount} eligible</span></span>
                    <span className="text-slate-500">vs</span>
                    <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center font-black text-[10px]">B</span><span className="text-slate-300">{bCount} eligible</span></span>
                  </div>
                </div>
                <div className="overflow-x-auto"><table className="w-full text-xs">
                  <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="text-left px-4 py-2.5 font-semibold text-slate-600">Option</th><th className="text-center px-4 py-2.5 w-28 text-emerald-700 font-semibold">A ({loan.loanType})</th><th className="text-center px-4 py-2.5 w-28 text-teal-700 font-semibold">B ({loan2.loanType})</th><th className="text-center px-4 py-2.5 w-24 text-slate-500 font-semibold">Delta</th></tr></thead>
                  <tbody>{all.map((opt,i)=>{const aV=a[opt],bV=b[opt];return(<tr key={i} className={`border-b border-slate-100 ${aV&&bV?"bg-emerald-50/60":(!aV&&!bV)?"":"bg-amber-50/60"}`}><td className="px-4 py-2.5 font-medium text-slate-700">{opt}</td><td className="px-4 py-2.5 text-center">{aV===undefined?"—":aV?<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[10px]">✓</span>:<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 font-black text-[10px]">✗</span>}</td><td className="px-4 py-2.5 text-center">{bV===undefined?"—":bV?<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[10px]">✓</span>:<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 font-black text-[10px]">✗</span>}</td><td className="px-4 py-2.5 text-center">{aV&&bV?<span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Both</span>:(!aV&&!bV)?<span className="text-slate-300">Neither</span>:(aV&&!bV)?<span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">A only</span>:<span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-semibold">B only</span>}</td></tr>);})}</tbody>
                  <tfoot><tr className="bg-slate-50 border-t-2 border-slate-200"><td className="px-4 py-3 font-bold text-slate-700">Total Eligible</td><td className="px-4 py-3 text-center font-black text-emerald-700 text-sm">{aCount}</td><td className="px-4 py-3 text-center font-black text-teal-700 text-sm">{bCount}</td><td className="px-4 py-3 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${aCount>bCount?"bg-emerald-100 text-emerald-700":bCount>aCount?"bg-teal-100 text-teal-700":"bg-slate-100 text-slate-500"}`}>{aCount>bCount?"A wins":bCount>aCount?"B wins":"Tied"}</span></td></tr></tfoot>
                </table></div>
              </div>);
            })()}
          </div>
        )}

        {/* ── PORTFOLIO ── */}
        {tab==="portfolio"&&(
          <div className="max-w-7xl mx-auto p-5">
            <div className="text-xl font-black text-slate-800 mb-1">📦 Portfolio Evaluation</div>
            <div className="text-sm text-slate-500 mb-5">Upload a CSV of loans to evaluate all at once</div>

            {/* Upload area */}
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-400 p-10 text-center mb-5 transition-colors">
              <div className="text-4xl mb-3">📄</div>
              <div className="text-sm font-bold text-slate-700 mb-1">Drop CSV file here or click to upload</div>
              <div className="text-xs text-slate-400 mb-4">Required columns: loanType, delinquencyMonths. Optional: loanNumber, borrowerName, upb, currentPITI, grossMonthlyIncome, hardshipType, etc.</div>
              <input type="file" accept=".csv" className="hidden" id="csv-upload"
                onChange={e => { setPortfolioFile(e.target.files?.[0] || null); setPortfolioResults([]); }}/>
              <label htmlFor="csv-upload" className="bg-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-bold cursor-pointer hover:bg-emerald-800">Choose CSV File</label>
              {portfolioFile && <div className="text-sm text-emerald-600 mt-3 font-semibold">✅ {portfolioFile.name}</div>}
            </div>

            {/* Download template */}
            <div className="text-xs text-slate-500 mb-4">
              Need a template?
              <button onClick={() => {
                const headers = "loanNumber,borrowerName,loanType,delinquencyMonths,upb,currentPITI,currentPI,grossMonthlyIncome,currentEscrow,hardshipType,hardshipDuration,lienPosition,occupancyStatus,propertyDisposition,arrearagesToCapitalize,pmmsRate,currentInterestRate";
                const example = "1234567890,Smith John,FHA,6,247500,1800,1388,5200,412,Reduction in Income,Long Term,First,Owner Occupied,Principal Residence,7200,6.75,6.875";
                const csv = headers + "\n" + example;
                const blob = new Blob([csv], {type:"text/csv"});
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href=url; a.download="portfolio_template.csv"; a.click();
                URL.revokeObjectURL(url);
              }} className="text-emerald-600 underline ml-1">Download template CSV</button>
            </div>

            {portfolioFile && !portfolioRunning && portfolioResults.length === 0 && (
              <button onClick={runPortfolio} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-3 rounded-xl text-sm shadow-lg transition-all active:scale-95">
                🔍 Evaluate All Loans →
              </button>
            )}

            {portfolioRunning && (
              <div className="text-center py-8">
                <div className="text-slate-500 text-sm mb-3">Evaluating loans... {portfolioProgress}%</div>
                <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full transition-all" style={{width:`${portfolioProgress}%`}}/></div>
              </div>
            )}

            {portfolioResults.length > 0 && (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {([
                    ["Total Loans", portfolioResults.length],
                    ["With Eligible Options", portfolioResults.filter(r=>r.eligibleCount>0).length],
                    ["No Options Available", portfolioResults.filter(r=>r.eligibleCount===0).length],
                    ["Avg Eligible Options", (portfolioResults.reduce((s,r)=>s+r.eligibleCount,0)/portfolioResults.length).toFixed(1)],
                  ] as [string, string|number][]).map(([label, val]) => (
                    <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                      <div className="text-2xl font-black text-emerald-700">{val}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mb-3">
                  <button onClick={exportPortfolioCSV} className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-800">⬇️ Export CSV</button>
                  <button onClick={() => { setPortfolioResults([]); setPortfolioFile(null); }} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-200">Clear</button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {["Loan #","Borrower","Type","DLQ","UPB","Eligible","Top Option","Action"].map(h=>(
                          <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {portfolioResults.map((r, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono text-xs">{r.loanNumber}</td>
                          <td className="px-4 py-2.5">{r.borrowerName || "—"}</td>
                          <td className="px-4 py-2.5"><span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded">{r.loanType}</span></td>
                          <td className="px-4 py-2.5">{r.delinquencyMonths || "—"}</td>
                          <td className="px-4 py-2.5">{r._loan.upb ? `$${Number(r._loan.upb).toLocaleString()}` : "—"}</td>
                          <td className="px-4 py-2.5"><span className={`text-xs font-bold px-2 py-0.5 rounded ${r.eligibleCount>0?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-600"}`}>{r.eligibleCount}</span></td>
                          <td className="px-4 py-2.5 text-xs text-emerald-700 font-semibold max-w-48 truncate" title={r.topOption}>{r.topOption}</td>
                          <td className="px-4 py-2.5">
                            <button className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold whitespace-nowrap"
                              onClick={() => { setLoan({...initLoan, ...r._loan}); setTab("inputs"); }}>
                              Open →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === "settings" && (
          <div className="max-w-3xl mx-auto p-5">
            <div className="text-xl font-black text-slate-800 mb-1">⚙️ Servicer Settings</div>
            <div className="text-sm text-slate-500 mb-5">Configure servicer-specific overlays applied on top of agency guidelines</div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
              <div className="text-sm font-bold text-slate-700 mb-3">📋 Underwriting Overlays</div>
              <div className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3 mb-4">
                ⚠️ Overlays are applied on top of agency guidelines. Options blocked by overlays will show as ineligible with an overlay reason in the audit trail.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Minimum FICO Score (0 = no overlay)</label>
                  <input type="number" className="border rounded-lg px-3 py-2 text-sm w-full"
                    value={overlays.minFICO} onChange={e=>setOverlays(o=>({...o,minFICO:e.target.value}))}
                    placeholder="e.g. 580"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Max Delinquency (months, 0 = no limit)</label>
                  <input type="number" className="border rounded-lg px-3 py-2 text-sm w-full"
                    value={overlays.maxDLQMonths} onChange={e=>setOverlays(o=>({...o,maxDLQMonths:e.target.value}))}
                    placeholder="e.g. 24"/>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-bold text-slate-600 block mb-2">Excluded Loss Mitigation Options</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {["Payment Supplement","VASP (VA Partial Claim)","USDA Deed-in-Lieu","Freddie Mac Deed-in-Lieu","FNMA Deed-in-Lieu","VA Deed-in-Lieu"].map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" className="accent-red-500"
                        checked={overlays.excludedOptions.includes(opt)}
                        onChange={e => setOverlays(o => ({...o, excludedOptions: e.target.checked ? [...o.excludedOptions, opt] : o.excludedOptions.filter(x=>x!==opt)}))}/>
                      {opt}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-bold text-slate-600 block mb-1">Custom Report Footer Note</label>
                <textarea className="border rounded-lg px-3 py-2 text-sm w-full h-20 resize-none"
                  value={overlays.customNote} onChange={e=>setOverlays(o=>({...o,customNote:e.target.value}))}
                  placeholder="e.g. This evaluation is subject to CMG Financial servicer overlays effective January 2026..."/>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
              <div className="text-sm font-bold text-slate-700 mb-3">📅 Guideline Currency</div>
              {Object.entries(GUIDELINE_VERSIONS).map(([type, gv]) => {
                const days = guidelineDaysOld(type);
                const color = days <= 90 ? "text-emerald-600" : days <= 180 ? "text-amber-600" : "text-red-600";
                return (
                  <div key={type} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                    <span className="font-bold text-slate-700 w-14">{type}</span>
                    <span className="text-xs text-slate-600 flex-1">{gv.version}</span>
                    <span className={`text-xs font-semibold ${color}`}>{days}d ago</span>
                    <a href={gv.url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline">Check →</a>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
              <div className="text-sm font-bold text-slate-700 mb-3">🔐 Authentication</div>
              <div className="text-xs text-slate-500 space-y-2">
                <p>Currently using: <strong>{supabaseConfigured ? "Supabase Auth (magic link + OAuth)" : "No auth (local mode)"}</strong></p>
                <p>To enable Google/Microsoft SSO: enable the providers in your Supabase dashboard under Authentication → Providers.</p>
                <p>Magic link is enabled by default. Google and Microsoft require OAuth app registration.</p>
              </div>
            </div>

            {overlays.customNote && (
              <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 border border-slate-200">
                <strong>Report footer preview:</strong> {overlays.customNote}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AUTH GATE ────────────────────────────────────────────────────────────────
export default function App() {
  const [profile,setProfile]=useState<Profile|null>(null);
  const [authReady,setAuthReady]=useState(false);
  // screen: "login" | "signup" | "pending"
  const [screen,setScreen]=useState<"login"|"signup"|"pending">("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [fullName,setFullName]=useState("");
  const [authErr,setAuthErr]=useState("");
  const [authLoading,setAuthLoading]=useState(false);

  const loadProfile=async(userId:string)=>{
    try {
      const {data}=await supabase.from("profiles").select("*").eq("id",userId).single();
      if(data){ setProfile(data as Profile); }
      else { setScreen("pending"); }
    } catch { setScreen("pending"); }
  };

  // On mount: check for existing session once
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session){ loadProfile(session.user.id); }
      else { setAuthReady(true); }
    }).catch(()=>setAuthReady(true));
  },[]);

  // Once profile is loaded, mark auth as ready
  useEffect(()=>{ if(profile) setAuthReady(true); },[profile]);

  const handleSignOut=async()=>{
    await supabase.auth.signOut();
    setProfile(null); setScreen("login"); setEmail(""); setPassword(""); setFullName("");
  };

  const handleLogin=async(e:React.FormEvent)=>{
    e.preventDefault(); setAuthErr(""); setAuthLoading(true);
    try {
      const {data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error){ setAuthErr(error.message); }
      else if(data.user){ await loadProfile(data.user.id); setAuthReady(true); }
    } catch(e:any) {
      setAuthErr(e?.message||"Sign in failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp=async(e:React.FormEvent)=>{
    e.preventDefault(); setAuthErr(""); setAuthLoading(true);
    const {data:signUpData,error}=await supabase.auth.signUp({email,password});
    if(error){ setAuthErr(error.message); setAuthLoading(false); return; }
    if(signUpData.user){
      await supabase.from("profiles").insert({
        id: signUpData.user.id,
        email: signUpData.user.email,
        full_name: fullName,
      });
      setScreen("pending");
    }
    setAuthLoading(false);
  };

  const inputCls="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";
  const logo=(
    <div className="text-center mb-8">
      <img src={resolutionIQLogo} alt="ResolutionIQ" className="w-full max-w-xs mx-auto mb-2" />
    </div>
  );
  const shell=(content:React.ReactNode)=>(
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">{logo}{content}</div>
    </div>
  );

  if(!supabaseConfigured) return <ErrorBoundary>{shell(
    <div className="bg-red-900/40 border border-red-700 rounded-2xl p-6 text-center space-y-2">
      <p className="text-red-300 font-bold">Configuration Error</p>
      <p className="text-red-400 text-sm">Supabase environment variables are not set. Add <code className="bg-red-900/60 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-red-900/60 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> as GitHub repository secrets, then re-run the deployment.</p>
    </div>
  )}</ErrorBoundary>;

  if(!authReady) return <ErrorBoundary>{shell(<div className="text-center text-slate-400 py-8 text-sm">Loading…</div>)}</ErrorBoundary>;

  if(profile){
    if(!profile.approved) return <ErrorBoundary>{shell(
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4">
        <div className="text-3xl">⏳</div>
        <p className="text-white font-semibold">Access Pending</p>
        <p className="text-slate-400 text-sm">Your request for <strong className="text-slate-200">{profile.email}</strong> is awaiting admin approval. You'll be able to log in once approved.</p>
        <button onClick={handleSignOut} className="text-slate-500 hover:text-slate-300 text-xs underline">Sign out</button>
      </div>
    )}</ErrorBoundary>;
    return <ErrorBoundary><MainApp profile={profile} onSignOut={handleSignOut}/></ErrorBoundary>;
  }

  if(screen==="pending") return <ErrorBoundary>{shell(
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4">
      <div className="text-3xl">✅</div>
      <p className="text-white font-semibold">Request Submitted</p>
      <p className="text-slate-400 text-sm">Your account is pending approval. An admin will review your request shortly.</p>
      <button onClick={()=>{setScreen("login");setEmail("");setPassword("");setFullName("");}} className="text-slate-500 hover:text-slate-300 text-xs underline">Back to sign in</button>
    </div>
  )}</ErrorBoundary>;

  if(screen==="signup") return <ErrorBoundary>{shell(
    <form onSubmit={handleSignUp} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
      <p className="text-white font-bold text-sm">Request Access</p>
      <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label><input autoFocus className={inputCls} placeholder="Jane Smith" value={fullName} onChange={e=>{setFullName(e.target.value);setAuthErr("");}}/></div>
      <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Work Email</label><input type="email" className={inputCls} placeholder="you@cmgfi.com" value={email} onChange={e=>{setEmail(e.target.value);setAuthErr("");}}/></div>
      <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label><input type="password" className={inputCls} placeholder="Create a password" value={password} onChange={e=>{setPassword(e.target.value);setAuthErr("");}}/></div>
      {authErr&&<p className="text-red-400 text-xs font-medium">{authErr}</p>}
      <button type="submit" disabled={authLoading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-all text-sm shadow">{authLoading?"Submitting…":"Submit Request"}</button>
      <button type="button" onClick={()=>{setScreen("login");setAuthErr("");}} className="w-full text-slate-400 hover:text-slate-200 text-xs py-1 transition-all">Already have access? Sign in</button>
    </form>
  )}</ErrorBoundary>;

  return <ErrorBoundary>{shell(
    <form onSubmit={handleLogin} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
      <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email</label><input autoFocus type="email" className={inputCls} placeholder="you@cmgfi.com" value={email} onChange={e=>{setEmail(e.target.value);setAuthErr("");}}/></div>
      <div><label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label><input type="password" className={inputCls} placeholder="Enter password" value={password} onChange={e=>{setPassword(e.target.value);setAuthErr("");}}/></div>
      {authErr&&<p className="text-red-400 text-xs font-medium">{authErr}</p>}
      <button type="submit" disabled={authLoading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-all text-sm shadow">{authLoading?"Signing in…":"Sign In"}</button>
      <button type="button" onClick={()=>{setScreen("signup");setAuthErr("");}} className="w-full text-slate-400 hover:text-slate-200 text-xs py-1 transition-all">Don't have access? Request it →</button>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-600"/></div>
        <div className="relative text-center"><span className="bg-slate-800 px-2 text-xs text-slate-400">or continue with</span></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } })}
          className="flex items-center justify-center gap-2 border border-slate-600 rounded-lg py-2 text-sm font-medium hover:bg-slate-700 transition-colors text-slate-200">
          <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Google
        </button>
        <button type="button" onClick={() => supabase.auth.signInWithOAuth({ provider: "azure", options: { redirectTo: window.location.href, scopes: "email" } })}
          className="flex items-center justify-center gap-2 border border-slate-600 rounded-lg py-2 text-sm font-medium hover:bg-slate-700 transition-colors text-slate-200">
          <svg className="w-4 h-4" viewBox="0 0 23 23"><path fill="#f3f3f3" d="M0 0h23v23H0z"/><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
          Microsoft
        </button>
      </div>
    </form>
  )}</ErrorBoundary>;
}
