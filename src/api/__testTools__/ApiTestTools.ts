import { ApiDependencies, CompositionRoot } from '../../composition-root';
import { Express } from 'express';
import { InMemoryAppRepository } from '../../infra/memory/InMemoryAppRepository';
import { InMemoryWorkflowRunRepository } from '../../infra/memory/InMemoryWorkflowRunRepository';
import { Settings } from '../../settings-types';
import { buildWebApp } from '../server';
import supertest from 'supertest';

export type TestAgent = supertest.SuperTest<supertest.Test>;

export const TEST_SETTINGS: Settings = Object.freeze({
  catlight: {},
  http: {
    port: 12345,
  },
});

function getDependenciesForTesting(partial: Partial<ApiDependencies>): ApiDependencies {
  return {
    appRepo: partial.appRepo ?? new InMemoryAppRepository(),
    workflowRunRepo: partial.workflowRunRepo ?? new InMemoryWorkflowRunRepository(),
  };
}

export class ApiTestTools {
  private static createTestWebApp(
    settings: Settings,
    dependencies: Partial<ApiDependencies>
  ): Express {
    const compositionRoot = CompositionRoot.forTesting(
      settings,
      getDependenciesForTesting(dependencies)
    );
    return buildWebApp(compositionRoot);
  }

  public static createTestAgent(
    dependencies: Partial<ApiDependencies> = {},
    settings: Settings = TEST_SETTINGS
  ): TestAgent {
    return supertest.agent(ApiTestTools.createTestWebApp(settings, dependencies));
  }
}
