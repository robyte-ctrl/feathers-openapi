// NOTE(leonid): copy from zod-express-api :: open-api-helpers.ts but with removed not necessary logic (code related to dateIn and uploadFile can be helpful to also add here)

import type { SchemaObject } from 'openapi3-ts';
import { z } from 'zod';


export type ArrayElement<T extends readonly unknown[]> =
  T extends readonly (infer K)[] ? K : never;


type DepictHelper<T extends z.ZodType<any>> = (params: {
  schema: T;
  initial?: SchemaObject;
  isResponse: boolean;
}) => SchemaObject;
type DepictingRules = Partial<Record< | z.ZodFirstPartyTypeKind,
DepictHelper<any>>>;
'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString';
export const depictDefault: DepictHelper<z.ZodDefault<z.ZodTypeAny>> = ({
  schema: {
    _def: { innerType, defaultValue },
  },
  initial,
  isResponse,
}) => ({
  ...initial,
  ...depictSchema({ schema: innerType, initial, isResponse }),
  default: defaultValue(),
});
export const depictAny: DepictHelper<z.ZodAny> = ({ initial }) => ({
  ...initial,
  format: 'any',
});

export const depictUnion: DepictHelper<z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>> = ({ schema: { options }, initial, isResponse }) => ({
  ...initial,
  oneOf: options.map(option => depictSchema({ schema: option, isResponse })),
});
export const depictDiscriminatedUnion: DepictHelper<z.ZodDiscriminatedUnion<string, z.Primitive, z.ZodObject<any>>> = ({ schema: { options, discriminator }, initial, isResponse }) => {
  return {
    ...initial,
    discriminator: {
      propertyName: discriminator,
    },
    oneOf: Array.from(options.values()).map(option =>
      depictSchema({ schema: option, isResponse }),
    ),
  };
};
export const depictIntersection: DepictHelper<z.ZodIntersection<z.ZodTypeAny, z.ZodTypeAny>> = ({
  schema: {
    _def: { left, right },
  },
  initial,
  isResponse,
}) => ({
  ...initial,
  allOf: [
    depictSchema({ schema: left, isResponse }),
    depictSchema({ schema: right, isResponse }),
  ],
});
export const depictOptionalOrNullable: DepictHelper<z.ZodNullable<any> | z.ZodOptional<any>> = ({ schema, initial, isResponse }) => ({
  ...initial,
  ...depictSchema({ schema: schema.unwrap(), isResponse }),
});
export const depictEnum: DepictHelper<z.ZodEnum<any> | z.ZodNativeEnum<any>> = ({
  schema: {
    _def: { values },
  },
  initial,
}) => ({
  ...initial,
  type: typeof Object.values(values)[0] as 'number' | 'string',
  enum: Object.values(values),
});
export const depictLiteral: DepictHelper<z.ZodLiteral<any>> = ({
  schema: {
    _def: { value },
  },
  initial,
}) => ({
  ...initial,
  type: typeof value as 'boolean' | 'number' | 'string',
  enum: [value],
});
export const depictObject: DepictHelper<z.AnyZodObject> = ({
  schema,
  initial,
  isResponse,
}) => ({
  ...initial,
  type: 'object',
  properties: depictObjectProperties({ schema, isResponse }),
  required: Object.keys(schema.shape).filter(
    key => !schema.shape[key].isOptional(),
  ),
});

/** @see https://swagger.io/docs/specification/data-models/data-types/ */
export const depictNull: DepictHelper<z.ZodNull> = ({ initial }) => ({
  ...initial,
  type: 'string',
  nullable: true,
  format: 'null',
});

