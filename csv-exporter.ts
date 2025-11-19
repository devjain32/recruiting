import { createObjectCsvWriter } from 'csv-writer';
import { ContributorData } from './types';
import * as path from 'path';
import * as fs from 'fs';

export class CSVExporter {
  /**
   * Export contributors to CSV file
   */
  async exportToCSV(
    contributors: ContributorData[],
    outputPath: string
  ): Promise<void> {
    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: [
        { id: 'username', title: 'Username' },
        { id: 'name', title: 'Name' },
        { id: 'email', title: 'Email' },
        { id: 'location', title: 'Location' },
        { id: 'company', title: 'Company' },
        { id: 'bio', title: 'Bio' },
        { id: 'twitter', title: 'Twitter' },
        { id: 'blog', title: 'Blog/Website' },
        { id: 'profileUrl', title: 'GitHub Profile' },
        { id: 'repoName', title: 'Repository' },
        { id: 'totalContributions', title: 'Total Contributions' },
        { id: 'commits', title: 'Commits' },
        { id: 'pullRequests', title: 'Pull Requests' },
        { id: 'issues', title: 'Issues' },
        { id: 'notableContributions', title: 'Notable Contributions (Sample)' },
        { id: 'firstContribution', title: 'First Contribution' },
        { id: 'lastContribution', title: 'Last Contribution' },
        { id: 'fetchedAt', title: 'Data Fetched At' }
      ]
    });

    const records = contributors.map(contributor => ({
      ...contributor,
      notableContributions: contributor.notableContributions.slice(0, 3).join(' | '),
      firstContribution: contributor.firstContribution?.toISOString().split('T')[0] || '',
      lastContribution: contributor.lastContribution?.toISOString().split('T')[0] || '',
      fetchedAt: contributor.fetchedAt.toISOString().split('T')[0]
    }));

    await csvWriter.writeRecords(records);
    console.log(`\n✅ Exported ${contributors.length} contributors to ${outputPath}`);
  }

  /**
   * Merge multiple contributor datasets (removing duplicates)
   */
  mergeContributors(
    existingContributors: ContributorData[],
    newContributors: ContributorData[]
  ): ContributorData[] {
    const merged = new Map<string, ContributorData>();

    // Add existing contributors
    for (const contributor of existingContributors) {
      merged.set(contributor.username, contributor);
    }

    // Merge or add new contributors
    for (const contributor of newContributors) {
      const existing = merged.get(contributor.username);
      
      if (!existing) {
        merged.set(contributor.username, contributor);
      } else {
        // Merge contribution data
        existing.totalContributions += contributor.totalContributions;
        existing.commits += contributor.commits;
        existing.pullRequests += contributor.pullRequests;
        existing.issues += contributor.issues;
        
        // Merge notable contributions (keep unique ones)
        const allContributions = [
          ...existing.notableContributions,
          ...contributor.notableContributions
        ];
        existing.notableContributions = Array.from(new Set(allContributions)).slice(0, 5);
        
        // Update dates
        if (contributor.firstContribution && 
            (!existing.firstContribution || contributor.firstContribution < existing.firstContribution)) {
          existing.firstContribution = contributor.firstContribution;
        }
        if (contributor.lastContribution && 
            (!existing.lastContribution || contributor.lastContribution > existing.lastContribution)) {
          existing.lastContribution = contributor.lastContribution;
        }
        
        // Update repo name to show multiple repos
        if (!existing.repoName.includes(contributor.repoName)) {
          existing.repoName += `, ${contributor.repoName}`;
        }
        
        existing.fetchedAt = new Date();
      }
    }

    return Array.from(merged.values());
  }
}