export type WorkflowRunStatus =
  | 'Queued'
  | 'Running'
  | 'Succeeded'
  | 'PartiallySucceeded'
  | 'Failed'
  | 'Canceled';

export interface WorkflowRunAuthor {
  readonly email: string;
  readonly name: string;
}
export interface WorkflowRun {
  readonly id: string;
  readonly webUrl: string;
  readonly status: WorkflowRunStatus;
  readonly startTime: Date;
  readonly finishTime?: Date;
  readonly mainAuthor?: WorkflowRunAuthor;
}

export interface WorflowRunFilter {
  readonly maxAgeInDays: number;
  readonly maxRunsPerBranch: number;
}

export type WorkflowRunsPerBranch = ReadonlyMap<string, ReadonlyArray<WorkflowRun>>;
export interface IWorkflowRunRepository {
  getLatestRunsForWorkflow(
    token: string,
    appId: string,
    workflowId: string,
    filter: WorflowRunFilter
  ): Promise<WorkflowRunsPerBranch>;
}
