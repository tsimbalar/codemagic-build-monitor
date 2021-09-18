/* eslint-disable no-underscore-dangle */
import fetch from 'node-fetch';

export interface CodemagicApp {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
}

export type CodemagicBuild = CodemagicWorkflowBuild | CodemagicYamlBuild;

export interface CodemagicYamlBuild {
  readonly type: 'yaml';
  readonly id: string;
  readonly yamlWorkflowId: string;
  readonly name: string;
}

export interface CodemagicWorkflowBuild {
  readonly type: 'workflow';
  readonly id: string;
  readonly workflowId: string;
  readonly name: string;
}
export interface CodemagicWorkflow {
  readonly id: string;
  readonly name: string;
}

export interface CodemagicWorkflowsAndBuilds {
  readonly builds: CodemagicBuild[];
  readonly workflows: CodemagicWorkflow[];
}

export interface PullRequestInfo {
  readonly destinationBranch: string;
  readonly number: number;
  readonly sourceBranch: string;
  readonly url: string;
}

export interface BuildUserInfo {
  readonly name: string;
  readonly email: string;
}

export interface CodemagicBuildDetails {
  readonly id: string;
  readonly branch: string;
  readonly createdAt: string;
  readonly finishedAt?: string;
  readonly startedAt?: string;
  readonly status: string;
  readonly pullRequestInfo?: PullRequestInfo;
  readonly author?: BuildUserInfo;
}

export class CodemagicClient {
  public constructor(private readonly apiToken: string) {}

  public async listApplications(): Promise<ReadonlyArray<CodemagicApp>> {
    const response = await fetch('https://api.codemagic.io/apps', {
      headers: {
        'x-auth-token': this.apiToken,
      },
    });
    const body = await response.json();
    const applications = body.applications;
    if (!applications) {
      throw new Error('Returned body had no "applications" property');
    }
    if (!Array.isArray(applications)) {
      throw new Error('body.applications is not an array');
    }
    return applications.map<CodemagicApp>((a) => ({
      id: a._id,
      name: a.appName,
      owner: a.repository.owner.name,
    }));
  }

  public async listWorkflowsAndBuilds(appId: string): Promise<CodemagicWorkflowsAndBuilds> {
    const response = await fetch(`https://api.codemagic.io/builds?appId=${appId}`, {
      headers: {
        'x-auth-token': this.apiToken,
      },
    });
    const body = await response.json();
    const builds = body.builds;
    if (!builds) {
      throw new Error('Returned body had no "builds" property');
    }
    if (!Array.isArray(builds)) {
      throw new Error('body.builds is not an array');
    }
    const applications = body.applications;
    if (!applications) {
      throw new Error('Returned body had no "applications" property');
    }
    if (!Array.isArray(applications)) {
      throw new Error('body.applications is not an array');
    }

    const appDetails = applications.find((a) => a._id === appId);
    if (!appDetails) {
      throw new Error(
        `Application with id ${appId} not returned from backend. Available : ${applications.map(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          (a) => a._id
        )}`
      );
    }
    const workflows = appDetails.workflows as { [key: string]: any };

    return {
      workflows: [...Object.values(workflows)].map((wf) => ({
        id: wf._id,
        name: wf.name,
      })),
      builds: builds.map<CodemagicBuild>((b) => {
        if (b.fileWorkflowId) {
          return {
            type: 'yaml',
            id: b._id,
            yamlWorkflowId: b.fileWorkflowId,
            name: b.config?.name ?? b.fileWorkflowId,
          };
        }
        return {
          type: 'workflow',
          id: b._id,
          workflowId: b.workflowId,
          name: b.config?.name ?? b.workflowId,
        };
      }),
    };
  }

  public async listBuilds(
    appId: string,
    workflowId: string
  ): Promise<ReadonlyArray<CodemagicBuildDetails>> {
    const response = await fetch(
      `https://api.codemagic.io/builds?appId=${appId}&workflowId=${workflowId}`,
      {
        headers: {
          'x-auth-token': this.apiToken,
        },
      }
    );
    const body = await response.json();
    const builds = body.builds;
    if (!builds) {
      throw new Error('Returned body had no "builds" property');
    }
    if (!Array.isArray(builds)) {
      throw new Error('body.builds is not an array');
    }
    const applications = body.applications;
    if (!applications) {
      throw new Error('Returned body had no "applications" property');
    }
    if (!Array.isArray(applications)) {
      throw new Error('body.applications is not an array');
    }
    const appDetails = applications.find((a) => a._id === appId);
    if (!appDetails) {
      throw new Error(
        `Application with id ${appId} not returned from backend. Available : ${applications.map(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          (a) => a._id
        )}`
      );
    }

    return builds.map((b) => this.mapToBuildDetails(b));
  }

  private mapToBuildDetails(build: any): CodemagicBuildDetails {
    let result: CodemagicBuildDetails = {
      id: build._id,
      branch: build.branch,
      createdAt: build.createdAt,
      status: build.status,
      finishedAt: build.finishedAt,
      startedAt: build.startedAt,
    };

    if (build.pullRequest) {
      result = { ...result, pullRequestInfo: build.pullRequest };
    }
    if (build.commit) {
      const authorInfo: BuildUserInfo = {
        name: build.commit.authorName,
        email: build.commit.authorEmail,
      };
      result = { ...result, author: authorInfo };
    }
    return result;
  }
}
