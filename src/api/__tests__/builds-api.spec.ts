/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ApiTestTools, TEST_SETTINGS, TestAgent } from '../__testTools__/ApiTestTools';
import { BuildDefinitionMetadata, SpaceMetadata } from '../../catlight-protocol/dynamic';
import {
  DynamicBuildInfoMetadataResponse,
  DynamicFilteredBuildInfoRequest,
  DynamicFilteredBuildInfoResponse,
} from '../api-types';
import { RepoName, Workflow } from '../../domain/IAppRepository';
import { InMemoryAppRepository } from '../../infra/memory/InMemoryAppRepository';
import { InMemoryWorkflowRunRepository } from '../../infra/memory/InMemoryWorkflowRunRepository';
import { ValidationErrorJson } from '../middleware/schema-validation';
import { WorkflowRun } from '../../domain/IWorkflowRunRepository';

describe('/builds', () => {
  describe('GET /builds', () => {
    test('should return a 401 status code when missing bearer token', async () => {
      const agent = ApiTestTools.createTestAgent();
      const response = await agent.get('/builds').send();
      expect(response.status).toBe(401);
      expect(response.type).toBe('application/json');
    });

    describe('with token of existing user', () => {
      const token = 'THIS_IS_THE_TOKEN';
      let agent: TestAgent;
      let appRepo: InMemoryAppRepository;
      let workflowRunRepo: InMemoryWorkflowRunRepository;

      beforeEach(() => {
        appRepo = new InMemoryAppRepository();
        workflowRunRepo = new InMemoryWorkflowRunRepository();

        agent = ApiTestTools.createTestAgent({ workflowRunRepo, appRepo }, { ...TEST_SETTINGS });
      });

      test('should return a 200 status code', async () => {
        const response = await agent.get('/builds').set('Authorization', `Bearer ${token}`).send();
        expect(response.status).toBe(200);
        expect(response.type).toBe('application/json');

        const body = response.body as DynamicBuildInfoMetadataResponse;
        expect(body.protocol).toBe('https://catlight.io/protocol/v1.0/dynamic');
      });

      test('should identify server as codemagic-build-monitor', async () => {
        const response = await agent.get('/builds').set('Authorization', `Bearer ${token}`).send();

        const body = response.body as DynamicBuildInfoMetadataResponse;
        expect(body.name).toMatch('codemagic-build-monitor');
        expect(body.serverVersion).toMatch(/[0-9]+.[0-9]+.[0-9]+/u);
      });

      test('should have codemagic.io as server id', async () => {
        const response = await agent.get('/builds').set('Authorization', `Bearer ${token}`).send();

        const body = response.body as DynamicBuildInfoMetadataResponse;
        expect(body.id).toEqual('codemagic.io');
      });

      test('should not return current user information', async () => {
        const response = await agent.get('/builds').set('Authorization', `Bearer ${token}`).send();

        const body = response.body as DynamicBuildInfoMetadataResponse;
        expect(body.currentUser).not.toBeDefined();
      });

      test('should return spaces of user', async () => {
        const repo1 = { id: '789', name: new RepoName('orgx', 'repoa'), webUrl: '', workflows: [] };
        const repo2 = { id: '123', name: new RepoName('orgx', 'repoz'), webUrl: '', workflows: [] };
        appRepo.addApp(token, repo1);
        appRepo.addApp(token, repo2);
        const response = await agent.get('/builds').set('Authorization', `Bearer ${token}`).send();

        const body = response.body as DynamicBuildInfoMetadataResponse;
        expect(body.spaces).toEqual<SpaceMetadata[]>([
          {
            id: repo1.name.fullName,
            name: repo1.name.fullName,
            webUrl: repo1.webUrl,
            buildDefinitions: expect.anything(),
          },
          {
            id: repo2.name.fullName,
            name: repo2.name.fullName,
            webUrl: repo2.webUrl,
            buildDefinitions: expect.anything(),
          },
        ]);
      });

      test('should return build definitions', async () => {
        const repoOwner = 'orgx';
        const workflow1: Workflow = {
          id: 'worflow-id',
          name: 'workflow-name',
          webUrl: 'http://www.perdu.com',
        };
        const workflow2: Workflow = {
          id: 'worflow-id2',
          name: 'workflow-name2',
          webUrl: 'http://www.perdu2.com',
        };
        const repoName = new RepoName(repoOwner, 'repoz');
        appRepo.addApp(token, {
          id: '123',
          name: repoName,
          webUrl: '',
          workflows: [workflow1, workflow2],
        });
        const response = await agent.get('/builds').set('Authorization', `Bearer ${token}`).send();

        const body = response.body as DynamicBuildInfoMetadataResponse;
        expect(body.spaces).toHaveLength(1);
        const buildDefinitions = body.spaces[0].buildDefinitions;
        expect(buildDefinitions).toEqual<BuildDefinitionMetadata[]>([
          {
            id: workflow1.id,
            name: 'repoz · workflow-name',
            folder: repoName.fullName,
            webUrl: workflow1.webUrl,
          },
          {
            id: workflow2.id,
            name: 'repoz · workflow-name2',
            folder: repoName.fullName,
            webUrl: workflow2.webUrl,
          },
        ]);
      });
    });
  });

  describe('POST /builds', () => {
    const VALID_MINIMAL_POST_PAYLOAD: DynamicFilteredBuildInfoRequest = {
      id: 'something',
      spaces: [],
    };

    test('should return a 401 status code when missing bearer token', async () => {
      const agent = ApiTestTools.createTestAgent();
      const response = await agent.post('/builds').send();
      expect(response.status).toBe(401);
      expect(response.type).toBe('application/json');
    });

    describe('with token of existing user', () => {
      const token = 'THIS_IS_THE_TOKEN';
      let agent: TestAgent;
      let appRepo: InMemoryAppRepository;
      let workflowRunRepo: InMemoryWorkflowRunRepository;

      beforeEach(() => {
        appRepo = new InMemoryAppRepository();
        workflowRunRepo = new InMemoryWorkflowRunRepository();

        agent = ApiTestTools.createTestAgent({ appRepo, workflowRunRepo }, { ...TEST_SETTINGS });
      });

      test('should return a 422 status code when provided invalid payload', async () => {
        const invalidRequestBody = { this: 'is', not: 'what we want' };

        const response = await agent
          .post('/builds')
          .set('Authorization', `Bearer ${token}`)
          .send(invalidRequestBody);

        expect(response.status).toBe(422);
        expect(response.type).toBe('application/json');

        const body = response.body as ValidationErrorJson;
        expect(body.technicalDetails.msg).toContain('Validation failed');
        expect(body.technicalDetails.errors).toContain("filters.spaces - 'spaces' is required");
      });

      test('should return a 422 status code when provided a badly formatted space id', async () => {
        const invalidRequestBody: DynamicFilteredBuildInfoRequest = {
          ...VALID_MINIMAL_POST_PAYLOAD,
          spaces: [
            {
              id: 'not-a-valid-repo',
              buildDefinitions: [],
            },
          ],
        };

        const response = await agent
          .post('/builds')
          .set('Authorization', `Bearer ${token}`)
          .send(invalidRequestBody);

        expect(response.status).toBe(422);
        expect(response.type).toBe('application/json');

        const body = response.body as ValidationErrorJson;
        expect(body.technicalDetails.msg).toContain('Validation failed');
        expect(body.technicalDetails.errors).toContain(
          'spaces.$0.id - Not match in \'^[^/]+/[^/]+$\'(provided : "not-a-valid-repo")'
        );
      });

      test('should return a 200 status code', async () => {
        const response = await agent
          .post('/builds')
          .set('Authorization', `Bearer ${token}`)
          .send(VALID_MINIMAL_POST_PAYLOAD);

        expect(response.status).toBe(200);
        expect(response.type).toBe('application/json');

        const body = response.body as DynamicFilteredBuildInfoResponse;
        expect(body.protocol).toBe('https://catlight.io/protocol/v1.0/dynamic');
      });

      test('should identify server as codemagic.io', async () => {
        const response = await agent
          .post('/builds')
          .set('Authorization', `Bearer ${token}`)
          .send(VALID_MINIMAL_POST_PAYLOAD);

        const body = response.body as DynamicFilteredBuildInfoResponse;
        expect(body.id).toEqual('codemagic.io');
      });

      test('should return details when a single build info is requested', async () => {
        const repoName = new RepoName('orgx', 'repoa');

        const workflow1: Workflow = {
          id: 'worflow-id',
          name: 'workflow-name',
          webUrl: 'http://www.perdu.com',
        };
        const repo1 = {
          id: '789',
          name: repoName,
          webUrl: '',
          workflows: [workflow1],
        };

        appRepo.addApp(token, repo1);

        const branch1 = 'master';
        const branch1Runs: WorkflowRun[] = [
          {
            id: 'master1',
            startTime: new Date(),
            status: 'Queued',
            webUrl: 'http://....',
            event: 'push',
          },
        ];

        const branch2 = 'develop';
        const branch2Runs: WorkflowRun[] = [
          {
            id: 'develop1',
            startTime: new Date(),
            status: 'Queued',
            webUrl: 'http://....',
            event: 'push',
          },
        ];

        workflowRunRepo.addRuns(repoName, workflow1.id, branch1, branch1Runs);
        workflowRunRepo.addRuns(repoName, workflow1.id, branch2, branch2Runs);

        const requestBody: DynamicFilteredBuildInfoRequest = {
          id: VALID_MINIMAL_POST_PAYLOAD.id,
          spaces: [
            {
              id: repo1.name.fullName,
              buildDefinitions: [
                {
                  id: workflow1.id,
                },
              ],
            },
          ],
        };

        const response = await agent
          .post('/builds')
          .set('Authorization', `Bearer ${token}`)
          .send(requestBody);

        const body = response.body as DynamicFilteredBuildInfoResponse;
        expect(body.spaces).toHaveLength(1);
        const buildDefinitions = body.spaces[0].buildDefinitions;
        expect(buildDefinitions).toHaveLength(1);
        const buildBranches = buildDefinitions[0].branches;
        expect(buildBranches).toHaveLength(2);

        const buildBranch1 = buildBranches.find((b) => b.id === branch1)!;
        expect(buildBranch1).toBeDefined();
        expect(buildBranch1.builds).toHaveLength(1);
        expect(buildBranch1.builds[0].id).toBe('master1');

        const buildBranch2 = buildBranches.find((b) => b.id === branch2)!;
        expect(buildBranch2).toBeDefined();
        expect(buildBranch2.builds).toHaveLength(1);
        expect(buildBranch2.builds[0].id).toBe('develop1');
      });
    });
  });
});
