import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { sequencerCreate } from './create.js';
import { sequencerOpen } from './open.js';
import { sequencerAddTrack } from './add-track.js';
import { sequencerAddBinding } from './add-binding.js';
import { sequencerSetKeyframe } from './set-keyframe.js';
import { sequencerGetInfo } from './get-info.js';
import { sequencerExportFbx } from './export-fbx.js';
import { sequencerImportFbx } from './import-fbx.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'sequencer-create',
      description: 'Create a new Level Sequence asset.',
      schema: {
        sequenceName: z.string().describe('Sequence name'),
        sequencePath: z.string().describe('Content path'),
      },
      handler: async (ctx, params) => sequencerCreate(ctx.bridge, params as any),
    },
    {
      name: 'sequencer-open',
      description: 'Open Level Sequence in Sequencer editor.',
      schema: {
        sequencePath: z.string().describe('Sequence asset path'),
      },
      handler: async (ctx, params) => sequencerOpen(ctx.bridge, params as any),
    },
    {
      name: 'sequencer-addTrack',
      description: 'Add a track to a Level Sequence.',
      schema: {
        sequencePath: z.string().describe('Sequence asset path'),
        trackType: z.string().describe('Track type (e.g., Transform, Audio, Event)'),
        objectPath: z.string().optional().describe('Actor/object to bind the track to'),
      },
      handler: async (ctx, params) => sequencerAddTrack(ctx.bridge, params as any),
    },
    {
      name: 'sequencer-addBinding',
      description: 'Add actor binding (possessable/spawnable) to a Level Sequence.',
      schema: {
        sequencePath: z.string().describe('Sequence asset path'),
        actorName: z.string().describe('Actor name to bind'),
        bindingType: z.string().optional().describe('possessable or spawnable (default: possessable)'),
      },
      handler: async (ctx, params) => sequencerAddBinding(ctx.bridge, params as any),
    },
    {
      name: 'sequencer-setKeyframe',
      description: 'Set a keyframe value on a sequencer track.',
      schema: {
        sequencePath: z.string().describe('Sequence asset path'),
        trackName: z.string().describe('Track display name'),
        time: z.number().describe('Time in seconds'),
        value: z.unknown().describe('Keyframe value'),
      },
      handler: async (ctx, params) => sequencerSetKeyframe(ctx.bridge, params as any),
    },
    {
      name: 'sequencer-getInfo',
      description: 'Get Level Sequence metadata (tracks, bindings, frame range).',
      schema: {
        sequencePath: z.string().describe('Sequence asset path'),
      },
      handler: async (ctx, params) => sequencerGetInfo(ctx.bridge, params as any),
    },
    {
      name: 'sequencer-exportFbx',
      description: 'Export Level Sequence animation to FBX.',
      schema: {
        sequencePath: z.string().describe('Sequence asset path'),
        outputPath: z.string().describe('Output FBX file path'),
      },
      handler: async (ctx, params) => sequencerExportFbx(ctx.bridge, params as any),
    },
    {
      name: 'sequencer-importFbx',
      description: 'Import FBX animation into Level Sequence.',
      schema: {
        sequencePath: z.string().describe('Sequence asset path'),
        fbxPath: z.string().describe('Input FBX file path'),
      },
      handler: async (ctx, params) => sequencerImportFbx(ctx.bridge, params as any),
    },
  ];
}
