import {OpenApiBuilder} from 'openapi3-ts';
import {extractData} from './read-app';
import {prepareOpenapiRouteInfo} from './prepare-openapi-route-info';

export class OpenAPI extends OpenApiBuilder {
  public constructor({
    app,
    title,
    version,
    serverUrl,
}: { app: any; title: string; version: string; serverUrl: string }) {
    super();
    this.addInfo({ title, version }).addServer({ url: serverUrl });

    prepareOpenapiRouteInfo(extractData(app)).map(({swaggerCompatiblePath, pathItem}) => {
      this.addPath(swaggerCompatiblePath, {
        ...this.rootDoc.paths?.[swaggerCompatiblePath] || {},
        ...pathItem,
      });
    })
  }
}

