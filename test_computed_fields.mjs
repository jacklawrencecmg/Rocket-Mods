// test_computed_fields.mjs — Integration tests for auto-computed fields in evaluators
// Copies helpers and evaluator functions from test_evaluations.mjs pattern

// ─── HELPERS & CONSTANTS ─────────────────────────────────────────────────────
const STANDARD_HARDSHIPS = ["Unemployment","Business Failure","Increase in Housing Expenses","Property Problem","Reduction in Income","Unknown"];
const n = v => parseFloat(v) || 0;
const calcMonthlyPI = (principal, annualRate, termMonths) => {
  if (!principal || !annualRate || !termMonths) return null;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / termMonths;
  return principal * (r * Math.pow(1+r, termMonths)) / (Math.pow(1+r, termMonths) - 1);
};
const monthsBetween = (d1, d2) => {
  if (!d1 || !d2) return null;
  try {
    const a = new Date(d1+"T00:00:00"), b = new Date(d2+"T00:00:00");
    return (b.getFullYear()-a.getFullYear())*12 + (b.getMonth()-a.getMonth());
  } catch { return null; }
};
const calcOriginalMaturity = (firstPmt, termMonths) => {
  if (!firstPmt || !termMonths) return null;
  const d = new Date(firstPmt+"T00:00:00");
  d.setMonth(d.getMonth() + n(termMonths) - 1);
  return d.toISOString().split("T")[0];
};
function node(q, a, pass) { return { question:q, answer:String(a), pass }; }

const initLoan = {
  loanType:"FHA", loanNumber:"", borrowerName:"", repayMonths:"24",
  upb:"", originalUpb:"", currentEscrow:"", currentPI:"", currentPITI:"",
  grossMonthlyIncome:"", monthlyExpenses:"", cashReservesAmount:"",
  currentInterestRate:"", pmmsRate:"", modifiedPI:"",
  arrearagesToCapitalize:"", escrowShortage:"", legalFees:"", lateFees:"",
  escrowAdvanceBalance:"", accruedDelinquentInterest:"", suspenseBalance:"",
  priorPartialClaimBalance:"", partialClaimPct:"", targetPayment:"",
  originalMaturityDate:"", noteFirstPaymentDate:"", noteTerm:"", approvalEffectiveDate:"",
  delinquencyMonths:"", delinquencyDays:"",
  hardshipType:"Reduction in Income", hardshipDuration:"Resolved",
  lienPosition:"First", occupancyStatus:"Owner Occupied",
  propertyCondition:"Standard", propertyDisposition:"Principal Residence",
  foreclosureActive:false, occupancyAbandoned:false, continuousIncome:true,
  borrowerIntentRetention:true,
  canAchieveTargetByReamort:true, currentRateAtOrBelowMarket:true,
  currentPITIAtOrBelowTarget:true, borrowerConfirmedCannotAffordCurrent:false,
  borrowerCanAffordModifiedPayment:false, borrowerCanAffordReinstateOrRepay:false,
  borrowerCanAffordCurrentMonthly:false, modifiedPILe90PctOld:false,
  meetsPFSRequirements:false, outstandingDebtUncurable:false, meetsDILRequirements:false,
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
  usdaPriorWorkoutCompSaleFailed:false, usdaStep3DeferralRequired:false,
  fnmaLoanAge:"24", fnmaPriorDeferredUPB:"0", fnmaPropertyType:"Principal Residence",
  fnmaHardshipResolved:false, fnmaCanResumeFull:false, fnmaCannotReinstate:true,
  fnmaImminentDefault:false, fnmaWithin36MonthsMaturity:false,
  fnmaPriorDeferralMonths:"24", fnmaCumulativeDeferredMonths:"0",
  fnmaPriorModCount:"0", fnmaFailedTPP12Months:false, fnmaReDefaulted12Months:false,
  fnmaRecourseArrangement:false, fnmaActiveLiquidation:false,
  fnmaActiveRepayPlan:false, fnmaActivePendingOffer:false, fnmaActiveTPP:false,
  fnmaDisasterHardship:false, fnmaFEMADesignation:false, fnmaInsuredLoss:false,
  fnmaDelinquencyAtDisaster:"0", fnmaSameDlisasterPriorDeferral:false,
  fnmaMortgageType:"Fixed Rate", fnmaCurrentIndex:"", fnmaMargin:"",
  fnmaQRPCAchieved:false, fnmaFICO:"", fnmaHousingRatio:"",
  fnmaCashReservesLt3Mo:false, fnmaLongTermHardship:false, fnmaPrior30DLQ12Mo:false,
  fhlmcHardshipResolved:false, fhlmcCanResumeFull:false, fhlmcImminentDefault:false,
  fhlmcPriorDeferredUPB:"0", fhlmcCumulativeDeferredMonths:"0",
  fhlmcPriorDeferralMonths:"0", fhlmcLoanAge:"24",
  fhlmcMortgageType:"Conventional", fhlmcRateType:"Fixed Rate",
  fhlmcCurrentIndex:"", fhlmcMarginRate:"",
  fhlmcPropertyType:"Primary Residence",
  fhlmcLongTermHardship:true, fhlmcUnemployed:false, fhlmcVerifiedIncome:true,
  fhlmcCashReservesLt25k:true, fhlmcFICO:"680", fhlmcPrior30DayDLQ6Mo:false,
  fhlmcHousingExpenseRatio:"", fhlmcPropertyValue:"", fhlmcPostedModRate:"",
  fhlmcRecourse:false, fhlmcStepRateMortgage:false, fhlmcRateAdjustedWithin12Mo:false,
  fhlmcPriorModCount:"0", fhlmcFailedFlexTPP12Mo:false, fhlmcPriorFlexMod60DLQ:false,
  fhlmcApprovedLiquidationOption:false, fhlmcActiveTPP:false,
  fhlmcActiveForbearance:false, fhlmcActiveRepayPlan:false, fhlmcUnexpiredOffer:false,
  fhlmcDisasterHardship:false, fhlmcFEMADesignation:false, fhlmcDLQAtDisaster:"0",
  activeRPP:false, pmmsLeCurrentPlus1:true,
  dlqAtDisasterLt30:false, loanGe60DaysDLQ:false,
  previousWorkoutForbearance:false, workoutStateActivePassed:false,
  dlqGe12ContractualPayments:false, borrowerIntentDisposition:false,
  completeBRP:false, priorWorkoutCompromiseSaleFailed:false,
  calculatedRPPGt0:true, forbearancePeriodLt12:true, totalDLQLt12:true,
};
function L(overrides) { return Object.assign({}, initLoan, overrides); }

