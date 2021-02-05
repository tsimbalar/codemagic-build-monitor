import * as express from 'express';
import { Controller, Get, Request, Route } from '@tsoa/runtime';
import { MetaInfo } from '../../meta';

@Route('')
export class IndexController extends Controller {
  public constructor(private readonly metaInfo: MetaInfo) {
    super();
  }

  @Get('')
  public getHomePage(@Request() request: express.Request): string | null {
    const response = (<any>request).res as express.Response;
    this.setStatus(200);
    response.contentType('text/html');
    response
      .send(
        `
    <html>
    <head>
      <title>codemagic-build-monitor v${this.metaInfo.version}</title>
    </head>
    <body>
      <h1>Welcome to codemagic-build-monitor !</h1>
      <code>codemagic-build-monitor</code> gives access to the current state of your workflows running in CodeMagic in a format understood by the Catlight app.

      <h2>Monitoring your CodeMagic builds</h2>
      <p>If you want to start monitoring your CodeMagic builds in Catlight, follow the instructions here : <a href="https://github.com/tsimbalar/codemagic-build-monitor#readme">https://github.com/tsimbalar/codemagic-build-monitor#readme</a></p>

      <h2>Playing around with <code>codemagic-build-monitor</code></h2>
      <ul>
        <li>check the status of the server here: <a href="_/healthcheck">/_/healthcheck</a></li>
        <li>interact with the API here: <a href="docs">/docs</a></li>
        <li>learn more about the Catlight Protocol here: <a href="https://github.com/catlightio/catlight-protocol">https://github.com/catlightio/catlight-protocol</a></li>
      </ul>
      <hr/>
      <span>Currently running at ${request.protocol}://${request.headers.host} - version v${
          this.metaInfo.version
        }</span>
      <pre>${JSON.stringify(this.metaInfo.buildInfo, null, 2)}</pre>
    </body>
    </html>
    `
      )
      .end();
    return null; // Found via #44
  }
}
