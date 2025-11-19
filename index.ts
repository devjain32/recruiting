import * as dotenv from 'dotenv';
import * as path from 'path';
import { GitHubClient } from './github-client';
import { CSVExporter } from './csv-exporter';
import { ContributorData, FetchOptions } from './types';

// Load environment variables
dotenv.config();

async function main() {
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    console.error('❌ Error: GITHUB_TOKEN not found in environment variables');
    console.error('Please create a .env file with your GitHub token');
    console.error('See .env.example for reference');
    process.exit(1);
  }

  // Get repos from command line arguments
  const repos = process.argv.slice(2);
  
  if (repos.length === 0) {
    console.log('GitHub Talent Sourcer');
    console.log('====================\n');
    console.log('Usage: npm run dev <repo1> <repo2> ...');
    console.log('\nExamples:');
    console.log('  npm run dev prisma/prisma');
    console.log('  npm run dev https://github.com/trpc/trpc');
    console.log('  npm run dev prisma/prisma trpc/trpc TanStack/query');
    console.log('\nThe script will:');
    console.log('  1. Fetch contributors, PR authors, and issue creators');
    console.log('  2. Filter by location (if LOCATION_FILTER is set in .env)');
    console.log('  3. Export to CSV with contact info and contribution details');
    console.log('  4. Merge data from multiple repos into a single CSV\n');
    process.exit(0);
  }

  console.log('🚀 GitHub Talent Sourcer');
  console.log('========================\n');

  // Parse fetch options from environment
  const options: FetchOptions = {
    locationFilter: process.env.LOCATION_FILTER 
      ? process.env.LOCATION_FILTER.split(',').map(s => s.trim())
      : undefined,
    minContributions: process.env.MIN_CONTRIBUTIONS 
      ? parseInt(process.env.MIN_CONTRIBUTIONS) 
      : 1,
    activeWithinMonths: process.env.ACTIVE_WITHIN_MONTHS
      ? parseInt(process.env.ACTIVE_WITHIN_MONTHS)
      : undefined,
    includeCommitters: true,
    includePRAuthors: true,
    includeIssueCreators: true
  };

  console.log('Configuration:');
  console.log(`  Repositories: ${repos.join(', ')}`);
  if (options.locationFilter) {
    console.log(`  Location Filter: ${options.locationFilter.join(', ')}`);
  }
  if (options.minContributions && options.minContributions > 1) {
    console.log(`  Min Contributions: ${options.minContributions}`);
  }
  if (options.activeWithinMonths) {
    console.log(`  Active Within: ${options.activeWithinMonths} months`);
  }
  console.log('');

  const client = new GitHubClient(token);
  const exporter = new CSVExporter();
  
  let allContributors: ContributorData[] = [];

  // Fetch contributors from each repo
  for (const repoInput of repos) {
    try {
      const repoConfig = client.parseRepo(repoInput);
      const contributors = await client.fetchContributors(repoConfig, options);
      
      // Filter by minimum contributions
      const filtered = contributors.filter(
        c => c.totalContributions >= (options.minContributions || 1)
      );
      
      console.log(`  Filtered to ${filtered.length} contributors (min ${options.minContributions} contributions)`);
      
      allContributors = exporter.mergeContributors(allContributors, filtered);
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error: any) {
      console.error(`\n❌ Error processing ${repoInput}: ${error.message}\n`);
    }
  }

  // Sort by total contributions (descending)
  allContributors.sort((a, b) => b.totalContributions - a.totalContributions);

  // Export to CSV
  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(process.cwd(), 'output', `contributors_${timestamp}.csv`);
  
  await exporter.exportToCSV(allContributors, outputPath);

  // Print summary
  console.log('\n📊 Summary:');
  console.log(`  Total unique contributors: ${allContributors.length}`);
  console.log(`  With email: ${allContributors.filter(c => c.email).length}`);
  console.log(`  With location: ${allContributors.filter(c => c.location).length}`);
  console.log(`  With Twitter: ${allContributors.filter(c => c.twitter).length}`);
  console.log(`  Total PRs: ${allContributors.reduce((sum, c) => sum + c.pullRequests, 0)}`);
  console.log(`  Total Issues: ${allContributors.reduce((sum, c) => sum + c.issues, 0)}`);
  console.log(`  Total Commits: ${allContributors.reduce((sum, c) => sum + c.commits, 0)}`);

  console.log('\n✨ Done! Check the output folder for your CSV file.\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});