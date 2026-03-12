import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { datatableCreate } from './create.js';
import { datatableAddRow } from './add-row.js';
import { datatableGetRows } from './get-rows.js';
import { datatableRemoveRow } from './remove-row.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'datatable-create',
      description: 'Create new DataTable.',
      schema: {
        tableName: z.string(),
        tablePath: z.string(),
        rowStructPath: z.string(),
      },
      handler: async (ctx, params) => datatableCreate(ctx.bridge, params as unknown as Parameters<typeof datatableCreate>[1]),
    },
    {
      name: 'datatable-addRow',
      description: 'Add/modify DataTable row.',
      schema: {
        tablePath: z.string(),
        rowName: z.string(),
        rowData: z.record(z.unknown()),
      },
      handler: async (ctx, params) => datatableAddRow(ctx.bridge, params as unknown as Parameters<typeof datatableAddRow>[1]),
    },
    {
      name: 'datatable-getRows',
      description: 'Read all DataTable rows.',
      schema: {
        tablePath: z.string(),
      },
      handler: async (ctx, params) => datatableGetRows(ctx.bridge, params as unknown as Parameters<typeof datatableGetRows>[1]),
    },
    {
      name: 'datatable-removeRow',
      description: 'Remove DataTable row.',
      schema: {
        tablePath: z.string(),
        rowName: z.string(),
      },
      handler: async (ctx, params) => datatableRemoveRow(ctx.bridge, params as unknown as Parameters<typeof datatableRemoveRow>[1]),
    },
  ];
}
