import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { audioImport } from './import.js';
import { audioCreateCue } from './create-cue.js';
import { audioGetInfo } from './get-info.js';
import { audioSetAttenuation } from './set-attenuation.js';
import { audioCreateMetaSound } from './create-meta-sound.js';
import { audioListAssets } from './list-assets.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'audio-import',
      description: 'Import an audio file into the project.',
      schema: {
        filePath: z.string().describe('Source audio file path'),
        destinationPath: z.string().describe('Content path for imported audio'),
        assetName: z.string().optional().describe('Override asset name'),
      },
      handler: async (ctx, params) => audioImport(ctx.bridge, params as any),
    },
    {
      name: 'audio-createCue',
      description: 'Create a Sound Cue asset.',
      schema: {
        cueName: z.string().describe('Sound Cue name'),
        cuePath: z.string().describe('Content path'),
        soundWavePath: z.string().optional().describe('SoundWave to assign'),
      },
      handler: async (ctx, params) => audioCreateCue(ctx.bridge, params as any),
    },
    {
      name: 'audio-getInfo',
      description: 'Get audio asset info: duration, channels, sample rate.',
      schema: {
        audioPath: z.string().describe('Content path to audio asset'),
      },
      handler: async (ctx, params) => audioGetInfo(ctx.bridge, params as any),
    },
    {
      name: 'audio-setAttenuation',
      description: 'Configure distance attenuation on an audio asset.',
      schema: {
        audioPath: z.string().describe('Content path to audio asset'),
        innerRadius: z.number().optional().describe('Inner radius'),
        outerRadius: z.number().optional().describe('Outer radius'),
        falloffDistance: z.number().optional().describe('Falloff distance'),
      },
      handler: async (ctx, params) => audioSetAttenuation(ctx.bridge, params as any),
    },
    {
      name: 'audio-createMetaSound',
      description: 'Create a MetaSound source asset (UE5+).',
      schema: {
        assetName: z.string().describe('MetaSound asset name'),
        assetPath: z.string().describe('Content path'),
      },
      handler: async (ctx, params) => audioCreateMetaSound(ctx.bridge, params as any),
    },
    {
      name: 'audio-listAssets',
      description: 'List audio assets in the project.',
      schema: {
        directory: z.string().optional().describe('Content directory to search'),
        filter: z.string().optional().describe('Name filter pattern'),
        assetType: z.string().optional().describe('Filter by type: SoundWave, SoundCue, MetaSound'),
      },
      handler: async (ctx, params) => audioListAssets(ctx.bridge, params as any),
    },
  ];
}
