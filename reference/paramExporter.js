/**
 * paramExporter.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates a valid ArduPilot .param file string from a configured build.
 *
 * Output format:
 *   # comment lines
 *   PARAM_NAME,value
 *
 * Mission Planner, QGroundControl, and ArduPilot's param load CLI all
 * accept this format.
 */

import { buildParamList, getRebootRequired } from './paramMappings.js';

const VERSION = '0.1';

/**
 * Format a param value for .param file output.
 * Integers stay as integers; floats are trimmed to 6 significant figures.
 */
function formatValue(value) {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value !== 'number') return value;
  if (Number.isInteger(value))   return value.toString();
  return parseFloat(value.toPrecision(6)).toString();
}

/**
 * Pad param name to a fixed width for readability.
 */
function padParam(name, width = 28) {
  return name.padEnd(width, ' ');
}

/**
 * Generate the .param file content string.
 *
 * @param {object[]} components   - All configured component instances from Zustand store
 * @param {string}   vehicleType  - 'copter' | 'plane' | 'vtol'
 * @param {string}   vehicleLabel - Human label for the header comment
 * @param {object}   frameInfo    - { label, frameClass, frameType } from selected frame
 * @returns {{ content: string, rebootRequired: object[], conflicts: object[] }}
 */
export function generateParamFile(components, vehicleType, vehicleLabel, frameInfo) {
  const { grouped, flat } = buildParamList(components, vehicleType);
  const rebootRequired    = getRebootRequired(flat);
  const conflicts         = flat.filter(p => p._conflict);

  const now     = new Date().toISOString().split('T')[0];
  const fwLabel = vehicleType === 'copter' ? 'ArduCopter'
                : vehicleType === 'plane'  ? 'ArduPlane'
                : 'ArduPlane (QuadPlane / VTOL)';

  const lines = [];

  // ── File header ──────────────────────────────────────────────────────────
  lines.push(`# ═══════════════════════════════════════════════════════════════`);
  lines.push(`# ArduPilot Visual Configurator — Parameter Export`);
  lines.push(`# ───────────────────────────────────────────────────────────────`);
  lines.push(`# Generated : ${now}`);
  lines.push(`# AVC       : v${VERSION}`);
  lines.push(`# Firmware  : ${fwLabel}`);
  lines.push(`# Vehicle   : ${vehicleLabel}`);
  if (frameInfo) {
    lines.push(`# Frame     : ${frameInfo.label} (CLASS=${frameInfo.frameClass}, TYPE=${frameInfo.frameType})`);
  }
  lines.push(`# Hardware  : CubePilot Cube Orange / Cube Orange+`);
  lines.push(`# `);
  lines.push(`# IMPORTANT: Review all values before arming.`);
  lines.push(`# Load via: Mission Planner → Config → Full Parameter List → Load`);
  if (rebootRequired.length > 0) {
    lines.push(`# `);
    lines.push(`# ⚠ REBOOT REQUIRED after writing these parameters:`);
    rebootRequired.forEach(r => {
      lines.push(`#   ${r.param}`);
    });
  }
  lines.push(`# ═══════════════════════════════════════════════════════════════`);
  lines.push('');

  // ── Parameter groups ────────────────────────────────────────────────────
  for (const [groupName, entries] of Object.entries(grouped)) {
    if (!entries || entries.length === 0) continue;

    lines.push(`# ── ${groupName} ${'─'.repeat(Math.max(0, 55 - groupName.length))}`);

    for (const entry of entries) {
      const commentCol = entry.comment ? `  # ${entry.comment}` : '';
      const conflictWarning = entry._conflict
        ? `  # ⚠ CONFLICT: another component set this to a different value`
        : '';
      lines.push(`${padParam(entry.param)}${formatValue(entry.value)}${commentCol}${conflictWarning}`);
    }

    lines.push('');
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  lines.push(`# End of AVC export — ${flat.length} parameters`);

  return {
    content: lines.join('\n'),
    rebootRequired,
    conflicts,
    paramCount: flat.length,
  };
}

/**
 * Trigger a browser file download of the .param file.
 *
 * @param {string} content  - File content string from generateParamFile
 * @param {string} filename - Desired filename (default: 'avc_export.param')
 */
export function downloadParamFile(content, filename = 'avc_export.param') {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
