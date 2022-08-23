// @ts-ignore
import joiToJson from 'joi-to-json';
import {z} from 'zod';
import {jsonSchemaToZod} from 'json-schema-to-zod';
import type {OperationObject, ResponseObject} from 'openapi3-ts';
import {depictSchema} from './depict-all';
import {transpile} from 'typescript';


function getZodScheme(schema: any): z.ZodObject<any> {
  if (typeof schema !== 'object') {
    throw new Error('Schema is not object');
  }

  if ('_def' in schema) {
    return schema;
  }

  const jsonSchema = typeof schema.validate === 'function' ? joiToJson(schema) : schema;

  // @ts-expect-error pass zod to global for use it in eval
  global.z = z;

  const tsCode = jsonSchemaToZod(jsonSchema).split('export default').slice(1).join('export default') as any;

  return eval(transpile(tsCode));
}

export function prepareOpenapiRouteInfo(data: { path: string, method: string, params: any, body: any, response: any }[]) {
  return data.map(e => {
    const swaggerCompatiblePath = (e.path.startsWith('/') ? e.path : `/${e.path}`).split('/').map(e => {
      return e.startsWith(':') ? `{${e.slice(1)}}` : e;
    }).join('/');

    const definedParams: OperationObject['parameters'] = [];

    e.params?.filter((e: any) => e?.schema)?.map((p: any) => {
      const zodScheme = getZodScheme(p.schema);

      const params: OperationObject['parameters'] = Object.keys(zodScheme.shape).map((name) => {
        return {
          name: name,
          required: !zodScheme.shape[name].isOptional(),
          in: p.name === 'route' ? 'path' : 'query',
          schema: depictSchema({schema: zodScheme.shape[name], isResponse: false}),
        };
      });

      definedParams.push(...params);
    });

    let requestBody: OperationObject['requestBody'];
    if (e.body?.length && e.body[0].schema) { // NOTE: for body is used only first schema
      const schemeFromExpress = depictSchema({schema: getZodScheme(e.body[0].schema), isResponse: false});

      requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: schemeFromExpress,
          },
        },
      };
    }

    const response: ResponseObject = {
      description: 'Description',
    };

    if (e.response?.length && e.response[0].schema) {  // NOTE: for response is used only first schema
      const schemeFromExpress = depictSchema({schema: getZodScheme(e.response[0].schema), isResponse: false});

      response['content'] = {
        'application/json': {
          schema: schemeFromExpress,
        },
      };
    }

    const operation: OperationObject = {
      responses: {
        200: response,
      },
      requestBody: requestBody ?? undefined,
      parameters: definedParams.concat(
        e.path.split('/').map(part => part.startsWith(':') ? part.slice(1) : '').filter(e => e)
          .filter(e => {
            // @ts-expect-error
            return !definedParams.map(def => def.name).includes(e);
          })
          .map(e => {
            return {
              name: e,
              required: true,
              in: 'path',
              schema: {
                type: 'string',
              },
            };
          }),
      ),
    };

    return {
      swaggerCompatiblePath,
      pathItem: {
        [e.method.toLowerCase()]: operation,
      }
    }
  })
}
