import { ConstructorFunction, IControllerFactory } from './api/ioc/IControllerFactory';
import { MetaInfo, meta as metaFromPackageJson } from './meta';
import { AppRepository } from './infra/codemagic/AppRepository';
import { BearerAuthenticationProvider } from './api/auth/BearerAuthenticationProvider';
import { BuildInfoController } from './api/controllers/BuildInfoController';
import { CachedAppRepository } from './infra/caching/CachedAppRepository';
import { Controller } from '@tsoa/runtime';
import { DiagnosticsController } from './api/controllers/DiagnosticsController';
import { ExampleController } from './api/controllers/ExampleController';
import { IAppRepository } from './domain/IAppRepository';
import { IAuthentication } from './api/auth/IAuthentication';
import { IWorkflowRunRepository } from './domain/IWorkflowRunRepository';
import { IndexController } from './api/controllers/IndexController';
import LRUCache from 'lru-cache';
import { Settings } from './settings-types';
import { TsoaAuthentication } from './api/auth/TsoaAuthentication';
import { WorkflowRunRepository } from './infra/codemagic/WorkflowRunRepository';
import { getCodeMagicClientFactory } from './infra/codemagic/CodeMagicClientFactory';

export interface ApiDependencies {
  readonly appRepo: IAppRepository;
  readonly workflowRunRepo: IWorkflowRunRepository;
}

export class CompositionRoot implements IControllerFactory {
  private readonly cache: LRUCache<string, any>;

  private readonly dependencies: ApiDependencies;

  private constructor(
    private readonly settings: Settings,
    private readonly meta: MetaInfo,
    dependencies: ApiDependencies
  ) {
    this.cache = new LRUCache<string, any>({});
    this.dependencies = {
      appRepo: new CachedAppRepository(this.cache, dependencies.appRepo),
      workflowRunRepo: dependencies.workflowRunRepo,
    };
  }

  public static forProd(settings: Settings): CompositionRoot {
    const clientFactory = getCodeMagicClientFactory(metaFromPackageJson);
    return new CompositionRoot(settings, metaFromPackageJson, {
      appRepo: new AppRepository(clientFactory),
      workflowRunRepo: new WorkflowRunRepository(clientFactory),
    });
  }

  public static forTesting(settings: Settings, dependencies: ApiDependencies): CompositionRoot {
    return new CompositionRoot(settings, metaFromPackageJson, dependencies);
  }

  public get<T>(controllerConstructor: ConstructorFunction<T>): Controller {
    switch (controllerConstructor.name) {
      case IndexController.name:
        return new IndexController(this.meta);
      case ExampleController.name:
        return new ExampleController();
      case BuildInfoController.name:
        return new BuildInfoController(
          this.meta,
          this.dependencies.appRepo,
          this.dependencies.workflowRunRepo
        );
      case DiagnosticsController.name:
        return new DiagnosticsController(this.meta);
      default:
        // eslint-disable-next-line no-console
        console.error('Cannot create an instance of ', controllerConstructor);
        throw new Error(`How do I create an instance of ${controllerConstructor} ?? `);
    }
  }

  public getAuthentication(): IAuthentication {
    return new TsoaAuthentication([new BearerAuthenticationProvider()]);
  }
}
