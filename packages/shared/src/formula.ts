/**
 * Safe formula evaluator for UNISON column formulas.
 * Supports numbers, + - * /, parentheses, comparisons, IF(), field refs {Name},
 * and DURATION_HOURS(start,end). No arbitrary code / Function() / eval.
 */

export type FormulaContext = Record<string, unknown>;

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaError';
  }
}

type Tok =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lp' }
  | { t: 'rp' }
  | { t: 'comma' }
  | { t: 'ref'; v: string };

function tokenize(input: string): Tok[] {
  const s = input.trim();
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === '(') {
      out.push({ t: 'lp' });
      i += 1;
      continue;
    }
    if (c === ')') {
      out.push({ t: 'rp' });
      i += 1;
      continue;
    }
    if (c === ',') {
      out.push({ t: 'comma' });
      i += 1;
      continue;
    }
    if (c === '{') {
      const end = s.indexOf('}', i + 1);
      if (end < 0) throw new FormulaError('Unclosed field reference');
      out.push({ t: 'ref', v: s.slice(i + 1, end).trim() });
      i = end + 1;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      let val = '';
      while (j < s.length && s[j] !== quote) {
        val += s[j];
        j += 1;
      }
      if (j >= s.length) throw new FormulaError('Unclosed string');
      out.push({ t: 'str', v: val });
      i = j + 1;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j]!)) j += 1;
      const n = Number(s.slice(i, j));
      if (Number.isNaN(n)) throw new FormulaError(`Invalid number near ${s.slice(i, j)}`);
      out.push({ t: 'num', v: n });
      i = j;
      continue;
    }
    if ('+-*/<>=!'.includes(c)) {
      let op = c;
      if ((c === '<' || c === '>' || c === '=' || c === '!') && s[i + 1] === '=') {
        op += '=';
        i += 2;
      } else {
        i += 1;
      }
      out.push({ t: 'op', v: op });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < s.length && /[A-Za-z0-9_]/.test(s[j]!)) j += 1;
      out.push({ t: 'id', v: s.slice(i, j) });
      i = j;
      continue;
    }
    throw new FormulaError(`Unexpected character '${c}'`);
  }
  return out;
}

class Parser {
  constructor(
    private tokens: Tok[],
    private ctx: FormulaContext,
    private pos = 0,
  ) {}

  private peek(): Tok | undefined {
    return this.tokens[this.pos];
  }

  private eat(): Tok {
    const t = this.tokens[this.pos];
    if (!t) throw new FormulaError('Unexpected end of formula');
    this.pos += 1;
    return t;
  }

  parse(): unknown {
    const v = this.parseOr();
    if (this.pos < this.tokens.length) throw new FormulaError('Trailing tokens');
    return v;
  }

  private parseOr(): unknown {
    let left = this.parseAnd();
    while (this.peek()?.t === 'id' && (this.peek() as { v: string }).v.toLowerCase() === 'or') {
      this.eat();
      const right = this.parseAnd();
      left = Boolean(left) || Boolean(right);
    }
    return left;
  }

  private parseAnd(): unknown {
    let left = this.parseCompare();
    while (this.peek()?.t === 'id' && (this.peek() as { v: string }).v.toLowerCase() === 'and') {
      this.eat();
      const right = this.parseCompare();
      left = Boolean(left) && Boolean(right);
    }
    return left;
  }

  private parseCompare(): unknown {
    let left = this.parseAdd();
    const p = this.peek();
    if (p?.t === 'op' && ['=', '==', '!=', '<', '>', '<=', '>='].includes(p.v)) {
      const op = this.eat() as { t: 'op'; v: string };
      const right = this.parseAdd();
      const ln = toNum(left);
      const rn = toNum(right);
      switch (op.v) {
        case '=':
        case '==':
          return ln != null && rn != null ? ln === rn : String(left) === String(right);
        case '!=':
          return ln != null && rn != null ? ln !== rn : String(left) !== String(right);
        case '<':
          return (ln ?? 0) < (rn ?? 0);
        case '>':
          return (ln ?? 0) > (rn ?? 0);
        case '<=':
          return (ln ?? 0) <= (rn ?? 0);
        case '>=':
          return (ln ?? 0) >= (rn ?? 0);
        default:
          return false;
      }
    }
    return left;
  }

  private parseAdd(): unknown {
    let left = this.parseMul();
    while (this.peek()?.t === 'op' && (this.peek() as { v: string }).v in { '+': 1, '-': 1 }) {
      const op = (this.eat() as { v: string }).v;
      const right = this.parseMul();
      const ln = toNum(left) ?? 0;
      const rn = toNum(right) ?? 0;
      left = op === '+' ? ln + rn : ln - rn;
    }
    return left;
  }

