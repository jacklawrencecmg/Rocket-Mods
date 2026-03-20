// test_waterfall.mjs — Tests for the computeWaterfall function

// ─── COPY computeWaterfall AND WATERFALL_ORDER FROM App.tsx ───────────────────
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
  const inWaterfall = new Set(order);
  const extras = eligibleResults.filter(r => !inWaterfall.has(r.option));
  return { waterfallEligible, extras, topOption: waterfallEligible[0] || eligibleResults[0] || null };
}

// ─── TEST FRAMEWORK ───────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch(e) { console.error(`FAIL: ${name} — ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || "assertion failed"); }

// Helper to make a simple eligible result object
function r(option) { return { option, eligible: true }; }

// ─── TESTS ────────────────────────────────────────────────────────────────────

// FHA: Reinstatement before Modification in waterfall
test("FHA waterfall puts Reinstatement before Modification", () => {
  const eligible = [
    r("FHA 30-Year Standalone Modification"),
    r("FHA Reinstatement"),
    r("Repayment Plan"),
  ];
  const { waterfallEligible } = computeWaterfall("FHA", eligible);
  const opts = waterfallEligible.map(o => o.option);
  const riIdx = opts.indexOf("FHA Reinstatement");
  const modIdx = opts.indexOf("FHA 30-Year Standalone Modification");
  assert(riIdx !== -1, "FHA Reinstatement should be in waterfall");
  assert(modIdx !== -1, "FHA 30-Year Standalone Modification should be in waterfall");
  assert(riIdx < modIdx, `Reinstatement (pos ${riIdx}) should come before Modification (pos ${modIdx})`);
});

// FHA: topOption is Reinstatement (earliest in waterfall)
test("FHA topOption is Reinstatement when eligible", () => {
  const eligible = [
    r("Repayment Plan"),
    r("FHA Reinstatement"),
    r("Payment Supplement"),
  ];
  const { topOption } = computeWaterfall("FHA", eligible);
  assert(topOption.option === "FHA Reinstatement", `Expected FHA Reinstatement as top, got ${topOption.option}`);
});

// VA: Repayment Plan before Modification
test("VA waterfall puts Repayment Plan before Modification", () => {
  const eligible = [
    r("VA 30-Year Loan Modification"),
    r("VA Repayment Plan"),
    r("VA Reinstatement"),
  ];
  const { waterfallEligible } = computeWaterfall("VA", eligible);
  const opts = waterfallEligible.map(o => o.option);
  const rpIdx = opts.indexOf("VA Repayment Plan");
  const modIdx = opts.indexOf("VA 30-Year Loan Modification");
  assert(rpIdx !== -1, "VA Repayment Plan should be in waterfall");
  assert(modIdx !== -1, "VA 30-Year Loan Modification should be in waterfall");
  assert(rpIdx < modIdx, `Repayment Plan (pos ${rpIdx}) should come before Modification (pos ${modIdx})`);
});

// FHLMC: Payment Deferral before Flex Modification
test("FHLMC waterfall puts Payment Deferral before Flex Modification", () => {
  const eligible = [
    r("Freddie Mac Flex Modification"),
    r("FHLMC Payment Deferral"),
    r("FHLMC Reinstatement"),
  ];
  const { waterfallEligible } = computeWaterfall("FHLMC", eligible);
  const opts = waterfallEligible.map(o => o.option);
  const pdIdx = opts.indexOf("FHLMC Payment Deferral");
  const fmIdx = opts.indexOf("Freddie Mac Flex Modification");
  assert(pdIdx !== -1, "FHLMC Payment Deferral should be in waterfall");
  assert(fmIdx !== -1, "Freddie Mac Flex Modification should be in waterfall");
  assert(pdIdx < fmIdx, `Payment Deferral (pos ${pdIdx}) should come before Flex Modification (pos ${fmIdx})`);
});

