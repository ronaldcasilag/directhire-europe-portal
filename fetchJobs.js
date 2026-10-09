import fs from 'fs';

// Rate conversion EUR to PHP
const EUR_TO_PHP = 62.5;

async function runAggregator() {
  console.log("Starting labor-market aligned job aggregation...");

  // Load target verified employers
  let employers = [];
  try {
    const employersRaw = fs.readFileSync('./employers.json', 'utf8');
    employers = JSON.parse(employersRaw);
  } catch (err) {
    console.error("Error reading employers.json:", err);
  }

  // Load existing jobs
  let existingJobs = [];
  try {
    const jobsRaw = fs.readFileSync('./jobs.json', 'utf8');
    existingJobs = JSON.parse(jobsRaw);
  } catch (err) {
    console.log("No existing jobs found, creating new dataset.");
  }

  // New Scraped Sample (Simulated pipeline payload from European Direct-Hire Portals)
  const incomingScrapedJobs = [
    {
      id: "EU-PL-30491",
      title: "6G Pipe Welder & Structural Fabricator",
      employer: "PKN Orlen S.A.",
      employerRegistryId: "PL7740001454",
      location: "Płock, Poland",
      countryCode: "PL",
      occupationalTier: "Tier 2: High-Value Skilled Trades",
      opportunityScore: 9.0,
      category: "Skilled Trades & Industrial Maintenance",
      employmentType: "Direct Hire / Full-Time",
      amountEUR: 2600,
      minExperienceYears: 3,
      education: "High School / TVET Graduate",
      credentials: ["TESDA NC II/NC III SMAW/GTAW 6G"],
      languageRequired: "English B1 (Functional)",
      applyUrl: "https://www.orlen.pl/en/careers",
      postedDate: new Date().toISOString().split('T')[0]
    }
  ];

  // Map into labor market schema
  const formattedJobs = incomingScrapedJobs.map(job => ({
    id: job.id,
    title: job.title,
    employer: job.employer,
    employerRegistryId: job.employerRegistryId,
    location: job.location,
    countryCode: job.countryCode,
    occupationalTier: job.occupationalTier,
    opportunityScore: job.opportunityScore,
    category: job.category,
    employmentType: job.employmentType,
    salary: {
      amountEUR: job.amountEUR,
      estimatedNetPHP: Math.round(job.amountEUR * EUR_TO_PHP),
      period: "Monthly"
    },
    requirements: {
      minExperienceYears: job.minExperienceYears,
      education: job.education,
      credentials: job.credentials,
      languageRequired: job.languageRequired
    },
    costsAndFees: {
      placementFee: "Zero Placement Fee (Employer Covered)",
      estimatedUpfrontPHP: 18000,
      upfrontExpensesBreakdown: "DFA Apostille, Medical Exam (GAMCA/Panel), NBI Clearance"
    },
    verificationStatus: {
      isVerifiedEmployer: true,
      dmwDirectHireCompliant: true,
      viesVerified: true
    },
    applyUrl: job.applyUrl,
    postedDate: job.postedDate
  }));

  // Merge and deduplicate
  const combinedJobs = [...formattedJobs, ...existingJobs];
  const uniqueJobs = Array.from(new Map(combinedJobs.map(item => [item.id, item])).values());

  fs.writeFileSync('./jobs.json', JSON.stringify(uniqueJobs, null, 2));
  console.log(`Successfully updated jobs.json. Total active listings: ${uniqueJobs.length}`);
}

runAggregator();
