export interface App {
  readonly id: string;
  readonly name: string;
  readonly webUrl: string;
  readonly workflows: ReadonlyArray<Workflow>;
}

export interface Workflow {
  readonly id: string;
  readonly name: string;
}

export interface IAppRepository {
  listForToken(token: string): Promise<ReadonlyArray<App>>;
}
