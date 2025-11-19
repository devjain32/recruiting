export interface ContributorData {
    username: string;
    name: string | null;
    email: string | null;
    location: string | null;
    bio: string | null;
    company: string | null;
    twitter: string | null;
    blog: string | null;
    profileUrl: string;
    
    // Contribution metrics
    totalContributions: number;
    pullRequests: number;
    issues: number;
    commits: number;
    
    // Specific contributions (for personalization)
    notableContributions: string[];
    
    // Activity
    firstContribution: Date | null;
    lastContribution: Date | null;
    
    // Metadata
    repoName: string;
    fetchedAt: Date;
  }
  
  export interface RepoConfig {
    owner: string;
    repo: string;
    fullName: string;
  }
  
  export interface FetchOptions {
    locationFilter?: string[];
    minContributions?: number;
    activeWithinMonths?: number;
    includeIssueCreators?: boolean;
    includePRAuthors?: boolean;
    includeCommitters?: boolean;
  }