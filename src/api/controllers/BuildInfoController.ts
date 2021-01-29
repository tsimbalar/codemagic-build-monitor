import * as catlightCore from '../../catlight-protocol/shared';
import * as catlightDynamic from '../../catlight-protocol/dynamic';
import * as express from 'express';
import { Body, Controller, Get, Post, Request, Response, Route, Security } from '@tsoa/runtime';
import {
  DynamicBuildInfoMetadataResponse,
  DynamicFilteredBuildInfoRequest,
  DynamicFilteredBuildInfoResponse,
} from '../api-types';
import { IAppRepository, RepoName, Workflow } from '../../domain/IAppRepository';
import {
  IWorkflowRunRepository,
  WorkflowRun,
  WorkflowRunsPerBranch,
} from '../../domain/IWorkflowRunRepository';
import { MetaInfo } from '../../meta';
import { ValidationErrorJson } from '../middleware/schema-validation';

const SERVER_ID = 'codemagic.io';

interface BuildDefinitionAndRuns {
  readonly buildDefinition: catlightDynamic.BuildDefinitionStateRequest;
  readonly runs: WorkflowRunsPerBranch;
}

@Route('builds')
export class BuildInfoController extends Controller {
  public constructor(
    private readonly metaInfo: MetaInfo,
    private readonly repos: IAppRepository,
    private readonly workflowRuns: IWorkflowRunRepository
  ) {
    super();
  }

  @Get('')
  @Security('bearerAuth')
  public async getMetadata(
    @Request() request: express.Request
  ): Promise<DynamicBuildInfoMetadataResponse> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const currentUser = request.user!;

    const repos = await this.repos.listForToken(currentUser.token);

    return {
      protocol: 'https://catlight.io/protocol/v1.0/dynamic',
      id: SERVER_ID,
      name: 'CodeMagic (via codemagic-build-monitor)',
      serverVersion: this.metaInfo.version,
      webUrl: 'https://github.com/tsimbalar/codemagic-build-monitor',
      // TODO : how to get current user info ?
      currentUser: undefined,
      spaces: repos.map((repo) => ({
        id: repo.name.fullName,
        name: repo.name.fullName,
        webUrl: repo.webUrl,
        buildDefinitions: repo.workflows.map((wf) =>
          this.mapToBuildDefinitionMetadata(repo.name, wf)
        ),
      })),
    };
  }

  @Post('')
  @Security('bearerAuth')
  @Response<ValidationErrorJson>(422, 'Validation error')
  public async getServerState(
    @Request() request: express.Request,
    @Body() filters: DynamicFilteredBuildInfoRequest
  ): Promise<DynamicFilteredBuildInfoResponse> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const currentUser = request.user!;

    const filteredBuilds = await this.getAllBuildsForFilter(currentUser.token, filters);

    return {
      protocol: 'https://catlight.io/protocol/v1.0/dynamic',
      id: SERVER_ID,
      spaces: filters.spaces.map((space) => ({
        id: space.id,
        name: space.id,
        buildDefinitions: (filteredBuilds.get(space.id) || []).map((item) =>
          this.mapToBuildDefinition(item)
        ),
      })),
    };
  }

  private async getAllBuildsForFilter(
    token: string,
    filters: DynamicFilteredBuildInfoRequest
  ): Promise<Map<string, ReadonlyArray<BuildDefinitionAndRuns>>> {
    const getAllWorkflows = filters.spaces
      .map((space) => {
        const spaceId = space.id;
        const repoName = RepoName.parse(spaceId);
        const buildDefinitions = space.buildDefinitions;
        return buildDefinitions.map(async (buildDef) => {
          const runs = await this.workflowRuns.getLatestRunsForWorkflow(
            token,
            repoName,
            buildDef.id,
            {
              maxAgeInDays: 3,
              maxRunsPerBranch: 5,
            }
          );
          return {
            spaceId,
            buildDefinition: buildDef,
            runs,
          };
        });
      })
      .flatMap((x) => x);
    const all = await Promise.all(getAllWorkflows);

    const result = new Map<string, ReadonlyArray<BuildDefinitionAndRuns>>();
    for (const item of all) {
      const { spaceId, ...workflowAndRuns } = item;
      const repoKey = spaceId;
      const existing = result.get(repoKey) || [];

      const updated = [...existing, workflowAndRuns];

      result.set(repoKey, updated);
    }
    return result;
  }

  private mapToBuildDefinition(
    buildDefinitionsAndRuns: BuildDefinitionAndRuns
  ): catlightDynamic.BuildDefinitionStateResponse {
    const buildDef = buildDefinitionsAndRuns.buildDefinition;
    const runsPerBranch = buildDefinitionsAndRuns.runs;
    return {
      id: buildDef.id,
      branches: this.mapToBuildBranches(runsPerBranch),
    };
  }

  private mapToBuildBranches(runsPerBranch: WorkflowRunsPerBranch): catlightCore.BuildBranch[] {
    return [...runsPerBranch.entries()].map<catlightCore.BuildBranch>(([branchName, runs]) => ({
      id: branchName,
      builds: runs.map((r) => this.mapToBuild(r)),
    }));
  }

  private mapToBuild(run: WorkflowRun): catlightCore.Build {
    let result: catlightCore.Build = {
      id: run.id,
      startTime: run.startTime,
      status: run.status,
      finishTime: run.finishTime,
      name: run.name,
      webUrl: run.webUrl,

      // TODO: contributors, triggeredByUser
    };
    if (run.mainAuthor) {
      result = {
        ...result,
        triggeredByUser: {
          id: run.mainAuthor.login,
          name: run.mainAuthor.name,
        },
      };
    }
    return result;
  }

  private mapToBuildDefinitionMetadata(
    repo: RepoName,
    workflow: Workflow
  ): catlightDynamic.BuildDefinitionMetadata {
    return {
      id: workflow.id,
      name: `${repo.name} · ${workflow.name}`,
      folder: repo.fullName,
      webUrl: workflow.webUrl,
    };
  }
}
