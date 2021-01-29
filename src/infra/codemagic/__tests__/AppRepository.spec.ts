import { App, RepoName } from '../../../domain/IAppRepository';
import { AppRepository } from '../AppRepository';
import { getCodeMagicClientFactory } from '../CodeMagicClientFactory';
import { testCredentials } from '../__testTools__/TestCredentials';

describe('AppRepository', () => {
  const clientFactory = getCodeMagicClientFactory({
    version: 'v0-tests',
    buildInfo: {},
  });

  describe('listForToken', () => {
    test('should return all apps when using token', async () => {
      const sut = new AppRepository(clientFactory);

      const actual = await sut.listForToken(testCredentials.PRIVATE_API_KEY);

      expect(actual).not.toHaveLength(0);

      // check one that we know will exist
      const specificApp = actual.find((s) =>
        s.name.equals(new RepoName('koa-health', 'koa-flutter'))
      );
      expect(specificApp).toBeDefined();
      expect(specificApp).toEqual<App>({
        id: '60101f30cb2f384082f476a4',
        name: new RepoName('koa-health', 'koa-flutter'),
        webUrl: 'https://codemagic.io/app/60101f30cb2f384082f476a4',
        workflows: [
          {
            id: '60101f30cb2f384082f476a3',
            name: 'Default Workflow',
            webUrl:
              'https://codemagic.io/app/60101f30cb2f384082f476a4/build/60101f30cb2f384082f476a3',
          },
        ],
      });
    }, 20000 /* this may take a while */);
  });
});
