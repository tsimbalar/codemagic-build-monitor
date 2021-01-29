import { App, IAppRepository } from '../../domain/IAppRepository';

export class InMemoryAppRepository implements IAppRepository {
  private readonly appsByToken: Map<string, App[]> = new Map<string, App[]>();

  public async listForToken(token: string): Promise<ReadonlyArray<App>> {
    const appsForToken = this.appsByToken.get(token) ?? [];
    return [...appsForToken].sort((a, b) => a.name.localeCompare(b.name));
  }

  public addApp(token: string, app: App): void {
    const appsForToken = this.appsByToken.get(token) ?? [];
    appsForToken.push(app);
    this.appsByToken.set(token, appsForToken);
  }
}
