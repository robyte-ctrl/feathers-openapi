import { transpile } from 'typescript';
import {z} from 'zod';
import { strict as assert } from 'node:assert';
import { depictSchema } from '../src/depict-all';

it('should convert ts to js and exec it without errors', function () {
  const js = transpile(`z
  .object({
    $limit: z.number().int().gte(0).optional(),
    $skip: z.number().int().gte(0).optional(),
    data: z.unknown().optional(),
    search: z
      .any()
      .superRefine((x, ctx) => {
        const schemas = [z.number().int().gte(1), z.string()];

        // here is ts
        const errors = schemas.reduce(
          (errors: z.ZodError[], schema) =>
            ((result) =>
              "error" in result ? [...errors, result.error] : errors)(
              schema.safeParse(x)
            ),
          []
        );
        if (schemas.length - errors.length !== 1) {
          ctx.addIssue({
            path: ctx.path,
            code: "invalid_union",
            unionErrors: errors,
            message: "Invalid input: Should pass single schema",
          });
        }
      })
      .optional(),
    businessLocationId: z.number().int().gte(1).optional(),
    areaId: z.number().int().gte(1).optional(),
    placeId: z.number().int().gte(1).optional(),
    startDate: z.date().optional(),
    endDate: z.date().or(z.string()).optional(),
    status: z
      .union([
        z.array(z.any()),
        z.boolean(),
        z.number(),
        z.object({}).catchall(z.any()),
        z.string(),
        z.null(),
      ])
      .optional(),
    allowPickUp: z.boolean().optional(),
    getOnlyRealOrders: z.boolean().optional(),
    isProductionLocation: z.boolean().optional(),
  })`);

  (global as any).z = z;
  const zodObject = eval(js);

  assert.strictEqual(!!zodObject.shape.search, true);

  const schema = depictSchema({schema: zodObject, isResponse: false});

  assert.deepStrictEqual(schema, {
    "type": "object",
    "properties": {
      "$limit": {
        "type": "integer",
        "format": "int64",
        "minimum": 0,
        "exclusiveMinimum": false,
        "maximum": 9007199254740991,
        "exclusiveMaximum": false
      },
      "$skip": {
        "type": "integer",
        "format": "int64",
        "minimum": 0,
        "exclusiveMinimum": false,
        "maximum": 9007199254740991,
        "exclusiveMaximum": false
      },
      "data": {
        "nullable": true,
        "format": "any"
      },
      "search": {
        "nullable": true,
        "format": "any"
      },
      "businessLocationId": {
        "type": "integer",
        "format": "int64",
        "minimum": 1,
        "exclusiveMinimum": false,
        "maximum": 9007199254740991,
        "exclusiveMaximum": false
      },
      "areaId": {
        "type": "integer",
        "format": "int64",
        "minimum": 1,
        "exclusiveMinimum": false,
        "maximum": 9007199254740991,
        "exclusiveMaximum": false
      },
      "placeId": {
        "type": "integer",
        "format": "int64",
        "minimum": 1,
        "exclusiveMinimum": false,
        "maximum": 9007199254740991,
        "exclusiveMaximum": false
      },
      "startDate": {
        "type": "string",
        "format": "date-time"
      },
      "endDate": {
        "oneOf": [
          {
            "type": "string",
            "format": "date-time"
          },
          {
            "type": "string"
          }
        ]
      },
      "status": {
        "nullable": true,
        "oneOf": [
          {
            "type": "array",
            "items": {
              "nullable": true,
              "format": "any"
            }
          },
          {
            "type": "boolean"
          },
          {
            "type": "number",
            "format": "double",
            "minimum": 5e-324,
            "exclusiveMinimum": false,
            "maximum": 1.7976931348623157e+308,
            "exclusiveMaximum": false
          },
          {
            "type": "object",
            "properties": {},
            "required": []
          },
          {
            "type": "string"
          },
          {
            "nullable": true,
            "type": "string",
            "format": "null"
          }
        ]
      },
      "allowPickUp": {
        "type": "boolean"
      },
      "getOnlyRealOrders": {
        "type": "boolean"
      },
      "isProductionLocation": {
        "type": "boolean"
      }
    },
    "required": []
  });
});
