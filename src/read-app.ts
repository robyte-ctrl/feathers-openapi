type Service = {
  __hooks: Record<'before' | 'after', Record<string, { name?: string; schema?: { name: string; schema: any; options: any } }[]> | undefined>;
};

export function extractData(app: { services: Record<string, Service> }) {
  const urls = Object.entries(app.services).map(([path, details]) => {
    const hooks = details['__hooks'];

    function extractSchemaFromHooks(hooksByMethods: any, validationHookName: string): Record<string, any[]> {
      return Object.fromEntries(Object.entries(hooksByMethods ?? {}).map(([method, fns = []]: any) => {
        const schemes = fns.filter((e: any) => e?.name === validationHookName).map((e: any) => e?.schema);

        return [method, schemes];
      }).filter(<T>(e: T | null): e is T => !!e))
    }

    const paramsSchemas = extractSchemaFromHooks(hooks?.before ?? {}, 'validateParamHook');
    const idSchemas = extractSchemaFromHooks(hooks?.before ?? {}, 'validateIdHook');

    const fullParamsSchemas = Object.fromEntries(Object.entries(paramsSchemas).map(([method, schemas]) => {
      return [method, schemas.concat(idSchemas[method] ?? [])];
    }));

    return {
      path,
      params: fullParamsSchemas,
      body: extractSchemaFromHooks(hooks?.before ?? {}, 'validateBodyHook'),
      response: extractSchemaFromHooks(hooks.after ?? {}, 'validateResponseHook'),
      methods: Object.entries((details as any).methods).filter(e => (details as any)[e[0]]) as [string, string[]][],
    };
  });

  return urls.map(({path, methods, ...restData}) => {

    const methodsById = methods.filter(e => e[1].includes('id'));
    const methodWithoutId = methods.filter(e => !e[1].includes('id'));

    const data: { path: string, methods: string[], params: any, body: any, response: any }[] = [];
    if (methodsById.length) {
      data.push({
          path: `${path}/:id`,
          ...restData as any,
          methods: methodsById.map(e => e[0]),
        },
      );
    }
    if (methodWithoutId.length) {
      data.push({
          path,
          ...restData as any,
          methods: methodWithoutId.map(e => e[0]),
        },
      );
    }

    const METHODS: Record<string, string> = {
      find: 'GET',
      get: 'GET',
      remove: 'DELETE',
      patch: 'PATCH',
      create: 'POST',
      update: 'PUT'
    };

    const result: { path: string; method: string; params: any; body: any, response: any }[] = [];
    data.map(e => {
      e.methods.map((method: string) => {
        const HTTP_METHOD = METHODS[method];
        if (HTTP_METHOD) {
          result.push({
            path: e.path,
            method: HTTP_METHOD,
            params: e.params[method],
            body: e.body[method],
            response: e.response[method],
          });
        }
      });
    });

    return result;
  }).flat();
}
