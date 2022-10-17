## Open-api generator for @feathersjs/feathers
-  This library will analyze your app for generate openapi/swagger schema.

#### Tested only for @feathers: 3.3.1, report if you meet problems

### Installation
```shell
    npm i feathers-openapi
```

### Example of use

```typescript
import { OpenAPI } from 'feathers-openapi';   /// this library
import swaggerUi from 'swagger-ui-express'; // other library for generate UI based on openapi.json

const scheme = new OpenAPI({
app, // here you pass your express app that have attached @feathersjs/feathers and all endpoints
title: 'application',
version: '1',
serverUrl: `http://localhost:4200`,  // swagger documentation will reffered to this host
}).getSpecAsJson();

app.use('/swagger', swaggerUi.serve, swaggerUi.setup(JSON.parse(scheme))); // endpoint for swagger UI
app.use('/openapi', (req, res) => res.end(scheme)); // endpoint for get json version  (can be util for codegeneration)

```


### Creating implementation of hooks where is connected info for validation

#### Hook should be function with name `validateParamHook` & `validateId` (for params), `validateBody`(for request body) or `validateResponseHook`( for response body) and also you should  attach variable to this function that contain validation scheme with format   `[hookName].schema.schema = schema;`


#### NOTE! supported only validation schema of type `zod`, `joi`. Ensure that you convert your schema to one of these formats

```typescript

// function validateParam will create validateParamHook and attach to this hook validation schema
export function validateParam<S extends AnySchema | ZodSchema<any, any, any>>(name: 'query' | 'route', schema: S, options?: ValidationOptions): Hook {
  function validateParamHook(context: HookContext) {
    return {
      ...context,
      params: {
        ...context.params,
        [name]: validateBase(context.params[name], schema, 'params', false, options),
      },
    };
  }

  validateParamHook.schema = {  // it is mandatory for feathers-openapid
    name,
    schema,
    options,
  };

  return validateParamHook;
}

export function validateBody<S extends AnySchema | ZodSchema<any, any, any>>(schema: S, options?: ValidationOptions): Hook {
  function validateBodyHook(context: HookContext) {
    return {
      ...context,
      data: validateBase(context['data'], schema, 'data', false, options),
    };
  }

  validateBodyHook.schema = {
    schema,
    options,
  };

  return validateBodyHook;
}

export function validateResponse<S extends AnySchema | ZodSchema<any, any, any>>(schema: S, options?: ValidationOptions): Hook {
  function validateResponseHook(context: HookContext) {
    return {
      ...context,
      result: validateBase(context['result'], schema, 'result', true, options),
    };
  }

  validateResponseHook.schema = {
    schema,
    options,
  };

  return validateResponseHook;
}

export function validateId<S extends AnySchema | ZodSchema<any, any, any>>(schema: S, options?: ValidationOptions): Hook {
  function validateIdHook(context: HookContext) {
    return {
      ...context,
      id: validateBase(context['id'], schema, 'id', false, options),
    };
  }

  validateIdHook.schema = {
    schema: isJoiScheme(schema) ? Joi.object({ id: schema }) : z.object({ id: schema }),
    options,
  };

  return validateIdHook;
}


const isJoiScheme = <J extends AnySchema, Z extends ZodSchema<any, any, any>>(s: J | Z): s is J => {
  return Joi.isSchema(s);
};

function validateBase<S extends AnySchema | ZodSchema<any, any, any>>(data: unknown, schema: S, target: string, softErrors: boolean, options?: ValidationOptions) {
  if (isJoiScheme(schema)) {
    const { error, value } = schema.validate(data, options);

    if (error) {
      logger.warn(`validateBase ${ target } validation failed`, error);

      const { message, details } = error;

      if (!softErrors) {
        throw new BadRequest(message, details);
      }
    }

    return value;
  }
  try {
    return schema.parse(data);
  } catch (e: unknown) {
    logger.warn(`validateBase ${ target } validation failed`, e);

    const { message, issues } = e as ZodError;

    if (!softErrors) {
      throw new BadRequest(message, issues);
    }
  }


  return context;
}

```

### Using hooks

```typescript

app.service(serviceName).hooks({
  before: {
    create: [
      validators.validateBody(z.object({ username: z.string(), password: z.string() })),
      validators.validateParam(
        'route',
        Joi.object({
          appId: Joi.string().required(),
        }).required(),
      )
    ],
  },
  after: {
    create: [
      validators.validateResponse(z.object({ userId: z.number() }))
    ]
  }
});

```

### License
MIT
