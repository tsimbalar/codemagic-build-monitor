/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-underscore-dangle */
import * as sampleAppBuildListResponse from './build-list-per-app.json';
import * as sampleAppListResponse from './app-list-sample.json';
import {
  CodeMagicApp,
  CodeMagicBuild,
  CodeMagicClient,
  CodeMagicWorkflow,
  CodeMagicWorkflowBuild,
  CodeMagicYamlBuild,
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
      nock(backendUrl).get(`/builds?appId=${appId}`).reply(200, sampleAppBuildListResponse);

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
      nock(backendUrl).get(`/builds?appId=${appId}`).reply(200, sampleAppBuildListResponse);

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
      nock(backendUrl).get(`/builds?appId=${appId}`).reply(200, sampleAppBuildListResponse);

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
});
