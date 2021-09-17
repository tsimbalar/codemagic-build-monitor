import * as catlightCore from '../../catlight-protocol/shared';
import * as catlightDynamic from '../../catlight-protocol/dynamic';
import * as express from 'express';
import { Body, Controller, Get, Post, Request, Response, Route, Security } from '@tsoa/runtime';
import {
  DynamicBuildInfoMetadataResponse,
  DynamicFilteredBuildInfoRequest,
  DynamicFilteredBuildInfoResponse,
} from '../api-types';
import { IAppRepository, Workflow } from '../../domain/IAppRepository';
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
    private readonly apps: IAppRepository,
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

    const appplications = await this.apps.listForToken(currentUser.token);

    return {
      protocol: 'https://catlight.io/protocol/v1.0/dynamic',
      id: SERVER_ID,
      name: 'Codemagic (via codemagic-build-monitor)',
      serverVersion: this.metaInfo.version,
      webUrl: 'https://github.com/tsimbalar/codemagic-build-monitor',
      // TODO : how to get current user info ?
      currentUser: undefined,
      spaces: appplications.map((app) => ({
        id: app.id,
        name: app.name,
        webUrl: app.webUrl,
        buildDefinitions: app.workflows.map((wf) =>
          this.mapToBuildDefinitionMetadata(app.name, wf)
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
        const appId = space.id;
        const buildDefinitions = space.buildDefinitions;
        return buildDefinitions.map(async (buildDef) => {
          const runs = await this.workflowRuns.getLatestRunsForWorkflow(token, appId, buildDef.id, {
            maxAgeInDays: 25,
            maxRunsPerBranch: 8,
          });
          return {
            spaceId: appId,
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
      const appKey = spaceId;
      const existing = result.get(appKey) || [];

      const updated = [...existing, workflowAndRuns];

      result.set(appKey, updated);
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
      webUrl: run.webUrl,

      // TODO: contributors, triggeredByUser
    };
    if (run.mainAuthor) {
      result = {
        ...result,
        triggeredByUser: {
          id: run.mainAuthor.email,
          name: run.mainAuthor.name,
        },
      };
    }
    return result;
  }

  private mapToBuildDefinitionMetadata(
    appName: string,
    workflow: Workflow
  ): catlightDynamic.BuildDefinitionMetadata {
    return {
      id: workflow.id,
      name: `${appName} · ${workflow.name}`,
      folder: appName,
    };
  }
}
