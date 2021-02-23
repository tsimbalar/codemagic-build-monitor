/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-underscore-dangle */
import * as sampleAppBuildListResponse from './build-list-per-app.json';
import * as sampleAppListResponse from './app-list-sample.json';
import * as sampleBuildListByFormalWorkflowResponse from './build-list-per-app-and-workflow-formal.json';
import * as sampleBuildListByYamlWorkflowForBuildResponse from './build-list-per-app-and-workflow-yaml-build.json';
import * as sampleBuildListByYamlWorkflowForPRResponse from './build-list-per-app-and-workflow-yaml-pr.json';
import * as sampleBuildListByYamlWorkflowResponse from './build-list-per-app-and-workflow-yaml.json';

import {
  BuildUserInfo,
  CodeMagicApp,
  CodeMagicBuild,
  CodeMagicBuildDetails,
  CodeMagicClient,
  CodeMagicWorkflow,
  PullRequestInfo,
} from '../CodeMagicClient';
import nock from 'nock';

const backendUrl = 'https://api.codemagic.io';

describe('CodeMagicClient', () => {
  beforeEach(() => {
    // prevent any call that would try to reach to outside
    nock.disableNetConnect();
  });

  afterEach(() => {
    // restore default state
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('listApplications', () => {
    test('should authenticate with token in x-auth-token header', async () => {
      const myToken = 'this-is-super-secret';
      const nockScope = nock(backendUrl, {
        reqheaders: {
          'x-auth-token': myToken,
        },
      })
        .get(/.*/u)
        .reply(200, sampleAppListResponse);

      const sut = new CodeMagicClient(myToken);

      await sut.listApplications();

      expect(nockScope.pendingMocks()).toHaveLength(0);
    });

    test('should GET /apps', async () => {
      const nockScope = nock(backendUrl).get('/apps').reply(200, sampleAppListResponse);

      const sut = new CodeMagicClient('some token');

      await sut.listApplications();

      expect(nockScope.pendingMocks()).toHaveLength(0);
    });

    test('should return apps', async () => {
      nock(backendUrl).get('/apps').reply(200, sampleAppListResponse);

      const sut = new CodeMagicClient('some token');

      const actual = await sut.listApplications();

      expect(actual).toHaveLength(sampleAppListResponse.applications.length);
      const sampleApp = sampleAppListResponse.applications[0];
      expect(actual[0]).toEqual<CodeMagicApp>({
        id: sampleApp._id,
        name: sampleApp.appName,
        owner: sampleApp.repository.owner.name,
      });
    });
  });

  describe('listWorkflowsAndBuilds', () => {
    const appId = '6005b3cec3030b252c53d750';

    test('should authenticate with token in x-auth-token header', async () => {
      const myToken = 'this-is-super-secret';
      const nockScope = nock(backendUrl, {
        reqheaders: {
          'x-auth-token': myToken,
        },
      })
        .get(/.*/u)
        .reply(200, sampleAppListResponse);

      const sut = new CodeMagicClient(myToken);

      await sut.listWorkflowsAndBuilds(appId);

      expect(nockScope.pendingMocks()).toHaveLength(0);
    });

    test('should GET /builds?appId', async () => {
      const nockScope = nock(backendUrl)
        .get(`/builds?appId=${appId}`)
        .reply(200, sampleAppListResponse);

      const sut = new CodeMagicClient('some token');

      await sut.listWorkflowsAndBuilds(appId);

      expect(nockScope.pendingMocks()).toHaveLength(0);
    });

    test('should return yaml builds', async () => {
      nock(backendUrl).get(/.*/u).reply(200, sampleAppBuildListResponse);

      const sut = new CodeMagicClient('some token');

      const actual = await sut.listWorkflowsAndBuilds(appId);
      const actualBuilds = actual.builds;

      expect(actualBuilds).toHaveLength(sampleAppBuildListResponse.builds.length);
      const sampleBuild = sampleAppBuildListResponse.builds[0];
      expect(actualBuilds[0]).toEqual<CodeMagicBuild>({
        id: sampleBuild._id,
        type: 'yaml',
        name: sampleBuild.config.name ?? sampleBuild.fileWorkflowId,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        yamlWorkflowId: sampleBuild.fileWorkflowId!,
      });
    });

    test('should return workflow builds', async () => {
      nock(backendUrl).get(/.*/u).reply(200, sampleAppBuildListResponse);

      const sut = new CodeMagicClient('some token');

      const actual = await sut.listWorkflowsAndBuilds(appId);
      const actualBuilds = actual.builds;

      expect(actualBuilds).toHaveLength(sampleAppBuildListResponse.builds.length);
      const sampleBuild = sampleAppBuildListResponse.builds.find(
        (b) => b.workflowId === '6005b3cec3030b252c53d74f'
      )!;
      expect(actualBuilds).toContainEqual<CodeMagicBuild>({
        type: 'workflow',
        id: sampleBuild._id,
        name: sampleBuild.config.name ?? sampleBuild.workflowId,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        workflowId: sampleBuild.workflowId!,
      });
    });

    test('should return workflows', async () => {
      nock(backendUrl).get(/.*/u).reply(200, sampleAppBuildListResponse);

      const sut = new CodeMagicClient('some token');

      const actual = await sut.listWorkflowsAndBuilds(appId);
      const actualWorkflows = actual.workflows;

      const appFromSample = sampleAppBuildListResponse.applications.find((a) => a._id === appId)!;

      expect(actualWorkflows).toHaveLength(appFromSample.workflowIds.length);
      const sampleWorkflow = appFromSample.workflows['6005b3cec3030b252c53d74f']!;
      expect(actualWorkflows[0]).toEqual<CodeMagicWorkflow>({
        id: sampleWorkflow._id,
        name: sampleWorkflow.name,
      });
    });
  });

  describe('listBuilds - "formal" workflow', () => {
    const appId = '6005b3cec3030b252c53d750';
    const workflowId = '6005b3cec3030b252c53d74f';

    test('should authenticate with token in x-auth-token header', async () => {
      const myToken = 'this-is-super-secret';
      const nockScope = nock(backendUrl, {
        reqheaders: {
          'x-auth-token': myToken,
        },
      })
        .get(/.*/u)
        .reply(200, sampleBuildListByFormalWorkflowResponse);

      const sut = new CodeMagicClient(myToken);

      await sut.listBuilds(appId, workflowId);

      expect(nockScope.pendingMocks()).toHaveLength(0);
    });

    test('should GET /builds?appId&workflowId', async () => {
      const nockScope = nock(backendUrl)
        .get(`/builds?appId=${appId}&workflowId=${workflowId}`)
        .reply(200, sampleBuildListByFormalWorkflowResponse);

      const sut = new CodeMagicClient('some token');

      await sut.listBuilds(appId, workflowId);

      expect(nockScope.pendingMocks()).toHaveLength(0);
    });

    test('should return build details', async () => {
      nock(backendUrl).get(/.*/u).reply(200, sampleBuildListByFormalWorkflowResponse);

      const sut = new CodeMagicClient('some token');

      const actual = await sut.listBuilds(appId, workflowId);

      expect(actual).toHaveLength(sampleBuildListByFormalWorkflowResponse.builds.length);
      const sampleBuild = sampleBuildListByFormalWorkflowResponse.builds[0];
      expect(actual[0]).toEqual<CodeMagicBuildDetails>({
        id: sampleBuild._id,
        branch: sampleBuild.branch,
        createdAt: sampleBuild.createdAt,
        status: sampleBuild.status,
        finishedAt: sampleBuild.finishedAt,
        startedAt: sampleBuild.startedAt,
        author: expect.anything(),
      });
    });

    test('should return build commit author', async () => {
      nock(backendUrl).get(/.*/u).reply(200, sampleBuildListByFormalWorkflowResponse);

      const sut = new CodeMagicClient('some token');

      const actual = await sut.listBuilds(appId, workflowId);

      expect(actual).toHaveLength(sampleBuildListByFormalWorkflowResponse.builds.length);
      const sampleBuild = sampleBuildListByFormalWorkflowResponse.builds[0];
      expect(actual[0].author).toEqual<BuildUserInfo>({
        name: sampleBuild.commit.authorName,
        email: sampleBuild.commit.authorEmail,
      });
    });
  });

  describe('listBuilds - "yaml" workflow', () => {
    const appId = '5fc6539af7698e06abe1becd';
    const workflowIdYaml = 'pull-request';

    test('should authenticate with token in x-auth-token header', async () => {
      const myToken = 'this-is-super-secret';
      const nockScope = nock(backendUrl, {
        reqheaders: {
          'x-auth-token': myToken,
        },
      })
        .get(/.*/u)
        .reply(200, sampleBuildListByYamlWorkflowResponse);

      const sut = new CodeMagicClient(myToken);

      await sut.listBuilds(appId, workflowIdYaml);

      expect(nockScope.pendingMocks()).toHaveLength(0);
    });

    test('should GET /builds?appId&workflowId', async () => {
      const nockScope = nock(backendUrl)
        .get(`/builds?appId=${appId}&workflowId=${workflowIdYaml}`)
        .reply(200, sampleBuildListByYamlWorkflowResponse);

      const sut = new CodeMagicClient('some token');

      await sut.listBuilds(appId, workflowIdYaml);

      expect(nockScope.pendingMocks()).toHaveLength(0);
    });

    test('should return build details', async () => {
      nock(backendUrl).get(/.*/u).reply(200, sampleBuildListByYamlWorkflowForBuildResponse);

      const sut = new CodeMagicClient('some token');

      const actual = await sut.listBuilds(appId, workflowIdYaml);

      expect(actual).toHaveLength(sampleBuildListByYamlWorkflowForBuildResponse.builds.length);
      const sampleBuild = sampleBuildListByYamlWorkflowForBuildResponse.builds[0];
      expect(actual[0]).toEqual<CodeMagicBuildDetails>({
        id: sampleBuild._id,
        branch: sampleBuild.branch,
        createdAt: sampleBuild.createdAt,
        status: sampleBuild.status,
        finishedAt: sampleBuild.finishedAt,
        startedAt: sampleBuild.startedAt,
        author: expect.anything(),
      });
    });

    test('should return build commit author', async () => {
      nock(backendUrl).get(/.*/u).reply(200, sampleBuildListByYamlWorkflowForBuildResponse);

      const sut = new CodeMagicClient('some token');

      const actual = await sut.listBuilds(appId, workflowIdYaml);

      expect(actual).toHaveLength(sampleBuildListByYamlWorkflowForBuildResponse.builds.length);
      const sampleBuild = sampleBuildListByYamlWorkflowForBuildResponse.builds[0];
      expect(actual[0].author).toEqual<BuildUserInfo>({
        name: sampleBuild.commit.authorName,
        email: sampleBuild.commit.authorEmail,
      });
    });

    test('should return PR info when available', async () => {
      nock(backendUrl).get(/.*/u).reply(200, sampleBuildListByYamlWorkflowForPRResponse);

      const sut = new CodeMagicClient('some token');

      const actual = await sut.listBuilds(appId, workflowIdYaml);

      expect(actual).toHaveLength(sampleBuildListByYamlWorkflowResponse.builds.length);
      expect(actual[0].pullRequestInfo).toEqual<PullRequestInfo>({
        destinationBranch: 'develop',
        number: 1484,
        sourceBranch: 'feat/SUB-2134-browse-by-focus-area',
        url: 'https://github.com/koa-health/foundations-app/pull/1484',
      });
    });
  });
});
