
import type { Hook, HookContext } from '@feathersjs/feathers';
import type { AnySchema, ValidationOptions } from 'joi';
import * as Joi from 'joi';
import type { ZodSchema, ZodError } from 'zod';
import {z} from 'zod';


let logger = { warn: (text: string, data: any, ...rest: any[]) => console.log( text, data, ...rest ) };

export function configureLogger(newLogger: typeof logger) {
  logger = newLogger;
}

let BadRequest = class extends Error {
  constructor(message: string, data: any) {
    super();
  }
};

export function configureBadRequest(err: typeof BadRequest) {
   BadRequest = err;
}


export function validateParam<S extends AnySchema | ZodSchema<any, any, any>>(name: 'query' | 'route', schema: S, options?: ValidationOptions): Hook {
  function validateParamHook(context: HookContext) {
    const { params: { [name]: param } } = context;

    if (isJoiScheme(schema)) {
      const { error, value } = schema.validate(param, options);
      if (error) {
        logger.warn('validateParamHook validation failed', error);

        const { message, details } = error;

        throw new BadRequest(message, details);
      }

      context.params[name] = value;
    } else {
      try {
        context.params[name] = schema.parse(param);
      } catch (e) {
        logger.warn('validateParamHook validation failed', e);

        const { message, issues } = e as ZodError;

        throw new BadRequest(message, issues);
      }
    }

    return context;
  }

  validateParamHook.schema = {
    name,
    schema,
    options,
  };

  return validateParamHook;
}

const isJoiScheme = <J extends AnySchema, Z extends ZodSchema<any, any, any>>(s: J | Z): s is J => {
  return Joi.isSchema(s);
};

function validateBase<S extends AnySchema | ZodSchema<any, any, any>>(context: HookContext, schema: S, target: 'data' | 'result', softErrors: boolean, joiOptions?: ValidationOptions) {
  const { [target]: data } = context;

  if (isJoiScheme(schema)) {
    const { error, value } = schema.validate(data, joiOptions);

    if (error) {
      logger.warn('validateBodyHook validation failed', error);

      const { message, details } = error;

      if (!softErrors) {
        throw new BadRequest(message, details);
      }
    }

    context[target] = value;
  } else {
    try {
      context[target] = schema.parse(data);
    } catch (e: unknown) {
      logger.warn('validateBase validation failed', e);

      const { message, issues } = e as ZodError;

      if (!softErrors) {
        throw new BadRequest(message, issues);
      }
    }
  }

  return context;
}

export function validateBody<S extends AnySchema | ZodSchema<any, any, any>>(schema: S, joiOptions?: ValidationOptions): Hook {
  function validateBodyHook(context: HookContext) {
    return validateBase(context, schema, 'data', false, joiOptions);
  }

  validateBodyHook.schema = {
    schema,
    options: joiOptions,
  };

  return validateBodyHook;
}

export function validateResponse<S extends AnySchema | ZodSchema<any, any, any>>(schema: S, joiOptions?: ValidationOptions): Hook {
  function validateResponseHook(context: HookContext) {
    return validateBase(context, schema, 'result', true, joiOptions);
  }

  validateResponseHook.schema = {
    schema,
    options: joiOptions,
  };

  return validateResponseHook;
}

export function validateId<S extends AnySchema | ZodSchema<any, any, any>>(schema: S, options?: ValidationOptions): Hook {
  function validateIdHook(context: HookContext) {
    const { id } = context;

    if (isJoiScheme(schema)) {
      const { error, value } = schema.validate(id, options);
      if (error) {
        logger.warn('validateId validation failed', error);

        const { message, details } = error;

        throw new BadRequest(message, details);
      }

      context.id = value;
    } else {
      try {
        context.id = schema.parse(id);
      } catch (e) {
        logger.warn('validateId validation failed', e);

        const { message, issues } = e as ZodError;

        throw new BadRequest(message, issues);
      }
    }

    return context;
  }

  validateIdHook.schema = {
    schema: isJoiScheme(schema) ? Joi.object({ id: schema }) : z.object({ id: schema }),
    options
  };

  return validateIdHook;
}
