// ─── HELPERS & CONSTANTS ─────────────────────────────────────────────────────
const STANDARD_HARDSHIPS = ["Unemployment","Business Failure","Increase in Housing Expenses","Property Problem","Reduction in Income","Unknown"];
const n = v => parseFloat(v) || 0;
const calcMonthlyPI = (principal, annualRate, termMonths) => {
  if (!principal || !annualRate || !termMonths) return null;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / termMonths;
  return principal * (r * Math.pow(1+r, termMonths)) / (Math.pow(1+r, termMonths) - 1);
};
function node(q, a, pass) { return { question:q, answer:String(a), pass }; }

const initLoan = {
  loanType:"FHA", loanNumber:"", borrowerName:"", repayMonths:"24",
  upb:"", originalUpb:"", currentEscrow:"", currentPI:"", currentPITI:"",
  grossMonthlyIncome:"", currentInterestRate:"", pmmsRate:"", modifiedPI:"",
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

// ─── evaluateFHA ──────────────────────────────────────────────────────────────
function evaluateFHA(l) {
  const results = [];
  const dlq=n(l.delinquencyMonths), priorHR=n(l.priorFHAHAMPMonths);
  const origUpbFHA = n(l.originalUpb);
  const origUpbEntered = origUpbFHA > 0;
  const capAmtFHA = n(l.arrearagesToCapitalize) + n(l.escrowShortage) + n(l.legalFees);
  const newUPBFHA = n(l.upb) + capAmtFHA;
  const upbWithinOrig = !origUpbEntered || newUPBFHA <= origUpbFHA;
  const upbWithinOrigLabel = !origUpbEntered ? "Enter Original UPB to verify" : (newUPBFHA <= origUpbFHA ? "OK" : "FAIL");
  const isDisaster = l.hardshipType === "Disaster";
  const baseNodes=[
    node("Occupancy=Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),
    node("Foreclosure!=Active",!l.foreclosureActive,!l.foreclosureActive),
    node("Property!=Condemned/Uninhabitable",l.propertyCondition,l.propertyCondition!=="Condemned"&&l.propertyCondition!=="Uninhabitable"),
    node("Property=Principal Residence",l.propertyDisposition,l.propertyDisposition==="Principal Residence"),
    node("Lien=First",l.lienPosition,l.lienPosition==="First")
  ];
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
  const cok = comboCapPass || (l.arrearsExceed30PctLimit && l.modPaymentLe40PctGMI);
  const comboCapLabel = comboWithinCap != null
    ? `PC needed ${(pcNeeded??0).toFixed(2)} ${comboWithinCap?"<=":">"} available ${fhaPCAvailable.toFixed(2)}`
    : `Manual: PC% ${n(l.partialClaimPct).toFixed(1)}% ${n(l.partialClaimPct)<=30?"<=":">"} 30%`;

  results.push({option:"FHA Reinstatement",eligible:dlq>0,nodes:[node("Past-due amounts exist",dlq+"mo DLQ",dlq>0)]});

  if (l.verifiedDisaster) {
    const dn=[...baseNodes,
      node("In PDMA",l.propertyInPDMA,l.propertyInPDMA),
      node("Principal Residence pre-disaster",l.principalResidencePreDisaster,l.principalResidencePreDisaster),
      node("DLQ<12mo",dlq,dlq<12),
      node("Not damaged OR repairs done",l.propertySubstantiallyDamaged?l.repairsCompleted:"N/A",!l.propertySubstantiallyDamaged||l.repairsCompleted)
    ];
    const db=dn.every(nd=>nd.pass);
    results.push({option:"FHA Disaster Loan Modification",eligible:db&&canAchieve360&&(l.currentOrLe30DaysAtDisaster||l.incomeGePreDisaster||l.incomeDocProvided),nodes:[...dn,node("Target achievable by re-amortization",achieve360Label,canAchieve360),node("Income/DLQ condition",l.currentOrLe30DaysAtDisaster||l.incomeGePreDisaster||l.incomeDocProvided,l.currentOrLe30DaysAtDisaster||l.incomeGePreDisaster||l.incomeDocProvided)]});
    results.push({option:"FHA Disaster Standalone Partial Claim",eligible:db&&!canAchieve360&&comboCapPass,nodes:[...dn,node("Target NOT achievable",achieve360Label,!canAchieve360),node("PC within 30% cap",comboCapLabel,comboCapPass)]});
  }

  results.push({option:"Repayment Plan",eligible:!isDisaster&&dlq<=12&&l.canRepayWithin24Months&&!l.failedTPP,nodes:[node("Non-disaster hardship",l.hardshipType,!isDisaster),node("DLQ<=12mo",dlq,dlq<=12),node("Can repay 24mo",l.canRepayWithin24Months,l.canRepayWithin24Months),node("No failed TPP",!l.failedTPP,!l.failedTPP)]});
  results.push({option:"Formal Forbearance",eligible:!isDisaster&&dlq<12&&(l.canRepayWithin6Months||l.requestedForbearance),nodes:[node("Non-disaster hardship",l.hardshipType,!isDisaster),node("DLQ<12mo",dlq,dlq<12),node("Repay 6mo OR requested",l.canRepayWithin6Months||l.requestedForbearance,l.canRepayWithin6Months||l.requestedForbearance)]});

  const cooldownOK = priorHR === 0 || priorHR >= 24;
  const hb = baseEligible && cooldownOK && dlq > 0 && STANDARD_HARDSHIPS.includes(l.hardshipType) && l.borrowerIntentRetention;
  const hn = [...baseNodes,
    node("Std hardship",l.hardshipType,STANDARD_HARDSHIPS.includes(l.hardshipType)),
    node("DLQ>0",dlq,dlq>0),
    node("Prior home retention >=24mo ago or none",priorHR===0?"None":priorHR+"mo",cooldownOK),
    node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention)
  ];

  results.push({option:"FHA Standalone Partial Claim",eligible:hb&&l.fhaBorrowerCanResumePreHardship&&comboCapPass,nodes:[...hn,node("Can resume pre-hardship pmt",l.fhaBorrowerCanResumePreHardship?"Yes":"No",l.fhaBorrowerCanResumePreHardship),node("PC within 30% cap",comboCapLabel,comboCapPass)]});

  const fhaDeferCumUsed = n(l.fhaCumulativeDeferredMonths);
  const fhaDeferPrior = n(l.fhaPriorDeferralMonths);
  const fhaDeferDlqOK = dlq >= 3 && dlq <= 12;
  const fhaDeferCumOK = fhaDeferCumUsed < 12;
  const fhaDeferSpacingOK = fhaDeferPrior === 0 || fhaDeferPrior >= 12;
  results.push({option:"FHA Payment Deferral",eligible:!isDisaster&&baseEligible&&fhaDeferDlqOK&&l.fhaHardshipResolved&&fhaDeferCumOK&&fhaDeferSpacingOK,nodes:[node("Non-disaster hardship",l.hardshipType,!isDisaster),...baseNodes,node("DLQ 3-12 months",dlq+"mo",fhaDeferDlqOK),node("Hardship resolved",l.fhaHardshipResolved?"Yes":"No",l.fhaHardshipResolved),node("Cumulative deferrals < 12mo",fhaDeferCumUsed+"mo",fhaDeferCumOK),node("Prior deferral >=12mo ago or never",fhaDeferPrior===0?"None":fhaDeferPrior+"mo ago",fhaDeferSpacingOK)]});
  results.push({option:"FHA 30-Year Standalone Modification",eligible:hb&&canAchieve360,nodes:[...hn,node("25% P&I reduction achievable by 360mo re-amortization",achieve360Label,canAchieve360)]});
  results.push({option:"FHA 40-Year Combination Modification + Partial Claim",eligible:hb&&!canAchieve360&&cok&&canAchieve480&&upbWithinOrig,nodes:[...hn,node("25% reduction NOT achievable by 360mo",achieve360Label,!canAchieve360),node("PC within 30% cap",comboCapLabel,cok),node("25% reduction achievable by 480mo",achieve480Label,canAchieve480),node("New UPB <= Original UPB",upbWithinOrigLabel,upbWithinOrig)]});
  results.push({option:"Payment Supplement",eligible:!isDisaster&&baseEligible&&dlq>0&&!canAchieve360&&l.comboPaymentLe40PctIncome,nodes:[node("Non-disaster hardship",l.hardshipType,!isDisaster),...baseNodes,node("DLQ>0",dlq,dlq>0),node("25% P&I reduction NOT achievable",achieve360Label,!canAchieve360),node("Combo pmt<=40% GMI",l.comboPaymentLe40PctIncome,l.comboPaymentLe40PctIncome)]});
  results.push({option:"Special Forbearance - Unemployment",eligible:dlq<=12&&!l.foreclosureActive&&l.hardshipType==="Unemployment"&&l.occupancyStatus==="Owner Occupied"&&l.propertyDisposition==="Principal Residence"&&l.verifiedUnemployment&&!l.continuousIncome&&l.ineligibleAllRetention&&!l.propertyListedForSale&&!l.assumptionInProcess,nodes:[node("DLQ<=12mo",dlq,dlq<=12),node("Hardship=Unemployment",l.hardshipType,l.hardshipType==="Unemployment"),node("Verified unemployment",l.verifiedUnemployment,l.verifiedUnemployment),node("No continuous income",!l.continuousIncome,!l.continuousIncome),node("Ineligible all retention",l.ineligibleAllRetention,l.ineligibleAllRetention),node("Not listed for sale",!l.propertyListedForSale,!l.propertyListedForSale),node("No assumption",!l.assumptionInProcess,!l.assumptionInProcess)]});
  {
    const pfsIntentOK = !l.borrowerIntentRetention;
    const pfsHardshipOK = STANDARD_HARDSHIPS.includes(l.hardshipType) || l.hardshipType === "Disaster";
    const pfsDlqOK = dlq > 0;
    const pfsPropOK = l.propertyDisposition === "Principal Residence" || l.propertyListedForSale;
    const pfsNodes = [node("Borrower intent = Disposition",pfsIntentOK?"Disposition":"Retention",pfsIntentOK),node("Documented hardship",l.hardshipType,pfsHardshipOK),node("Loan is delinquent",dlq+"mo",pfsDlqOK),node("Principal Residence (or listed for sale)",pfsPropOK?"Yes":"No",pfsPropOK),node("Meets all other PFS criteria",l.meetsPFSRequirements?"Yes":"No",l.meetsPFSRequirements)];
    results.push({option:"Pre-Foreclosure Sale (PFS)",eligible:pfsNodes.every(nd=>nd.pass),nodes:pfsNodes});
  }
  {
    const dilPFSFailed = l.outstandingDebtUncurable;
    const dilPropOK = l.propertyCondition !== "Condemned" && !l.occupancyAbandoned;
    const dilHardshipOK = STANDARD_HARDSHIPS.includes(l.hardshipType) || l.hardshipType === "Disaster";
    const dilNodes = [node("PFS attempted and failed",dilPFSFailed?"Yes":"No",dilPFSFailed),node("Documented hardship",l.hardshipType,dilHardshipOK),node("Property not condemned/abandoned",l.propertyCondition,dilPropOK),node("Meets all other DIL criteria",l.meetsDILRequirements?"Yes":"No",l.meetsDILRequirements)];
    results.push({option:"Deed-in-Lieu (DIL)",eligible:dilNodes.every(nd=>nd.pass),nodes:dilNodes});
  }
  return results;
}

// append test

function evaluateUSDA(l) {
  const results=[];
  const dlqD=n(l.delinquencyDays)||n(l.delinquencyMonths)*30, dlqM=n(l.delinquencyMonths), nm=parseInt(l.usdaNumPrevMods)||0;
  const isD=l.hardshipType==="Disaster", ltp=l.hardshipDuration==="Long Term"||l.hardshipDuration==="Permanent";
  const br=l.propertyCondition!=="Condemned"&&l.propertyCondition!=="Uninhabitable"&&!l.occupancyAbandoned&&l.lienPosition==="First";
  const ib=!isD&&dlqD>=0&&dlqD<360&&l.borrowerIntentRetention&&l.hardshipDuration==="Short Term"&&l.usdaHardshipNotExcluded&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.occupancyStatus==="Owner Occupied"&&(l.usdaForbearancePeriodLt12||l.usdaTotalDLQLt12);
  const iN=[node("Non-disaster hardship",l.hardshipType,!isD),node("DLQ<360d",dlqD,dlqD>=0&&dlqD<360),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Short Term hardship",l.hardshipDuration,l.hardshipDuration==="Short Term"),node("Not excluded type",l.usdaHardshipNotExcluded,l.usdaHardshipNotExcluded),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("Forbearance or DLQ<12mo",l.usdaForbearancePeriodLt12||l.usdaTotalDLQLt12,l.usdaForbearancePeriodLt12||l.usdaTotalDLQLt12)];
  const rb=!isD&&dlqD>0&&dlqD<360&&l.borrowerIntentRetention&&l.hardshipDuration==="Resolved"&&l.usdaHardshipNotExcluded&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.occupancyStatus==="Owner Occupied";
  const rN=[node("Non-disaster hardship",l.hardshipType,!isD),node("DLQ>0&<360d",dlqD,dlqD>0&&dlqD<360),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Hardship=Resolved",l.hardshipDuration,l.hardshipDuration==="Resolved"),node("Not excluded type",l.usdaHardshipNotExcluded,l.usdaHardshipNotExcluded),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied")];
  results.push({option:"USDA Reinstatement",eligible:dlqD>0,nodes:[node("Past-due amounts exist",dlqD+"d DLQ",dlqD>0)]});
  results.push({option:"USDA Informal Forbearance",eligible:ib,nodes:iN});
  const usdaCurrentPITI = n(l.currentPITI);
  const usdaArrears = n(l.arrearagesToCapitalize);
  const usdaRepayMos = Math.min(12, Math.max(1, n(l.repayMonths) || 6));
  const usdaRppPayment = usdaCurrentPITI > 0 && usdaArrears > 0 ? usdaCurrentPITI + (usdaArrears / usdaRepayMos) : null;
  const rppWithin200 = usdaRppPayment != null ? usdaRppPayment <= usdaCurrentPITI * 2 : l.usdaNewPaymentLe200pct;
  const rppCapLabel = usdaRppPayment != null ? (rppWithin200?"OK":"FAIL") : (l.usdaNewPaymentLe200pct?"Yes":"No");
  results.push({option:"USDA Informal Repayment Plan",eligible:rb&&rppWithin200&&l.usdaBorrowerPositiveNetIncome,nodes:[...rN,node("RPP payment <= 200% current PITI",rppCapLabel,rppWithin200),node("Positive net income",l.usdaBorrowerPositiveNetIncome,l.usdaBorrowerPositiveNetIncome)]});
  results.push({option:"USDA Disaster Forbearance",eligible:isD&&br&&l.occupancyStatus==="Owner Occupied"&&l.usdaDLQAt30AtDisaster,nodes:[node("Hardship=Disaster",isD,isD),node("Base eligibility",br,br),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("Current or <30d DLQ at disaster",l.usdaDLQAt30AtDisaster,l.usdaDLQAt30AtDisaster)]});
  results.push({option:"USDA Special Forbearance",eligible:!isD&&br&&l.occupancyStatus==="Owner Occupied"&&dlqM<=12,nodes:[node("Not Disaster",!isD,!isD),node("Base eligibility",br,br),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("DLQ<=12mo",dlqM,dlqM<=12)]});
  const notListedForSale = !l.propertyListedForSale;
  const sb=!isD&&br&&l.borrowerIntentRetention&&l.occupancyStatus==="Owner Occupied"&&nm<2&&!l.usdaPriorFailedStreamlineTPP&&dlqD>=90&&l.usdaUpbGe5000&&l.usdaPaymentsMade12&&l.usdaBankruptcyNotActive&&l.usdaLitigationNotActive&&l.usdaForeclosureSaleGe60Away&&notListedForSale;
  results.push({option:"USDA Streamline Loan Modification",eligible:sb,nodes:[node("Non-disaster hardship",l.hardshipType,!isD),node(">=90d DLQ",dlqD,dlqD>=90),node("UPB>=$5k",l.usdaUpbGe5000,l.usdaUpbGe5000),node("12+ payments",l.usdaPaymentsMade12,l.usdaPaymentsMade12),node("Bankruptcy!=Active",l.usdaBankruptcyNotActive,l.usdaBankruptcyNotActive),node("Litigation!=Active",l.usdaLitigationNotActive,l.usdaLitigationNotActive),node("No failed Streamline TPP",!l.usdaPriorFailedStreamlineTPP,!l.usdaPriorFailedStreamlineTPP),node("Not Abandoned/Condemned",br,br),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Prior mods < 2",nm,nm<2),node("Foreclosure sale>=60d",l.usdaForeclosureSaleGe60Away,l.usdaForeclosureSaleGe60Away),node("Property not listed for sale",notListedForSale?"No":"Listed",notListedForSale)]});
  results.push({option:"USDA Modification + MRA Servicing Plan",eligible:sb&&l.usdaStep3DeferralRequired,nodes:[node(">=90d DLQ",dlqD,dlqD>=90),node("Streamline Mod base eligible",sb,sb),node("480mo re-amortization cannot achieve target",l.usdaStep3DeferralRequired?"Yes":"No",l.usdaStep3DeferralRequired)]});
  results.push({option:"USDA Standalone Mortgage Recovery Advance (MRA)",eligible:!isD&&l.usdaBorrowerCanResumeCurrent&&(l.usdaHardshipDurationResolved||l.usdaLoanModIneligible)&&l.usdaBorrowerCannotCureDLQWithin12&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&dlqD>=30,nodes:[node("Non-disaster hardship",l.hardshipType,!isD),node("Can resume payment",l.usdaBorrowerCanResumeCurrent,l.usdaBorrowerCanResumeCurrent),node("Resolved OR Mod Ineligible",l.usdaHardshipDurationResolved||l.usdaLoanModIneligible,l.usdaHardshipDurationResolved||l.usdaLoanModIneligible),node("Cannot cure DLQ 12mo",l.usdaBorrowerCannotCureDLQWithin12,l.usdaBorrowerCannotCureDLQWithin12),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("DLQ>=30d",dlqD,dlqD>=30)]});
  results.push({option:"USDA Disaster Term Extension Modification",eligible:l.usdaPriorWorkoutDisasterForbearance&&isD&&l.usdaHardshipNotResolved&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.usdaDLQGe12Contractual&&l.usdaDLQAt30AtDisaster&&l.usdaLoanGe60DLQ&&l.usdaPrevWorkoutForbearance&&l.usdaWorkoutStateActivePassed,nodes:[node("Prior=Disaster Forbearance",l.usdaPriorWorkoutDisasterForbearance,l.usdaPriorWorkoutDisasterForbearance),node("Hardship=Disaster",isD,isD),node("Hardship!=Resolved",l.usdaHardshipNotResolved,l.usdaHardshipNotResolved),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("DLQ>=12 Contractual",l.usdaDLQGe12Contractual,l.usdaDLQGe12Contractual),node("<30d DLQ at Declaration",l.usdaDLQAt30AtDisaster,l.usdaDLQAt30AtDisaster),node("Loan>=60d DLQ",l.usdaLoanGe60DLQ,l.usdaLoanGe60DLQ),node("Prev=Forbearance",l.usdaPrevWorkoutForbearance,l.usdaPrevWorkoutForbearance),node("Workout Active/Passed",l.usdaWorkoutStateActivePassed,l.usdaWorkoutStateActivePassed)]});
  results.push({option:"USDA Disaster Modification",eligible:isD&&l.lienPosition==="First"&&l.usdaDLQAt30AtDisaster&&l.hardshipDuration==="Resolved"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.usdaBorrowerCanResumePmtFalse&&l.usdaLoanGe30DaysDLQ&&l.usdaPostModPITILePreMod,nodes:[node("Hardship=Disaster",isD,isD),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("<30d at Declaration",l.usdaDLQAt30AtDisaster,l.usdaDLQAt30AtDisaster),node("Hardship=Resolved",l.hardshipDuration,l.hardshipDuration==="Resolved"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("Cannot resume pmt",l.usdaBorrowerCanResumePmtFalse,l.usdaBorrowerCanResumePmtFalse),node("Loan>=30d DLQ",l.usdaLoanGe30DaysDLQ,l.usdaLoanGe30DaysDLQ),node("Post-Mod PITI<=Pre",l.usdaPostModPITILePreMod,l.usdaPostModPITILePreMod)]});
  results.push({option:"USDA Disaster Mortgage Recovery Advance (MRA)",eligible:!l.usdaEligibleForDisasterExtension&&!l.usdaEligibleForDisasterMod&&isD&&l.lienPosition==="First"&&l.usdaDLQAt30AtDisaster&&l.hardshipDuration==="Resolved"&&l.usdaPriorWorkoutNotMRA&&l.usdaReinstatementLtMRACap&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.usdaBorrowerCanResumePmtFalse&&l.usdaLoanGe30DaysDLQ&&l.usdaPostModPITILePreMod,nodes:[node("DisasterExt=FALSE",!l.usdaEligibleForDisasterExtension,!l.usdaEligibleForDisasterExtension),node("DisasterMod=FALSE",!l.usdaEligibleForDisasterMod,!l.usdaEligibleForDisasterMod),node("Hardship=Disaster",isD,isD),node("Prior!=MRA",l.usdaPriorWorkoutNotMRA,l.usdaPriorWorkoutNotMRA),node("Reinstatement<Cap",l.usdaReinstatementLtMRACap,l.usdaReinstatementLtMRACap),node("<30d at Declaration",l.usdaDLQAt30AtDisaster,l.usdaDLQAt30AtDisaster),node("Hardship=Resolved",l.hardshipDuration,l.hardshipDuration==="Resolved"),node("Cannot resume pmt",l.usdaBorrowerCanResumePmtFalse,l.usdaBorrowerCanResumePmtFalse),node("Post-Mod PITI<=Pre",l.usdaPostModPITILePreMod,l.usdaPostModPITILePreMod)]});
  const usdaDispositionIntent = !l.borrowerIntentRetention;
  const cb=ltp&&usdaDispositionIntent&&l.usdaDLQGt30&&l.occupancyStatus==="Owner Occupied"&&l.usdaCompleteBRP&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&(l.usdaDLQLe60AndBRP||l.usdaDLQGe60AndDisposition);
  results.push({option:"USDA Compromise Sale",eligible:cb,nodes:[node("Long Term/Perm hardship",l.hardshipDuration,ltp),node("Borrower intent = Disposition",usdaDispositionIntent?"Disposition":"Retention",usdaDispositionIntent),node("DLQ>30d",l.usdaDLQGt30,l.usdaDLQGt30),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("Complete BRP",l.usdaCompleteBRP,l.usdaCompleteBRP),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("DLQ/BRP/Disposition criteria",l.usdaDLQLe60AndBRP||l.usdaDLQGe60AndDisposition,l.usdaDLQLe60AndBRP||l.usdaDLQGe60AndDisposition)]});
  results.push({option:"USDA Deed-in-Lieu",eligible:cb&&l.usdaPriorWorkoutCompSaleFailed,nodes:[node("Comp Sale criteria met",cb,cb),node("Prior Comp Sale=FAILED",l.usdaPriorWorkoutCompSaleFailed,l.usdaPriorWorkoutCompSaleFailed)]});
  return results;
}

function evaluateVA(l) {
  const results=[];
  const dlqD=n(l.delinquencyDays)||n(l.delinquencyMonths)*30, pcPct=n(l.partialClaimPct);
  const vb=l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&!l.foreclosureActive;
  const origUpbVA = n(l.originalUpb);
  const capAmtVA = n(l.arrearagesToCapitalize) + n(l.escrowShortage) + n(l.legalFees);
  const newUPBVA = n(l.upb) + capAmtVA;
  const vaArrearsPct = origUpbVA > 0 ? (capAmtVA / origUpbVA * 100) : null;
  const vaArrearsWithin25 = vaArrearsPct != null ? vaArrearsPct <= 25 : true;
  const vaUPBWithinOrig = origUpbVA === 0 || newUPBVA <= origUpbVA;
  const rH=l.hardshipDuration==="Resolved", ltH=l.hardshipDuration==="Long Term"||l.hardshipDuration==="Permanent";
  const sH=STANDARD_HARDSHIPS.includes(l.hardshipType), isD=l.hardshipType==="Disaster";
  const oo=l.occupancyStatus==="Owner Occupied";
  const vN=[node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("Foreclosure!=Active",!l.foreclosureActive,!l.foreclosureActive)];
  if (isD){
    results.push({option:"VA Disaster Forbearance",eligible:vb&&l.dlqAtDisasterLt30&&(l.forbearancePeriodLt12||l.totalDLQLt12),nodes:[...vN,node("<30d DLQ at Declaration",l.dlqAtDisasterLt30,l.dlqAtDisasterLt30),node("Forbearance/DLQ<12mo",l.forbearancePeriodLt12||l.totalDLQLt12,l.forbearancePeriodLt12||l.totalDLQLt12)]});
    results.push({option:"VA Disaster Modification",eligible:vb&&!l.activeRPP&&l.pmmsLeCurrentPlus1&&l.dlqAtDisasterLt30&&l.loanGe60DaysDLQ&&l.previousWorkoutForbearance&&l.workoutStateActivePassed,nodes:[...vN,node("ActiveRPP=False",!l.activeRPP,!l.activeRPP),node("PMMS<=Rate+1%",l.pmmsLeCurrentPlus1,l.pmmsLeCurrentPlus1),node("<30d at Declaration",l.dlqAtDisasterLt30,l.dlqAtDisasterLt30),node("Loan>=60d DLQ",l.loanGe60DaysDLQ,l.loanGe60DaysDLQ),node("Prev=Forbearance",l.previousWorkoutForbearance,l.previousWorkoutForbearance),node("Workout Active/Passed",l.workoutStateActivePassed,l.workoutStateActivePassed)]});
    results.push({option:"VA Disaster Extend Modification",eligible:vb&&l.hardshipDuration!=="Resolved"&&l.dlqGe12ContractualPayments&&l.dlqAtDisasterLt30&&l.loanGe60DaysDLQ&&l.previousWorkoutForbearance&&l.workoutStateActivePassed,nodes:[...vN,node("Hardship!=Resolved",l.hardshipDuration,l.hardshipDuration!=="Resolved"),node("DLQ>=12 Contractual",l.dlqGe12ContractualPayments,l.dlqGe12ContractualPayments),node("<30d at Declaration",l.dlqAtDisasterLt30,l.dlqAtDisasterLt30),node("Loan>=60d DLQ",l.loanGe60DaysDLQ,l.loanGe60DaysDLQ),node("Prev=Forbearance",l.previousWorkoutForbearance,l.previousWorkoutForbearance),node("Workout Active/Passed",l.workoutStateActivePassed,l.workoutStateActivePassed)]});
  }
  results.push({option:"VA Reinstatement",eligible:vb&&dlqD>=1&&l.borrowerCanAffordReinstateOrRepay,nodes:[...vN,node("DLQ>0",dlqD,dlqD>=1),node("Can afford reinstatement",l.borrowerCanAffordReinstateOrRepay,l.borrowerCanAffordReinstateOrRepay)]});
  results.push({option:"VA Repayment Plan",eligible:vb&&sH&&rH&&dlqD>=30&&l.calculatedRPPGt0&&l.borrowerCanAffordReinstateOrRepay&&l.borrowerIntentRetention&&oo,nodes:[...vN,node("Non-disaster hardship",l.hardshipType,sH),node("Hardship=Resolved",l.hardshipDuration,rH),node("DLQ>=30d",dlqD,dlqD>=30),node("RPP Plans>0",l.calculatedRPPGt0,l.calculatedRPPGt0),node("Can afford RPP",l.borrowerCanAffordReinstateOrRepay,l.borrowerCanAffordReinstateOrRepay),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Owner Occupied",l.occupancyStatus,oo)]});
  results.push({option:"VA Special Forbearance",eligible:vb&&l.hardshipDuration==="Long Term"&&sH&&(l.forbearancePeriodLt12||l.totalDLQLt12)&&l.borrowerIntentRetention&&oo,nodes:[...vN,node("Hardship=Long Term",l.hardshipDuration,l.hardshipDuration==="Long Term"),node("Std hardship",l.hardshipType,sH),node("Forbearance/DLQ<12mo",l.forbearancePeriodLt12||l.totalDLQLt12,l.forbearancePeriodLt12||l.totalDLQLt12),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Owner Occupied",l.occupancyStatus,oo)]});
  results.push({option:"VA Traditional Modification",eligible:vb&&sH&&dlqD>=61&&l.borrowerConfirmedCannotAffordCurrent&&l.borrowerCanAffordModifiedPayment&&l.borrowerIntentRetention&&oo&&vaArrearsWithin25&&vaUPBWithinOrig,nodes:[...vN,node("Std hardship",l.hardshipType,sH),node("DLQ>=61d",dlqD,dlqD>=61),node("Confirmed cannot afford current",l.borrowerConfirmedCannotAffordCurrent,l.borrowerConfirmedCannotAffordCurrent),node("CAN afford modified",l.borrowerCanAffordModifiedPayment,l.borrowerCanAffordModifiedPayment),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Owner Occupied",l.occupancyStatus,oo),node("Arrearages <=25% of orig UPB",vaArrearsPct!=null?vaArrearsPct.toFixed(1)+"%":"N/A",vaArrearsWithin25),node("New UPB <= Orig UPB",vaUPBWithinOrig?"Yes":"No",vaUPBWithinOrig)]});
  results.push({option:"VA 30-Year Loan Modification",eligible:vb&&sH&&dlqD>=61&&l.borrowerConfirmedCannotAffordCurrent&&!l.borrowerCanAffordCurrentMonthly&&l.borrowerIntentRetention&&oo&&vaArrearsWithin25&&vaUPBWithinOrig,nodes:[...vN,node("Std hardship",l.hardshipType,sH),node("DLQ>=61d",dlqD,dlqD>=61),node("Confirmed cannot afford current",l.borrowerConfirmedCannotAffordCurrent,l.borrowerConfirmedCannotAffordCurrent),node("Cannot afford current monthly",!l.borrowerCanAffordCurrentMonthly,!l.borrowerCanAffordCurrentMonthly),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Owner Occupied",l.occupancyStatus,oo),node("Arrearages <=25% of orig UPB",vaArrearsPct!=null?vaArrearsPct.toFixed(1)+"%":"N/A",vaArrearsWithin25),node("New UPB <= Orig UPB",vaUPBWithinOrig?"Yes":"No",vaUPBWithinOrig)]});
  results.push({option:"VA 40-Year Loan Modification",eligible:vb&&sH&&dlqD>=61&&l.borrowerConfirmedCannotAffordCurrent&&oo&&l.borrowerIntentRetention,nodes:[...vN,node("Std hardship",l.hardshipType,sH),node("DLQ>=61d",dlqD,dlqD>=61),node("Confirmed cannot afford",l.borrowerConfirmedCannotAffordCurrent,l.borrowerConfirmedCannotAffordCurrent),node("Owner Occupied",l.occupancyStatus,oo),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention)]});
  results.push({option:"VASP (VA Partial Claim)",eligible:false,nodes:[node("Program status","Discontinued",false)]});
  const vaDispositionIntent = !l.borrowerIntentRetention;
  const vaDispositionBRP = dlqD<=60 ? l.completeBRP : true;
  const ce=ltH&&vb&&vaDispositionIntent&&vaDispositionBRP&&((dlqD<=60&&l.completeBRP)||(dlqD>=60&&l.borrowerIntentDisposition));
  const ceNodes=[...vN,node("Long Term/Perm hardship",l.hardshipDuration,ltH),node("Borrower intent = Disposition",vaDispositionIntent?"Disposition":"Retention",vaDispositionIntent),node(dlqD<=60?"Complete BRP (DLQ<=60d)":"DLQ>=60d + Disposition intent",dlqD<=60?l.completeBRP:l.borrowerIntentDisposition,dlqD<=60?l.completeBRP:l.borrowerIntentDisposition)];
  results.push({option:"VA Compromise Sale",eligible:ce,nodes:ceNodes});
  results.push({option:"VA Deed-in-Lieu",eligible:ce&&l.priorWorkoutCompromiseSaleFailed,nodes:[...ceNodes,node("Prior Comp Sale FAILED",l.priorWorkoutCompromiseSaleFailed,l.priorWorkoutCompromiseSaleFailed)]});
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
  const noActiveLiquidation = !l.fhlmcApprovedLiquidationOption;
  const noActiveTPP = !l.fhlmcActiveTPP;
  const noActiveForbearance = !l.fhlmcActiveForbearance;
  const noActiveRepay = !l.fhlmcActiveRepayPlan;
  const noUnexpiredOffer = !l.fhlmcUnexpiredOffer;
  const noRecourse = !l.fhlmcRecourse;
  const isDisaster = l.hardshipType === "Disaster";
  const hardIneligible = !isConventional || l.fhlmcRecourse;
  const investmentHardStop = l.fhlmcPropertyType === "Investment Property" && dlq < 2;
  const softIneligible = priorMods >= 3 || l.fhlmcFailedFlexTPP12Mo || l.fhlmcPriorFlexMod60DLQ;
  {
    const hasArrears = n(l.arrearagesToCapitalize) > 0 || dlq > 0;
    results.push({ option:"FHLMC Reinstatement", eligible:hasArrears, nodes:[node("Past-due amounts exist", dlq+"mo DLQ", hasArrears)] });
  }
  {
    const nodes = [node("Non-disaster hardship", l.hardshipType, !isDisaster),node("Hardship resolved", l.fhlmcHardshipResolved?"Yes":"No", l.fhlmcHardshipResolved),node("Property not condemned/abandoned", l.propertyCondition, propertyOK)];
    results.push({ option:"FHLMC Repayment Plan", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  {
    const eligDlqRange = dlq >= 2 && dlq <= 6;
    const eligLoanAge = loanAge >= 12;
    const fhlmcCumDeferred = n(l.fhlmcCumulativeDeferredMonths);
    const fhlmcPriorDeferral = n(l.fhlmcPriorDeferralMonths);
    const eligCumCap = fhlmcCumDeferred < 12;
    const eligPriorDeferral = fhlmcPriorDeferral === 0 || fhlmcPriorDeferral >= 12;
    const nodes = [node("Non-disaster hardship", l.hardshipType, !isDisaster),node("Conventional 1st lien", l.lienPosition, isConventional && isFirstLien),node("Loan age >= 12 months", loanAge+"mo", eligLoanAge),node("DLQ 2-6 months", dlq+"mo", eligDlqRange),node("Hardship resolved", l.fhlmcHardshipResolved?"Yes":"No", l.fhlmcHardshipResolved),node("Can resume full contractual payment", l.fhlmcCanResumeFull?"Yes":"No", l.fhlmcCanResumeFull),node("Cumulative deferred months < 12", fhlmcCumDeferred+"mo", eligCumCap),node("Prior non-disaster deferral >= 12 months ago or never", fhlmcPriorDeferral===0?"None":fhlmcPriorDeferral+"mo ago", eligPriorDeferral),node("No approved liquidation option active", l.fhlmcApprovedLiquidationOption?"Active":"None", noActiveLiquidation),node("No active/performing TPP", l.fhlmcActiveTPP?"Active":"None", noActiveTPP),node("No unexpired offer for another workout option", l.fhlmcUnexpiredOffer?"Yes":"No", noUnexpiredOffer)];
    results.push({ option:"FHLMC Payment Deferral", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  {
    const eligDlqAtDisaster = dlqAtDisaster < 2;
    const eligDlqRange = dlq >= 1 && dlq <= 12;
    const nodes = [node("Disaster-related hardship", l.fhlmcDisasterHardship?"Yes":"No", l.fhlmcDisasterHardship),node("Eligible Disaster (FEMA-declared or insured loss)", l.fhlmcFEMADesignation?"Yes":"No", l.fhlmcFEMADesignation),node("DLQ at time of disaster < 2 months", dlqAtDisaster+"mo", eligDlqAtDisaster),node("Current DLQ 1-12 months", dlq+"mo", eligDlqRange),node("Hardship resolved", l.fhlmcHardshipResolved?"Yes":"No", l.fhlmcHardshipResolved),node("Can resume full contractual payment", l.fhlmcCanResumeFull?"Yes":"No", l.fhlmcCanResumeFull),node("Conventional 1st lien", l.lienPosition, isConventional && isFirstLien),node("No approved liquidation option active", l.fhlmcApprovedLiquidationOption?"Active":"None", noActiveLiquidation),node("No active/performing TPP", l.fhlmcActiveTPP?"Active":"None", noActiveTPP),node("No unexpired offer for another workout option", l.fhlmcUnexpiredOffer?"Yes":"No", noUnexpiredOffer)];
    results.push({ option:"FHLMC Disaster Payment Deferral", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  {
    const isUnemployed = l.fhlmcUnemployed || l.hardshipType === "Unemployment";
    const isTemporary = !l.fhlmcLongTermHardship;
    const eligForbearance = isUnemployed || isTemporary;
    const nodes = [node("Non-disaster hardship", l.hardshipType, !isDisaster),node("Temporary hardship or unemployment", eligForbearance ? (isUnemployed ? "Unemployment" : "Temporary hardship") : "Long-term/permanent", eligForbearance),node("Property not condemned/abandoned", l.propertyCondition, propertyOK),node("No approved liquidation option active", l.fhlmcApprovedLiquidationOption?"Active":"None", noActiveLiquidation)];
    results.push({ option:"FHLMC Forbearance Plan", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  {
    const eligHardship = l.fhlmcLongTermHardship;
    const eligDLQ = dlq >= 2 || l.fhlmcImminentDefault;
    const eligLoanAge = loanAge >= 12;
    const rule1 = l.fhlmcCashReservesLt25k && isPrimaryRes && l.fhlmcLongTermHardship;
    const rule2 = fico <= 620 || l.fhlmcPrior30DayDLQ6Mo || housingRatio > 40;
    const imminentValid = !l.fhlmcImminentDefault || (rule1 && rule2);
    const nodes = [node("Non-disaster hardship", l.hardshipType, !isDisaster),node("Conventional mortgage", l.fhlmcMortgageType, isConventional),node("First lien", l.lienPosition, isFirstLien),node("No recourse arrangement", l.fhlmcRecourse?"Yes":"No", noRecourse),node("Loan age >= 12 months", loanAge+"mo", eligLoanAge),node(">= 60 days DLQ OR imminent default", dlq+"mo"+(l.fhlmcImminentDefault?" (ID)":""), eligDLQ),...(l.fhlmcImminentDefault ? [node("Imminent default business rules met", imminentValid?"Pass":"Fail", imminentValid)] : []),node("Long-term/permanent hardship", l.fhlmcLongTermHardship?"Yes":"No", eligHardship),node("Verified income", l.fhlmcVerifiedIncome?"Yes":"No", l.fhlmcVerifiedIncome),node("Investment property: current/<60 DLQ hard stop", l.fhlmcPropertyType, !investmentHardStop),node("Prior modifications < 3", priorMods, priorMods < 3),node("No failed Flex Mod TPP within 12 months", l.fhlmcFailedFlexTPP12Mo?"Yes":"No", !l.fhlmcFailedFlexTPP12Mo),node("No prior Flex Mod re-default within 12mo", l.fhlmcPriorFlexMod60DLQ?"Yes":"No", !l.fhlmcPriorFlexMod60DLQ),node("No approved liquidation option active", l.fhlmcApprovedLiquidationOption?"Active":"None", noActiveLiquidation),node("Not under active TPP/forbearance/repayment plan", (l.fhlmcActiveTPP||l.fhlmcActiveForbearance||l.fhlmcActiveRepayPlan)?"Active":"None", noActiveTPP&&noActiveForbearance&&noActiveRepay),node("No unexpired offer for another workout option", l.fhlmcUnexpiredOffer?"Yes":"No", noUnexpiredOffer)];
    results.push({ option:"Freddie Mac Flex Modification", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  {
    const eligStreamlined = dlq >= 3 || (l.fhlmcStepRateMortgage && l.fhlmcRateAdjustedWithin12Mo && dlq >= 2);
    const nodes = [node("Non-disaster hardship", l.hardshipType, !isDisaster),node("Conventional mortgage", l.fhlmcMortgageType, isConventional),node("First lien", l.lienPosition, isFirstLien),node("No recourse arrangement", l.fhlmcRecourse?"Yes":"No", noRecourse),node("Loan age >= 12 months", loanAge+"mo", loanAge >= 12),node(">= 90 days DLQ OR Step-Rate 60+ DLQ within 12mo of adjustment", dlq+"mo", eligStreamlined),node("Investment property: current/<60 DLQ hard stop", l.fhlmcPropertyType, !investmentHardStop),node("Prior modifications < 3", priorMods, priorMods < 3),node("No failed Flex Mod TPP within 12 months", l.fhlmcFailedFlexTPP12Mo?"Yes":"No", !l.fhlmcFailedFlexTPP12Mo),node("No prior Flex Mod re-default within 12mo", l.fhlmcPriorFlexMod60DLQ?"Yes":"No", !l.fhlmcPriorFlexMod60DLQ),node("No approved liquidation option active", l.fhlmcApprovedLiquidationOption?"Active":"None", noActiveLiquidation),node("Not under active TPP/forbearance/repayment plan", (l.fhlmcActiveTPP||l.fhlmcActiveForbearance||l.fhlmcActiveRepayPlan)?"Active":"None", noActiveTPP&&noActiveForbearance&&noActiveRepay),node("No unexpired offer for another workout option", l.fhlmcUnexpiredOffer?"Yes":"No", noUnexpiredOffer)];
    results.push({ option:"Freddie Mac Flex Modification (Streamlined)", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  {
    const eligDisaster = l.fhlmcDisasterHardship;
    const eligFEMA = l.fhlmcFEMADesignation;
    const eligDlqAtDisaster = dlqAtDisaster < 2;
    const nodes = [node("Disaster-related hardship", l.fhlmcDisasterHardship?"Yes":"No", eligDisaster),node("Eligible Disaster (FEMA-declared)", l.fhlmcFEMADesignation?"Yes":"No", eligFEMA),node("Conventional mortgage", l.fhlmcMortgageType, isConventional),node("First lien", l.lienPosition, isFirstLien),node("No recourse arrangement", l.fhlmcRecourse?"Yes":"No", noRecourse),node("Current or <60 days DLQ at time of disaster", dlqAtDisaster+"mo", eligDlqAtDisaster),node("Not under active approved liquidation option", l.fhlmcApprovedLiquidationOption?"Active":"None", noActiveLiquidation),node("Not under active non-disaster TPP/repayment plan", (l.fhlmcActiveTPP||l.fhlmcActiveRepayPlan)?"Active":"None", noActiveTPP&&noActiveRepay),node("No unexpired non-disaster workout offer", l.fhlmcUnexpiredOffer?"Yes":"No", noUnexpiredOffer)];
    results.push({ option:"Freddie Mac Flex Modification (Disaster)", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  {
    const eligIntent = !l.borrowerIntentRetention;
    const nodes = [node("Borrower intent = Disposition", l.borrowerIntentRetention?"Retain":"Dispose", eligIntent),node("Eligible hardship", l.hardshipType, l.hardshipType !== "None"),node("Conventional mortgage", l.fhlmcMortgageType, isConventional)];
    results.push({ option:"Freddie Mac Short Sale", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  {
    const eligIntent = !l.borrowerIntentRetention;
    const nodes = [node("Borrower intent = Disposition", l.borrowerIntentRetention?"Retain":"Dispose", eligIntent),node("Eligible hardship", l.hardshipType, l.hardshipType !== "None"),node("Conventional mortgage", l.fhlmcMortgageType, isConventional),node("Meets Deed-in-Lieu requirements", l.meetsDILRequirements?"Yes":"No", l.meetsDILRequirements)];
    results.push({ option:"Freddie Mac Deed-in-Lieu", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  return results;
}

function evaluateFNMA(l) {
  const results = [];
  const isDisaster = l.hardshipType === "Disaster";
  const dlq = n(l.delinquencyMonths);
  const loanAge = n(l.fnmaLoanAge);
  const priorModCount = n(l.fnmaPriorModCount);
  const cumulativeDeferred = n(l.fnmaCumulativeDeferredMonths);
  const priorDeferralMonths = n(l.fnmaPriorDeferralMonths);
  const dlqAtDisaster = n(l.fnmaDelinquencyAtDisaster);
  const propertyOK = l.propertyCondition !== "Condemned" && !l.occupancyAbandoned;
  const commonBlockers = [node("No recourse/indemnification with FNMA", l.fnmaRecourseArrangement?"Yes":"No", !l.fnmaRecourseArrangement),node("No approved liquidation option active", l.fnmaActiveLiquidation?"Active":"None", !l.fnmaActiveLiquidation),node("No active/performing repayment plan", l.fnmaActiveRepayPlan?"Active":"None", !l.fnmaActiveRepayPlan),node("No pending workout option offer", l.fnmaActivePendingOffer?"Pending":"None", !l.fnmaActivePendingOffer),node("No active/performing modification TPP", l.fnmaActiveTPP?"Active":"None", !l.fnmaActiveTPP)];
  {
    const hasArrears = n(l.arrearagesToCapitalize) > 0 || dlq > 0;
    results.push({ option:"FNMA Reinstatement", eligible:hasArrears, nodes:[node("Past-due amounts exist", dlq+"mo DLQ", hasArrears)] });
  }
  {
    const isPrincipalRes = l.fnmaPropertyType === "Principal Residence";
    const isDisasterOK = l.fnmaDisasterHardship;
    const eligPropType = isPrincipalRes || isDisasterOK;
    const nodes = [node("Eligible hardship", l.hardshipType, l.hardshipType !== "None"),node("Property type eligible", l.fnmaPropertyType, eligPropType),node("Property not condemned/abandoned", l.propertyCondition, propertyOK)];
    results.push({ option:"FNMA Forbearance Plan", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  {
    const nodes = [node("Non-disaster hardship", l.hardshipType, !isDisaster),node("Hardship appears resolved", l.fnmaHardshipResolved?"Yes":"No", l.fnmaHardshipResolved),node("Property not condemned/abandoned", l.propertyCondition, propertyOK)];
    results.push({ option:"FNMA Repayment Plan", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  {
    const eligLienPos = l.lienPosition === "First";
    const eligLoanAge = loanAge >= 12;
    const eligDlqRange = dlq >= 2 && dlq <= 6;
    const eligCumCap = cumulativeDeferred < 12;
    const eligPriorDeferral = priorDeferralMonths === 0 || priorDeferralMonths >= 12;
    const eligNotNearMaturity = !l.fnmaWithin36MonthsMaturity;
    const eligNoFailedTPP = !l.fnmaFailedTPP12Months;
    const eligHardship = l.fnmaHardshipResolved || l.fnmaImminentDefault;
    const nodes = [node("Non-disaster hardship", l.hardshipType, !isDisaster),node("Conventional 1st lien", l.lienPosition, eligLienPos),node("Loan age >= 12 months", loanAge+"mo", eligLoanAge),node("DLQ 2-6 months at evaluation", dlq+"mo", eligDlqRange),node("Hardship resolved OR servicer imminent default determination", l.fnmaHardshipResolved?"Resolved":l.fnmaImminentDefault?"Imminent Default":"Neither", eligHardship),node("Can resume full contractual payment", l.fnmaCanResumeFull?"Yes":"No", l.fnmaCanResumeFull),node("Cannot reinstate or afford repayment plan", l.fnmaCannotReinstate?"Yes":"No", l.fnmaCannotReinstate),node("Cumulative deferred months < 12 (lifetime)", cumulativeDeferred+"mo", eligCumCap),node("Prior non-disaster deferral >= 12 months ago (or never)", priorDeferralMonths===0?"None":priorDeferralMonths+"mo ago", eligPriorDeferral),node("Not within 36 months of maturity", l.fnmaWithin36MonthsMaturity?"Within 36mo":"OK", eligNotNearMaturity),node("No failed Flex Mod TPP within 12 months", l.fnmaFailedTPP12Months?"Yes":"No", eligNoFailedTPP),...commonBlockers];
    results.push({ option:"FNMA Payment Deferral", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  {
    const eligDisaster = l.fnmaDisasterHardship;
    const eligFEMA = l.fnmaFEMADesignation || l.fnmaInsuredLoss;
    const eligLienPos = l.lienPosition === "First";
    const eligDlqAtDisaster = dlqAtDisaster < 2;
    const eligDlqRange = dlq >= 1 && dlq <= 12;
    const eligNotSameDisaster = !l.fnmaSameDlisasterPriorDeferral;
    const eligNotNearMaturity = !l.fnmaWithin36MonthsMaturity;
    const nodes = [node("Disaster-related hardship", l.fnmaDisasterHardship?"Yes":"No", eligDisaster),node("FEMA designation or insured property loss", (l.fnmaFEMADesignation||l.fnmaInsuredLoss)?"Yes":"No", eligFEMA),node("Conventional 1st lien", l.lienPosition, eligLienPos),node("DLQ at time of disaster < 2 months", dlqAtDisaster+"mo", eligDlqAtDisaster),node("Current DLQ 1-12 months at evaluation", dlq+"mo", eligDlqRange),node("Hardship resolved", l.fnmaHardshipResolved?"Yes":"No", l.fnmaHardshipResolved),node("Can resume full contractual payment", l.fnmaCanResumeFull?"Yes":"No", l.fnmaCanResumeFull),node("Cannot reinstate or afford repayment plan", l.fnmaCannotReinstate?"Yes":"No", l.fnmaCannotReinstate),node("No prior deferral for this same disaster event", l.fnmaSameDlisasterPriorDeferral?"Yes":"No", eligNotSameDisaster),node("Not within 36 months of maturity", l.fnmaWithin36MonthsMaturity?"Within 36mo":"OK", eligNotNearMaturity),...commonBlockers];
    results.push({ option:"FNMA Disaster Payment Deferral", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  {
    const eligLienPos = l.lienPosition === "First";
    const eligLoanAge = loanAge >= 12;
    const eligDLQ = dlq >= 2 || l.fnmaImminentDefault;
    const fnmaIDRule1 = l.fnmaPropertyType === "Principal Residence" && l.fnmaLongTermHardship && l.fnmaCashReservesLt3Mo;
    const fnmaIDRule2 = n(l.fnmaFICO) <= 620 || l.fnmaPrior30DLQ12Mo || n(l.fnmaHousingRatio) > 55;
    const fnmaImminentValid = !l.fnmaImminentDefault || (fnmaIDRule1 && fnmaIDRule2);
    const eligPriorMods = priorModCount < 3;
    const eligNoFailedTPP = !l.fnmaFailedTPP12Months;
    const eligNoReDefault = !l.fnmaReDefaulted12Months;
    const nodes = [node("Non-disaster hardship", l.hardshipType, !isDisaster),node("Conventional 1st lien", l.lienPosition, eligLienPos),node("Loan age >= 12 months", loanAge+"mo", eligLoanAge),node(">= 60 days DLQ OR servicer imminent default determination", dlq+"mo"+(l.fnmaImminentDefault?" (imminent default)":""), eligDLQ),...(l.fnmaImminentDefault ? [node("Imminent default business rules met (Rule 1 + Rule 2)", fnmaImminentValid?"Pass":"Fail", fnmaImminentValid)] : []),node("Prior modifications < 3", priorModCount, eligPriorMods),node("No failed Flex Mod TPP within 12 months", l.fnmaFailedTPP12Months?"Yes":"No", eligNoFailedTPP),node("No 60-day re-default within 12mo of last Flex Mod", l.fnmaReDefaulted12Months?"Yes":"No", eligNoReDefault),...commonBlockers];
    results.push({ option:"Fannie Mae Flex Modification", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  {
    const eligLienPos = l.lienPosition === "First";
    const eligLoanAge = loanAge >= 12;
    const eligDLQ = dlq >= 3;
    const eligPriorMods = priorModCount < 3;
    const eligNoFailedTPP = !l.fnmaFailedTPP12Months;
    const eligNoReDefault = !l.fnmaReDefaulted12Months;
    const nodes = [node("Non-disaster hardship", l.hardshipType, !isDisaster),node("Conventional 1st lien", l.lienPosition, eligLienPos),node("Loan age >= 12 months", loanAge+"mo", eligLoanAge),node(">= 90 days (3 months) DLQ", dlq+"mo", eligDLQ),node("Prior modifications < 3", priorModCount, eligPriorMods),node("No failed Flex Mod TPP within 12 months", l.fnmaFailedTPP12Months?"Yes":"No", eligNoFailedTPP),node("No 60-day re-default within 12mo of last Flex Mod", l.fnmaReDefaulted12Months?"Yes":"No", eligNoReDefault),...commonBlockers];
    results.push({ option:"Fannie Mae Flex Modification (Streamlined)", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  {
    const eligDisaster = l.fnmaDisasterHardship;
    const eligFEMA = l.fnmaFEMADesignation || l.fnmaInsuredLoss;
    const eligLienPos = l.lienPosition === "First";
    const eligDlqAtDisaster = dlqAtDisaster < 2;
    const eligCurrentDLQ = dlq >= 3;
    const nodes = [node("Disaster-related hardship", l.fnmaDisasterHardship?"Yes":"No", eligDisaster),node("FEMA designation or insured property loss", (l.fnmaFEMADesignation||l.fnmaInsuredLoss)?"Yes":"No", eligFEMA),node("Conventional 1st lien", l.lienPosition, eligLienPos),node("DLQ at time of disaster < 2 months", dlqAtDisaster+"mo", eligDlqAtDisaster),node("Current DLQ >= 3 months", dlq+"mo", eligCurrentDLQ),...commonBlockers];
    results.push({ option:"Fannie Mae Flex Modification (Disaster)", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  {
    const eligIntent = !l.borrowerIntentRetention;
    const nodes = [node("Borrower intent = Disposition (not retention)", l.borrowerIntentRetention?"Retain":"Dispose", eligIntent),node("Eligible hardship", l.hardshipType, l.hardshipType !== "None")];
    results.push({ option:"Fannie Mae Short Sale", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  {
    const eligIntent = !l.borrowerIntentRetention;
    const nodes = [node("Borrower intent = Disposition", l.borrowerIntentRetention?"Retain":"Dispose", eligIntent),node("Eligible hardship", l.hardshipType, l.hardshipType !== "None"),node("Meets Mortgage Release requirements", l.meetsDILRequirements?"Yes":"No", l.meetsDILRequirements)];
    results.push({ option:"Fannie Mae Mortgage Release (DIL)", eligible:nodes.every(nd=>nd.pass), nodes });
  }
  return results;
}


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
check("VA","TC31 Non-disaster - standard options present, no disaster block",
  L({hardshipType:"Reduction in Income", delinquencyDays:"90", lienPosition:"First", occupancyStatus:"Owner Occupied", borrowerIntentRetention:true, borrowerConfirmedCannotAffordCurrent:true}),
  {"VA 40-Year Loan Modification": true}); // disaster options omitted by if(isD) block

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
check("FNMA","TC39 Payment Deferral via imminent default (DLQ=2 required)",
  L({delinquencyMonths:"2", hardshipType:"Reduction in Income", lienPosition:"First", fnmaLoanAge:"24", fnmaImminentDefault:true, fnmaHardshipResolved:false, fnmaCanResumeFull:true, fnmaCannotReinstate:true, fnmaCumulativeDeferredMonths:"0", fnmaPriorDeferralMonths:"0", fnmaWithin36MonthsMaturity:false}),
  {"FNMA Payment Deferral": true}); // DLQ range 2-6 still required; imminent default satisfies hardship gate only

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
console.log("\n=== LOSS MITIGATION ELIGIBILITY TEST RESULTS ===\n");
console.log(`Total tests : ${total}`);
console.log(`PASSED      : ${totalPass}`);
console.log(`FAILED      : ${totalFail}`);
console.log(`Accuracy    : ${(totalPass/total*100).toFixed(1)}%\n`);

console.log("Per-Evaluator Summary:");
for (const [name, s] of Object.entries(summary)) {
  const pct = ((s.pass/(s.pass+s.fail))*100).toFixed(1);
  console.log(`  ${name.padEnd(6)}: ${s.pass}/${s.pass+s.fail} passed (${pct}%)`);
}

if (failures.length > 0) {
  console.log("\nFAILURES:");
  for (const f of failures) {
    console.log(`  [${f.evaluatorName}] ${f.testName}`);
    console.log(`    Option  : "${f.option}"`);
    console.log(`    Expected: ${f.expected}`);
    console.log(`    Actual  : ${f.actual}`);
  }
} else {
  console.log("\nAll tests passed!");
}
