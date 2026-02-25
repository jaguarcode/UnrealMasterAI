import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import { EmbeddingStore } from '../../../src/rag/embedding-store.js';
import { SemanticSearch } from '../../../src/rag/semantic-search.js';
import { SlateTemplateLoader } from '../../../src/rag/slate-templates.js';

describe('SemanticSearch', () => {
  let store: EmbeddingStore;
  let search: SemanticSearch;

  beforeAll(() => {
    store = new EmbeddingStore();
    const templatesDir = path.resolve(__dirname, '../../../docs/slate-templates');
    const loader = new SlateTemplateLoader(store, templatesDir);
    const count = loader.loadAll();
    expect(count).toBe(7);
    search = new SemanticSearch(store);
  });

  it('all 7 templates are indexed at startup', () => {
    expect(store.size).toBe(7);
  });

  it('"create a list view widget" returns list-view as top result', () => {
    const results = search.search('create a list view widget');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].document.id).toBe('list-view');
  });

  it('"STreeView with hierarchical data" returns tree-view as top result', () => {
    const results = search.search('STreeView with hierarchical data');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].document.id).toBe('tree-view');
  });

  it('"modal dialog popup" returns dialog as top result', () => {
    const results = search.search('modal dialog popup');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].document.id).toBe('dialog');
  });

  it('"toolbar button" returns toolbar as top result', () => {
    const results = search.search('toolbar button');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].document.id).toBe('toolbar');
  });

  it('"base compound widget" returns base-widget as top result', () => {
    const results = search.search('base compound widget');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].document.id).toBe('base-widget');
  });

  it('"details panel customization" returns details-panel as top result', () => {
    const results = search.search('details panel customization');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].document.id).toBe('details-panel');
  });

  it('"dockable tab widget" returns tab-widget as top result', () => {
    const results = search.search('dockable tab widget');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].document.id).toBe('tab-widget');
  });

  it('top-k=3 returns exactly 3 results', () => {
    const results = search.search('widget', 3);
    expect(results).toHaveLength(3);
  });

  it('empty query returns empty results', () => {
    const results = search.search('');
    expect(results).toHaveLength(0);
  });

  it('search results are sorted by score descending', () => {
    const results = search.search('widget template');
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });
});
