import { WorkflowRun, WorkflowRunAuthor } from '../../../domain/IWorkflowRunRepository';
import { WorkflowRunRepository } from '../WorkflowRunRepository';
import { getCodeMagicClientFactory } from '../CodeMagicClientFactory';
import { testCredentials } from '../__testTools__/TestCredentials';

describe('WorkflowRunRepository', () => {
  const clientFactory = getCodeMagicClientFactory({
    version: 'v0-tests',
    buildInfo: {},
  });
  describe('getLatestRunsForWorkflow', () => {
    test('should retrieve runs of known workflow (yaml / app build)', async () => {
      const appId = '5fc6539af7698e06abe1becf';
      const workflowId = 'mindset-build';
      const sut = new WorkflowRunRepository(clientFactory);

      const actual = await sut.getLatestRunsForWorkflow(
        testCredentials.PRIVATE_API_KEY,
        appId,
        workflowId,
        {
          maxAgeInDays: 30,
          maxRunsPerBranch: 5,
        }
      );

      expect([...actual.entries()]).not.toHaveLength(0);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const runsOfBranchMaster = actual.get('master')!;
      expect(runsOfBranchMaster).toBeDefined();
      expect(runsOfBranchMaster).not.toHaveLength(0);

      const actualRun = runsOfBranchMaster[0];
      expect(actualRun).toEqual<WorkflowRun>({
        id: expect.stringContaining(''),
        startTime: expect.any(Date),
        status: expect.stringContaining(''),
        webUrl: expect.stringContaining(`https://codemagic.io/app/${appId}/build/`),
        finishTime: expect.anything(),
        mainAuthor: {
          email: expect.stringContaining('@'),
          name: expect.stringContaining(''),
        },
      });
    });

    test('should retrieve runs of known workflow (yaml / pull request)', async () => {
      const appId = '5fc6539af7698e06abe1becd';
      const workflowId = 'pull-request';
      const sut = new WorkflowRunRepository(clientFactory);

      const actual = await sut.getLatestRunsForWorkflow(
        testCredentials.PRIVATE_API_KEY,
        appId,
        workflowId,
        {
          maxAgeInDays: 30,
          maxRunsPerBranch: 5,
        }
      );

      expect([...actual.entries()]).not.toHaveLength(0);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const [branch, runsOfBranch] = [...actual.entries()][0];
      expect(branch).toBeDefined();
      // PRs should have a special branch name
      expect(branch).toContain('PR#');
      expect(runsOfBranch).not.toHaveLength(0);

      const actualRun = runsOfBranch[0];
      expect(actualRun).toEqual<WorkflowRun>({
        id: expect.stringContaining(''),
        startTime: expect.any(Date),
        status: expect.stringContaining(''),
        webUrl: expect.stringContaining(`https://codemagic.io/app/${appId}/build/`),
        finishTime: expect.anything(),
        mainAuthor: {
          email: expect.stringContaining('@'),
          name: expect.stringContaining(''),
        },
      });
    });

    test('should sort builds from older to newer', async () => {
      const appId = '5fc6539af7698e06abe1becf';
      const workflowId = 'mindset-build';
      const sut = new WorkflowRunRepository(clientFactory);

      const actual = await sut.getLatestRunsForWorkflow(
        testCredentials.PRIVATE_API_KEY,
        appId,
        workflowId,
        {
          maxAgeInDays: 30,
          maxRunsPerBranch: 3,
        }
      );

      expect([...actual.entries()]).not.toHaveLength(0);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const runsOfBranchMaster = actual.get('master')!;
      const oldestRun = runsOfBranchMaster[0];
      const secondOldestRun = runsOfBranchMaster[1];
      // oldest first
      expect(oldestRun.startTime.getTime()).toBeLessThan(secondOldestRun.startTime.getTime());
    });

    test('should apply maxAgeInDays', async () => {
      const appId = '5fc6539af7698e06abe1becf';
      const workflowId = 'mindset-build';
      const sut = new WorkflowRunRepository(clientFactory);

      const maxAgeInDays = 8;
      const actual = await sut.getLatestRunsForWorkflow(
        testCredentials.PRIVATE_API_KEY,
        appId,
        workflowId,
        { maxAgeInDays, maxRunsPerBranch: 1 }
      );

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const runsOfBranchMaster = actual.get('master')!;
      expect(runsOfBranchMaster).toBeDefined();
      expect(runsOfBranchMaster).not.toHaveLength(0);
      const oldestRun = runsOfBranchMaster[0];
      const nDaysAgo = new Date();
      nDaysAgo.setDate(nDaysAgo.getDate() - maxAgeInDays);

      expect(oldestRun.startTime.getTime()).toBeGreaterThan(nDaysAgo.getTime());
    });

    test('should apply maxRunsPerBranch in repo with lots of activity', async () => {
      const appId = '5fc6539af7698e06abe1becd';
      const workflowId = 'foundations-build';
      const sut = new WorkflowRunRepository(clientFactory);

      const maxRunsPerBranch = 2;
      const actual = await sut.getLatestRunsForWorkflow(
        testCredentials.PRIVATE_API_KEY,
        appId,
        workflowId,
        { maxAgeInDays: 30, maxRunsPerBranch }
      );

      const branchRunsWithMoreThanNBuilds = [...actual.entries()].filter(
        ([branch, runs]) => runs.length > maxRunsPerBranch
      );
      expect(branchRunsWithMoreThanNBuilds).toHaveLength(0);
    }, 15000 /* timeout - can take a while */);
  });
});
