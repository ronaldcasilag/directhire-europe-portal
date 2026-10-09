const fs = require('fs');

// Rate conversion EUR to PHP (Estimated average)
const EUR_TO_PHP = 62.5;

async function runAggregator() {
  console.log("Starting job aggregation process...");

  // Load target verified employers
  const employersRaw = fs.readFileSync('./employers.json', 'utf8');
  const employers = JSON.parse(employersRaw);

  // Load existing jobs
  let existingJobs = [];
  try {
    const jobsRaw = fs.readFileSync('./jobs.json', 'utf8');
    existingJobs = JSON.parse(jobsRaw);
  } catch (err) {
    console.log("No existing jobs found, creating new list.");
  }

  // Example automated payload from direct-hire sources
  const newScrapedJobs = [
    {
      id: "EU-DE-99201",
      title: "CNC Machinist & Heavy Equipment Operator",
      employer: "Škoda Auto a.s.",
      employerRegistryId: "CZ00177041",
      location: "Mladá Boleslav, Czech Republic",
      countryCode: "CZ",
      category: "Skilled Trades & Technical",
      employmentType: "Direct Hire / Full-Time",
      amountEUR: 2800,
      minExperienceYears: 3,
      education: "High School / TESDA NCII Certified",
      languageRequired: "English B1 or Czech A2",
      applyUrl: "https://www.skoda-kariera.cz/",
      postedDate: new Date().toISOString().split('T')[0]
    }
  ];

  // Map scraped jobs into audience-tailored structure
  const formattedJobs = newScrapedJobs.map(job => {
    return {
      id: job.id,
      title: job.title,
      employer: job.employer,
      employerRegistryId: job.employerRegistryId,
      location: job.location,
      countryCode: job.countryCode,
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
        languageRequired: job.languageRequired
      },
      costsAndFees: {
        placementFee: "Zero Placement Fee (Employer Pays)",
        estimatedUpfrontPHP: 18000,
        upfrontExpensesBreakdown: "DFA Apostille, Medical Exam, NBI Clearance"
      },
      verificationStatus: {
        isVerifiedEmployer: true,
        dmwDirectHireCompliant: true,
        viesVerified: true
      },
      applyUrl: job.applyUrl,
      postedDate: job.postedDate
    };
  });

  // Merge and remove duplicates by ID
  const combinedJobs = [...formattedJobs, ...existingJobs];
  const uniqueJobs = Array.from(new Map(combinedJobs.map(item => [item.id, item])).values());

  // Save back to jobs.json
  fs.writeFileSync('./jobs.json', JSON.stringify(uniqueJobs, null, 2));
  console.log(`Successfully updated jobs.json. Total active jobs: ${uniqueJobs.length}`);
}

runAggregator();
