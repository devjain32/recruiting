import { Octokit } from '@octokit/rest';
import { ContributorData, RepoConfig, FetchOptions } from './types';

export class GitHubClient {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Parse a GitHub repo URL or string into owner/repo format
   */
  parseRepo(repoInput: string): RepoConfig {
    // Handle full URLs
    if (repoInput.includes('github.com')) {
      const match = repoInput.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) throw new Error(`Invalid GitHub URL: ${repoInput}`);
      return {
        owner: match[1],
        repo: match[2].replace('.git', ''),
        fullName: `${match[1]}/${match[2].replace('.git', '')}`
      };
    }
    
    // Handle owner/repo format
    const parts = repoInput.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid repo format: ${repoInput}. Use 'owner/repo' or full GitHub URL`);
    }
    
    return {
      owner: parts[0],
      repo: parts[1],
      fullName: repoInput
    };
  }

  /**
   * Fetch all contributors with their detailed profiles
   */
  async fetchContributors(
    repoConfig: RepoConfig,
    options: FetchOptions = {}
  ): Promise<ContributorData[]> {
    console.log(`\nFetching contributors for ${repoConfig.fullName}...`);
    
    const contributors = new Map<string, ContributorData>();
    
    // Fetch different types of contributors based on options
    if (options.includeCommitters !== false) {
      await this.fetchCommitters(repoConfig, contributors, options);
    }
    
    if (options.includePRAuthors !== false) {
      await this.fetchPRAuthors(repoConfig, contributors, options);
    }
    
    if (options.includeIssueCreators !== false) {
      await this.fetchIssueCreators(repoConfig, contributors, options);
    }
    
    console.log(`Found ${contributors.size} unique contributors`);
    
    return Array.from(contributors.values());
  }

  /**
   * Fetch repository committers
   */
  private async fetchCommitters(
    repoConfig: RepoConfig,
    contributors: Map<string, ContributorData>,
    options: FetchOptions
  ): Promise<void> {
    console.log('  Fetching committers...');
    
    try {
      const response = await this.octokit.repos.listContributors({
        owner: repoConfig.owner,
        repo: repoConfig.repo,
        per_page: 100
      });

      for (const contributor of response.data) {
        if (contributor.type !== 'User') continue;
        
        const username = contributor.login;

        if (!username) continue;
        
        if (!contributors.has(username)) {
          const profile = await this.fetchUserProfile(username);
          
          // Apply location filter
          if (options.locationFilter && options.locationFilter.length > 0) {
            if (!profile.location || !this.matchesLocation(profile.location, options.locationFilter)) {
              continue;
            }
          }
          
          const contributorData: ContributorData = {
            username,
            name: profile.name,
            email: profile.email,
            location: profile.location,
            bio: profile.bio,
            company: profile.company,
            twitter: profile.twitter_username,
            blog: profile.blog,
            profileUrl: profile.html_url,
            totalContributions: contributor.contributions,
            pullRequests: 0,
            issues: 0,
            commits: contributor.contributions,
            notableContributions: [],
            firstContribution: null,
            lastContribution: null,
            repoName: repoConfig.fullName,
            fetchedAt: new Date()
          };
          
          contributors.set(username, contributorData);
        } else {
          // Update commit count
          const existing = contributors.get(username)!;
          existing.commits += contributor.contributions;
          existing.totalContributions += contributor.contributions;
        }
      }
      
      console.log(`    Found ${response.data.length} committers`);
    } catch (error: any) {
      console.error(`    Error fetching committers: ${error.message}`);
    }
  }

  /**
   * Fetch PR authors
   */
  private async fetchPRAuthors(
    repoConfig: RepoConfig,
    contributors: Map<string, ContributorData>,
    options: FetchOptions
  ): Promise<void> {
    console.log('  Fetching PR authors...');
    
    try {
      const cutoffDate = options.activeWithinMonths
        ? new Date(Date.now() - options.activeWithinMonths * 30 * 24 * 60 * 60 * 1000)
        : null;

      let page = 1;
      let hasMore = true;
      let prCount = 0;

      while (hasMore && page <= 3) { // Limit to 3 pages (300 PRs) to avoid rate limits
        const response = await this.octokit.pulls.list({
          owner: repoConfig.owner,
          repo: repoConfig.repo,
          state: 'all',
          per_page: 100,
          page,
          sort: 'created',
          direction: 'desc'
        });

        if (response.data.length === 0) {
          hasMore = false;
          break;
        }

        for (const pr of response.data) {
          if (cutoffDate && new Date(pr.created_at) < cutoffDate) {
            hasMore = false;
            break;
          }

          const username = pr.user?.login;
          if (!username) continue;

          prCount++;

          if (!contributors.has(username)) {
            const profile = await this.fetchUserProfile(username);
            
            // Apply location filter
            if (options.locationFilter && options.locationFilter.length > 0) {
              if (!profile.location || !this.matchesLocation(profile.location, options.locationFilter)) {
                continue;
              }
            }

            const contributorData: ContributorData = {
              username,
              name: profile.name,
              email: profile.email,
              location: profile.location,
              bio: profile.bio,
              company: profile.company,
              twitter: profile.twitter_username,
              blog: profile.blog,
              profileUrl: profile.html_url,
              totalContributions: 1,
              pullRequests: 1,
              issues: 0,
              commits: 0,
              notableContributions: [pr.title],
              firstContribution: new Date(pr.created_at),
              lastContribution: new Date(pr.created_at),
              repoName: repoConfig.fullName,
              fetchedAt: new Date()
            };

            contributors.set(username, contributorData);
          } else {
            const existing = contributors.get(username)!;
            existing.pullRequests++;
            existing.totalContributions++;
            
            if (existing.notableContributions.length < 5) {
              existing.notableContributions.push(pr.title);
            }
            
            const prDate = new Date(pr.created_at);
            if (!existing.firstContribution || prDate < existing.firstContribution) {
              existing.firstContribution = prDate;
            }
            if (!existing.lastContribution || prDate > existing.lastContribution) {
              existing.lastContribution = prDate;
            }
          }
        }

        page++;
      }

      console.log(`    Found ${prCount} PRs`);
    } catch (error: any) {
      console.error(`    Error fetching PRs: ${error.message}`);
    }
  }

  /**
   * Fetch issue creators
   */
  private async fetchIssueCreators(
    repoConfig: RepoConfig,
    contributors: Map<string, ContributorData>,
    options: FetchOptions
  ): Promise<void> {
    console.log('  Fetching issue creators...');
    
    try {
      const cutoffDate = options.activeWithinMonths
        ? new Date(Date.now() - options.activeWithinMonths * 30 * 24 * 60 * 60 * 1000)
        : null;

      let page = 1;
      let hasMore = true;
      let issueCount = 0;

      while (hasMore && page <= 3) { // Limit to 3 pages (300 issues)
        const response = await this.octokit.issues.listForRepo({
          owner: repoConfig.owner,
          repo: repoConfig.repo,
          state: 'all',
          per_page: 100,
          page,
          sort: 'created',
          direction: 'desc'
        });

        if (response.data.length === 0) {
          hasMore = false;
          break;
        }

        for (const issue of response.data) {
          // Skip pull requests (they appear in issues endpoint)
          if (issue.pull_request) continue;

          if (cutoffDate && new Date(issue.created_at) < cutoffDate) {
            hasMore = false;
            break;
          }

          const username = issue.user?.login;
          if (!username) continue;

          issueCount++;

          if (!contributors.has(username)) {
            const profile = await this.fetchUserProfile(username);
            
            // Apply location filter
            if (options.locationFilter && options.locationFilter.length > 0) {
              if (!profile.location || !this.matchesLocation(profile.location, options.locationFilter)) {
                continue;
              }
            }

            const contributorData: ContributorData = {
              username,
              name: profile.name,
              email: profile.email,
              location: profile.location,
              bio: profile.bio,
              company: profile.company,
              twitter: profile.twitter_username,
              blog: profile.blog,
              profileUrl: profile.html_url,
              totalContributions: 1,
              pullRequests: 0,
              issues: 1,
              commits: 0,
              notableContributions: [issue.title],
              firstContribution: new Date(issue.created_at),
              lastContribution: new Date(issue.created_at),
              repoName: repoConfig.fullName,
              fetchedAt: new Date()
            };

            contributors.set(username, contributorData);
          } else {
            const existing = contributors.get(username)!;
            existing.issues++;
            existing.totalContributions++;
            
            if (existing.notableContributions.length < 5) {
              existing.notableContributions.push(issue.title);
            }
            
            const issueDate = new Date(issue.created_at);
            if (!existing.firstContribution || issueDate < existing.firstContribution) {
              existing.firstContribution = issueDate;
            }
            if (!existing.lastContribution || issueDate > existing.lastContribution) {
              existing.lastContribution = issueDate;
            }
          }
        }

        page++;
      }

      console.log(`    Found ${issueCount} issues`);
    } catch (error: any) {
      console.error(`    Error fetching issues: ${error.message}`);
    }
  }

  /**
   * Fetch detailed user profile
   */
  private async fetchUserProfile(username: string): Promise<any> {
    try {
      const response = await this.octokit.users.getByUsername({ username });
      return response.data;
    } catch (error: any) {
      console.warn(`    Warning: Could not fetch profile for ${username}`);
      return {
        login: username,
        name: null,
        email: null,
        location: null,
        bio: null,
        company: null,
        twitter_username: null,
        blog: null,
        html_url: `https://github.com/${username}`
      };
    }
  }

  /**
   * Check if location matches any filter
   */
  private matchesLocation(location: string, filters: string[]): boolean {
    const locationLower = location.toLowerCase();
    return filters.some(filter => locationLower.includes(filter.toLowerCase()));
  }
}