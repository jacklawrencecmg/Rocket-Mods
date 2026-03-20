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
    const dn=[...baseNodes,node("In PDMA",l.propertyInPDMA,l.propertyInPDMA),node("Principal Residence pre-disaster",l.principalResidencePreDisaster,l.principalResidencePreDisaster),node("DLQ<12mo",dlq,dlq<12),node("Not damaged OR repairs done",l.propertySubstantiallyDamaged?l.repairsCompleted:"N/A",!l.propertySubstantiallyDamaged||l.repairsCompleted)];
    const db=dn.every(nd=>nd.pass);
    results.push({option:"FHA Disaster Loan Modification",eligible:db&&canAchieve360&&(l.currentOrLe30DaysAtDisaster||l.incomeGePreDisaster||l.incomeDocProvided),nodes:[...dn,node("Target achievable by re-amortization",achieve360Label,canAchieve360),node("Income/DLQ condition",l.currentOrLe30DaysAtDisaster||l.incomeGePreDisaster||l.incomeDocProvided,l.currentOrLe30DaysAtDisaster||l.incomeGePreDisaster||l.incomeDocProvided)]});
    results.push({option:"FHA Disaster Standalone Partial Claim",eligible:db&&!canAchieve360&&comboCapPass,nodes:[...dn,node("Target NOT achievable",achieve360Label,!canAchieve360),node("PC within 30% cap",comboCapLabel,comboCapPass)]});
  }
  results.push({option:"Repayment Plan",eligible:!isDisaster&&dlq<=12&&l.canRepayWithin24Months&&!l.failedTPP,nodes:[node("Non-disaster hardship",l.hardshipType,!isDisaster),node("DLQ<=12mo",dlq,dlq<=12),node("Can repay 24mo",l.canRepayWithin24Months,l.canRepayWithin24Months),node("No failed TPP",!l.failedTPP,!l.failedTPP)]});
  results.push({option:"Formal Forbearance",eligible:!isDisaster&&dlq<12&&(l.canRepayWithin6Months||l.requestedForbearance),nodes:[node("Non-disaster hardship",l.hardshipType,!isDisaster),node("DLQ<12mo",dlq,dlq<12),node("Repay 6mo OR requested",l.canRepayWithin6Months||l.requestedForbearance,l.canRepayWithin6Months||l.requestedForbearance)]});
  const cooldownOK = priorHR === 0 || priorHR >= 24;
  const hb = baseEligible && cooldownOK && dlq > 0 && STANDARD_HARDSHIPS.includes(l.hardshipType) && l.borrowerIntentRetention;
  const hn = [...baseNodes,node("Std hardship",l.hardshipType,STANDARD_HARDSHIPS.includes(l.hardshipType)),node("DLQ>0",dlq,dlq>0),node("Prior home retention >=24mo ago or none",priorHR===0?"None":priorHR+"mo",cooldownOK),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention)];
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
  { const pfsIntentOK=!l.borrowerIntentRetention; const pfsHardshipOK=STANDARD_HARDSHIPS.includes(l.hardshipType)||l.hardshipType==="Disaster"; const pfsDlqOK=dlq>0; const pfsPropOK=l.propertyDisposition==="Principal Residence"||l.propertyListedForSale; const pfsNodes=[node("Borrower intent = Disposition",pfsIntentOK?"Disposition":"Retention",pfsIntentOK),node("Documented hardship",l.hardshipType,pfsHardshipOK),node("Loan is delinquent",dlq+"mo",pfsDlqOK),node("Principal Residence (or listed for sale)",pfsPropOK?"Yes":"No",pfsPropOK),node("Meets all other PFS criteria",l.meetsPFSRequirements?"Yes":"No",l.meetsPFSRequirements)]; results.push({option:"Pre-Foreclosure Sale (PFS)",eligible:pfsNodes.every(nd=>nd.pass),nodes:pfsNodes}); }
  { const dilPFSFailed=l.outstandingDebtUncurable; const dilPropOK=l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned; const dilHardshipOK=STANDARD_HARDSHIPS.includes(l.hardshipType)||l.hardshipType==="Disaster"; const dilNodes=[node("PFS attempted and failed",dilPFSFailed?"Yes":"No",dilPFSFailed),node("Documented hardship",l.hardshipType,dilHardshipOK),node("Property not condemned/abandoned",l.propertyCondition,dilPropOK),node("Meets all other DIL criteria",l.meetsDILRequirements?"Yes":"No",l.meetsDILRequirements)]; results.push({option:"Deed-in-Lieu (DIL)",eligible:dilNodes.every(nd=>nd.pass),nodes:dilNodes}); }
  return results;
}

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
  const usdaCurrentPITI=n(l.currentPITI), usdaArrears=n(l.arrearagesToCapitalize), usdaRepayMos=Math.min(12,Math.max(1,n(l.repayMonths)||6));
  const usdaRppPayment=usdaCurrentPITI>0&&usdaArrears>0?usdaCurrentPITI+(usdaArrears/usdaRepayMos):null;
  const rppWithin200=usdaRppPayment!=null?usdaRppPayment<=usdaCurrentPITI*2:l.usdaNewPaymentLe200pct;
  const rppCapLabel=usdaRppPayment!=null?(rppWithin200?"OK":"FAIL"):(l.usdaNewPaymentLe200pct?"Yes":"No");
  results.push({option:"USDA Informal Repayment Plan",eligible:rb&&rppWithin200&&l.usdaBorrowerPositiveNetIncome,nodes:[...rN,node("RPP payment <= 200% current PITI",rppCapLabel,rppWithin200),node("Positive net income",l.usdaBorrowerPositiveNetIncome,l.usdaBorrowerPositiveNetIncome)]});
  results.push({option:"USDA Disaster Forbearance",eligible:isD&&br&&l.occupancyStatus==="Owner Occupied"&&l.usdaDLQAt30AtDisaster,nodes:[node("Hardship=Disaster",isD,isD),node("Base eligibility",br,br),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("Current or <30d DLQ at disaster",l.usdaDLQAt30AtDisaster,l.usdaDLQAt30AtDisaster)]});
  results.push({option:"USDA Special Forbearance",eligible:!isD&&br&&l.occupancyStatus==="Owner Occupied"&&dlqM<=12,nodes:[node("Not Disaster",!isD,!isD),node("Base eligibility",br,br),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("DLQ<=12mo",dlqM,dlqM<=12)]});
  const notListedForSale=!l.propertyListedForSale;
  const sb=!isD&&br&&l.borrowerIntentRetention&&l.occupancyStatus==="Owner Occupied"&&nm<2&&!l.usdaPriorFailedStreamlineTPP&&dlqD>=90&&l.usdaUpbGe5000&&l.usdaPaymentsMade12&&l.usdaBankruptcyNotActive&&l.usdaLitigationNotActive&&l.usdaForeclosureSaleGe60Away&&notListedForSale;
  results.push({option:"USDA Streamline Loan Modification",eligible:sb,nodes:[node("Non-disaster hardship",l.hardshipType,!isD),node(">=90d DLQ",dlqD,dlqD>=90),node("UPB>=$5k",l.usdaUpbGe5000,l.usdaUpbGe5000),node("12+ payments",l.usdaPaymentsMade12,l.usdaPaymentsMade12),node("Bankruptcy!=Active",l.usdaBankruptcyNotActive,l.usdaBankruptcyNotActive),node("Litigation!=Active",l.usdaLitigationNotActive,l.usdaLitigationNotActive),node("No failed Streamline TPP",!l.usdaPriorFailedStreamlineTPP,!l.usdaPriorFailedStreamlineTPP),node("Not Abandoned/Condemned",br,br),node("Intent=Retain",l.borrowerIntentRetention,l.borrowerIntentRetention),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Prior mods < 2",nm,nm<2),node("Foreclosure sale>=60d",l.usdaForeclosureSaleGe60Away,l.usdaForeclosureSaleGe60Away),node("Property not listed for sale",notListedForSale?"No":"Listed",notListedForSale)]});
  results.push({option:"USDA Modification + MRA Servicing Plan",eligible:sb&&l.usdaStep3DeferralRequired,nodes:[node(">=90d DLQ",dlqD,dlqD>=90),node("Streamline Mod base eligible",sb,sb),node("480mo re-amortization cannot achieve target",l.usdaStep3DeferralRequired?"Yes":"No",l.usdaStep3DeferralRequired)]});
  results.push({option:"USDA Standalone Mortgage Recovery Advance (MRA)",eligible:!isD&&l.usdaBorrowerCanResumeCurrent&&(l.usdaHardshipDurationResolved||l.usdaLoanModIneligible)&&l.usdaBorrowerCannotCureDLQWithin12&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&dlqD>=30,nodes:[node("Non-disaster hardship",l.hardshipType,!isD),node("Can resume payment",l.usdaBorrowerCanResumeCurrent,l.usdaBorrowerCanResumeCurrent),node("Resolved OR Mod Ineligible",l.usdaHardshipDurationResolved||l.usdaLoanModIneligible,l.usdaHardshipDurationResolved||l.usdaLoanModIneligible),node("Cannot cure DLQ 12mo",l.usdaBorrowerCannotCureDLQWithin12,l.usdaBorrowerCannotCureDLQWithin12),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("DLQ>=30d",dlqD,dlqD>=30)]});
  results.push({option:"USDA Disaster Term Extension Modification",eligible:l.usdaPriorWorkoutDisasterForbearance&&isD&&l.usdaHardshipNotResolved&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.usdaDLQGe12Contractual&&l.usdaDLQAt30AtDisaster&&l.usdaLoanGe60DLQ&&l.usdaPrevWorkoutForbearance&&l.usdaWorkoutStateActivePassed,nodes:[node("Prior=Disaster Forbearance",l.usdaPriorWorkoutDisasterForbearance,l.usdaPriorWorkoutDisasterForbearance),node("Hardship=Disaster",isD,isD),node("Hardship!=Resolved",l.usdaHardshipNotResolved,l.usdaHardshipNotResolved),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("DLQ>=12 Contractual",l.usdaDLQGe12Contractual,l.usdaDLQGe12Contractual),node("<30d DLQ at Declaration",l.usdaDLQAt30AtDisaster,l.usdaDLQAt30AtDisaster),node("Loan>=60d DLQ",l.usdaLoanGe60DLQ,l.usdaLoanGe60DLQ),node("Prev=Forbearance",l.usdaPrevWorkoutForbearance,l.usdaPrevWorkoutForbearance),node("Workout Active/Passed",l.usdaWorkoutStateActivePassed,l.usdaWorkoutStateActivePassed)]});
  results.push({option:"USDA Disaster Modification",eligible:isD&&l.lienPosition==="First"&&l.usdaDLQAt30AtDisaster&&l.hardshipDuration==="Resolved"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.usdaBorrowerCanResumePmtFalse&&l.usdaLoanGe30DaysDLQ&&l.usdaPostModPITILePreMod,nodes:[node("Hardship=Disaster",isD,isD),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("<30d at Declaration",l.usdaDLQAt30AtDisaster,l.usdaDLQAt30AtDisaster),node("Hardship=Resolved",l.hardshipDuration,l.hardshipDuration==="Resolved"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("Cannot resume pmt",l.usdaBorrowerCanResumePmtFalse,l.usdaBorrowerCanResumePmtFalse),node("Loan>=30d DLQ",l.usdaLoanGe30DaysDLQ,l.usdaLoanGe30DaysDLQ),node("Post-Mod PITI<=Pre",l.usdaPostModPITILePreMod,l.usdaPostModPITILePreMod)]});
  results.push({option:"USDA Disaster Mortgage Recovery Advance (MRA)",eligible:!l.usdaEligibleForDisasterExtension&&!l.usdaEligibleForDisasterMod&&isD&&l.lienPosition==="First"&&l.usdaDLQAt30AtDisaster&&l.hardshipDuration==="Resolved"&&l.usdaPriorWorkoutNotMRA&&l.usdaReinstatementLtMRACap&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&l.usdaBorrowerCanResumePmtFalse&&l.usdaLoanGe30DaysDLQ&&l.usdaPostModPITILePreMod,nodes:[node("DisasterExt=FALSE",!l.usdaEligibleForDisasterExtension,!l.usdaEligibleForDisasterExtension),node("DisasterMod=FALSE",!l.usdaEligibleForDisasterMod,!l.usdaEligibleForDisasterMod),node("Hardship=Disaster",isD,isD),node("Prior!=MRA",l.usdaPriorWorkoutNotMRA,l.usdaPriorWorkoutNotMRA),node("Reinstatement<Cap",l.usdaReinstatementLtMRACap,l.usdaReinstatementLtMRACap),node("<30d at Declaration",l.usdaDLQAt30AtDisaster,l.usdaDLQAt30AtDisaster),node("Hardship=Resolved",l.hardshipDuration,l.hardshipDuration==="Resolved"),node("Cannot resume pmt",l.usdaBorrowerCanResumePmtFalse,l.usdaBorrowerCanResumePmtFalse),node("Post-Mod PITI<=Pre",l.usdaPostModPITILePreMod,l.usdaPostModPITILePreMod)]});
  const usdaDispositionIntent=!l.borrowerIntentRetention;
  const cb=ltp&&usdaDispositionIntent&&l.usdaDLQGt30&&l.occupancyStatus==="Owner Occupied"&&l.usdaCompleteBRP&&l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&(l.usdaDLQLe60AndBRP||l.usdaDLQGe60AndDisposition);
  results.push({option:"USDA Compromise Sale",eligible:cb,nodes:[node("Long Term/Perm hardship",l.hardshipDuration,ltp),node("Borrower intent = Disposition",usdaDispositionIntent?"Disposition":"Retention",usdaDispositionIntent),node("DLQ>30d",l.usdaDLQGt30,l.usdaDLQGt30),node("Owner Occupied",l.occupancyStatus,l.occupancyStatus==="Owner Occupied"),node("Complete BRP",l.usdaCompleteBRP,l.usdaCompleteBRP),node("Lien=First",l.lienPosition,l.lienPosition==="First"),node("Not Condemned",l.propertyCondition,l.propertyCondition!=="Condemned"),node("Not Abandoned",!l.occupancyAbandoned,!l.occupancyAbandoned),node("DLQ/BRP/Disposition criteria",l.usdaDLQLe60AndBRP||l.usdaDLQGe60AndDisposition,l.usdaDLQLe60AndBRP||l.usdaDLQGe60AndDisposition)]});
  results.push({option:"USDA Deed-in-Lieu",eligible:cb&&l.usdaPriorWorkoutCompSaleFailed,nodes:[node("Comp Sale criteria met",cb,cb),node("Prior Comp Sale=FAILED",l.usdaPriorWorkoutCompSaleFailed,l.usdaPriorWorkoutCompSaleFailed)]});
  return results;
}

function evaluateVA(l) {
  const results=[];
  const dlqD=n(l.delinquencyDays)||n(l.delinquencyMonths)*30;
  const vb=l.lienPosition==="First"&&l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned&&!l.foreclosureActive;
  const origUpbVA=n(l.originalUpb), capAmtVA=n(l.arrearagesToCapitalize)+n(l.escrowShortage)+n(l.legalFees), newUPBVA=n(l.upb)+capAmtVA;
  const vaArrearsPct=origUpbVA>0?(capAmtVA/origUpbVA*100):null;
  const vaArrearsWithin25=vaArrearsPct!=null?vaArrearsPct<=25:true;
  const vaUPBWithinOrig=origUpbVA===0||newUPBVA<=origUpbVA;
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
  const vaDispositionIntent=!l.borrowerIntentRetention;
  const vaDispositionBRP=dlqD<=60?l.completeBRP:true;
  const ce=ltH&&vb&&vaDispositionIntent&&vaDispositionBRP&&((dlqD<=60&&l.completeBRP)||(dlqD>=60&&l.borrowerIntentDisposition));
  const ceNodes=[...vN,node("Long Term/Perm hardship",l.hardshipDuration,ltH),node("Borrower intent = Disposition",vaDispositionIntent?"Disposition":"Retention",vaDispositionIntent),node(dlqD<=60?"Complete BRP (DLQ<=60d)":"DLQ>=60d + Disposition intent",dlqD<=60?l.completeBRP:l.borrowerIntentDisposition,dlqD<=60?l.completeBRP:l.borrowerIntentDisposition)];
  results.push({option:"VA Compromise Sale",eligible:ce,nodes:ceNodes});
  results.push({option:"VA Deed-in-Lieu",eligible:ce&&l.priorWorkoutCompromiseSaleFailed,nodes:[...ceNodes,node("Prior Comp Sale FAILED",l.priorWorkoutCompromiseSaleFailed,l.priorWorkoutCompromiseSaleFailed)]});
  return results;
}

function evaluateFHLMC(l) {
  const results=[];
  const dlq=n(l.delinquencyMonths), loanAge=n(l.fhlmcLoanAge), priorMods=n(l.fhlmcPriorModCount);
  const dlqAtDisaster=n(l.fhlmcDLQAtDisaster), fico=n(l.fhlmcFICO), housingRatio=n(l.fhlmcHousingExpenseRatio);
  const isConventional=l.fhlmcMortgageType==="Conventional", isFirstLien=l.lienPosition==="First";
  const isPrimaryRes=l.fhlmcPropertyType==="Primary Residence";
  const propertyOK=l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned;
  const noActiveLiquidation=!l.fhlmcApprovedLiquidationOption, noActiveTPP=!l.fhlmcActiveTPP;
  const noActiveForbearance=!l.fhlmcActiveForbearance, noActiveRepay=!l.fhlmcActiveRepayPlan;
  const noUnexpiredOffer=!l.fhlmcUnexpiredOffer, noRecourse=!l.fhlmcRecourse;
  const isDisaster=l.hardshipType==="Disaster";
  const investmentHardStop=l.fhlmcPropertyType==="Investment Property"&&dlq<2;
  { const hasArrears=n(l.arrearagesToCapitalize)>0||dlq>0; results.push({option:"FHLMC Reinstatement",eligible:hasArrears,nodes:[node("Past-due amounts exist",dlq+"mo DLQ",hasArrears)]}); }
  { const nodes=[node("Non-disaster hardship",l.hardshipType,!isDisaster),node("Hardship resolved",l.fhlmcHardshipResolved?"Yes":"No",l.fhlmcHardshipResolved),node("Property not condemned/abandoned",l.propertyCondition,propertyOK)]; results.push({option:"FHLMC Repayment Plan",eligible:nodes.every(nd=>nd.pass),nodes}); }
  {
    const eligDlqRange=dlq>=2&&dlq<=6, eligLoanAge=loanAge>=12;
    const fhlmcCumDeferred=n(l.fhlmcCumulativeDeferredMonths), fhlmcPriorDeferral=n(l.fhlmcPriorDeferralMonths);
    const eligCumCap=fhlmcCumDeferred<12, eligPriorDeferral=fhlmcPriorDeferral===0||fhlmcPriorDeferral>=12;
    const nodes=[node("Non-disaster hardship",l.hardshipType,!isDisaster),node("Conventional 1st lien",l.lienPosition,isConventional&&isFirstLien),node("Loan age >= 12 months",loanAge+"mo",eligLoanAge),node("DLQ 2-6 months",dlq+"mo",eligDlqRange),node("Hardship resolved",l.fhlmcHardshipResolved?"Yes":"No",l.fhlmcHardshipResolved),node("Can resume full contractual payment",l.fhlmcCanResumeFull?"Yes":"No",l.fhlmcCanResumeFull),node("Cumulative deferred months < 12",fhlmcCumDeferred+"mo",eligCumCap),node("Prior non-disaster deferral >= 12 months ago or never",fhlmcPriorDeferral===0?"None":fhlmcPriorDeferral+"mo ago",eligPriorDeferral),node("No approved liquidation option active",l.fhlmcApprovedLiquidationOption?"Active":"None",noActiveLiquidation),node("No active/performing TPP",l.fhlmcActiveTPP?"Active":"None",noActiveTPP),node("No unexpired offer for another workout option",l.fhlmcUnexpiredOffer?"Yes":"No",noUnexpiredOffer)];
    results.push({option:"FHLMC Payment Deferral",eligible:nodes.every(nd=>nd.pass),nodes});
  }
  {
    const eligDlqAtDisaster=dlqAtDisaster<2, eligDlqRange=dlq>=1&&dlq<=12;
    const nodes=[node("Disaster-related hardship",l.fhlmcDisasterHardship?"Yes":"No",l.fhlmcDisasterHardship),node("Eligible Disaster (FEMA-declared or insured loss)",l.fhlmcFEMADesignation?"Yes":"No",l.fhlmcFEMADesignation),node("DLQ at time of disaster < 2 months",dlqAtDisaster+"mo",eligDlqAtDisaster),node("Current DLQ 1-12 months",dlq+"mo",eligDlqRange),node("Hardship resolved",l.fhlmcHardshipResolved?"Yes":"No",l.fhlmcHardshipResolved),node("Can resume full contractual payment",l.fhlmcCanResumeFull?"Yes":"No",l.fhlmcCanResumeFull),node("Conventional 1st lien",l.lienPosition,isConventional&&isFirstLien),node("No approved liquidation option active",l.fhlmcApprovedLiquidationOption?"Active":"None",noActiveLiquidation),node("No active/performing TPP",l.fhlmcActiveTPP?"Active":"None",noActiveTPP),node("No unexpired offer for another workout option",l.fhlmcUnexpiredOffer?"Yes":"No",noUnexpiredOffer)];
    results.push({option:"FHLMC Disaster Payment Deferral",eligible:nodes.every(nd=>nd.pass),nodes});
  }
  {
    const isUnemployed=l.fhlmcUnemployed||l.hardshipType==="Unemployment";
    const isTemporary=!l.fhlmcLongTermHardship, eligForbearance=isUnemployed||isTemporary;
    const nodes=[node("Non-disaster hardship",l.hardshipType,!isDisaster),node("Temporary hardship or unemployment",eligForbearance?(isUnemployed?"Unemployment":"Temporary hardship"):"Long-term/permanent",eligForbearance),node("Property not condemned/abandoned",l.propertyCondition,propertyOK),node("No approved liquidation option active",l.fhlmcApprovedLiquidationOption?"Active":"None",noActiveLiquidation)];
    results.push({option:"FHLMC Forbearance Plan",eligible:nodes.every(nd=>nd.pass),nodes});
  }
  {
    const eligHardship=l.fhlmcLongTermHardship, eligDLQ=dlq>=2||l.fhlmcImminentDefault, eligLoanAge=loanAge>=12;
    const rule1=l.fhlmcCashReservesLt25k&&isPrimaryRes&&l.fhlmcLongTermHardship;
    const rule2=fico<=620||l.fhlmcPrior30DayDLQ6Mo||housingRatio>40;
    const imminentValid=!l.fhlmcImminentDefault||(rule1&&rule2);
    const nodes=[node("Non-disaster hardship",l.hardshipType,!isDisaster),node("Conventional mortgage",l.fhlmcMortgageType,isConventional),node("First lien",l.lienPosition,isFirstLien),node("No recourse arrangement",l.fhlmcRecourse?"Yes":"No",noRecourse),node("Loan age >= 12 months",loanAge+"mo",eligLoanAge),node(">= 60 days DLQ OR imminent default",dlq+"mo"+(l.fhlmcImminentDefault?" (ID)":""),eligDLQ),...(l.fhlmcImminentDefault?[node("Imminent default business rules met",imminentValid?"Pass":"Fail",imminentValid)]:[]),node("Long-term/permanent hardship",l.fhlmcLongTermHardship?"Yes":"No",eligHardship),node("Verified income",l.fhlmcVerifiedIncome?"Yes":"No",l.fhlmcVerifiedIncome),node("Investment property: current/<60 DLQ hard stop",l.fhlmcPropertyType,!investmentHardStop),node("Prior modifications < 3",priorMods,priorMods<3),node("No failed Flex Mod TPP within 12 months",l.fhlmcFailedFlexTPP12Mo?"Yes":"No",!l.fhlmcFailedFlexTPP12Mo),node("No prior Flex Mod re-default within 12mo",l.fhlmcPriorFlexMod60DLQ?"Yes":"No",!l.fhlmcPriorFlexMod60DLQ),node("No approved liquidation option active",l.fhlmcApprovedLiquidationOption?"Active":"None",noActiveLiquidation),node("Not under active TPP/forbearance/repayment plan",(l.fhlmcActiveTPP||l.fhlmcActiveForbearance||l.fhlmcActiveRepayPlan)?"Active":"None",noActiveTPP&&noActiveForbearance&&noActiveRepay),node("No unexpired offer for another workout option",l.fhlmcUnexpiredOffer?"Yes":"No",noUnexpiredOffer)];
    results.push({option:"Freddie Mac Flex Modification",eligible:nodes.every(nd=>nd.pass),nodes});
  }
  {
    const eligStreamlined=dlq>=3||(l.fhlmcStepRateMortgage&&l.fhlmcRateAdjustedWithin12Mo&&dlq>=2);
    const nodes=[node("Non-disaster hardship",l.hardshipType,!isDisaster),node("Conventional mortgage",l.fhlmcMortgageType,isConventional),node("First lien",l.lienPosition,isFirstLien),node("No recourse arrangement",l.fhlmcRecourse?"Yes":"No",noRecourse),node("Loan age >= 12 months",loanAge+"mo",loanAge>=12),node(">= 90 days DLQ OR Step-Rate 60+ DLQ within 12mo of adjustment",dlq+"mo",eligStreamlined),node("Investment property: current/<60 DLQ hard stop",l.fhlmcPropertyType,!investmentHardStop),node("Prior modifications < 3",priorMods,priorMods<3),node("No failed Flex Mod TPP within 12 months",l.fhlmcFailedFlexTPP12Mo?"Yes":"No",!l.fhlmcFailedFlexTPP12Mo),node("No prior Flex Mod re-default within 12mo",l.fhlmcPriorFlexMod60DLQ?"Yes":"No",!l.fhlmcPriorFlexMod60DLQ),node("No approved liquidation option active",l.fhlmcApprovedLiquidationOption?"Active":"None",noActiveLiquidation),node("Not under active TPP/forbearance/repayment plan",(l.fhlmcActiveTPP||l.fhlmcActiveForbearance||l.fhlmcActiveRepayPlan)?"Active":"None",noActiveTPP&&noActiveForbearance&&noActiveRepay),node("No unexpired offer for another workout option",l.fhlmcUnexpiredOffer?"Yes":"No",noUnexpiredOffer)];
    results.push({option:"Freddie Mac Flex Modification (Streamlined)",eligible:nodes.every(nd=>nd.pass),nodes});
  }
  {
    const eligDlqAtDisaster=dlqAtDisaster<2;
    const nodes=[node("Disaster-related hardship",l.fhlmcDisasterHardship?"Yes":"No",l.fhlmcDisasterHardship),node("Eligible Disaster (FEMA-declared)",l.fhlmcFEMADesignation?"Yes":"No",l.fhlmcFEMADesignation),node("Conventional mortgage",l.fhlmcMortgageType,isConventional),node("First lien",l.lienPosition,isFirstLien),node("No recourse arrangement",l.fhlmcRecourse?"Yes":"No",noRecourse),node("Current or <60 days DLQ at time of disaster",dlqAtDisaster+"mo",eligDlqAtDisaster),node("Not under active approved liquidation option",l.fhlmcApprovedLiquidationOption?"Active":"None",noActiveLiquidation),node("Not under active non-disaster TPP/repayment plan",(l.fhlmcActiveTPP||l.fhlmcActiveRepayPlan)?"Active":"None",noActiveTPP&&noActiveRepay),node("No unexpired non-disaster workout offer",l.fhlmcUnexpiredOffer?"Yes":"No",noUnexpiredOffer)];
    results.push({option:"Freddie Mac Flex Modification (Disaster)",eligible:nodes.every(nd=>nd.pass),nodes});
  }
  { const eligIntent=!l.borrowerIntentRetention; const nodes=[node("Borrower intent = Disposition",l.borrowerIntentRetention?"Retain":"Dispose",eligIntent),node("Eligible hardship",l.hardshipType,l.hardshipType!=="None"),node("Conventional mortgage",l.fhlmcMortgageType,isConventional)]; results.push({option:"Freddie Mac Short Sale",eligible:nodes.every(nd=>nd.pass),nodes}); }
  { const eligIntent=!l.borrowerIntentRetention; const nodes=[node("Borrower intent = Disposition",l.borrowerIntentRetention?"Retain":"Dispose",eligIntent),node("Eligible hardship",l.hardshipType,l.hardshipType!=="None"),node("Conventional mortgage",l.fhlmcMortgageType,isConventional),node("Meets Deed-in-Lieu requirements",l.meetsDILRequirements?"Yes":"No",l.meetsDILRequirements)]; results.push({option:"Freddie Mac Deed-in-Lieu",eligible:nodes.every(nd=>nd.pass),nodes}); }
  return results;
}

function evaluateFNMA(l) {
  const results=[];
  const isDisaster=l.hardshipType==="Disaster", dlq=n(l.delinquencyMonths), loanAge=n(l.fnmaLoanAge);
  const priorModCount=n(l.fnmaPriorModCount), cumulativeDeferred=n(l.fnmaCumulativeDeferredMonths);
  const priorDeferralMonths=n(l.fnmaPriorDeferralMonths), dlqAtDisaster=n(l.fnmaDelinquencyAtDisaster);
  const propertyOK=l.propertyCondition!=="Condemned"&&!l.occupancyAbandoned;
  const commonBlockers=[node("No recourse/indemnification with FNMA",l.fnmaRecourseArrangement?"Yes":"No",!l.fnmaRecourseArrangement),node("No approved liquidation option active",l.fnmaActiveLiquidation?"Active":"None",!l.fnmaActiveLiquidation),node("No active/performing repayment plan",l.fnmaActiveRepayPlan?"Active":"None",!l.fnmaActiveRepayPlan),node("No pending workout option offer",l.fnmaActivePendingOffer?"Pending":"None",!l.fnmaActivePendingOffer),node("No active/performing modification TPP",l.fnmaActiveTPP?"Active":"None",!l.fnmaActiveTPP)];
  { const hasArrears=n(l.arrearagesToCapitalize)>0||dlq>0; results.push({option:"FNMA Reinstatement",eligible:hasArrears,nodes:[node("Past-due amounts exist",dlq+"mo DLQ",hasArrears)]}); }
  { const isPrincipalRes=l.fnmaPropertyType==="Principal Residence"; const eligPropType=isPrincipalRes||l.fnmaDisasterHardship; const nodes=[node("Eligible hardship",l.hardshipType,l.hardshipType!=="None"),node("Property type eligible",l.fnmaPropertyType,eligPropType),node("Property not condemned/abandoned",l.propertyCondition,propertyOK)]; results.push({option:"FNMA Forbearance Plan",eligible:nodes.every(nd=>nd.pass),nodes}); }
  { const nodes=[node("Non-disaster hardship",l.hardshipType,!isDisaster),node("Hardship appears resolved",l.fnmaHardshipResolved?"Yes":"No",l.fnmaHardshipResolved),node("Property not condemned/abandoned",l.propertyCondition,propertyOK)]; results.push({option:"FNMA Repayment Plan",eligible:nodes.every(nd=>nd.pass),nodes}); }
  {
    const eligLienPos=l.lienPosition==="First", eligLoanAge=loanAge>=12, eligDlqRange=dlq>=2&&dlq<=6;
    const eligCumCap=cumulativeDeferred<12, eligPriorDeferral=priorDeferralMonths===0||priorDeferralMonths>=12;
    const eligHardship=l.fnmaHardshipResolved||l.fnmaImminentDefault;
    const nodes=[node("Non-disaster hardship",l.hardshipType,!isDisaster),node("Conventional 1st lien",l.lienPosition,eligLienPos),node("Loan age >= 12 months",loanAge+"mo",eligLoanAge),node("DLQ 2-6 months at evaluation",dlq+"mo",eligDlqRange),node("Hardship resolved OR servicer imminent default determination",l.fnmaHardshipResolved?"Resolved":l.fnmaImminentDefault?"Imminent Default":"Neither",eligHardship),node("Can resume full contractual payment",l.fnmaCanResumeFull?"Yes":"No",l.fnmaCanResumeFull),node("Cannot reinstate or afford repayment plan",l.fnmaCannotReinstate?"Yes":"No",l.fnmaCannotReinstate),node("Cumulative deferred months < 12 (lifetime)",cumulativeDeferred+"mo",eligCumCap),node("Prior non-disaster deferral >= 12 months ago (or never)",priorDeferralMonths===0?"None":priorDeferralMonths+"mo ago",eligPriorDeferral),node("Not within 36 months of maturity",l.fnmaWithin36MonthsMaturity?"Within 36mo":"OK",!l.fnmaWithin36MonthsMaturity),node("No failed Flex Mod TPP within 12 months",l.fnmaFailedTPP12Months?"Yes":"No",!l.fnmaFailedTPP12Months),...commonBlockers];
    results.push({option:"FNMA Payment Deferral",eligible:nodes.every(nd=>nd.pass),nodes});
  }
  {
    const eligFEMA=l.fnmaFEMADesignation||l.fnmaInsuredLoss, eligDlqAtDisaster=dlqAtDisaster<2, eligDlqRange=dlq>=1&&dlq<=12;
    const nodes=[node("Disaster-related hardship",l.fnmaDisasterHardship?"Yes":"No",l.fnmaDisasterHardship),node("FEMA designation or insured property loss",(l.fnmaFEMADesignation||l.fnmaInsuredLoss)?"Yes":"No",eligFEMA),node("Conventional 1st lien",l.lienPosition,l.lienPosition==="First"),node("DLQ at time of disaster < 2 months",dlqAtDisaster+"mo",eligDlqAtDisaster),node("Current DLQ 1-12 months at evaluation",dlq+"mo",eligDlqRange),node("Hardship resolved",l.fnmaHardshipResolved?"Yes":"No",l.fnmaHardshipResolved),node("Can resume full contractual payment",l.fnmaCanResumeFull?"Yes":"No",l.fnmaCanResumeFull),node("Cannot reinstate or afford repayment plan",l.fnmaCannotReinstate?"Yes":"No",l.fnmaCannotReinstate),node("No prior deferral for this same disaster event",l.fnmaSameDlisasterPriorDeferral?"Yes":"No",!l.fnmaSameDlisasterPriorDeferral),node("Not within 36 months of maturity",l.fnmaWithin36MonthsMaturity?"Within 36mo":"OK",!l.fnmaWithin36MonthsMaturity),...commonBlockers];
    results.push({option:"FNMA Disaster Payment Deferral",eligible:nodes.every(nd=>nd.pass),nodes});
  }
  {
    const eligLienPos=l.lienPosition==="First", eligLoanAge=loanAge>=12, eligDLQ=dlq>=2||l.fnmaImminentDefault;
    const fnmaIDRule1=l.fnmaPropertyType==="Principal Residence"&&l.fnmaLongTermHardship&&l.fnmaCashReservesLt3Mo;
    const fnmaIDRule2=n(l.fnmaFICO)<=620||l.fnmaPrior30DLQ12Mo||n(l.fnmaHousingRatio)>55;
    const fnmaImminentValid=!l.fnmaImminentDefault||(fnmaIDRule1&&fnmaIDRule2);
    const nodes=[node("Non-disaster hardship",l.hardshipType,!isDisaster),node("Conventional 1st lien",l.lienPosition,eligLienPos),node("Loan age >= 12 months",loanAge+"mo",eligLoanAge),node(">= 60 days DLQ OR servicer imminent default determination",dlq+"mo"+(l.fnmaImminentDefault?" (imminent default)":""),eligDLQ),...(l.fnmaImminentDefault?[node("Imminent default business rules met (Rule 1 + Rule 2)",fnmaImminentValid?"Pass":"Fail",fnmaImminentValid)]:[]),node("Prior modifications < 3",priorModCount,priorModCount<3),node("No failed Flex Mod TPP within 12 months",l.fnmaFailedTPP12Months?"Yes":"No",!l.fnmaFailedTPP12Months),node("No 60-day re-default within 12mo of last Flex Mod",l.fnmaReDefaulted12Months?"Yes":"No",!l.fnmaReDefaulted12Months),...commonBlockers];
    results.push({option:"Fannie Mae Flex Modification",eligible:nodes.every(nd=>nd.pass),nodes});
  }
  {
    const eligDLQ=dlq>=3;
    const nodes=[node("Non-disaster hardship",l.hardshipType,!isDisaster),node("Conventional 1st lien",l.lienPosition,l.lienPosition==="First"),node("Loan age >= 12 months",loanAge+"mo",loanAge>=12),node(">= 90 days (3 months) DLQ",dlq+"mo",eligDLQ),node("Prior modifications < 3",priorModCount,priorModCount<3),node("No failed Flex Mod TPP within 12 months",l.fnmaFailedTPP12Months?"Yes":"No",!l.fnmaFailedTPP12Months),node("No 60-day re-default within 12mo of last Flex Mod",l.fnmaReDefaulted12Months?"Yes":"No",!l.fnmaReDefaulted12Months),...commonBlockers];
    results.push({option:"Fannie Mae Flex Modification (Streamlined)",eligible:nodes.every(nd=>nd.pass),nodes});
  }
  {
    const eligFEMA=l.fnmaFEMADesignation||l.fnmaInsuredLoss, eligDlqAtDisaster=dlqAtDisaster<2, eligCurrentDLQ=dlq>=3;
    const nodes=[node("Disaster-related hardship",l.fnmaDisasterHardship?"Yes":"No",l.fnmaDisasterHardship),node("FEMA designation or insured property loss",(l.fnmaFEMADesignation||l.fnmaInsuredLoss)?"Yes":"No",eligFEMA),node("Conventional 1st lien",l.lienPosition,l.lienPosition==="First"),node("DLQ at time of disaster < 2 months",dlqAtDisaster+"mo",eligDlqAtDisaster),node("Current DLQ >= 3 months",dlq+"mo",eligCurrentDLQ),...commonBlockers];
    results.push({option:"Fannie Mae Flex Modification (Disaster)",eligible:nodes.every(nd=>nd.pass),nodes});
  }
  { const eligIntent=!l.borrowerIntentRetention; const nodes=[node("Borrower intent = Disposition (not retention)",l.borrowerIntentRetention?"Retain":"Dispose",eligIntent),node("Eligible hardship",l.hardshipType,l.hardshipType!=="None")]; results.push({option:"Fannie Mae Short Sale",eligible:nodes.every(nd=>nd.pass),nodes}); }
  { const eligIntent=!l.borrowerIntentRetention; const nodes=[node("Borrower intent = Disposition",l.borrowerIntentRetention?"Retain":"Dispose",eligIntent),node("Eligible hardship",l.hardshipType,l.hardshipType!=="None"),node("Meets Mortgage Release requirements",l.meetsDILRequirements?"Yes":"No",l.meetsDILRequirements)]; results.push({option:"Fannie Mae Mortgage Release (DIL)",eligible:nodes.every(nd=>nd.pass),nodes}); }
  return results;
}

// ─── TEST FRAMEWORK ───────────────────────────────────────────────────────────
let totalPass=0, totalFail=0;
const failures=[], summary={};
function check(evaluatorName, testName, loan, checks) {
  const results=eval("evaluate"+evaluatorName)(loan);
  const resultMap={};
  for (const r of results) resultMap[r.option]=r.eligible;
  if (!summary[evaluatorName]) summary[evaluatorName]={pass:0,fail:0};
  for (const [option,expected] of Object.entries(checks)) {
    const actual=resultMap[option];
    if (actual===undefined){failures.push({evaluatorName,testName,option,expected,actual:"NOT FOUND"});totalFail++;summary[evaluatorName].fail++;}
    else if (actual===expected){totalPass++;summary[evaluatorName].pass++;}
    else{failures.push({evaluatorName,testName,option,expected,actual});totalFail++;summary[evaluatorName].fail++;}
  }
}

// ─── FHLMC IMMINENT DEFAULT TESTS (15) ────────────────────────────────────────
// Base imminent default loan: <2mo DLQ, but servicer determined imminent default
// Rule 1: Primary Res + Long Term + Cash Reserves < $25k
// Rule 2: FICO<=620 OR Prior 30-day DLQ in 6mo OR Housing Ratio>40%

// Happy: ID with Rule1+Rule2 (FICO<=620)
check("FHLMC","ID-FHLMC-01 Flex Mod eligible - imminent default, FICO<=620",
  L({delinquencyMonths:"1",fhlmcImminentDefault:true,fhlmcLongTermHardship:true,
     fhlmcCashReservesLt25k:true,fhlmcPropertyType:"Primary Residence",
     fhlmcFICO:"580",fhlmcVerifiedIncome:true}),
  {"Freddie Mac Flex Modification":true});

// Happy: ID with Rule2 via prior 30-day DLQ
check("FHLMC","ID-FHLMC-02 Flex Mod eligible - imminent default, prior 30d DLQ",
  L({delinquencyMonths:"1",fhlmcImminentDefault:true,fhlmcLongTermHardship:true,
     fhlmcCashReservesLt25k:true,fhlmcPropertyType:"Primary Residence",
     fhlmcFICO:"700",fhlmcPrior30DayDLQ6Mo:true,fhlmcVerifiedIncome:true}),
  {"Freddie Mac Flex Modification":true});

// Happy: ID with Rule2 via housing ratio >40%
check("FHLMC","ID-FHLMC-03 Flex Mod eligible - imminent default, housing ratio >40%",
  L({delinquencyMonths:"1",fhlmcImminentDefault:true,fhlmcLongTermHardship:true,
     fhlmcCashReservesLt25k:true,fhlmcPropertyType:"Primary Residence",
     fhlmcFICO:"700",fhlmcHousingExpenseRatio:"45",fhlmcVerifiedIncome:true}),
  {"Freddie Mac Flex Modification":true});

// Sad: ID but Rule1 fails - not primary residence
check("FHLMC","ID-FHLMC-04 Flex Mod ineligible - imminent default, not primary res",
  L({delinquencyMonths:"1",fhlmcImminentDefault:true,fhlmcLongTermHardship:true,
     fhlmcCashReservesLt25k:true,fhlmcPropertyType:"Second Home",
     fhlmcFICO:"580",fhlmcVerifiedIncome:true}),
  {"Freddie Mac Flex Modification":false});

// Sad: ID but Rule1 fails - cash reserves >= $25k
check("FHLMC","ID-FHLMC-05 Flex Mod ineligible - imminent default, cash reserves >=25k",
  L({delinquencyMonths:"1",fhlmcImminentDefault:true,fhlmcLongTermHardship:true,
     fhlmcCashReservesLt25k:false,fhlmcPropertyType:"Primary Residence",
     fhlmcFICO:"580",fhlmcVerifiedIncome:true}),
  {"Freddie Mac Flex Modification":false});

// Sad: ID but Rule2 fails - good FICO, no prior DLQ, low housing ratio
check("FHLMC","ID-FHLMC-06 Flex Mod ineligible - imminent default, no Rule2 criteria",
  L({delinquencyMonths:"1",fhlmcImminentDefault:true,fhlmcLongTermHardship:true,
     fhlmcCashReservesLt25k:true,fhlmcPropertyType:"Primary Residence",
     fhlmcFICO:"720",fhlmcPrior30DayDLQ6Mo:false,fhlmcHousingExpenseRatio:"35",fhlmcVerifiedIncome:true}),
  {"Freddie Mac Flex Modification":false});

// Happy: 0 DLQ (current), imminent default - Payment Deferral NOT eligible (needs 2-6mo DLQ)
check("FHLMC","ID-FHLMC-07 Payment Deferral ineligible - imminent default but DLQ=0",
  L({delinquencyMonths:"0",fhlmcImminentDefault:true,fhlmcHardshipResolved:true,fhlmcCanResumeFull:true}),
  {"FHLMC Payment Deferral":false});

// Severely delinquent: 6mo DLQ - Flex Mod eligible (streamlined path)
check("FHLMC","ID-FHLMC-08 Flex Mod (Streamlined) eligible - 6mo DLQ",
  L({delinquencyMonths:"6",fhlmcLongTermHardship:true,fhlmcVerifiedIncome:true}),
  {"Freddie Mac Flex Modification (Streamlined)":true});

// Severely delinquent: 12mo DLQ - Flex Mod standard eligible
check("FHLMC","ID-FHLMC-09 Flex Mod eligible - 12mo severe DLQ",
  L({delinquencyMonths:"12",fhlmcLongTermHardship:true,fhlmcVerifiedIncome:true}),
  {"Freddie Mac Flex Modification":true});

// Severely delinquent: 24mo DLQ - Flex Mod eligible
check("FHLMC","ID-FHLMC-10 Flex Mod eligible - 24mo severe DLQ",
  L({delinquencyMonths:"24",fhlmcLongTermHardship:true,fhlmcVerifiedIncome:true}),
  {"Freddie Mac Flex Modification":true});

// Severely delinquent: 6mo DLQ - Payment Deferral NOT eligible (>6mo)
check("FHLMC","ID-FHLMC-11 Payment Deferral ineligible - 7mo DLQ",
  L({delinquencyMonths:"7",fhlmcHardshipResolved:true,fhlmcCanResumeFull:true}),
  {"FHLMC Payment Deferral":false});

// Severely delinquent: 13mo DLQ - Repayment Plan ineligible (needs resolved hardship - but repayment plan only checks hardship resolved and property OK)
check("FHLMC","ID-FHLMC-12 Repayment Plan eligible - 13mo DLQ with resolved hardship",
  L({delinquencyMonths:"13",fhlmcHardshipResolved:true}),
  {"FHLMC Repayment Plan":true});

// Imminent default: current loan (0 DLQ) - Reinstatement NOT eligible
check("FHLMC","ID-FHLMC-13 Reinstatement ineligible - current loan",
  L({delinquencyMonths:"0"}),
  {"FHLMC Reinstatement":false});

// Severely delinquent + investment property at 0 DLQ - investment hard stop
check("FHLMC","ID-FHLMC-14 Flex Mod ineligible - investment property, DLQ<2",
  L({delinquencyMonths:"1",fhlmcPropertyType:"Investment Property",fhlmcLongTermHardship:true,fhlmcVerifiedIncome:true}),
  {"Freddie Mac Flex Modification":false});

// Investment property at 3mo DLQ - hard stop lifted
check("FHLMC","ID-FHLMC-15 Flex Mod eligible - investment property, DLQ>=2",
  L({delinquencyMonths:"3",fhlmcPropertyType:"Investment Property",fhlmcLongTermHardship:true,fhlmcVerifiedIncome:true}),
  {"Freddie Mac Flex Modification":true});

// ─── FNMA IMMINENT DEFAULT TESTS (15) ─────────────────────────────────────────
// Rule 1: Principal Res + Long Term Hardship + Cash Reserves < 3mo PITI
// Rule 2: FICO<=620 OR Prior 2x30-day DLQ in 12mo OR Housing Ratio>55%

// Happy: ID with Rule1+Rule2 (FICO<=620)
check("FNMA","ID-FNMA-01 Flex Mod eligible - imminent default, FICO<=620",
  L({delinquencyMonths:"1",fnmaImminentDefault:true,fnmaLongTermHardship:true,
     fnmaCashReservesLt3Mo:true,fnmaPropertyType:"Principal Residence",fnmaFICO:"600"}),
  {"Fannie Mae Flex Modification":true});

// Happy: ID with Rule2 via housing ratio >55%
check("FNMA","ID-FNMA-02 Flex Mod eligible - imminent default, housing ratio >55%",
  L({delinquencyMonths:"1",fnmaImminentDefault:true,fnmaLongTermHardship:true,
     fnmaCashReservesLt3Mo:true,fnmaPropertyType:"Principal Residence",
     fnmaFICO:"700",fnmaHousingRatio:"58"}),
  {"Fannie Mae Flex Modification":true});

// Happy: ID with Rule2 via prior 2x30-day DLQ
check("FNMA","ID-FNMA-03 Flex Mod eligible - imminent default, prior 30d DLQ",
  L({delinquencyMonths:"1",fnmaImminentDefault:true,fnmaLongTermHardship:true,
     fnmaCashReservesLt3Mo:true,fnmaPropertyType:"Principal Residence",
     fnmaFICO:"700",fnmaPrior30DLQ12Mo:true}),
  {"Fannie Mae Flex Modification":true});

// Sad: ID but Rule1 fails - not principal residence
check("FNMA","ID-FNMA-04 Flex Mod ineligible - imminent default, not principal res",
  L({delinquencyMonths:"1",fnmaImminentDefault:true,fnmaLongTermHardship:true,
     fnmaCashReservesLt3Mo:true,fnmaPropertyType:"Second Home",fnmaFICO:"580"}),
  {"Fannie Mae Flex Modification":false});

// Sad: ID but Rule1 fails - not long-term hardship
check("FNMA","ID-FNMA-05 Flex Mod ineligible - imminent default, not long-term hardship",
  L({delinquencyMonths:"1",fnmaImminentDefault:true,fnmaLongTermHardship:false,
     fnmaCashReservesLt3Mo:true,fnmaPropertyType:"Principal Residence",fnmaFICO:"580"}),
  {"Fannie Mae Flex Modification":false});

// Sad: ID but Rule2 fails - FICO>620, no prior DLQ, housing ratio<=55%
check("FNMA","ID-FNMA-06 Flex Mod ineligible - imminent default, no Rule2",
  L({delinquencyMonths:"1",fnmaImminentDefault:true,fnmaLongTermHardship:true,
     fnmaCashReservesLt3Mo:true,fnmaPropertyType:"Principal Residence",
     fnmaFICO:"700",fnmaPrior30DLQ12Mo:false,fnmaHousingRatio:"50"}),
  {"Fannie Mae Flex Modification":false});

// Happy: FNMA Payment Deferral - imminent default qualifies as resolved/ID
check("FNMA","ID-FNMA-07 Payment Deferral eligible - imminent default determination",
  L({delinquencyMonths:"2",fnmaImminentDefault:true,fnmaCanResumeFull:true,fnmaCannotReinstate:true}),
  {"FNMA Payment Deferral":true});

// Sad: Payment Deferral - current loan (DLQ<2)
check("FNMA","ID-FNMA-08 Payment Deferral ineligible - DLQ<2 months",
  L({delinquencyMonths:"1",fnmaImminentDefault:false,fnmaHardshipResolved:true,fnmaCanResumeFull:true}),
  {"FNMA Payment Deferral":false});

// Severely delinquent: 6mo DLQ - Flex Mod (Streamlined) eligible
check("FNMA","ID-FNMA-09 Flex Mod (Streamlined) eligible - 6mo DLQ",
  L({delinquencyMonths:"6"}),
  {"Fannie Mae Flex Modification (Streamlined)":true});

// Severely delinquent: 12mo DLQ - Flex Mod standard eligible
check("FNMA","ID-FNMA-10 Flex Mod eligible - 12mo severe DLQ",
  L({delinquencyMonths:"12"}),
  {"Fannie Mae Flex Modification":true});

// Severely delinquent: 18mo DLQ - Flex Mod eligible
check("FNMA","ID-FNMA-11 Flex Mod eligible - 18mo severe DLQ",
  L({delinquencyMonths:"18"}),
  {"Fannie Mae Flex Modification":true});

// Severely delinquent: 7mo DLQ - Payment Deferral NOT eligible (>6mo)
check("FNMA","ID-FNMA-12 Payment Deferral ineligible - 7mo DLQ",
  L({delinquencyMonths:"7",fnmaHardshipResolved:true,fnmaCanResumeFull:true}),
  {"FNMA Payment Deferral":false});

// Severely delinquent: 24mo DLQ - Reinstatement eligible
check("FNMA","ID-FNMA-13 Reinstatement eligible - 24mo DLQ",
  L({delinquencyMonths:"24"}),
  {"FNMA Reinstatement":true});

// Imminent default: 0 DLQ - Reinstatement NOT eligible
check("FNMA","ID-FNMA-14 Reinstatement ineligible - current loan",
  L({delinquencyMonths:"0"}),
  {"FNMA Reinstatement":false});

// Severely delinquent: short sale available at any DLQ with disposition intent
check("FNMA","ID-FNMA-15 Short Sale eligible - 18mo DLQ, disposition intent",
  L({delinquencyMonths:"18",borrowerIntentRetention:false,hardshipType:"Reduction in Income"}),
  {"Fannie Mae Short Sale":true});

// ─── FHA SEVERELY DELINQUENT TESTS (10) ───────────────────────────────────────

// 13mo DLQ - Repayment Plan NOT eligible (>12mo)
check("FHA","SEV-FHA-01 Repayment Plan ineligible - 13mo DLQ",
  L({delinquencyMonths:"13",canRepayWithin24Months:true}),
  {"Repayment Plan":false});

// 13mo DLQ - Formal Forbearance NOT eligible (>=12mo)
check("FHA","SEV-FHA-02 Formal Forbearance ineligible - 13mo DLQ",
  L({delinquencyMonths:"13",canRepayWithin6Months:true}),
  {"Formal Forbearance":false});

// 13mo DLQ - Payment Deferral NOT eligible (>12mo)
check("FHA","SEV-FHA-03 Payment Deferral ineligible - 13mo DLQ",
  L({delinquencyMonths:"13",fhaHardshipResolved:true}),
  {"FHA Payment Deferral":false});

// 13mo DLQ - 30yr Mod still eligible (hb only needs dlq>0)
check("FHA","SEV-FHA-04 30-Year Mod eligible - 13mo DLQ",
  L({delinquencyMonths:"13",canAchieveTargetByReamort:true}),
  {"FHA 30-Year Standalone Modification":true});

// 24mo DLQ - 30yr Mod eligible
check("FHA","SEV-FHA-05 30-Year Mod eligible - 24mo DLQ",
  L({delinquencyMonths:"24",canAchieveTargetByReamort:true}),
  {"FHA 30-Year Standalone Modification":true});

// 24mo DLQ - 40yr Combo Mod eligible when 360 can't achieve target
check("FHA","SEV-FHA-06 40-Year Combo eligible - 24mo DLQ, 480mo achieves target",
  L({delinquencyMonths:"24",canAchieveTargetByReamort:false,canAchieveTargetBy480Reamort:true,partialClaimPct:"20"}),
  {"FHA 40-Year Combination Modification + Partial Claim":true});

// 24mo DLQ - Payment Supplement eligible
check("FHA","SEV-FHA-07 Payment Supplement eligible - 24mo DLQ",
  L({delinquencyMonths:"24",canAchieveTargetByReamort:false,comboPaymentLe40PctIncome:true}),
  {"Payment Supplement":true});

// 24mo DLQ - PFS eligible with disposition intent
check("FHA","SEV-FHA-08 PFS eligible - 24mo DLQ, disposition intent",
  L({delinquencyMonths:"24",borrowerIntentRetention:false,meetsPFSRequirements:true}),
  {"Pre-Foreclosure Sale (PFS)":true});

// 24mo DLQ - DIL eligible
check("FHA","SEV-FHA-09 DIL eligible - 24mo DLQ, PFS failed",
  L({delinquencyMonths:"24",borrowerIntentRetention:false,outstandingDebtUncurable:true,meetsDILRequirements:true}),
  {"Deed-in-Lieu (DIL)":true});

// 12mo DLQ - Repayment Plan eligible (boundary: exactly 12)
check("FHA","SEV-FHA-10 Repayment Plan eligible - exactly 12mo DLQ",
  L({delinquencyMonths:"12",canRepayWithin24Months:true}),
  {"Repayment Plan":true});

// ─── USDA SEVERELY DELINQUENT TESTS (5) ───────────────────────────────────────

// 12mo DLQ (360d) - Streamline Mod NOT eligible (dlqD>=360 blocks ib, sb needs dlqD>=90 ✓)
// Actually 12mo = 360d, sb requires dlqD>=90 so 360 is fine, but ib requires dlqD<360
check("USDA","SEV-USDA-01 Informal Forbearance ineligible - 360d DLQ",
  L({delinquencyDays:"360",hardshipDuration:"Short Term"}),
  {"USDA Informal Forbearance":false});

// 6mo DLQ - Streamline Mod eligible
check("USDA","SEV-USDA-02 Streamline Mod eligible - 6mo (180d) DLQ",
  L({delinquencyDays:"180"}),
  {"USDA Streamline Loan Modification":true});

// 12mo DLQ - Streamline Mod eligible
check("USDA","SEV-USDA-03 Streamline Mod eligible - 12mo (360d) DLQ (boundary)",
  L({delinquencyDays:"359"}),
  {"USDA Streamline Loan Modification":true});

// 3mo DLQ - Special Forbearance eligible (<=12mo)
check("USDA","SEV-USDA-04 Special Forbearance eligible - 3mo DLQ",
  L({delinquencyMonths:"3"}),
  {"USDA Special Forbearance":true});

// 13mo DLQ - Special Forbearance NOT eligible (>12mo)
check("USDA","SEV-USDA-05 Special Forbearance ineligible - 13mo DLQ",
  L({delinquencyMonths:"13"}),
  {"USDA Special Forbearance":false});

// ─── VA SEVERELY DELINQUENT TESTS (5) ─────────────────────────────────────────

// 2mo (61d) DLQ - Traditional Mod, 30yr Mod, 40yr Mod all eligible
check("VA","SEV-VA-01 Traditional/30yr/40yr Mod eligible - 61d DLQ",
  L({delinquencyDays:"61",borrowerConfirmedCannotAffordCurrent:true,
     borrowerCanAffordModifiedPayment:true}),
  {"VA Traditional Modification":true,"VA 30-Year Loan Modification":true,"VA 40-Year Loan Modification":true});

// 1mo (60d) DLQ - Traditional Mod NOT eligible (needs >=61d)
check("VA","SEV-VA-02 Traditional Mod ineligible - 60d DLQ (boundary)",
  L({delinquencyDays:"60",borrowerConfirmedCannotAffordCurrent:true,borrowerCanAffordModifiedPayment:true}),
  {"VA Traditional Modification":false});

// 12mo DLQ - All mods eligible at severe DLQ
check("VA","SEV-VA-03 VA mods eligible - 12mo severe DLQ",
  L({delinquencyDays:"365",borrowerConfirmedCannotAffordCurrent:true,borrowerCanAffordModifiedPayment:true}),
  {"VA Traditional Modification":true,"VA 40-Year Loan Modification":true});

// 24mo DLQ, disposition intent - Compromise Sale eligible
check("VA","SEV-VA-04 Compromise Sale eligible - 24mo severe DLQ, disposition",
  L({delinquencyDays:"730",hardshipDuration:"Long Term",borrowerIntentRetention:false,borrowerIntentDisposition:true}),
  {"VA Compromise Sale":true});

// 1mo DLQ - Repayment Plan eligible (>=30d)
check("VA","SEV-VA-05 Repayment Plan eligible - 30d DLQ (boundary)",
  L({delinquencyDays:"30",hardshipDuration:"Resolved",borrowerCanAffordReinstateOrRepay:true}),
  {"VA Repayment Plan":true});

// ─── RESULTS ──────────────────────────────────────────────────────────────────
console.log("\n=== IMMINENT DEFAULT & SEVERELY DELINQUENT TEST RESULTS ===");
for (const [ev,s] of Object.entries(summary)) {
  const total=s.pass+s.fail;
  console.log(`${ev}: ${s.pass}/${total} passed (${((s.pass/total)*100).toFixed(1)}%)`);
}
console.log(`\nTotal: ${totalPass}/${totalPass+totalFail} passed (${((totalPass/(totalPass+totalFail))*100).toFixed(1)}%)`);
if (failures.length>0) {
  console.log("\nFAILURES:");
  for (const f of failures) {
    console.log(`  [${f.evaluatorName}] ${f.testName}`);
    console.log(`    Option: "${f.option}" | Expected: ${f.expected} | Got: ${f.actual}`);
  }
}
