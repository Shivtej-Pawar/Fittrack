import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "./workoutHelpers";

/**
 * Export helpers for the Workouts page (Phase 9 / Feature 5).
 *
 * Both functions work entirely client-side from whatever workout array
 * is passed in (the page passes its currently *filtered* list — see
 * Workouts.jsx — so an export reflects exactly what's on screen, same as
 * clicking export on a filtered spreadsheet view would). No backend
 * endpoint involved, per this phase's explicit requirement.
 */

// One row's worth of Sets/Reps/Weight for a Strength workout: the counts
// and per-set values, in set order, comma-separated so a single workout
// stays a single row in both the CSV and the PDF table (rather than
// exploding into one row per set) without losing any per-set data.
function formatSetColumns(workout) {
  const sets = workout.set_entries ?? [];
  if (sets.length === 0) {
    return { setCount: "", reps: "", weight: "" };
  }
  return {
    setCount: String(sets.length),
    reps: sets.map((s) => s.reps).join(", "),
    weight: sets.map((s) => s.weight).join(", "),
  };
}

const EXPORT_COLUMNS = [
  "Date",
  "Category",
  "Exercise",
  "Muscle Group",
  "Variation",
  "Sets",
  "Reps",
  "Weight",
  "Notes",
];

function workoutToRow(workout) {
  const { setCount, reps, weight } = formatSetColumns(workout);
  return [
    formatDate(workout.created_at),
    workout.category,
    workout.exercise_name,
    workout.muscle_group ?? "",
    workout.variation ?? "",
    setCount,
    reps,
    weight,
    workout.notes ?? "",
  ];
}

// Wraps a single CSV field in quotes and escapes any embedded quotes,
// but only when actually necessary (contains a comma, quote, or
// newline) — keeps the common case (plain text) readable/unquoted.
function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Exported (Phase 13) so components/ShareProgressCard.jsx can reuse this
// exact download mechanism for its generated PNG instead of duplicating
// it. Behavior for existing callers below is unchanged.
export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// CSV export — plain Blob download, no library, no backend endpoint.
export function exportWorkoutsToCsv(workouts) {
  const rows = [EXPORT_COLUMNS, ...workouts.map(workoutToRow)];
  const csvContent = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
  // Leading BOM so Excel (which otherwise guesses the wrong encoding for
  // non-ASCII characters) opens this as UTF-8 correctly.
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const dateStamp = new Date().toISOString().slice(0, 10);
  triggerBlobDownload(blob, `fittrack-workouts-${dateStamp}.csv`);
}

// PDF export — jsPDF + jspdf-autotable, matching the CSV's columns so
// both exports represent the same data.
export function exportWorkoutsToPdf(workouts) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235); // blue-600, matches the app's accent color
  doc.text("FitTrack", 14, 18);

  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128); // gray-500
  doc.text("Workout History Export", 14, 25);

  const generatedOn = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`Generated: ${generatedOn}`, 14, 31);

  const totalSets = workouts.reduce(
    (sum, w) => sum + (w.set_entries?.length ?? 0),
    0
  );
  doc.text(
    `Summary: ${workouts.length} workout${workouts.length === 1 ? "" : "s"}` +
      (totalSets > 0 ? `, ${totalSets} total set${totalSets === 1 ? "" : "s"}` : ""),
    14,
    37
  );

  autoTable(doc, {
    startY: 43,
    head: [EXPORT_COLUMNS],
    body: workouts.map(workoutToRow),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      8: { cellWidth: 40 }, // Notes — give it more room than an auto-sized column would
    },
  });

  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`fittrack-workouts-${dateStamp}.pdf`);
}