export const depictBoolean: DepictHelper<z.ZodBoolean> = ({ initial }) => ({
  ...initial,
  type: 'boolean',
});
export const depictBigInt: DepictHelper<z.ZodBigInt> = ({ initial }) => ({
  ...initial,
  type: 'integer',
  format: 'bigint',
});
export const depictRecord: DepictHelper<z.ZodRecord<z.ZodTypeAny>> = ({
  schema: { _def: def },
  initial,
  isResponse,
}) => {
  if (
    def.keyType instanceof z.ZodEnum ||
    def.keyType instanceof z.ZodNativeEnum
  ) {
    const keys = Object.values(def.keyType._def.values);
    const shape = keys.reduce<z.ZodRawShape>(
      (carry, key) => ({
        ...carry,

        // @ts-expect-error
        [key]: def.valueType,
      }),
      {},
    );

    return {
      ...initial,
      type: 'object',
      properties: depictObjectProperties({
        schema: z.object(shape),
        isResponse,
      }),
      required: keys,
    };
  }
  if (def.keyType instanceof z.ZodLiteral) {
    return {
      ...initial,
      type: 'object',
      properties: depictObjectProperties({
        schema: z.object({
          [def.keyType._def.value]: def.valueType,
        }),
        isResponse,
      }),
      required: [def.keyType._def.value],
    };
  }
  if (def.keyType instanceof z.ZodUnion) {
    const areOptionsLiteral = def.keyType.options.reduce(
      (carry: boolean, option: z.ZodTypeAny) =>
        carry && option instanceof z.ZodLiteral,
      true,
    );
    if (areOptionsLiteral) {
      const shape = def.keyType.options.reduce(
        (carry: z.ZodRawShape, option: z.ZodLiteral<any>) => ({
          ...carry,
          [option.value]: def.valueType,
        }),
        {} as z.ZodRawShape,
      );

      return {
        ...initial,
        type: 'object',
        properties: depictObjectProperties({
          schema: z.object(shape),
          isResponse,
        }),
        required: def.keyType.options.map(
          (option: z.ZodLiteral<any>) => option.value,
        ),
      };
    }
  }

  return {
    ...initial,
    type: 'object',
    additionalProperties: depictSchema({ schema: def.valueType, isResponse }),
  };
};
export const depictArray: DepictHelper<z.ZodArray<z.ZodTypeAny>> = ({
  schema: { _def: def },
  initial,
  isResponse,
}) => ({
  ...initial,
  type: 'array',
  items: depictSchema({ schema: def.type, isResponse }),
  ...def.minLength ? { minItems: def.minLength.value } : {},
  ...def.maxLength ? { maxItems: def.maxLength.value } : {},
});

