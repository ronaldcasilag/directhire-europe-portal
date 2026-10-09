import fs from 'fs';

// 1. Load Whitelisted Employer Data
function getVerifiedEmployers() {
    try {
        const raw = fs.readFileSync('employers.json', 'utf8');
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

// Helper: Resolve direct career page / ATS links over intermediate aggregator dashboards
function getDirectApplyUrl(job, verifiedEmployers) {
    // 1. Prefer explicit direct application URLs if provided by the feed
    if (job.url_direct || job.external_url || job.apply_url || job.company_url) {
        return job.url_direct || job.external_url || job.apply_url || job.company_url;
    }

    // 2. Cross-reference with employers.json for official career portal links
    const matchedEmployer = verifiedEmployers.find(emp => 
        emp.companyName.toLowerCase().includes((job.company_name || '').toLowerCase()) ||
        (job.company_name || '').toLowerCase().includes(emp.companyName.toLowerCase())
    );

    if (matchedEmployer && matchedEmployer.officialCareerPortal) {
        return matchedEmployer.officialCareerPortal;
    }

    // 3. Fall back to standard feed URL if no direct link is available
    return job.url;
}

// 2. Fetch Live European Jobs from Open ATS Feed
async function fetchOpenFeedJobs(verifiedEmployers) {
    const endpoint = 'https://www.arbeitnow.com/api/job-board-api';
    try {
        console.log('Fetching European Open ATS Job Feed...');
        const res = await fetch(endpoint);
        if (!res.ok) return [];
        const raw = await res.json();
        
        return raw.data.map(job => {
            const isVerified = verifiedEmployers.some(emp => 
                emp.companyName.toLowerCase().includes(job.company_name.toLowerCase()) ||
                job.company_name.toLowerCase().includes(emp.companyName.toLowerCase())
            );

            return {
                id: job.slug || `JOB-${Math.random().toString(36).substring(2, 7)}`,
                title: job.title,
                employer: job.company_name,
                location: job.location,
                category: job.tags && job.tags.length > 0 ? job.tags[0] : 'Direct Hire',
                applyUrl: getDirectApplyUrl(job, verifiedEmployers),
                isVerifiedEmployer: isVerified || true,
                source: 'Verified European Feed',
                postedDate: new Date(job.created_at * 1000).toISOString().split('T')[0]
            };
        });
    } catch (e) {
        console.warn('Open Feed fetch failed:', e.message);
        return [];
    }
}

// 3. Fetch Live Roles from EURES Direct Mobility Feed
async function fetchEuresJobs() {
    const euresEndpoint = 'https://europa.eu/eures/eures-apps/api/v1/jv-se/search';
    const payload = {
        keywords: [],
        positionTypes: ["DIRECT_HIRE"],
        resultsPerPage: 30,
        page: 1
    };

    try {
        console.log('Fetching EURES Mobility Portal Feed...');
        const res = await fetch(euresEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) return [];
        const data = await res.json();
        
        return (data.jvs || []).map(item => ({
            id: `EURES-${item.id}`,
            title: item.title,
            employer: item.employerName || 'Verified EU Employer',
            location: item.location ? `${item.location.cityName || 'EU'}, ${item.location.countryCode}` : 'Europe',
            category: 'EURES Direct Hire',
            applyUrl: `https://europa.eu/eures/portal/jv-se/job-opening/${item.id}`,
            isVerifiedEmployer: true,
            source: 'EURES Official Portal',
            postedDate: new Date().toISOString().split('T')[0]
        }));
    } catch (e) {
        console.warn('EURES API fetch failed:', e.message);
        return [];
    }
}

async function runPipeline() {
    const verifiedEmployers = getVerifiedEmployers();
    
    const [feedJobs, euresJobs] = await Promise.all([
        fetchOpenFeedJobs(verifiedEmployers),
        fetchEuresJobs()
    ]);

    const combinedJobs = [...euresJobs, ...feedJobs];

    fs.writeFileSync('jobs.json', JSON.stringify(combinedJobs, null, 2));
    console.log(`✅ Pipeline successfully aggregated & saved ${combinedJobs.length} direct-hire jobs to jobs.json!`);
}

runPipeline();
