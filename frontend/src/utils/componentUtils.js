// Shared component utilities — used by Inspector, Palette, and any future consumers.

// ── Field visibility ──────────────────────────────────────────────────────────
// dependsOn: {field, value} — per-field sibling check
//   value: '!9' = not-equal, [1,3] = in-array, true/false = truthy, number/string = strict eq
// showIf: {key, values} — show only when fields[key] is in values[]
//   if fields[key] is unset, field is shown (conservative default)
export function fieldVisible(field, fields) {
  const dep = field.dependsOn
  if (!dep) return true
  if (dep.allOf) return dep.allOf.every(d => fieldVisible({ dependsOn: d }, fields))
  const actual = fields[dep.field]
  const depVal = dep.value
  let visible
  if (typeof depVal === 'string' && depVal.startsWith('!'))
    visible = String(actual) !== depVal.slice(1)
  else if (Array.isArray(depVal))
    visible = depVal.some(v => String(v) === String(actual))
  else if (typeof depVal === 'boolean')
    visible = depVal ? !!actual : !actual
  else
    visible = String(actual) === String(depVal)
  if (!visible) return false

  const si = field.showIf
  if (si) {
    const cur = fields[si.key]
    if (cur == null || cur === '') return true
    return si.values.some(v => String(v) === String(cur))
  }

  return true
}

// ── Completion check ──────────────────────────────────────────────────────────
// Returns true when every visible required field has a non-empty value.
// A field counts as configured if component.fields[key] is set, OR if the
// field schema has a default (the user can accept it without touching it).
export function computeComplete(component, def) {
  if (!def?.inspector) return false
  for (const group of def.inspector) {
    for (const field of group.fields) {
      if (!field.required) continue
      if (!fieldVisible(field, component.fields ?? {})) continue

      if (field.type === 'pinSelect') {
        if (!component.outputPin) return false
      } else {
        const v = (component.fields ?? {})[field.key] ?? field.default
        if (v === undefined || v === null || v === '') return false
      }
    }
  }
  return true
}