/** @todo improve it when OpenAPI 3.1.0 will be released */
export const depictTuple: DepictHelper<z.ZodTuple> = ({
  schema: { items },
  initial,
  isResponse,
}) => {
  const types = items.map(item => depictSchema({ schema: item, isResponse }));

  return {
    ...initial,
    type: 'array',
    minItems: types.length,
    maxItems: types.length,
    items: {
      oneOf: types,
      format: 'tuple',
      ...types.length === 0
        ? {}
        : {
          description: types
            .map((item, index) => `${ index }: ${ item.type }`)
            .join(', '),
        },
    },
  };
};
export const depictString: DepictHelper<z.ZodString> = ({
  schema: {
    _def: { checks },
  },
  initial,
}) => {
  const isEmail = checks.find(({ kind }) => kind === 'email') !== undefined;
  const isUrl = checks.find(({ kind }) => kind === 'url') !== undefined;
  const isUUID = checks.find(({ kind }) => kind === 'uuid') !== undefined;
  const isCUID = checks.find(({ kind }) => kind === 'cuid') !== undefined;
  const minLengthCheck = checks.find(({ kind }) => kind === 'min') as
    | Extract<ArrayElement<z.ZodStringDef['checks']>, { kind: 'min' }>
    | undefined;
  const maxLengthCheck = checks.find(({ kind }) => kind === 'max') as
    | Extract<ArrayElement<z.ZodStringDef['checks']>, { kind: 'max' }>
    | undefined;
  const regexCheck = checks.find(({ kind }) => kind === 'regex') as
    | Extract<ArrayElement<z.ZodStringDef['checks']>, { kind: 'regex' }>
    | undefined;

  return {
    ...initial,
    type: 'string' as const,
    ...isEmail ? { format: 'email' } : {},
    ...isUrl ? { format: 'url' } : {},
    ...isUUID ? { format: 'uuid' } : {},
    ...isCUID ? { format: 'cuid' } : {},
    ...minLengthCheck ? { minLength: minLengthCheck.value } : {},
    ...maxLengthCheck ? { maxLength: maxLengthCheck.value } : {},
    ...regexCheck
      ? { pattern: `/${ regexCheck.regex.source }/${ regexCheck.regex.flags }` }
      : {},
  };
};
export const depictNumber: DepictHelper<z.ZodNumber> = ({
  schema,
  initial,
}) => {
  const minCheck = schema._def.checks.find(({ kind }) => kind === 'min') as
    | Extract<ArrayElement<z.ZodNumberDef['checks']>, { kind: 'min' }>
    | undefined;
  const isMinInclusive = minCheck ? minCheck.inclusive : true;
  const maxCheck = schema._def.checks.find(({ kind }) => kind === 'max') as
    | Extract<ArrayElement<z.ZodNumberDef['checks']>, { kind: 'max' }>
    | undefined;
  const isMaxInclusive = maxCheck ? maxCheck.inclusive : true;

  return {
    ...initial,
    type: schema.isInt ? ('integer' as const) : 'number' as const,
    format: schema.isInt ? ('int64' as const) : 'double' as const,
    minimum:
      schema.minValue === null
        ? schema.isInt
          ? Number.MIN_SAFE_INTEGER
          : Number.MIN_VALUE
        : schema.minValue,
    exclusiveMinimum: !isMinInclusive,
    maximum:
      schema.maxValue === null
        ? schema.isInt
          ? Number.MAX_SAFE_INTEGER
          : Number.MAX_VALUE
        : schema.maxValue,
    exclusiveMaximum: !isMaxInclusive,
  };
};
export const depictObjectProperties = ({
  schema: { shape },
  isResponse,
}: Parameters<DepictHelper<z.AnyZodObject>>[0]) => {
  return Object.keys(shape).reduce<Record<string, SchemaObject>>(
    (carry, key) => ({
      ...carry,
      [key]: depictSchema({ schema: shape[key], isResponse }),
    }),
    {},
  );
};
export const depictEffect: DepictHelper<z.ZodEffects<z.ZodTypeAny>> = ({
  schema,
  initial,
  isResponse,
}) => {
  const input = depictSchema({ schema: schema._def.schema, isResponse });
  const effect = schema._def.effect;
  if (isResponse && effect && effect.type === 'transform') {
    let output = 'undefined';
    try {
      output = typeof effect.transform(
        ['integer', 'number'].includes(`${ input.type }`)
          ? 0
          : 'string' === input.type
            ? ''
            : 'boolean' === input.type
              ? false
              : 'object' === input.type
                ? {}
                : 'null' === input.type
                  ? null
                  : 'array' === input.type
                    ? []
                    : undefined,
        {
          addIssue: () => {
          }, path: [],
        },
      );
    } catch (e) {
      /**/
    }

    return {
      ...initial,
      ...input,
      ...['number', 'string', 'boolean'].includes(output)
        ? {
          type: output as 'boolean' | 'number' | 'string',
        }
        : {},
    };
  }
  if (!isResponse && effect && effect.type === 'preprocess') {
    const { type: inputType, ...rest } = input;

    return {
      ...initial,
      ...rest,
      format: `${ rest.format || inputType } (preprocessed)`,
    };
  }

  return { ...initial, ...input };
};
export const depictDate: DepictHelper<z.ZodDate> = ({ initial }) => ({
  ...initial,
  type: 'string',
  format: 'date-time',
});
const depictHelpers: DepictingRules = {
  ZodString: depictString,
  ZodNumber: depictNumber,
  ZodBigInt: depictBigInt,
  ZodBoolean: depictBoolean,
  ZodNull: depictNull,
  ZodArray: depictArray,
  ZodTuple: depictTuple,
  ZodRecord: depictRecord,
  ZodObject: depictObject,
  ZodLiteral: depictLiteral,
  ZodIntersection: depictIntersection,
  ZodUnion: depictUnion,
  ZodAny: depictAny,
  ZodUnknown: depictAny,
  ZodDefault: depictDefault,
  ZodEnum: depictEnum,
  ZodNativeEnum: depictEnum,
  ZodEffects: depictEffect,
  ZodOptional: depictOptionalOrNullable,
  ZodNullable: depictOptionalOrNullable,
  ZodDiscriminatedUnion: depictDiscriminatedUnion,
  ZodDate: depictDate,
};
export const depictSchema: DepictHelper<z.ZodTypeAny> = ({
  schema,
  isResponse,
}) => {
  const initial: SchemaObject = {};
  if (schema.isNullable()) {
    initial.nullable = true;
  }
  if (schema.description) {
    initial.description = `${ schema.description }`;
  }
  const nextHelper =
    'typeName' in schema._def
      ? depictHelpers[schema._def.typeName as keyof typeof depictHelpers]
      : null;
  if (!nextHelper) {
    throw new Error(
      `Zod type ${ schema.constructor.name } is unsupported`,
    );
  }

  return nextHelper({ schema, initial, isResponse });
};
