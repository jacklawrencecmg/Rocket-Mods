import io, os

path = 'C:/Users/jlawrence/OneDrive - cmgfi/Desktop/LMU2/test_evaluations.mjs'

usda = '''
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
'''

va = '''
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
'''

fhlmc = '''
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
'''

fnma = '''
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
'''

with io.open(path, 'a', encoding='utf-8') as f:
    f.write(usda)
    f.write(va)
    f.write(fhlmc)
    f.write(fnma)

print("All 4 functions appended")
