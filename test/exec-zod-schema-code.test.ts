import { transpile } from 'typescript';
import {z} from 'zod';
import { strict as assert } from 'node:assert';

it('should convert ts to js and exec it without errors', function () {
  const js = transpile(`z
  .object({
    $limit: z.number().int().gte(0).optional(),
    $skip: z.number().int().gte(0).optional(),
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
    startDate: z.string().optional(),
    endDate: z.string().optional(),
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
  })
  .strict()`);

  (global as any).z = z;
  const zodObject = eval(js);

  assert.strictEqual(!!zodObject.shape.search, true);
});