  private parseMul(): unknown {
    let left = this.parseUnary();
    while (this.peek()?.t === 'op' && (this.peek() as { v: string }).v in { '*': 1, '/': 1 }) {
      const op = (this.eat() as { v: string }).v;
      const right = this.parseUnary();
      const ln = toNum(left) ?? 0;
      const rn = toNum(right) ?? 0;
      if (op === '/' && rn === 0) throw new FormulaError('Division by zero');
      left = op === '*' ? ln * rn : ln / rn;
    }
    return left;
  }

  private parseUnary(): unknown {
    if (this.peek()?.t === 'op' && (this.peek() as { v: string }).v === '-') {
      this.eat();
      return -(toNum(this.parseUnary()) ?? 0);
    }
    return this.parsePrimary();
  }

  private parsePrimary(): unknown {
    const t = this.eat();
    if (t.t === 'num') return t.v;
    if (t.t === 'str') return t.v;
    if (t.t === 'ref') return resolveRef(this.ctx, t.v);
    if (t.t === 'lp') {
      const v = this.parseOr();
      const close = this.eat();
      if (close.t !== 'rp') throw new FormulaError('Expected )');
      return v;
    }
    if (t.t === 'id') {
      const name = t.v.toUpperCase();
      if (name === 'TRUE') return true;
      if (name === 'FALSE') return false;
      if (this.peek()?.t !== 'lp') {
        return resolveRef(this.ctx, t.v);
      }
      this.eat(); // (
      const args: unknown[] = [];
      if (this.peek()?.t !== 'rp') {
        args.push(this.parseOr());
        while (this.peek()?.t === 'comma') {
          this.eat();
          args.push(this.parseOr());
        }
      }
      const rp = this.eat();
      if (rp.t !== 'rp') throw new FormulaError('Expected ) after function args');
      return callFn(name, args);
    }
    throw new FormulaError('Invalid expression');
  }
}

function toNum(v: unknown): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function resolveRef(ctx: FormulaContext, key: string): unknown {
  if (Object.prototype.hasOwnProperty.call(ctx, key)) return ctx[key];
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(ctx)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

function callFn(name: string, args: unknown[]): unknown {
  switch (name) {
    case 'IF': {
      if (args.length < 2) throw new FormulaError('IF needs at least 2 args');
      return args[0] ? args[1] : (args[2] ?? null);
    }
    case 'ABS':
      return Math.abs(toNum(args[0]) ?? 0);
    case 'MIN':
      return Math.min(...args.map((a) => toNum(a) ?? 0));
    case 'MAX':
      return Math.max(...args.map((a) => toNum(a) ?? 0));
    case 'ROUND': {
      const n = toNum(args[0]) ?? 0;
      const d = toNum(args[1]) ?? 0;
      const f = 10 ** d;
      return Math.round(n * f) / f;
    }
    case 'DURATION_HOURS': {
      // DURATION_HOURS(startIso, endIso) or DURATION_HOURS(hoursNumber)
      if (args.length === 1) return toNum(args[0]) ?? 0;
      const a = args[0];
      const b = args[1];
      if (typeof a === 'string' && typeof b === 'string') {
        const ms = new Date(b).getTime() - new Date(a).getTime();
        if (Number.isNaN(ms)) throw new FormulaError('Invalid dates in DURATION_HOURS');
        return ms / 3_600_000;
      }
      return (toNum(b) ?? 0) - (toNum(a) ?? 0);
    }
    case 'CONCAT':
      return args.map((a) => (a == null ? '' : String(a))).join('');
    default:
      throw new FormulaError(`Unknown function ${name}`);
  }
}

export function evaluateFormula(expression: string, context: FormulaContext = {}): unknown {
  if (!expression || !expression.trim()) return null;
  if (expression.length > 2000) throw new FormulaError('Formula too long');
  const tokens = tokenize(expression);
  return new Parser(tokens, context).parse();
}

/** Build formula context from item + columns (by name and id). */
export function buildFormulaContext(
  item: {
    name: string;
    status: string;
    priority: string;
    progress: number;
    dueDate?: string | null;
    values: Record<string, unknown>;
  },
  columns: Array<{ id: string; name: string; type: string; settings?: { systemField?: string } }>,
  getCell: (columnId: string) => unknown,
): FormulaContext {
  const ctx: FormulaContext = {
    name: item.name,
    status: item.status,
    priority: item.priority,
    progress: item.progress,
    dueDate: item.dueDate ?? null,
  };
  for (const col of columns) {
    if (col.type === 'formula') continue;
    const v = getCell(col.id);
    ctx[col.name] = v;
    ctx[col.id] = v;
  }
  return ctx;
}
