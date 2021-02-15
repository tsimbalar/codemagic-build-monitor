/* eslint-disable camelcase */
import {
  IWorkflowRunRepository,
  WorflowRunFilter,
  WorkflowRun,
  WorkflowRunStatus,
  WorkflowRunsPerBranch,
} from '../../domain/IWorkflowRunRepository';
import { CodeMagicBuildDetails } from './CodeMagicClient';
import { CodeMagicClientFactory } from './CodeMagicClientFactory';
import { parseISO } from 'date-fns';

export class WorkflowRunRepository implements IWorkflowRunRepository {
  public constructor(private readonly clientFactory: CodeMagicClientFactory) {}

  public async getLatestRunsForWorkflow(
    token: string,
    appId: string,
    workflowId: string,
    filter: WorflowRunFilter
  ): Promise<WorkflowRunsPerBranch> {
    const nDaysAgo = new Date();
    nDaysAgo.setDate(nDaysAgo.getDate() - filter.maxAgeInDays);

    const codeMagicClient = this.clientFactory(token);

    const result = new Map<string, ReadonlyArray<WorkflowRun>>();

    const allBuilds = await codeMagicClient.listBuilds(appId, workflowId);

    for (const run of allBuilds) {
      const branchKey = this.getBranchKey(run);
      const runStartTime = parseISO(run.createdAt);

      if (runStartTime <= nDaysAgo) {
        // stop right now because older than maxAgeDays
        // eslint-disable-next-line no-continue
        break;
      }

      const currentForBranch = result.get(branchKey) || [];

      const isLatestRunInThisBranch = currentForBranch.length === 0;

      if (currentForBranch.length >= filter.maxRunsPerBranch) {
        // skipping this run because we already have enough builds for this branch
        // eslint-disable-next-line no-continue
        continue;
      }

      const status = this.parseWorkflowRunStatus(run);
      //   let author: WorkflowRunAuthor | undefined;
      //   if (isLatestRunInThisBranch) {
      //     // eslint-disable-next-line no-await-in-loop
      //     const commitAuthor = await this.commitAuthorRepo.getAuthorForCommit(
      //       token,
      //       repoName,
      //       run.head_commit.id
      //     );

      //     if (commitAuthor) {
      //       author = {
      //         login: commitAuthor.login,
      //         name: commitAuthor.name ?? commitAuthor.login,
      //       };
      //     }
      //   }
      const workflowRun: WorkflowRun = {
        id: run.id,
        webUrl: `https://codemagic.io/app/${appId}/build/${run.id}`,
        startTime: parseISO(run.createdAt),
        status,
        finishTime: run.finishedAt ? parseISO(run.finishedAt) : undefined,
        // mainAuthor: author, TODO
      };

      result.set(branchKey, [workflowRun, ...currentForBranch]);
    }

    // }

    return result;
  }

  private getBranchKey(run: CodeMagicBuildDetails): string {
    if (run.pullRequestInfo) {
      return `PR#${run.pullRequestInfo.sourceBranch}`;
    }

    return `${run.branch}`;
  }

  private parseWorkflowRunStatus(run: CodeMagicBuildDetails): WorkflowRunStatus {
    if (!run.startedAt) {
      return 'Queued';
    }

    // eslint-disable-next-line default-case
    switch (run.status) {
      case 'finished':
        return 'Succeeded';
      case 'preparing':
        return 'Queued';
      case 'fetching':
        return 'Queued';
      case 'building':
        return 'Running';
      case 'publishing':
        return 'Running';
      case 'canceled':
        return 'Canceled';
      case 'failed':
        return 'Failed';
      case 'timeout':
        return 'Canceled';
    }
    throw new Error(`Unsupported workflow run status "${run.status}"`);
  }
}
