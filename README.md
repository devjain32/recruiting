# GitHub Talent Sourcer

A TypeScript tool to extract and analyze GitHub contributors for talent sourcing. Perfect for finding developers who have contributed to specific open-source projects in your tech stack.

## Features

- ✅ Fetch contributors, PR authors, and issue creators from any GitHub repo
- ✅ Filter by location (e.g., India, Bangalore, etc.)
- ✅ Extract contact information (email, Twitter, blog)
- ✅ Track contribution metrics (commits, PRs, issues)
- ✅ Capture notable contributions for personalized outreach
- ✅ Merge data from multiple repos into a single CSV
- ✅ Export to CSV for easy analysis and outreach

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - `public_repo` (to read public repositories)
   - `read:user` (to read user profile data)
4. Copy the generated token

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your GitHub token:

```env
GITHUB_TOKEN=ghp_your_token_here
MIN_CONTRIBUTIONS=1
ACTIVE_WITHIN_MONTHS=12
```

## Usage

### Basic Usage

Fetch contributors from a single repo:

```bash
npm run dev prisma/prisma
```

### Multiple Repositories

Fetch contributors from multiple repos (data will be merged):

```bash
npm run dev prisma/prisma trpc/trpc TanStack/query
```

### Using Full GitHub URLs

You can also use full GitHub URLs:

```bash
npm run dev https://github.com/prisma/prisma https://github.com/trpc/trpc
```

### Example Repos for Your SDK

Based on your use case (natural language queries, ORMs, tRPC, TypeScript):

```bash
npm run dev \
  prisma/prisma \
  trpc/trpc \
  TanStack/query \
  drizzle-team/drizzle-orm \
  Effect-TS/effect
```

## Output

The tool generates a CSV file in the `output/` directory with the following columns:

- **Username**: GitHub username
- **Name**: Full name
- **Email**: Public email (if available)
- **Location**: Location from profile
- **Company**: Company from profile
- **Bio**: Bio/description
- **Twitter**: Twitter username
- **Blog/Website**: Personal website
- **GitHub Profile**: Link to GitHub profile
- **Repository**: Repo(s) they contributed to
- **Total Contributions**: Total PRs + issues + commits
- **Commits**: Number of commits
- **Pull Requests**: Number of PRs
- **Issues**: Number of issues created
- **Notable Contributions**: Sample of PR/issue titles (for personalization)
- **First Contribution**: Date of first contribution
- **Last Contribution**: Date of last contribution
- **Data Fetched At**: When the data was collected

## Configuration Options

### Location Filter

Filter contributors by location (comma-separated):

```env
LOCATION_FILTER=India,Bangalore,Mumbai,Hyderabad,Delhi,Pune
```

This will only include contributors whose location field contains any of these terms (case-insensitive).

### Minimum Contributions

Only include contributors with at least N contributions:

```env
MIN_CONTRIBUTIONS=5
```

### Activity Filter

Only include contributors active within the last N months:

```env
ACTIVE_WITHIN_MONTHS=6
```

## Rate Limits

- The GitHub API allows **5,000 requests per hour** with authentication
- The tool is designed to be efficient and stays well within limits
- For large repos, the tool limits fetching to ~300 PRs and ~300 issues per repo
- A small delay is added between repos to avoid rate limiting

## Tips for Best Results

1. **Start with 5-10 highly relevant repos** rather than hundreds
2. **Use location filters** to narrow down to your target geography
3. **Look for developers with multiple contributions** (set MIN_CONTRIBUTIONS=3 or higher)
4. **Check recent activity** using ACTIVE_WITHIN_MONTHS to find currently active developers
5. **Review the "Notable Contributions" column** to personalize your outreach

## Next Steps

After running this on 5-10 repos:

1. **Review the CSV** and identify high-quality candidates
2. **Phase 2**: Build a scoring system based on contribution quality
3. **Phase 3**: Generate personalized outreach templates based on contributions

## Troubleshooting

### "GITHUB_TOKEN not found"

Make sure you've created a `.env` file and added your GitHub token.

### Rate Limit Errors

If you hit rate limits:
- Wait for the limit to reset (check https://api.github.com/rate_limit)
- Reduce the number of repos you're fetching
- The tool already implements delays between requests

### No Contributors Found

- Check if the repo name is correct
- Verify your location filter isn't too restrictive
- Try removing MIN_CONTRIBUTIONS filter
- Some repos may have very few contributors

## License

MIT