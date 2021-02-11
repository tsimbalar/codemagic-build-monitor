import {
  IWorkflowRunRepository,
  WorflowRunFilter,
  WorkflowRun,
  WorkflowRunsPerBranch,
} from '../../domain/IWorkflowRunRepository';

export class InMemoryWorkflowRunRepository implements IWorkflowRunRepository {
  private readonly runsPerRepoAndWorkflow: Map<string, WorkflowRunsPerBranch> = new Map();

  public addRuns(appId: string, workflowId: string, branch: string, runs: WorkflowRun[]): void {
    const storageKey = this.getStorageKey(appId, workflowId);
    const current = this.runsPerRepoAndWorkflow.get(storageKey) || new Map<string, WorkflowRun[]>();

    const updated = new Map(current.entries());
    updated.set(branch, runs);
    this.runsPerRepoAndWorkflow.set(storageKey, updated);
  }

  public async getLatestRunsForWorkflow(
    token: string,
    appId: string,
    workflowId: string,
    filter: WorflowRunFilter
  ): Promise<WorkflowRunsPerBranch> {
    const storageKey = this.getStorageKey(appId, workflowId);
    const runs = this.runsPerRepoAndWorkflow.get(storageKey) || new Map<string, WorkflowRun[]>();

    return runs;
  }

  private getStorageKey(appId: string, workflowId: string): string {
    return `${appId}-${workflowId}`;
  }
}
