import { Controller, Get, Route } from '@tsoa/runtime';
import { HealthCheckResponse } from '../api-types';
import type { MetaInfo } from '../../meta';

@Route('')
export class DiagnosticsController extends Controller {
  public constructor(private readonly metaInfo: MetaInfo) {
    super();
  }

  /**
   * Gets an indication of the current health of the system
   */
  @Get('_/healthcheck')
  public getHealthCheck(): HealthCheckResponse {
    return {
      version: this.metaInfo.version,
      buildInfo: this.metaInfo.buildInfo,
    };
  }
}