// Empty eligible list → empty waterfall
test("Empty eligible list returns empty waterfall", () => {
  const { waterfallEligible, extras, topOption } = computeWaterfall("FHA", []);
  assert(waterfallEligible.length === 0, "waterfallEligible should be empty");
  assert(extras.length === 0, "extras should be empty");
  assert(topOption === null, "topOption should be null");
});

// Options not in waterfall order go to extras
test("Options not in waterfall order go to extras", () => {
  const eligible = [
    r("FHA Reinstatement"),
    r("Pre-Foreclosure Sale (PFS)"),   // not in FHA waterfall order
    r("Deed-in-Lieu (DIL)"),           // not in FHA waterfall order
  ];
  const { waterfallEligible, extras } = computeWaterfall("FHA", eligible);
  const mainOpts = waterfallEligible.map(o => o.option);
  assert(mainOpts.includes("FHA Reinstatement"), "FHA Reinstatement should be in waterfall");
  assert(!mainOpts.includes("Pre-Foreclosure Sale (PFS)"), "PFS should not be in main waterfall");
  assert(extras.some(o => o.option === "Pre-Foreclosure Sale (PFS)"), "PFS should be in extras");
  assert(extras.some(o => o.option === "Deed-in-Lieu (DIL)"), "DIL should be in extras");
});

// USDA: Reinstatement is first in waterfall
test("USDA waterfall starts with Reinstatement", () => {
  const eligible = [
    r("USDA Streamline Loan Modification"),
    r("USDA Informal Repayment Plan"),
    r("USDA Reinstatement"),
  ];
  const { topOption } = computeWaterfall("USDA", eligible);
  assert(topOption.option === "USDA Reinstatement", `Expected USDA Reinstatement as top, got ${topOption.option}`);
});

// FNMA: Payment Deferral before Flex Modification
test("FNMA waterfall puts Payment Deferral before Flex Modification", () => {
  const eligible = [
    r("Fannie Mae Flex Modification"),
    r("FNMA Payment Deferral"),
    r("FNMA Reinstatement"),
  ];
  const { waterfallEligible } = computeWaterfall("FNMA", eligible);
  const opts = waterfallEligible.map(o => o.option);
  const pdIdx = opts.indexOf("FNMA Payment Deferral");
  const fmIdx = opts.indexOf("Fannie Mae Flex Modification");
  assert(pdIdx !== -1, "FNMA Payment Deferral should be in waterfall");
  assert(fmIdx !== -1, "Fannie Mae Flex Modification should be in waterfall");
  assert(pdIdx < fmIdx, `Payment Deferral (pos ${pdIdx}) should come before Flex Mod (pos ${fmIdx})`);
});

// Unknown loan type → empty order → all go to extras
test("Unknown loan type puts all options in extras", () => {
  const eligible = [r("Some Option"), r("Another Option")];
  const { waterfallEligible, extras } = computeWaterfall("UNKNOWN", eligible);
  assert(waterfallEligible.length === 0, "waterfallEligible should be empty for unknown type");
  assert(extras.length === 2, "All options should be in extras for unknown type");
});

// Single eligible option → topOption equals that option
test("Single eligible option is the topOption", () => {
  const eligible = [r("FHA 30-Year Standalone Modification")];
  const { topOption } = computeWaterfall("FHA", eligible);
  assert(topOption !== null, "topOption should not be null");
  assert(topOption.option === "FHA 30-Year Standalone Modification", `Expected modification as top, got ${topOption?.option}`);
});

// ─── REPORT ───────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log("\n=== WATERFALL TEST RESULTS ===\n");
console.log(`Total tests : ${total}`);
console.log(`PASSED      : ${passed}`);
console.log(`FAILED      : ${failed}`);
if (total > 0) console.log(`Accuracy    : ${(passed/total*100).toFixed(1)}%\n`);
if (failed === 0) console.log("All waterfall tests passed!");
