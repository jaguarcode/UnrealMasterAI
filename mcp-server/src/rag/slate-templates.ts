/**
 * Slate template document loader.
 * Reads markdown templates from disk and indexes them into the EmbeddingStore.
 */
import fs from 'node:fs';
import path from 'node:path';
import { EmbeddingStore, type Document } from './embedding-store.js';

export class SlateTemplateLoader {
  private store: EmbeddingStore;
  private templatesDir: string;

  constructor(store: EmbeddingStore, templatesDir: string) {
    this.store = store;
    this.templatesDir = templatesDir;
  }

  /**
   * Load and index all markdown templates from the templates directory.
   * @returns number of templates loaded
   */
  loadAll(): number {
    const files = fs
      .readdirSync(this.templatesDir)
      .filter((f) => f.endsWith('.md') && f !== '.gitkeep');

    for (const file of files) {
      const content = fs.readFileSync(
        path.join(this.templatesDir, file),
        'utf-8',
      );
      const id = path.basename(file, '.md');
      const title = this.extractTitle(content);
      const keywords = this.extractKeywords(content);

      this.store.addDocument({ id, title, content, keywords });
    }

    this.store.reindex();
    return files.length;
  }

  private extractTitle(content: string): string {
    const match = content.match(/^#\s+(.+)/m);
    return match ? match[1] : '';
  }

  private extractKeywords(content: string): string[] {
    const match = content.match(/## Keywords\n(.+)/);
    if (!match) return [];
    return match[1].split(',').map((k) => k.trim().toLowerCase());
  }
}
