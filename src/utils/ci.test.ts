import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectCiGitInfo } from './ci';

const githubPush = {
  GITHUB_ACTIONS: 'true',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_REF_NAME: 'main',
  GITHUB_SHA: 'push-sha',
  GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_REPOSITORY: 'getgitops/gitops-cli',
  GITHUB_ACTOR: 'octocat',
};

describe('detectCiGitInfo', () => {
  it('returns nothing outside a known CI', () => {
    assert.deepEqual(detectCiGitInfo({}), {});
  });

  it('reads the git metadata of a GitHub Actions push', () => {
    assert.deepEqual(detectCiGitInfo(githubPush), {
      gitBranch: 'main',
      gitCommit: 'push-sha',
      gitRepoUrl: 'https://github.com/getgitops/gitops-cli',
      gitAuthor: 'octocat',
      gitVersion: 'refs/heads/main',
    });
  });

  it('uses the source branch and head commit of a GitHub pull request', () => {
    const eventPath = join(mkdtempSync(join(tmpdir(), 'gops-ci-')), 'event.json');
    writeFileSync(eventPath, JSON.stringify({ pull_request: { head: { sha: 'pr-head-sha' } } }));

    const info = detectCiGitInfo({
      ...githubPush,
      GITHUB_REF: 'refs/pull/7/merge',
      GITHUB_REF_NAME: '7/merge',
      GITHUB_HEAD_REF: 'feature/login',
      GITHUB_SHA: 'merge-sha',
      GITHUB_EVENT_PATH: eventPath,
    });

    assert.equal(info.gitBranch, 'feature/login');
    assert.equal(info.gitCommit, 'pr-head-sha');
  });

  it('reads the git metadata of a GitLab merge request pipeline', () => {
    assert.deepEqual(
      detectCiGitInfo({
        GITLAB_CI: 'true',
        CI_COMMIT_BRANCH: undefined,
        CI_MERGE_REQUEST_SOURCE_BRANCH_NAME: 'feature/login',
        CI_MERGE_REQUEST_SOURCE_BRANCH_SHA: 'mr-head-sha',
        CI_COMMIT_SHA: 'merge-sha',
        CI_PROJECT_URL: 'https://gitlab.com/getgitops/app',
        GITLAB_USER_LOGIN: 'jane',
      }),
      {
        gitBranch: 'feature/login',
        gitCommit: 'mr-head-sha',
        gitRepoUrl: 'https://gitlab.com/getgitops/app',
        gitAuthor: 'jane',
        gitVersion: 'refs/heads/feature/login',
      },
    );
  });

  it('reports GitLab tag pipelines as refs/tags', () => {
    const info = detectCiGitInfo({ GITLAB_CI: 'true', CI_COMMIT_TAG: 'v1.0.0', CI_COMMIT_SHA: 'tag-sha' });
    assert.equal(info.gitVersion, 'refs/tags/v1.0.0');
    assert.equal(info.gitCommit, 'tag-sha');
  });

  it('reads the git metadata of a Bitbucket pipeline', () => {
    assert.deepEqual(
      detectCiGitInfo(
        {
          BITBUCKET_BUILD_NUMBER: '42',
          BITBUCKET_BRANCH: 'main',
          BITBUCKET_COMMIT: 'bb-sha',
          BITBUCKET_REPO_FULL_NAME: 'getgitops/app',
        },
        () => 'Jane',
      ),
      {
        gitBranch: 'main',
        gitCommit: 'bb-sha',
        gitRepoUrl: 'https://bitbucket.org/getgitops/app',
        gitAuthor: 'Jane',
        gitVersion: 'refs/heads/main',
      },
    );
  });

  it('reads the git metadata of a Jenkins build', () => {
    assert.deepEqual(
      detectCiGitInfo(
        {
          JENKINS_URL: 'https://jenkins.example.com/',
          GIT_BRANCH: 'origin/main',
          GIT_COMMIT: 'jenkins-sha',
          GIT_URL: 'https://user:token@github.com/getgitops/app.git',
        },
        () => 'Jane',
      ),
      {
        gitBranch: 'main',
        gitCommit: 'jenkins-sha',
        gitRepoUrl: 'https://github.com/getgitops/app.git',
        gitAuthor: 'Jane',
        gitVersion: 'refs/heads/main',
      },
    );
  });

  it('prefers the PR source branch in Jenkins multibranch pipelines', () => {
    const info = detectCiGitInfo(
      { JENKINS_URL: 'https://jenkins.example.com/', BRANCH_NAME: 'PR-7', CHANGE_BRANCH: 'feature/login' },
      () => undefined,
    );
    assert.equal(info.gitBranch, 'feature/login');
  });

  it('keeps scp-like Jenkins repo URLs as they are', () => {
    const info = detectCiGitInfo(
      { JENKINS_URL: 'https://jenkins.example.com/', GIT_URL: 'git@github.com:getgitops/app.git' },
      () => undefined,
    );
    assert.equal(info.gitRepoUrl, 'git@github.com:getgitops/app.git');
  });
});
