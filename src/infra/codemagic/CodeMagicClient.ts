/* eslint-disable no-underscore-dangle */
import fetch from 'node-fetch';

export interface CodeMagicApp {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly workflows: CodeMagicWorkflow[];
}

export interface CodeMagicWorkflow {
  readonly id: string;
  readonly name: string;
}

export class CodeMagicClient {
  public constructor(private readonly apiToken: string) {}

  public async listApplications(): Promise<ReadonlyArray<CodeMagicApp>> {
    const response = await fetch('https://api.codemagic.io/apps', {
      headers: {
        'x-auth-token': this.apiToken,
      },
    });
    const body = await response.json();
    const applications = body.applications;
    if (!applications) {
      throw new Error('Returned body had no "applications" property');
    }
    if (!Array.isArray(applications)) {
      throw new Error('body.applications is not an array');
    }
    return applications.map<CodeMagicApp>((a) => ({
      id: a._id,
      name: a.appName,
      owner: a.repository.owner.name,
      workflows: Object.entries(a.workflows).map(([id, wf]) => ({
        id: (wf as any)._id,
        name: (wf as any).name,
      })),
    }));
  }
}