// ─── COPY EVALUATOR FUNCTIONS FROM test_evaluations.mjs ──────────────────────
// (These are pure functions that don't depend on React)

function evaluateFHA(l) {
  const results = [];
  const dlq=n(l.delinquencyMonths), priorHR=n(l.priorFHAHAMPMonths), gmi=n(l.grossMonthlyIncome);
  const origUpbFHA = n(l.originalUpb);
  const origUpbEntered = origUpbFHA > 0;
  const capAmtFHA = n(l.arrearagesToCapitalize) + n(l.escrowShortage) + n(l.legalFees);
  const newUPBFHA = n(l.upb) + capAmtFHA;
  const upbWithinOrig = !origUpbEntered || newUPBFHA <= origUpbFHA;
  const upbWithinOrigLabel = !origUpbEntered ? "Enter Original UPB to verify" : (newUPBFHA <= origUpbFHA ? `Yes` : `No`);
  const isDisaster = l.hardshipType === "Disaster";
  const baseNodes=[node("Occupancy=Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("Foreclosure≠Active",!l.foreclosureActive,!l.foreclosureActive),node("Property≠Condemned/Uninhabitable",l.propertyCondition,l.propertyCondition!=="Condemned"&&l.propertyCondition!=="Uninhabitable"),node("Property=Principal Residence",l.propertyDisposition,l.propertyDisposition==="Principal Residence"),node("Lien=First",l.lienPosition,l.lienPosition==="First")];
  const baseEligible=baseNodes.every(nd=>nd.pass);
  const fhaPmms = n(l.pmmsRate);
  const fhaModRate = fhaPmms > 0 ? Math.round((fhaPmms + 0.25) / 0.125) * 0.125 : 0;
  const fhaEscrow = n(l.currentEscrow);
  const currentPI_fha = n(l.currentPI);
  const targetPITI_25pct = currentPI_fha > 0 ? (currentPI_fha * 0.75) + fhaEscrow : 0;
  const fhaTarget = n(l.targetPayment) || targetPITI_25pct;
  const fhaHasInputs = fhaModRate > 0 && fhaTarget > 0 && newUPBFHA > 0;
  const fhaPITI360 = fhaHasInputs ? (calcMonthlyPI(newUPBFHA, fhaModRate, 360) ?? 0) + fhaEscrow : null;
  const fhaPITI480 = fhaHasInputs ? (calcMonthlyPI(newUPBFHA, fhaModRate, 480) ?? 0) + fhaEscrow : null;
  const canAchieve360 = fhaPITI360 != null ? fhaPITI360 <= fhaTarget : l.canAchieveTargetByReamort;
  const canAchieve480 = fhaPITI480 != null ? fhaPITI480 <= fhaTarget : l.canAchieveTargetBy480Reamort;
  const achieve360Label = fhaHasInputs ? `PITI ${fhaPITI360.toFixed(2)} ${canAchieve360?"<=":">"} target ${fhaTarget.toFixed(2)}` : `Manual: ${canAchieve360?"Yes":"No"}`;
  const achieve480Label = fhaHasInputs ? `PITI ${fhaPITI480.toFixed(2)} ${canAchieve480?"<=":">"} target ${fhaTarget.toFixed(2)}` : `Manual: ${canAchieve480?"Yes":"No"}`;
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
  const arrearsAuto = origUpbEntered ? (n(l.arrearagesToCapitalize) / origUpbFHA) > 0.30 : l.arrearsExceed30PctLimit;
  const modPmt40Auto = gmi > 0 && fhaTarget > 0 ? fhaTarget / gmi <= 0.40 : l.modPaymentLe40PctGMI;
  const cok = comboCapPass || (arrearsAuto && modPmt40Auto);
  const comboCapLabel = comboWithinCap != null
    ? `PC needed ${(pcNeeded??0).toFixed(2)} ${comboWithinCap?"<=":">"} available ${fhaPCAvailable.toFixed(2)}`
    : `Manual: PC% ${n(l.partialClaimPct).toFixed(1)}% ${n(l.partialClaimPct)<=30?"<=":">"} 30%`;
  const fhaCurrentPITI = n(l.currentPITI);
  const pitiAtOrBelowTarget = fhaCurrentPITI > 0 && fhaTarget > 0 ? fhaCurrentPITI <= fhaTarget : l.currentPITIAtOrBelowTarget;
  const fhaArrears = n(l.arrearagesToCapitalize);
  const _rpp24Pct = fhaArrears > 0 && fhaCurrentPITI > 0 && gmi > 0 ? (fhaCurrentPITI + fhaArrears/24) / gmi : null;
  const canRepayWithin24 = _rpp24Pct !== null ? _rpp24Pct <= 0.40 : l.canRepayWithin24Months;
  const _rpp6Pct = fhaArrears > 0 && fhaCurrentPITI > 0 && gmi > 0 ? (fhaCurrentPITI + fhaArrears/6) / gmi : null;
  const canRepayWithin6 = _rpp6Pct !== null ? _rpp6Pct <= 0.40 : l.canRepayWithin6Months;
  const _comboPct = fhaCurrentPITI > 0 && gmi > 0 ? fhaCurrentPITI / gmi : null;
  const comboPayLe40 = _comboPct !== null ? _comboPct <= 0.40 : l.comboPaymentLe40PctIncome;
  results.push({option:"FHA Reinstatement",eligible:dlq>0,nodes:[node("Past-due amounts exist",dlq+"mo DLQ",dlq>0)]});
  const cooldownOK = priorHR === 0 || priorHR >= 24;
  const hb = baseEligible && cooldownOK && dlq > 0 && STANDARD_HARDSHIPS.includes(l.hardshipType) && l.borrowerIntentRetention;
  const hn = [...baseNodes,
    node("Std hardship",l.hardshipType,STANDARD_HARDSHIPS.includes(l.hardshipType)),
    node("DLQ>0",dlq,dlq>0),
    node("Prior home retention option >=24mo ago or none",priorHR===0?"None":priorHR+"mo",cooldownOK),
    node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention)
  ];
  results.push({option:"FHA Standalone Partial Claim",eligible:hb&&l.fhaBorrowerCanResumePreHardship&&comboCapPass,nodes:[...hn,node("Borrower can resume pre-hardship payment",l.fhaBorrowerCanResumePreHardship?"Yes":"No",l.fhaBorrowerCanResumePreHardship),node("PC within 30% cap",comboCapLabel,comboCapPass)]});
  const fhaDeferCumUsed = n(l.fhaCumulativeDeferredMonths);
  const fhaDeferPrior = n(l.fhaPriorDeferralMonths);
  const fhaDeferDlqOK = dlq >= 3 && dlq <= 12;
  const fhaDeferCumOK = fhaDeferCumUsed < 12;
  const fhaDeferSpacingOK = fhaDeferPrior === 0 || fhaDeferPrior >= 12;
  results.push({option:"FHA Payment Deferral",eligible:!isDisaster&&baseEligible&&fhaDeferDlqOK&&l.fhaHardshipResolved&&fhaDeferCumOK&&fhaDeferSpacingOK,nodes:[node("Non-disaster",l.hardshipType,!isDisaster),...baseNodes]});
  results.push({option:"FHA 30-Year Standalone Modification",eligible:hb&&canAchieve360,nodes:[...hn,node("25% P&I reduction achievable by 360mo re-amortization",achieve360Label,canAchieve360)]});
  results.push({option:"FHA 40-Year Combination Modification + Partial Claim",eligible:hb&&!canAchieve360&&cok&&canAchieve480&&upbWithinOrig,nodes:[...hn,node("25% reduction NOT achievable by 360mo",achieve360Label,!canAchieve360),node("PC within 30% cap",comboCapLabel,cok),node("25% reduction achievable by 480mo",achieve480Label,canAchieve480),node("New UPB <= Orig UPB",upbWithinOrigLabel,upbWithinOrig)]});
  results.push({option:"Payment Supplement",eligible:!isDisaster&&baseEligible&&dlq>0&&!canAchieve360&&comboPayLe40,nodes:[node("Non-disaster",l.hardshipType,!isDisaster),...baseNodes,node("DLQ>0",dlq,dlq>0),node("360mo NOT achievable",achieve360Label,!canAchieve360),node("Combo pmt<=40% GMI",comboPayLe40,comboPayLe40)]});
  results.push({option:"Repayment Plan",eligible:!isDisaster&&dlq<=12&&canRepayWithin24&&!l.failedTPP,nodes:[node("Non-disaster",l.hardshipType,!isDisaster),node("DLQ<=12mo",dlq,dlq<=12),node("Can repay 24mo",canRepayWithin24,canRepayWithin24),node("No failed TPP",!l.failedTPP,!l.failedTPP)]});
  results.push({option:"Formal Forbearance",eligible:!isDisaster&&dlq<12&&(canRepayWithin6||l.requestedForbearance),nodes:[node("Non-disaster",l.hardshipType,!isDisaster),node("DLQ<12mo",dlq,dlq<12),node("Repay 6mo OR requested",canRepayWithin6||l.requestedForbearance,canRepayWithin6||l.requestedForbearance)]});
  return results;
}

function evaluateUSDA(l) {
  const results=[];
  const dlqD=n(l.delinquencyDays)||n(l.delinquencyMonths)*30, dlqM=n(l.delinquencyMonths);
  const isD=l.hardshipType==="Disaster";
  const br=l.propertyCondition!=="Condemned"&&l.propertyCondition!=="Uninhabitable"&&!l.occupancyAbandoned&&l.lienPosition==="First";
  const usdaUpb5k = n(l.upb) > 0 ? n(l.upb) >= 5000 : l.usdaUpbGe5000;
  const usdaCurrentPITI = n(l.currentPITI);
  const usdaGMI = n(l.grossMonthlyIncome);
  const usdaMonthlyExp = n(l.monthlyExpenses);
  const _usdaNet = usdaGMI > 0 && usdaCurrentPITI > 0 && l.monthlyExpenses !== "" ? usdaGMI - usdaCurrentPITI - usdaMonthlyExp : null;
  const posNetIncome = _usdaNet !== null ? _usdaNet > 0 : l.usdaBorrowerPositiveNetIncome;
  const usdaFbLt12 = dlqM > 0 ? dlqM < 12 : l.usdaForbearancePeriodLt12;
  const usdaDLQLt12 = dlqM > 0 ? dlqM < 12 : l.usdaTotalDLQLt12;
  const usdaArrears = n(l.arrearagesToCapitalize);
  const usdaRepayMos = Math.min(12, Math.max(1, n(l.repayMonths) || 6));
  const usdaRppPayment = usdaCurrentPITI > 0 && usdaArrears > 0 ? usdaCurrentPITI + (usdaArrears / usdaRepayMos) : null;
  const rppWithin200 = usdaRppPayment != null ? usdaRppPayment <= usdaCurrentPITI * 2 : l.usdaNewPaymentLe200pct;
  const rppCapLabel = usdaRppPayment != null
    ? `${usdaRppPayment.toFixed(2)} ${rppWithin200?"<=":">"} 200% cap ${(usdaCurrentPITI*2).toFixed(2)}`
    : `Manual`;
  const rb=!isD&&dlqD>0&&dlqD<360&&l.borrowerIntentRetention&&l.hardshipDuration==="Resolved"&&l.usdaHardshipNotExcluded&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.occupancyStatus==="Owner Occupied";
  const rN=[node("Non-disaster hardship",l.hardshipType,!isD),node("DLQ>0&<360d",dlqD,dlqD>0&&dlqD<360),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Hardship=Resolved",l.hardshipDuration,l.hardshipDuration==="Resolved"),node("Not excluded type",l.usdaHardshipNotExcluded,l.usdaHardshipNotExcluded),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied")];
  results.push({option:"USDA Reinstatement",eligible:dlqD>0,nodes:[node("Past-due amounts exist",dlqD+"d DLQ",dlqD>0)]});
  results.push({option:"USDA Informal Forbearance",eligible:false,nodes:[node("placeholder","placeholder",false)]});
  results.push({option:"USDA Informal Repayment Plan",eligible:rb&&rppWithin200&&posNetIncome,nodes:[...rN,node("RPP payment <= 200% current PITI",rppCapLabel,rppWithin200),node("Positive net income",posNetIncome,posNetIncome)]});
  return results;
}

