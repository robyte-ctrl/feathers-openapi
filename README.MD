## Open-api generator for @feathersjs/feathers

#### Tested only for @feathers: 3.3.1  ( open discussion if you have problems with connect it to feathers )

### How does it work ?
This library will analyze your app for generate openapi/swagger schema. All that need from you is to connect it to your app and write specific validation hooks for service methods if you want that input and output data will be specified in generated openapi/swagger schema. Now it support only validation based on `zod`(native) and `joi`(using conversion), open task related to it if you use something other.


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


## For to connect info about input and output data is required that your app have validation hooks with specific name and structure
### Using hooks from library

```typescript
export { validateBody, validateId, validateParam, validateResponse } from 'feathers-openapi';

configureLogger(logger);
configureBadRequest(BadRequest);

// and in code with your service

app.service(serviceName).hooks({
  before: {
    create: [
      validateBody(z.object({ username: z.string(), password: z.string() })),
      validateParam(
        'route',
        Joi.object({
          appId: Joi.string().required(),
        }).required(),
      )
    ],
  },
  after: {
    create: [
      validateResponse(z.object({ userId: z.number() }))
    ]
  }
});

```

### Creating custom implementation of hooks

#### Hook should be function with name `validateParamHook` & `validateId` (for params), `validateBody`(for request body) or `validateResponseHook`( for response body) and also you should  attach variable to this function that contain validation scheme with format   `[hookName].schema.schema = schema;`


#### NOTE! supported only validation schema of type `zod`, `joi`. Ensure that you convert your schema to one of these formats

```typescript

// function validateParam will create validateParamHook and attach to this hook validation schema
export function validateParam<S extends ObjectSchema>(name: 'query' | 'route', schema: S, options?: ValidationOptions): Hook {
  function validateParamHook(context: HookContext) {
    const { params: { [name]: param } } = context;

    const { error, value } = schema.validate(param, options); // example for `joi` validator
    if (error) {
      const { message, details } = error;

      throw new BadRequest(message, details);
    }

    context.params[name] = value;

    return context;
  }

  validateParamHook.schema = {
    name,
    schema,
    options,
  };

  return validateParamHook;
}
```

### License
MIT
