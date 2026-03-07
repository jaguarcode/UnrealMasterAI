/**
 * Keyword-based embedding store using TF-IDF similarity.
 * Provides document indexing and search without external ML dependencies.
 */

export interface Document {
  id: string;
  title: string;
  content: string;
  keywords: string[];
}

export interface SearchResult {
  document: Document;
  score: number;
}

// NOTE: Intentionally separate from utils/tokenize.ts — different regex for embedding/RAG purposes
/**
 * Tokenize a string into lowercase words, stripping punctuation.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Compute term frequency map for a list of tokens.
 */
function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  // Normalize by total token count
  const total = tokens.length;
  if (total > 0) {
    for (const [term, count] of tf) {
      tf.set(term, count / total);
    }
  }
  return tf;
}

export class EmbeddingStore {
  private documents: Map<string, Document> = new Map();
  private idf: Map<string, number> = new Map();
  private docTokens: Map<string, Map<string, number>> = new Map();

  /** Add a document to the store. */
  addDocument(doc: Document): void {
    this.documents.set(doc.id, doc);
    const tokens = tokenize(doc.content);
    this.docTokens.set(doc.id, termFrequency(tokens));
  }

  /** Remove a document by id. */
  removeDocument(id: string): boolean {
    this.docTokens.delete(id);
    return this.documents.delete(id);
  }

  /**
   * Search by query string. Returns sorted by score descending.
   * @param query - search query
   * @param topK - maximum results to return (default: 5)
   */
  search(query: string, topK = 5): SearchResult[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) {
      return [];
    }

    const results: SearchResult[] = [];

    for (const [docId, doc] of this.documents) {
      const tf = this.docTokens.get(docId);
      if (!tf) continue;

      let score = 0;
      const keywordSet = new Set(doc.keywords.map((k) => k.toLowerCase()));

      for (const token of queryTokens) {
        const tfValue = tf.get(token) ?? 0;
        const idfValue = this.idf.get(token) ?? 0;
        score += tfValue * idfValue;

        // Boost for explicit keyword matches (2x weight)
        if (keywordSet.has(token)) {
          score += idfValue * 2;
        }
      }

      // Also check multi-word keyword matches (e.g. "SListView", "STreeView")
      const lowerContent = doc.content.toLowerCase();
      for (const token of queryTokens) {
        // Boost for tokens appearing in the title
        if (doc.title.toLowerCase().includes(token)) {
          score += 1.0;
        }
        // Boost for multi-word keyword phrases
        for (const kw of doc.keywords) {
          if (kw.includes(token) && kw !== token) {
            score += 0.5;
          }
        }
      }

      if (score > 0) {
        results.push({ document: doc, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /** Re-index IDF weights across all documents. */
  reindex(): void {
    const N = this.documents.size;
    if (N === 0) {
      this.idf.clear();
      return;
    }

    // Count how many documents contain each term
    const docFreq = new Map<string, number>();
    for (const tf of this.docTokens.values()) {
      for (const term of tf.keys()) {
        docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
      }
    }

    // Compute IDF = log(N / df)
    this.idf.clear();
    for (const [term, df] of docFreq) {
      this.idf.set(term, Math.log(N / df));
    }
  }

  /** Number of documents in the store. */
  get size(): number {
    return this.documents.size;
  }

  /** Return all documents in the store. */
  getAllDocuments(): Document[] {
    return Array.from(this.documents.values());
  }
}