function evaluateVA(l) {
  const results=[];
  const dlqD=n(l.delinquencyDays)||n(l.delinquencyMonths)*30;
  const vb=l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&!l.foreclosureActive;
  const rH=l.hardshipDuration==="Resolved";
  const sH=STANDARD_HARDSHIPS.includes(l.hardshipType);
  const oo=l.occupancyStatus==="Owner Occupied";
  const vN=[node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("Foreclosure!=Active",!l.foreclosureActive,!l.foreclosureActive)];
  const vaGMI = n(l.grossMonthlyIncome);
  const vaPITI = n(l.currentPITI);
  const vaArrears = n(l.arrearagesToCapitalize);
  const vaMonthlyExp = n(l.monthlyExpenses);
  const vaRepayMo = Math.min(24, Math.max(1, n(l.repayMonths) || 12));
  const _vaRPP = vaArrears > 0 && vaPITI > 0 && vaGMI > 0 ? (vaPITI + vaArrears/vaRepayMo + vaMonthlyExp) / vaGMI : null;
  const borrowerCanAffordRPP = _vaRPP !== null ? _vaRPP <= 0.41 : l.borrowerCanAffordReinstateOrRepay;
  const vaModPI = n(l.modifiedPI);
  const vaEscrow = n(l.currentEscrow);
  const vaModPITI = vaModPI > 0 ? vaModPI + vaEscrow : 0;
  const _vaModDTI = vaModPITI > 0 && vaGMI > 0 && l.monthlyExpenses !== "" ? (vaModPITI + vaMonthlyExp) / vaGMI : null;
  const borrowerCanAffordMod = _vaModDTI !== null ? _vaModDTI <= 0.41 : l.borrowerCanAffordModifiedPayment;
  const _vaCurrDTI = vaPITI > 0 && vaGMI > 0 && l.monthlyExpenses !== "" ? (vaPITI + vaMonthlyExp) / vaGMI : null;
  const borrowerCanAffordCurrent = _vaCurrDTI !== null ? _vaCurrDTI <= 0.41 : l.borrowerCanAffordCurrentMonthly;
  results.push({option:"VA Reinstatement",eligible:vb&&dlqD>=1&&borrowerCanAffordRPP,nodes:[...vN,node("DLQ>0",dlqD,dlqD>=1),node("Can afford reinstatement",borrowerCanAffordRPP,borrowerCanAffordRPP)]});
  results.push({option:"VA Repayment Plan",eligible:vb&&sH&&rH&&dlqD>=30&&l.calculatedRPPGt0&&borrowerCanAffordRPP&&l.borrowerIntentRetention&&oo,nodes:[...vN,node("Std hardship",l.hardshipType,sH),node("Hardship=Resolved",l.hardshipDuration,rH),node("DLQ>=30d",dlqD,dlqD>=30),node("RPP Plans>0",l.calculatedRPPGt0,l.calculatedRPPGt0),node("Can afford RPP",borrowerCanAffordRPP,borrowerCanAffordRPP),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Owner Occupied",l.occupancyStatus,oo)]});
  results.push({option:"VA 30-Year Loan Modification",eligible:vb&&sH&&dlqD>=61&&l.borrowerConfirmedCannotAffordCurrent&&!borrowerCanAffordCurrent&&l.borrowerIntentRetention&&oo,nodes:[...vN,node("Std hardship",l.hardshipType,sH),node("DLQ>=61d",dlqD,dlqD>=61),node("Cannot afford current",!borrowerCanAffordCurrent,!borrowerCanAffordCurrent)]});
  return results;
}

function evaluateFHLMC(l) {
  const results = [];
  const dlq = n(l.delinquencyMonths);
  const fico = n(l.fhlmcFICO);
  const fhlmcCash = n(l.cashReservesAmount);
  const fhlmcGMI = n(l.grossMonthlyIncome);
  const fhlmcPITI = n(l.currentPITI);
  const fhlmcCashLt25k = fhlmcCash > 0 ? fhlmcCash < 25000 : l.fhlmcCashReservesLt25k;
  const housingRatioCalc = fhlmcPITI > 0 && fhlmcGMI > 0 ? fhlmcPITI / fhlmcGMI * 100 : null;
  const housingRatio = housingRatioCalc ?? n(l.fhlmcHousingExpenseRatio);
  const isConventional = l.fhlmcMortgageType === "Conventional";
  const isFirstLien = l.lienPosition === "First";
  const isPrimaryRes = l.fhlmcPropertyType === "Primary Residence";
  const propertyOK = l.propertyCondition !== "Condemned" && !l.occupancyAbandoned;
  const isDisaster = l.hardshipType === "Disaster";
  const fhlmcIDRule1 = fhlmcCashLt25k && isPrimaryRes && l.fhlmcLongTermHardship;
  const fhlmcIDRule2 = fico <= 620 || l.fhlmcPrior30DayDLQ6Mo || housingRatio > 40;
  const fhlmcIDHasInputs = fhlmcCash > 0 && fhlmcPITI > 0 && fhlmcGMI > 0 && fico > 0;
  const fhlmcImminentDefaultAuto = fhlmcIDHasInputs ? (fhlmcIDRule1 && fhlmcIDRule2) : l.fhlmcImminentDefault;
  const noActiveLiquidation = !l.fhlmcApprovedLiquidationOption;
  const noActiveTPP = !l.fhlmcActiveTPP;
  const noUnexpiredOffer = !l.fhlmcUnexpiredOffer;
  const priorMods = n(l.fhlmcPriorModCount);
  const softIneligible = priorMods >= 3 || l.fhlmcFailedFlexTPP12Mo || l.fhlmcPriorFlexMod60DLQ;
  const hardIneligible = !isConventional || l.fhlmcRecourse;
  const investmentHardStop = l.fhlmcPropertyType === "Investment Property" && dlq < 2;
  const loanAge = n(l.fhlmcLoanAge);
  results.push({option:"FHLMC Reinstatement",eligible:n(l.arrearagesToCapitalize)>0||dlq>0,nodes:[node("Past-due",dlq,dlq>0)]});
  {
    const eligDlqRange = dlq >= 2 && dlq <= 6;
    const eligLoanAge = loanAge >= 12;
    const eligCumCap = n(l.fhlmcCumulativeDeferredMonths) < 12;
    const eligPriorDeferral = n(l.fhlmcPriorDeferralMonths) === 0 || n(l.fhlmcPriorDeferralMonths) >= 12;
    const nodes = [
      node("Non-disaster",l.hardshipType,!isDisaster),
      node("Conventional 1st lien",l.lienPosition,isConventional&&isFirstLien),
      node("Loan age>=12",loanAge+"mo",eligLoanAge),
      node("DLQ 2-6 months",dlq+"mo",eligDlqRange),
      node("Hardship resolved",l.fhlmcHardshipResolved?"Yes":"No",l.fhlmcHardshipResolved),
      node("Can resume full",l.fhlmcCanResumeFull?"Yes":"No",l.fhlmcCanResumeFull),
      node("Cum deferred<12",n(l.fhlmcCumulativeDeferredMonths)+"mo",eligCumCap),
      node("Prior deferral>=12mo ago",n(l.fhlmcPriorDeferralMonths)===0?"None":n(l.fhlmcPriorDeferralMonths)+"mo ago",eligPriorDeferral),
      node("No active liquidation",l.fhlmcApprovedLiquidationOption?"Active":"None",noActiveLiquidation),
      node("No active TPP",l.fhlmcActiveTPP?"Active":"None",noActiveTPP),
      node("No unexpired offer",l.fhlmcUnexpiredOffer?"Yes":"No",noUnexpiredOffer),
    ];
    results.push({option:"FHLMC Payment Deferral",eligible:nodes.every(nd=>nd.pass),nodes});
  }
  {
    const eligHardship = l.fhlmcLongTermHardship;
    const dlqGe2 = dlq >= 2;
    const eligLoanAge = loanAge >= 24;
    const eligPropType = !investmentHardStop;
    const hardStop = hardIneligible || softIneligible;
    const idPath = !dlqGe2 && fhlmcImminentDefaultAuto;
    const standardPath = dlqGe2;
    const basePass = !hardStop && eligLoanAge && eligPropType && eligHardship && (standardPath || idPath);
    results.push({option:"Freddie Mac Flex Modification",eligible:basePass,nodes:[node("Long-term hardship",l.fhlmcLongTermHardship?"Yes":"No",eligHardship),node("Loan age>=24mo",loanAge+"mo",eligLoanAge),node("Conventional/not recourse",!hardIneligible?"Yes":"No",!hardIneligible),node("DLQ>=2mo or imminent default",dlqGe2||idPath?"Yes":"No",standardPath||idPath)]});
  }
  results.push({option:"housingRatioTest",eligible:housingRatio>40,nodes:[node("housingRatio>40",housingRatio,housingRatio>40)]});
  results.push({option:"cashLt25kTest",eligible:fhlmcCashLt25k,nodes:[node("cashLt25k",fhlmcCash,fhlmcCashLt25k)]});
  return results;
}

function evaluateFNMA(l) {
  const results = [];
  const dlq = n(l.delinquencyMonths);
  const fnmaCash = n(l.cashReservesAmount);
  const fnmaPITI = n(l.currentPITI);
  const loanAge = n(l.fnmaLoanAge);
  const cumulativeDeferred = n(l.fnmaCumulativeDeferredMonths);
  const priorDeferralMonths = n(l.fnmaPriorDeferralMonths);
  const fnmaCashLt3Mo = fnmaCash > 0 && fnmaPITI > 0 ? fnmaCash < fnmaPITI * 3 : l.fnmaCashReservesLt3Mo;
  const propertyOK = l.propertyCondition !== "Condemned" && !l.occupancyAbandoned;
  const isDisaster = l.hardshipType === "Disaster";
  const fnmaWithin36Mo = l.fnmaWithin36MonthsMaturity;
  const priorModCount = n(l.fnmaPriorModCount);
  const commonBlockers = [
    node("No recourse",l.fnmaRecourseArrangement?"Yes":"No",!l.fnmaRecourseArrangement),
    node("No active liquidation",l.fnmaActiveLiquidation?"Active":"None",!l.fnmaActiveLiquidation),
    node("No active repay",l.fnmaActiveRepayPlan?"Active":"None",!l.fnmaActiveRepayPlan),
    node("No pending offer",l.fnmaActivePendingOffer?"Pending":"None",!l.fnmaActivePendingOffer),
    node("No active TPP",l.fnmaActiveTPP?"Active":"None",!l.fnmaActiveTPP),
  ];
  results.push({option:"FNMA Reinstatement",eligible:n(l.arrearagesToCapitalize)>0||dlq>0,nodes:[node("Past-due",dlq,dlq>0)]});
  {
    const eligLienPos = l.lienPosition === "First";
    const eligLoanAge = loanAge >= 12;
    const eligDlqRange = dlq >= 2 && dlq <= 6;
    const eligCumCap = cumulativeDeferred < 12;
    const eligPriorDeferral = priorDeferralMonths === 0 || priorDeferralMonths >= 12;
    const eligNotNearMaturity = !fnmaWithin36Mo;
    const eligNoFailedTPP = !l.fnmaFailedTPP12Months;
    const eligHardship = l.fnmaHardshipResolved || l.fnmaImminentDefault;
    const nodes = [
      node("Non-disaster",l.hardshipType,!isDisaster),
      node("1st lien",l.lienPosition,eligLienPos),
      node("Loan age>=12",loanAge+"mo",eligLoanAge),
      node("DLQ 2-6 months",dlq+"mo",eligDlqRange),
      node("Hardship resolved or ID",l.fnmaHardshipResolved?"Resolved":l.fnmaImminentDefault?"ID":"Neither",eligHardship),
      node("Can resume full",l.fnmaCanResumeFull?"Yes":"No",l.fnmaCanResumeFull),
      node("Cannot reinstate",l.fnmaCannotReinstate?"Yes":"No",l.fnmaCannotReinstate),
      node("Cum deferred<12",cumulativeDeferred+"mo",eligCumCap),
      node("Prior deferral>=12mo",priorDeferralMonths===0?"None":priorDeferralMonths+"mo ago",eligPriorDeferral),
      node("Not within 36mo maturity",fnmaWithin36Mo?"Within":"OK",eligNotNearMaturity),
      node("No failed TPP",l.fnmaFailedTPP12Months?"Yes":"No",eligNoFailedTPP),
      ...commonBlockers,
    ];
    results.push({option:"FNMA Payment Deferral",eligible:nodes.every(nd=>nd.pass),nodes});
  }
  // Add cashLt3Mo test result
  results.push({option:"cashLt3MoTest",eligible:fnmaCashLt3Mo,nodes:[node("cashLt3Mo",fnmaCash,fnmaCashLt3Mo)]});
  return results;
}

// ─── TEST FRAMEWORK ───────────────────────────────────────────────────────────
let totalPass = 0, totalFail = 0;
const failures = [];

function check(testName, evalFn, loan, checks) {
  const results = evalFn(loan);
  const resultMap = {};
  for (const r of results) resultMap[r.option] = r.eligible;
  for (const [option, expected] of Object.entries(checks)) {
    const actual = resultMap[option];
    if (actual === undefined) {
      failures.push({ testName, option, expected, actual:"NOT FOUND" });
      totalFail++;
    } else if (actual === expected) {
      totalPass++;
    } else {
      failures.push({ testName, option, expected, actual });
      totalFail++;
    }
  }
}

// ─── FHA COMPUTED FIELD TESTS ─────────────────────────────────────────────────

// canRepayWithin24: PITI=$1800, arrears=$7200, GMI=$5200
// RPP pmt = 1800 + 7200/24 = 1800+300 = 2100; 40% of 5200 = 2080 → 2100 > 2080 → NOT within 24mo
check("FHA canRepayWithin24 false (2100 > 2080)", evaluateFHA,
  L({currentPITI:"1800", arrearagesToCapitalize:"7200", grossMonthlyIncome:"5200",
     delinquencyMonths:"4", hardshipType:"Reduction in Income",
     loanType:"FHA", repayMonths:"24"}),
  {"Repayment Plan": false});

// canRepayWithin24: PITI=$1000, arrears=$3000, GMI=$5000
// RPP pmt = 1000 + 3000/24 = 1000+125 = 1125; 40% of 5000 = 2000 → 1125 <= 2000 → CAN repay
check("FHA canRepayWithin24 true (1125 <= 2000)", evaluateFHA,
  L({currentPITI:"1000", arrearagesToCapitalize:"3000", grossMonthlyIncome:"5000",
     delinquencyMonths:"4", hardshipType:"Reduction in Income",
     loanType:"FHA", repayMonths:"24", failedTPP:false}),
  {"Repayment Plan": true});

// canRepayWithin6: PITI=$1000, arrears=$2400, GMI=$5000
// RPP pmt = 1000 + 2400/6 = 1000+400 = 1400; 40% of 5000 = 2000 → 1400 <= 2000 → CAN repay within 6
check("FHA canRepayWithin6 true (1400 <= 2000)", evaluateFHA,
  L({currentPITI:"1000", arrearagesToCapitalize:"2400", grossMonthlyIncome:"5000",
     delinquencyMonths:"6", hardshipType:"Reduction in Income", loanType:"FHA"}),
  {"Formal Forbearance": true});

// comboPayLe40: PITI=$1800, GMI=$5000 → 1800/5000 = 36% <= 40% → true
// Payment Supplement requires !canAchieve360 — ensure that with no mod rate inputs
check("FHA comboPayLe40 true (36%)", evaluateFHA,
  L({currentPITI:"1800", grossMonthlyIncome:"5000",
     delinquencyMonths:"4", hardshipType:"Reduction in Income", loanType:"FHA",
     canAchieveTargetByReamort:false}),
  {"Payment Supplement": true});

// comboPayLe40: PITI=$2200, GMI=$5000 → 2200/5000 = 44% > 40% → false
check("FHA comboPayLe40 false (44%)", evaluateFHA,
  L({currentPITI:"2200", grossMonthlyIncome:"5000",
     delinquencyMonths:"4", hardshipType:"Reduction in Income", loanType:"FHA",
     canAchieveTargetByReamort:false}),
  {"Payment Supplement": false});

// ─── USDA COMPUTED FIELD TESTS ────────────────────────────────────────────────

// posNetIncome true: GMI=$4000, PITI=$1500, expenses=$500 → net=$2000 > 0
check("USDA posNetIncome true (net=$2000)", evaluateUSDA,
  L({loanType:"USDA", grossMonthlyIncome:"4000", currentPITI:"1500", monthlyExpenses:"500",
     delinquencyMonths:"3", hardshipType:"Reduction in Income", hardshipDuration:"Resolved",
     borrowerIntentRetention:true, lienPosition:"First", occupancyStatus:"Owner Occupied",
     usdaHardshipNotExcluded:true, arrearagesToCapitalize:"1000"}),
  {"USDA Informal Repayment Plan": true});

// posNetIncome false: GMI=$2000, PITI=$1500, expenses=$800 → net=-$300 → false
check("USDA posNetIncome false (net=-$300)", evaluateUSDA,
  L({loanType:"USDA", grossMonthlyIncome:"2000", currentPITI:"1500", monthlyExpenses:"800",
     delinquencyMonths:"3", hardshipType:"Reduction in Income", hardshipDuration:"Resolved",
     borrowerIntentRetention:true, lienPosition:"First", occupancyStatus:"Owner Occupied",
     usdaHardshipNotExcluded:true, arrearagesToCapitalize:"1000"}),
  {"USDA Informal Repayment Plan": false});

// ─── VA COMPUTED FIELD TESTS ──────────────────────────────────────────────────

// borrowerCanAffordRPP: PITI=$1200, arrears=$3600, GMI=$5000, expenses=$500, repayMo=12
// total DTI = (1200 + 3600/12 + 500) / 5000 = (1200+300+500)/5000 = 2000/5000 = 40% <= 41% → true
check("VA borrowerCanAffordRPP true (40%)", evaluateVA,
  L({loanType:"VA", currentPITI:"1200", arrearagesToCapitalize:"3600",
     grossMonthlyIncome:"5000", monthlyExpenses:"500", repayMonths:"12",
     delinquencyDays:"90", hardshipType:"Reduction in Income", hardshipDuration:"Resolved",
     lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true,
     calculatedRPPGt0:true}),
  {"VA Repayment Plan": true});

// borrowerCanAffordCurrent: PITI=$1500, GMI=$4000, expenses=$500
// DTI = (1500+500)/4000 = 2000/4000 = 50% > 41% → cannot afford current → VA 30-Year Mod blocked by "!borrowerCanAffordCurrent"
// But borrowerCanAffordCurrent=false means VA 30-Year Mod would be eligible if other conditions met
check("VA borrowerCanAffordCurrent false (50% DTI → 30yr mod eligible)", evaluateVA,
  L({loanType:"VA", currentPITI:"1500", grossMonthlyIncome:"4000", monthlyExpenses:"500",
     delinquencyDays:"90", hardshipType:"Reduction in Income", hardshipDuration:"Resolved",
     lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true,
     borrowerConfirmedCannotAffordCurrent:true}),
  {"VA 30-Year Loan Modification": true});

// ─── FHLMC COMPUTED FIELD TESTS ───────────────────────────────────────────────

// fhlmcCashLt25k: cashReservesAmount=$10000 → true (< $25k)
check("FHLMC cashLt25k true ($10k)", evaluateFHLMC,
  L({loanType:"FHLMC", cashReservesAmount:"10000"}),
  {"cashLt25kTest": true});

// fhlmcCashLt25k: cashReservesAmount=$30000 → false (>= $25k)
check("FHLMC cashLt25k false ($30k)", evaluateFHLMC,
  L({loanType:"FHLMC", cashReservesAmount:"30000"}),
  {"cashLt25kTest": false});

// housingRatio > 40: PITI=$2000, GMI=$5000 → 40% (not > 40) → false (Rule 2 NOT triggered by ratio alone)
check("FHLMC housingRatio 40% not > 40 → false", evaluateFHLMC,
  L({loanType:"FHLMC", currentPITI:"2000", grossMonthlyIncome:"5000", cashReservesAmount:"1000", fhlmcFICO:"700"}),
  {"housingRatioTest": false});

// housingRatio > 40: PITI=$2100, GMI=$5000 → 42% > 40 → true
check("FHLMC housingRatio 42% > 40 → true", evaluateFHLMC,
  L({loanType:"FHLMC", currentPITI:"2100", grossMonthlyIncome:"5000", cashReservesAmount:"1000", fhlmcFICO:"700"}),
  {"housingRatioTest": true});

// ─── FNMA COMPUTED FIELD TESTS ────────────────────────────────────────────────

// fnmaCashLt3Mo: cashReservesAmount=$3000, PITI=$1500 → 3mo PITI=$4500 → $3000 < $4500 → true
check("FNMA cashLt3Mo true ($3k < $4.5k)", evaluateFNMA,
  L({loanType:"FNMA", cashReservesAmount:"3000", currentPITI:"1500"}),
  {"cashLt3MoTest": true});

// fnmaCashLt3Mo: cashReservesAmount=$8000, PITI=$1500 → $8000 >= $4500 → false
check("FNMA cashLt3Mo false ($8k >= $4.5k)", evaluateFNMA,
  L({loanType:"FNMA", cashReservesAmount:"8000", currentPITI:"1500"}),
  {"cashLt3MoTest": false});

// ─── REPORT ───────────────────────────────────────────────────────────────────
const total = totalPass + totalFail;
console.log("\n=== COMPUTED FIELDS TEST RESULTS ===\n");
console.log(`Total tests : ${total}`);
console.log(`PASSED      : ${totalPass}`);
console.log(`FAILED      : ${totalFail}`);
if (total > 0) console.log(`Accuracy    : ${(totalPass/total*100).toFixed(1)}%\n`);

if (failures.length > 0) {
  console.log("FAILURES:");
  for (const f of failures) {
    console.log(`  [${f.testName}]`);
    console.log(`    Option  : "${f.option}"`);
    console.log(`    Expected: ${f.expected}`);
    console.log(`    Actual  : ${f.actual}`);
  }
} else {
  console.log("All computed-field tests passed!");
}
