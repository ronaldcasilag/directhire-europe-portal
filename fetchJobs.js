import fs from 'fs';

async function updateDatabase() {
    const endpoint = 'https://www.arbeitnow.com/api/job-board-api';

    try {
        console.log('Fetching live European jobs...');
        const response = await fetch(endpoint);

        if (!response.ok) throw new Error('API request failed');

        const rawData = await response.json();

        const formattedJobs = rawData.data.map(job => ({
            id: job.slug || `JOB-${Math.random().toString(36).substring(2, 7)}`,
            title: job.title,
            employer: job.company_name,
            location: job.location,
            category: job.tags && job.tags.length > 0 ? job.tags[0] : 'Direct Hire',
            applyUrl: job.url,
            postedDate: new Date(job.created_at * 1000).toISOString().split('T')[0]
        }));

        fs.writeFileSync('jobs.json', JSON.stringify(formattedJobs, null, 2));
        console.log(`✅ Successfully saved ${formattedJobs.length} live jobs to jobs.json!`);

    } catch (error) {
        console.error('Pipeline Error:', error.message);
        process.exit(1);
    }
}

updateDatabase();
