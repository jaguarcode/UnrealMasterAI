export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  rule: string;
  message: string;
  line?: number;
}

export function validateSlateCode(code: string): ValidationResult {
  const errors: ValidationError[] = [];

  // Rule 1: SLATE_BEGIN_ARGS must have matching SLATE_END_ARGS
  const beginCount = (code.match(/SLATE_BEGIN_ARGS/g) ?? []).length;
  const endCount = (code.match(/SLATE_END_ARGS/g) ?? []).length;
  if (beginCount > endCount) {
    errors.push({
      rule: 'SLATE_ARGS_BALANCE',
      message: 'SLATE_BEGIN_ARGS without matching SLATE_END_ARGS',
    });
  }
  if (endCount > beginCount) {
    errors.push({
      rule: 'SLATE_ARGS_BALANCE',
      message: 'SLATE_END_ARGS without matching SLATE_BEGIN_ARGS',
    });
  }

  // Rule 2: TAttribute usage - check for direct access without .Get()
  // Warn if TAttribute<...> is used as a type but .Get() never appears
  const hasAttribute = /TAttribute\s*</.test(code);
  const hasGet = /\.Get\s*\(/.test(code);
  if (hasAttribute && !hasGet) {
    errors.push({
      rule: 'TATTRIBUTE_GET',
      message:
        'TAttribute used but .Get() never called - ensure attributes are accessed via .Get()',
    });
  }

  return { valid: errors.length === 0, errors };
}
