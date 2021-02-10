import { App, IAppRepository, RepoName, Workflow } from '../../domain/IAppRepository';
import { CodeMagicApp, CodeMagicBuild, CodeMagicClient } from './CodeMagicClient';
import { CodeMagicClientFactory } from './CodeMagicClientFactory';

export class AppRepository implements IAppRepository {
  public constructor(private readonly codeMagicClientFactory: CodeMagicClientFactory) {}

  public async listForToken(token: string): Promise<readonly App[]> {
    const client = this.codeMagicClientFactory(token);

    const allApps = await client.listApplications();

    const workflowsPerAppId = await this.getWorkflowsPerApp(client, allApps);

    return allApps.map<App>((a) => ({
      id: a.id,
      webUrl: `https://codemagic.io/app/${a.id}`,
      name: new RepoName(a.owner, a.name),
      workflows: workflowsPerAppId.get(a.id) ?? [],
    }));
  }

  private async getWorkflowsPerApp(
    client: CodeMagicClient,
    apps: ReadonlyArray<CodeMagicApp>
  ): Promise<Map<string, Workflow[]>> {
    const allWorkFlows = await Promise.all(
      apps.map(async (app) => {
        const buildsAndWorkflows = await client.listWorkflowsAndBuilds(app.id);

        const mappedWorkFlows = buildsAndWorkflows.workflows.map<Workflow>((w) => ({
          id: w.id.toString(),
          name: w.name,
        }));

        const yamlWorkflows = this.inferYamlWorkflowsFromBuilds(buildsAndWorkflows.builds);

        return [app.id, [...mappedWorkFlows, ...yamlWorkflows]] as [string, Workflow[]];
      })
    );

    return new Map(allWorkFlows);
  }

  private inferYamlWorkflowsFromBuilds(builds: CodeMagicBuild[]): Workflow[] {
    const yamlBuildsPerFileId = new Map<string, CodeMagicBuild[]>();

    for (const build of builds) {
      if (build.type === 'workflow') {
        // only care about yaml builds .... workflow ones are covered already outside
        // eslint-disable-next-line no-continue
        continue;
      }

      const existingBuildsForWorkflow = yamlBuildsPerFileId.get(build.yamlWorkflowId) || [];
      existingBuildsForWorkflow.push(build);
      yamlBuildsPerFileId.set(build.yamlWorkflowId, existingBuildsForWorkflow);
    }

    const result: Workflow[] = [];

    for (const [yamlWorkflowId, buildInfos] of yamlBuildsPerFileId.entries()) {
      const lastBuild = buildInfos[0];
      result.push({
        id: yamlWorkflowId,
        name: lastBuild.name,
      });
    }

    return result;
  }
}
