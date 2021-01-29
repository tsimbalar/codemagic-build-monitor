/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-underscore-dangle */
import * as sampleAppListResponse from './app-list-sample.json';
import { CodeMagicApp, CodeMagicClient, CodeMagicWorkflow } from '../CodeMagicClient';
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

    test('should return list of apps', async () => {
      nock(backendUrl).get('/apps').reply(200, sampleAppListResponse);

      const sut = new CodeMagicClient('some token');

      const actual = await sut.listApplications();

      expect(actual).toHaveLength(sampleAppListResponse.applications.length);
      const sampleApp = sampleAppListResponse.applications[0];
      expect(actual[0]).toEqual<CodeMagicApp>({
        id: sampleApp._id,
        name: sampleApp.appName,
        owner: sampleApp.repository.owner.name,
        workflows: expect.any(Array),
      });
    });

    test('should return workflows of apps', async () => {
      nock(backendUrl).get('/apps').reply(200, sampleAppListResponse);

      const sut = new CodeMagicClient('some token');

      const actual = await sut.listApplications();
      const actualWorkflows = actual[0].workflows;
      const sampleWorkflow = sampleAppListResponse.applications[0].workflows[
        '5fc6539af7698e06abe1becc'
      ]!;
      expect(actualWorkflows[0]).toEqual<CodeMagicWorkflow>({
        id: sampleWorkflow._id,
        name: sampleWorkflow.name,
      });
    });
  });
});
