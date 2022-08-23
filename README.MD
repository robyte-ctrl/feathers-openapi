## Open-api generator for @feathersjs/feathers

#### Tested only for @feathers: 3.3.1  ( create issue if it doesn't work for your version )

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

const options = { // TODO: check if it is required
    swaggerOptions: {
      validatorUrl: null,
    },
};

app.use('/swagger', swaggerUi.serve, swaggerUi.setup(JSON.parse(scheme), options)); // endpoint for swagger UI
app.use('/openapi', (req, res) => res.end(scheme)); // endpoint for get json version  (can be util for codegeneration)

```


## For to connect info about input and output data is required that your app have validation hooks with specific name and structure
### Using hooks from library

```typescript
export { validateBody, validateId, validateParam, validateResponse } from 'feathers-openapi';

configureLogger(logger as any);  // here you will configure logger & badRequest for validation hooks and export it's for use in project
configureBadRequest(BadRequest);

```

### Creating custom implementation of hooks

#### Hook should be function with name `validateParamHook` & `validateId` (for params), `validateBody`(for request body) or `validateResponseHook`( for response body) and also you should  attach variable to this function that contain validation scheme with format   `[hookName].schema.schema = schema;`


#### NOTE! supported only validation schema of type `zod`, `joi` and `json-schema`. Ensure that you convert your schema to one of these formats

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
