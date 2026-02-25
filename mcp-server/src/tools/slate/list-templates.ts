import { EmbeddingStore } from '../../rag/embedding-store.js';

export function listTemplates(
  store: EmbeddingStore,
): Array<{ id: string; title: string }> {
  return store.getAllDocuments().map((doc) => ({ id: doc.id, title: doc.title }));
}
