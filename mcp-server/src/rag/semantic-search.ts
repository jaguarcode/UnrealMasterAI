/**
 * Semantic search interface over the embedding store.
 * Provides a clean API for searching slate template documents.
 */
import { EmbeddingStore, type SearchResult } from './embedding-store.js';

export class SemanticSearch {
  private store: EmbeddingStore;

  constructor(store: EmbeddingStore) {
    this.store = store;
  }

  /** Search for relevant templates by natural language query. */
  search(query: string, topK?: number): SearchResult[] {
    return this.store.search(query, topK);
  }
}
