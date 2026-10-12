'use client';

import { Button, Input } from '@unison/ui';
import type { FilterClause, FilterGroup, FilterOp } from '@unison/shared';
import type { BoardColumn } from '@unison/types';

const OPS: Array<{ id: FilterOp; label: string }> = [
  { id: 'eq', label: 'is' },
  { id: 'neq', label: 'is not' },
  { id: 'contains', label: 'contains' },
  { id: 'gt', label: '>' },
  { id: 'gte', label: '≥' },
  { id: 'lt', label: '<' },
  { id: 'lte', label: '≤' },
  { id: 'blank', label: 'is empty' },
  { id: 'not_blank', label: 'is not empty' },
];

export function FilterBuilder({
  columns,
  value,
  onChange,
}: {
  columns: BoardColumn[];
  value: FilterGroup;
  onChange: (next: FilterGroup) => void;
}) {
  const filterable = columns.filter((c) => !c.isHidden && c.type !== 'formula');

  function updateClause(index: number, patch: Partial<FilterClause>) {
    const clauses = value.clauses.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange({ ...value, clauses });
  }

  function removeClause(index: number) {
    onChange({ ...value, clauses: value.clauses.filter((_, i) => i !== index) });
  }

  function addClause() {
    const col = filterable[0];
    if (!col) return;
    onChange({
      ...value,
      clauses: [...value.clauses, { columnId: col.id, op: 'eq', value: '' }],
    });
  }

  return (
    <div
      className="space-y-3 rounded-lg border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-3"
      aria-label="Filter builder"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Match</span>
        <div className="flex gap-1" role="group" aria-label="Filter combinator">
          {(['and', 'or'] as const).map((c) => (
            <Button
              key={c}
              size="sm"
              variant={value.combinator === c ? 'primary' : 'secondary'}
              onClick={() => onChange({ ...value, combinator: c })}
            >
              {c.toUpperCase()}
            </Button>
          ))}
        </div>
        <span className="text-sm text-[var(--unison-muted)]">of the following</span>
        <Button size="sm" variant="ghost" className="ms-auto" onClick={addClause}>
          Add condition
        </Button>
      </div>

      {value.clauses.length === 0 && (
        <p className="text-sm text-[var(--unison-muted)]">No conditions — all items shown.</p>
      )}

      <div className="space-y-2">
        {value.clauses.map((clause, index) => {
          const needsValue = clause.op !== 'blank' && clause.op !== 'not_blank';
          return (
            <div key={`${clause.columnId}-${index}`} className="flex flex-wrap items-center gap-2">
              {index > 0 && (
                <span className="w-10 text-xs font-semibold uppercase text-[var(--unison-muted)]">
                  {value.combinator}
                </span>
              )}
              <select
                className="h-9 rounded-md border border-[var(--unison-border)] bg-transparent px-2 text-sm"
                value={clause.columnId}
                aria-label={`Condition ${index + 1} column`}
                onChange={(e) => updateClause(index, { columnId: e.target.value })}
              >
                {filterable.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border border-[var(--unison-border)] bg-transparent px-2 text-sm"
                value={clause.op}
                aria-label={`Condition ${index + 1} operator`}
                onChange={(e) => updateClause(index, { op: e.target.value as FilterOp })}
              >
                {OPS.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.label}
                  </option>
                ))}
              </select>
              {needsValue && (
                <Input
                  className="max-w-[180px]"
                  value={String(clause.value ?? '')}
                  aria-label={`Condition ${index + 1} value`}
                  onChange={(e) => updateClause(index, { value: e.target.value })}
                />
              )}
              <Button size="sm" variant="ghost" onClick={() => removeClause(index)}>
                Remove
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
