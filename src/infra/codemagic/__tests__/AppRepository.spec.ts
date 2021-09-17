/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { App, Workflow } from '../../../domain/IAppRepository';
import { AppRepository } from '../AppRepository';
import { getCodemagicClientFactory } from '../CodemagicClientFactory';
import { testCredentials } from '../__testTools__/TestCredentials';

describe('AppRepository', () => {
  const clientFactory = getCodemagicClientFactory({
    version: 'v0-tests',
    buildInfo: {},
  });

  describe('listForToken', () => {
    test('should return all apps when using token #needs-secrets', async () => {
      const sut = new AppRepository(clientFactory);

      const actual = await sut.listForToken(testCredentials.PRIVATE_API_KEY);

      expect(actual).not.toHaveLength(0);

      // check one that we know will exist
      const specificApp = actual.find((s) => s.name === 'Perspectives');
      expect(specificApp).toBeDefined();
      expect(specificApp).toEqual<App>({
        id: '5fc6539af7698e06abe1bed1',
        name: 'Perspectives',
        webUrl: 'https://codemagic.io/app/5fc6539af7698e06abe1bed1',
        workflows: expect.anything(),
      });

      const workflows = specificApp!.workflows;

      // it should find "the default one"
      expect(workflows).toContainEqual<Workflow>({
        id: '5fc6539af7698e06abe1bed0',
        name: 'Default Workflow',
      });

      // it should find yaml one
      expect(workflows).toContainEqual<Workflow>({ id: 'pull-request', name: 'PR checks' });
    }, 20000 /* this may take a while */);
  });
});
