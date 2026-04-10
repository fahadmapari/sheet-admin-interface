'use client';

import { useRef, useState } from 'react';
import { Plus, RotateCcw, Trash2, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FIELD_LABELS } from '@/lib/constants';
import { useColumnGroups } from '@/lib/hooks/use-column-groups';
import type { ColumnGroup } from '@/lib/column-groups';
import { toast } from 'sonner';

function generateId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `group-${Date.now()}`;
}

export function ColumnGroupSettings() {
  const { groups: liveGroups, isDefault, isLoading, isError, mutate } = useColumnGroups();

  // Exclude the synthetic Others group from editing state — it's never saved
  const editableGroups = liveGroups.filter((g) => g.id !== 'others');

  const [draft, setDraft] = useState<ColumnGroup[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState('');
  // Ref keeps commitLabel free of stale closures when called from async blur handlers
  const labelInputRef = useRef('');

  const groups = draft ?? editableGroups;
  const isDirty = draft !== null;

  function beginEdit(group: ColumnGroup) {
    setEditingLabelId(group.id);
    setLabelInput(group.label);
    labelInputRef.current = group.label;
  }

  function commitLabel(groupId: string) {
    const value = labelInputRef.current.trim();
    if (!value) {
      setEditingLabelId(null);
      return;
    }
    setDraft((prev) =>
      (prev ?? editableGroups).map((g) =>
        g.id === groupId ? { ...g, label: value } : g
      )
    );
    setEditingLabelId(null);
  }

  function addGroup() {
    const label = 'New Group';
    const id = generateId(label) + '-' + Date.now();
    const newGroup: ColumnGroup = { id, label, fields: [] };
    setDraft((prev) => [...(prev ?? editableGroups), newGroup]);
    setTimeout(() => {
      setEditingLabelId(id);
      setLabelInput(label);
      labelInputRef.current = label;
    }, 50);
  }

  function removeGroup(groupId: string) {
    setDraft((prev) => (prev ?? editableGroups).filter((g) => g.id !== groupId));
  }

  function removeField(groupId: string, field: string) {
    setDraft((prev) =>
      (prev ?? editableGroups).map((g) =>
        g.id === groupId ? { ...g, fields: g.fields.filter((f) => f !== field) } : g
      )
    );
  }

  function moveField(field: string, fromGroupId: string, toGroupId: string) {
    setDraft((prev) => {
      const base = prev ?? editableGroups;
      return base.map((g) => {
        if (g.id === fromGroupId) return { ...g, fields: g.fields.filter((f) => f !== field) };
        if (g.id === toGroupId) return { ...g, fields: [...g.fields, field] };
        return g;
      });
    });
  }

  function discard() {
    setDraft(null);
    setEditingLabelId(null);
  }

  async function save() {
    if (!draft) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/column-groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: draft }),
      });
      if (!res.ok) throw new Error('Save failed');
      await mutate();
      setDraft(null);
      toast.success('Column groups saved');
    } catch {
      toast.error('Failed to save column groups');
    } finally {
      setIsSaving(false);
    }
  }

  async function resetToDefaults() {
    setIsSaving(true);
    try {
      const res = await fetch('/api/column-groups', { method: 'DELETE' });
      if (!res.ok) throw new Error('Reset failed');
      await mutate();
      setDraft(null);
      toast.success('Reset to defaults');
    } catch {
      toast.error('Failed to reset');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-[hsl(var(--text-secondary))]">Loading…</p>;
  }

  if (isError) {
    return <p className="text-sm text-red-500">Failed to load column groups. Please refresh.</p>;
  }

  // Compute Others fields: fields not assigned to any group in current draft
  const assignedFields = new Set(groups.flatMap((g) => g.fields));
  const othersFields = Object.keys(FIELD_LABELS).filter((f) => !assignedFields.has(f));

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {isDirty && (
            <>
              <Button size="sm" onClick={save} disabled={isSaving}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={discard} disabled={isSaving}>
                Discard
              </Button>
            </>
          )}
        </div>
        {!isDefault && !isDirty && (
          <Button
            size="sm"
            variant="outline"
            onClick={resetToDefaults}
            disabled={isSaving}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </Button>
        )}
      </div>

      {/* Group cards */}
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <div
            key={group.id}
            className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              {editingLabelId === group.id ? (
                <Input
                  autoFocus
                  value={labelInput}
                  onChange={(e) => { setLabelInput(e.target.value); labelInputRef.current = e.target.value; }}
                  onBlur={() => commitLabel(group.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitLabel(group.id);
                    if (e.key === 'Escape') setEditingLabelId(null);
                  }}
                  className="h-7 w-48 text-sm"
                />
              ) : (
                <button
                  className="text-sm font-medium hover:underline focus:outline-none"
                  onClick={() => beginEdit(group)}
                  title="Click to rename"
                >
                  {group.label}
                </button>
              )}
              <span className="text-xs text-[hsl(var(--text-tertiary))]">
                ({group.fields.length} fields)
              </span>
              <button
                className="ml-auto text-[hsl(var(--text-tertiary))] hover:text-red-500"
                onClick={() => removeGroup(group.id)}
                title="Remove group (fields move to Others)"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Field pills */}
            <div className="flex flex-wrap gap-1.5">
              {group.fields.map((field) => {
                const label = FIELD_LABELS[field as keyof typeof FIELD_LABELS] ?? field;
                const otherGroups = groups.filter((g) => g.id !== group.id);
                return (
                  <span
                    key={field}
                    className="inline-flex items-center gap-0.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-2 py-0.5 text-xs"
                  >
                    {label}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="ml-0.5 opacity-50 hover:opacity-100">
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        {otherGroups.map((g) => (
                          <DropdownMenuItem
                            key={g.id}
                            onClick={() => moveField(field, group.id, g.id)}
                          >
                            Move to: {g.label}
                          </DropdownMenuItem>
                        ))}
                        {otherGroups.length === 0 && (
                          <DropdownMenuItem disabled>No other groups</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                      className="ml-0.5 opacity-50 hover:opacity-100"
                      onClick={() => removeField(group.id, field)}
                      title="Remove from group (moves to Others)"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              {group.fields.length === 0 && (
                <span className="text-xs text-[hsl(var(--text-tertiary))]">No fields</span>
              )}
            </div>
          </div>
        ))}

        {/* Others group — read-only, shown only when non-empty */}
        {othersFields.length > 0 && (
          <div className="rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-medium text-[hsl(var(--text-secondary))]">Others</span>
              <span className="text-xs text-[hsl(var(--text-tertiary))]">
                (auto-managed — {othersFields.length} unassigned fields)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {othersFields.map((field) => {
                const label = FIELD_LABELS[field as keyof typeof FIELD_LABELS] ?? field;
                return (
                  <span
                    key={field}
                    className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-[hsl(var(--border))] px-2 py-0.5 text-xs text-[hsl(var(--text-secondary))]"
                  >
                    {label}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="ml-0.5 opacity-50 hover:opacity-100">
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        {groups.map((g) => (
                          <DropdownMenuItem
                            key={g.id}
                            onClick={() => moveField(field, 'others', g.id)}
                          >
                            Move to: {g.label}
                          </DropdownMenuItem>
                        ))}
                        {groups.length === 0 && (
                          <DropdownMenuItem disabled>No groups</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add group */}
      <div>
        <Button variant="outline" size="sm" onClick={addGroup} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Group
        </Button>
      </div>
    </div>
  );
}
