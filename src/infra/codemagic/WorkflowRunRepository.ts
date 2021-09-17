/* eslint-disable camelcase */
import {
  IWorkflowRunRepository,
  WorflowRunFilter,
  WorkflowRun,
  WorkflowRunAuthor,
  WorkflowRunStatus,
  WorkflowRunsPerBranch,
} from '../../domain/IWorkflowRunRepository';
import { CodemagicBuildDetails } from './CodemagicClient';
import { CodemagicClientFactory } from './CodemagicClientFactory';
import { parseISO } from 'date-fns';

export class WorkflowRunRepository implements IWorkflowRunRepository {
  public constructor(private readonly clientFactory: CodemagicClientFactory) {}

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

      if (currentForBranch.length >= filter.maxRunsPerBranch) {
        // skipping this run because we already have enough builds for this branch
        // eslint-disable-next-line no-continue
        continue;
      }

      const status = this.parseWorkflowRunStatus(run);
      let author: WorkflowRunAuthor | undefined;

      if (run.author) {
        author = {
          email: run.author.email,
          name: run.author.name ?? run.author.email,
        };
      }

      const workflowRun: WorkflowRun = {
        id: run.id,
        webUrl: `https://codemagic.io/app/${appId}/build/${run.id}`,
        startTime: parseISO(run.createdAt),
        status,
        finishTime: run.finishedAt ? parseISO(run.finishedAt) : undefined,
        mainAuthor: author,
      };

      result.set(branchKey, [workflowRun, ...currentForBranch]);
    }

    return result;
  }

  private getBranchKey(run: CodemagicBuildDetails): string {
    if (run.pullRequestInfo) {
      return `PR#${run.pullRequestInfo.sourceBranch}`;
    }

    return `${run.branch}`;
  }

  private parseWorkflowRunStatus(run: CodemagicBuildDetails): WorkflowRunStatus {
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
        return 'Running';
      case 'building':
        return 'Running';
      case 'publishing':
        return 'Running';
      case 'canceled':
        return 'Canceled';
      case 'failed':
        return 'Failed';
      case 'timeout':
        return 'Failed';
      case 'skipped':
        return 'Canceled';
    }
    throw new Error(`Unsupported workflow run status "${run.status}"`);
  }
}
