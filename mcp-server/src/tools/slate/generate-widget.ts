import { EmbeddingStore } from '../../rag/embedding-store.js';

export interface GenerateWidgetParams {
  query: string;
  widgetName?: string;
}

export interface GenerateWidgetResult {
  templates: Array<{ id: string; title: string; score: number; content: string }>;
  styleGuide: string;
  validationRules: string[];
}

const STYLE_GUIDE = `Epic Games Slate C++ Style Guide:
- Use SNew() macro for widget construction
- Use SLATE_BEGIN_ARGS / SLATE_END_ARGS for widget arguments
- Use SLATE_ARGUMENT, SLATE_ATTRIBUTE, SLATE_EVENT for arg types
- TAttribute<T> for bindable properties, access via .Get()
- Slot composition using operator+ and square brackets []
- Use .AutoHeight(), .FillHeight(), .MaxHeight() for sizing
- Naming: S-prefix for all Slate widgets (SMyWidget)
- One widget per file, matching filename`;

export function generateWidgetContext(
  store: EmbeddingStore,
  params: GenerateWidgetParams,
): GenerateWidgetResult {
  const results = store.search(params.query, 3);

  return {
    templates: results.map((r) => ({
      id: r.document.id,
      title: r.document.title,
      score: r.score,
      content: r.document.content,
    })),
    styleGuide: STYLE_GUIDE,
    validationRules: [
      'Balanced SNew brackets',
      'SLATE_BEGIN_ARGS must have SLATE_END_ARGS',
      'TAttribute accessed via .Get()',
    ],
  };
}
