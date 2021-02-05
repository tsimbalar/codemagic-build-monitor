import { App, IAppRepository, RepoName } from '../../domain/IAppRepository';
import { CodeMagicClientFactory } from './CodeMagicClientFactory';

export class AppRepository implements IAppRepository {
  public constructor(private readonly codeMagicClientFactory: CodeMagicClientFactory) {}

  public async listForToken(token: string): Promise<readonly App[]> {
    const client = this.codeMagicClientFactory(token);

    const allApps = await client.listApplications();

    return allApps.map<App>((a) => ({
      id: a.id,
      webUrl: `https://codemagic.io/app/${a.id}`,
      name: new RepoName(a.owner, a.name),
      workflows: a.workflows.map((wf) => ({
        id: wf.id,
        name: wf.name,
        webUrl: `https://codemagic.io/app/${a.id}/build/${wf.id}`,
      })),
    }));
  }
}
