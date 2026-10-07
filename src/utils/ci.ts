import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export interface CiGitInfo {
  gitBranch?: string;
  gitCommit?: string;
  gitRepoUrl?: string;
  gitAuthor?: string;
  gitVersion?: string;
}

type Env = NodeJS.ProcessEnv;

function githubPullRequestHeadSha(env: Env): string | undefined {
  if (!env.GITHUB_EVENT_PATH) return undefined;
  try {
    return JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8')).pull_request?.head?.sha;
  } catch {
    return undefined;
  }
}

// Bitbucket and Jenkins don't expose the commit author, so it's read from git.
function lastCommitAuthor(): string | undefined {
  try {
    const author = execFileSync('git', ['log', '-1', '--format=%an'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return author.trim() || undefined;
  } catch {
    return undefined;
  }
}

// Same format as GITHUB_REF, so every CI reports the version consistently.
function gitRef(tag?: string, branch?: string): string | undefined {
  if (tag) return `refs/tags/${tag}`;
  if (branch) return `refs/heads/${branch}`;
  return undefined;
}

function withoutCredentials(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch {
    return url; // e.g. git@host:org/repo.git
  }
}

/**
 * Git metadata provided by the CI the CLI is running in. Used as defaults for
 * `creport scan` when the --git-* flags are not passed.
 */
export function detectCiGitInfo(env: Env = process.env, gitAuthor = lastCommitAuthor): CiGitInfo {
  if (env.GITHUB_ACTIONS === 'true') {
    return {
      // In pull requests GITHUB_REF_NAME is "<number>/merge" and GITHUB_SHA the merge commit.
      gitBranch: env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME,
      gitCommit: githubPullRequestHeadSha(env) || env.GITHUB_SHA,
      gitRepoUrl:
        env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY
          ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}`
          : undefined,
      gitAuthor: env.GITHUB_ACTOR,
      gitVersion: env.GITHUB_REF,
    };
  }

  if (env.GITLAB_CI === 'true') {
    const branch = env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME || env.CI_COMMIT_BRANCH;
    return {
      gitBranch: branch,
      // Only set in merged results pipelines, where CI_COMMIT_SHA is the merge commit.
      gitCommit: env.CI_MERGE_REQUEST_SOURCE_BRANCH_SHA || env.CI_COMMIT_SHA,
      gitRepoUrl: env.CI_PROJECT_URL,
      gitAuthor: env.GITLAB_USER_LOGIN,
      gitVersion: gitRef(env.CI_COMMIT_TAG, branch),
    };
  }

  if (env.BITBUCKET_BUILD_NUMBER) {
    const branch = env.BITBUCKET_BRANCH;
    return {
      gitBranch: branch,
      gitCommit: env.BITBUCKET_COMMIT,
      gitRepoUrl: env.BITBUCKET_REPO_FULL_NAME
        ? `https://bitbucket.org/${env.BITBUCKET_REPO_FULL_NAME}`
        : undefined,
      gitAuthor: gitAuthor(),
      gitVersion: gitRef(env.BITBUCKET_TAG, branch),
    };
  }

  if (env.JENKINS_URL) {
    // CHANGE_BRANCH: source branch of a PR. BRANCH_NAME: multibranch pipelines.
    // GIT_BRANCH (git plugin) may come as "origin/<branch>".
    const branch = env.CHANGE_BRANCH || env.BRANCH_NAME || env.GIT_BRANCH?.replace(/^origin\//, '');
    return {
      gitBranch: branch,
      gitCommit: env.GIT_COMMIT,
      gitRepoUrl: withoutCredentials(env.GIT_URL),
      gitAuthor: gitAuthor(),
      gitVersion: gitRef(env.TAG_NAME, branch),
    };
  }

  return {};
}
