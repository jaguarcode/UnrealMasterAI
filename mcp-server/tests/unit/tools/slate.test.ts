import { describe, it, expect, beforeAll } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateSlateCode } from '../../../src/tools/slate/validate-slate.js';
import { generateWidgetContext } from '../../../src/tools/slate/generate-widget.js';
import { listTemplates } from '../../../src/tools/slate/list-templates.js';
import { EmbeddingStore } from '../../../src/rag/embedding-store.js';
import { SlateTemplateLoader } from '../../../src/rag/slate-templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.resolve(__dirname, '../../../../docs/slate-templates');

describe('SlateValidation', () => {
  it('validates balanced SNew brackets', () => {
    const code = 'SNew(SVerticalBox) + SVerticalBox::Slot() [ SNew(STextBlock) ]';
    const result = validateSlateCode(code);
    expect(result.valid).toBe(true);
  });

  it('fails SLATE_BEGIN_ARGS without SLATE_END_ARGS', () => {
    const code = 'SLATE_BEGIN_ARGS(SMyWidget) {}';
    const result = validateSlateCode(code);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('SLATE_ARGS_BALANCE');
  });

  it('fails SLATE_END_ARGS without SLATE_BEGIN_ARGS', () => {
    const code = 'SLATE_END_ARGS()';
    const result = validateSlateCode(code);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('SLATE_ARGS_BALANCE');
  });

  it('passes correct TAttribute usage', () => {
    const code = 'TAttribute<FText> Label; Label.Get()';
    const result = validateSlateCode(code);
    expect(result.valid).toBe(true);
  });

  it('fails missing .Get() on TAttribute', () => {
    const code = 'TAttribute<FText> Label;\nFText Value = Label;';
    const result = validateSlateCode(code);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('TATTRIBUTE_GET');
  });

  it('passes code with matching SLATE_BEGIN_ARGS and SLATE_END_ARGS', () => {
    const code = `
      SLATE_BEGIN_ARGS(SMyWidget)
      {}
      SLATE_END_ARGS()
    `;
    const result = validateSlateCode(code);
    expect(result.valid).toBe(true);
  });

  it('returns valid:true and empty errors for clean code', () => {
    const code = 'SNew(STextBlock).Text(FText::FromString(TEXT("Hello")))';
    const result = validateSlateCode(code);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('SlateGeneration', () => {
  let store: EmbeddingStore;

  beforeAll(() => {
    store = new EmbeddingStore();
    const loader = new SlateTemplateLoader(store, templatesDir);
    loader.loadAll();
  });

  it('query "list view" retrieves list-view template', () => {
    const result = generateWidgetContext(store, { query: 'list view' });
    expect(result.templates.length).toBeGreaterThan(0);
    expect(result.templates[0].id).toBe('list-view');
  });

  it('output includes style guide', () => {
    const result = generateWidgetContext(store, { query: 'widget' });
    expect(result.styleGuide).toContain('SLATE_BEGIN_ARGS');
  });

  it('includes validation rules', () => {
    const result = generateWidgetContext(store, { query: 'widget' });
    expect(result.validationRules.length).toBeGreaterThan(0);
  });

  it('generated context includes SLATE_BEGIN_ARGS in templates', () => {
    const result = generateWidgetContext(store, { query: 'base widget compound' });
    const hasSlateArgs = result.templates.some((t) =>
      t.content.includes('SLATE_BEGIN_ARGS'),
    );
    expect(hasSlateArgs).toBe(true);
  });

  it('templates have id, title, score, content fields', () => {
    const result = generateWidgetContext(store, { query: 'dialog' });
    expect(result.templates.length).toBeGreaterThan(0);
    const t = result.templates[0];
    expect(typeof t.id).toBe('string');
    expect(typeof t.title).toBe('string');
    expect(typeof t.score).toBe('number');
    expect(typeof t.content).toBe('string');
  });
});

describe('SlateListTemplates', () => {
  let store: EmbeddingStore;

  beforeAll(() => {
    store = new EmbeddingStore();
    const loader = new SlateTemplateLoader(store, templatesDir);
    loader.loadAll();
  });

  it('lists all loaded templates', () => {
    const templates = listTemplates(store);
    expect(templates.length).toBeGreaterThan(0);
  });

  it('each entry has id and title', () => {
    const templates = listTemplates(store);
    for (const t of templates) {
      expect(typeof t.id).toBe('string');
      expect(typeof t.title).toBe('string');
    }
  });

  it('list-view template is included in listing', () => {
    const templates = listTemplates(store);
    const ids = templates.map((t) => t.id);
    expect(ids).toContain('list-view');
  });

  it('base-widget template is included in listing', () => {
    const templates = listTemplates(store);
    const ids = templates.map((t) => t.id);
    expect(ids).toContain('base-widget');
  });
});
