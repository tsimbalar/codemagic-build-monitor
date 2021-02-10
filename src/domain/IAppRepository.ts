export interface App {
  readonly id: string;
  readonly name: RepoName;
  readonly webUrl: string;
  readonly workflows: ReadonlyArray<Workflow>;
}

export class RepoName {
  public constructor(public readonly owner: string, public readonly name: string) {}

  public static parse(input: string): RepoName {
    const split = input
      .split('/')
      .filter((x) => Boolean(x))
      .map((x) => x?.trim())
      .filter((x) => Boolean(x));
    if (split.length !== 2) {
      throw new Error(`${input} is not a valid RepoName`);
    }
    return new RepoName(split[0], split[1]);
  }

  public get fullName(): string {
    return `${this.owner}/${this.name}`;
  }

  public localeCompare(other: RepoName): number {
    return this.fullName.localeCompare(other.fullName);
  }

  public equals(other: RepoName): boolean {
    return this.fullName === other.fullName;
  }
}

export interface Workflow {
  readonly id: string;
  readonly name: string;
}

export interface IAppRepository {
  listForToken(token: string): Promise<ReadonlyArray<App>>;
}
