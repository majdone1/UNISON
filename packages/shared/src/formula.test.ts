import { describe, expect, it } from 'vitest';
import { evaluateFormula, FormulaError } from './formula';

describe('formula engine', () => {
  it('evaluates arithmetic and IF', () => {
    expect(evaluateFormula('1 + 2 * 3')).toBe(7);
    expect(evaluateFormula('IF(1 > 0, 10, 20)')).toBe(10);
    expect(evaluateFormula('IF({progress} >= 50, "ok", "low")', { progress: 60 })).toBe('ok');
  });

  it('resolves field refs and duration hours', () => {
    expect(evaluateFormula('{Effort} * 2', { Effort: 4 })).toBe(8);
    expect(
      evaluateFormula('DURATION_HOURS("2026-01-01T10:00:00.000Z", "2026-01-01T13:30:00.000Z")'),
    ).toBe(3.5);
    expect(evaluateFormula('{travel} + {work}', { travel: 1.5, work: 6 })).toBe(7.5);
  });

  it('rejects unknown functions and division by zero', () => {
    expect(() => evaluateFormula('EVAL("x")')).toThrow(FormulaError);
    expect(() => evaluateFormula('1/0')).toThrow('Division by zero');
  });
});
