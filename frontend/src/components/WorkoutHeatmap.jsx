import { useEffect, useMemo, useRef, useState } from "react";
import useScrollLock from "../hooks/useScrollLock";
import { buildMonthBlocks, intensityLevel } from "../utils/heatmapHelpers";

/**
 * Workout Calendar Heatmap (Phase 10 / Feature 2).
 *
 * Inspired by GitHub's contribution graph. Built entirely from workouts
 * already fetched via getWorkouts() (passed in as a prop) — no new
 * backend endpoint.
 *
 * --- Phase 16 / Feature 1 rewrite (the reason this file changed) --------
 * Before this phase, the whole component was ONE continuous 53-week grid
 * spanning the last 365 days, with month *labels* positioned along the
 * top — but a week *column* could (and regularly did) straddle a real
 * month boundary, so a handful of cells "inside" e.g. August's label
 * actually held July or September's dates. The fix is a genuine
 * restructure, not a label/spacing tweak: `utils/heatmapHelpers.js`'s
 * `buildMonthBlocks()` now builds one independent calendar block per
 * real month (via `daysInMonth()` / `new Date(year, month+1, 0)`), and
 * this component renders each block completely separately — there is no
 * longer a single shared week-column grid that a date could straddle.
 * Every other visual idea (5-level color intensity, hover tooltip,
 * weekday row labels) carries over unchanged from before.
 */

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

const LEVEL_CLASSES = [
  "bg-gray-100 dark:bg-gray-800",
  "bg-emerald-200 dark:bg-emerald-900",
  "bg-emerald-400 dark:bg-emerald-700",
  "bg-emerald-500 dark:bg-emerald-500",
  "bg-emerald-600 dark:bg-emerald-400",
];

// Phase 16 polish — "slightly increase desktop width so day squares are
// less compressed." Bumped from the old 11px to 13px per square (and the
// gap grows to match), which is purely a rendering constant — none of
// the date/count logic above cares about pixel sizes at all.
const CELL_SIZE = 13; // px
const CELL_GAP = 3; // px

function MonthBlock({ block, onDayClick, onDayHover, onDayLeave }) {
  const isEmpty = block.totalWorkouts === 0;

  return (
    <div
      // Phase 16 / Feature 6 — "empty month refinement." A month with
      // zero workouts is dimmed as a whole block (not hidden, not given
      // its own extra card/text — per spec, "no additional cards or
      // text should clutter the UI") and gets an explanatory `title`
      // tooltip on hover, rather than looking like a rendering mistake.
      className={`flex-shrink-0 transition-opacity duration-200 ${
        isEmpty ? "opacity-40 hover:opacity-70" : "opacity-100"
      }`}
      title={isEmpty ? "No workouts this month" : undefined}
    >
      <p className="mb-1.5 text-center text-xs font-medium tracking-wide text-gray-500">
        {block.label}
      </p>
      <div
        className="flex"
        style={{ gap: `${CELL_GAP}px` }}
      >
        {block.weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col" style={{ gap: `${CELL_GAP}px` }}>
            {week.map((cell, dayIndex) =>
              cell === null ? (
                // Alignment spacer only — no date, never a real
                // neighboring-month day, never clickable/hoverable.
                <div
                  key={dayIndex}
                  aria-hidden="true"
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                />
              ) : (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => cell.count > 0 && onDayClick(cell)}
                  onMouseEnter={(event) => onDayHover(cell, event)}
                  onMouseLeave={onDayLeave}
                  disabled={cell.count === 0}
                  aria-label={`${cell.date.toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}: ${cell.count} workout${cell.count === 1 ? "" : "s"}`}
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                  className={`rounded-sm transition-transform duration-100 ${
                    LEVEL_CLASSES[intensityLevel(cell.count)]
                  } ${cell.count > 0 ? "cursor-pointer hover:scale-125" : "cursor-default"}`}
                />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Phase 16 / Feature 3 — click/tap popover with that day's actual
// workouts (names, categories, sets), not just the hover tooltip's
// count. A real modal-like overlay (not just an absolutely-positioned
// tooltip) so it works identically for touch (tap) and mouse (click),
// and so it can be properly keyboard/escape/outside-click dismissible.
function DayPopover({ day, onClose }) {
  const panelRef = useRef(null);
  useScrollLock(true);

  // Escape-to-close — same document-level listener pattern already used
  // by Modal.jsx and WorkoutDrawer.jsx, reused here rather than a
  // third, slightly-different implementation.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Workouts on ${day.date.toLocaleDateString()}`}
        onClick={(event) => event.stopPropagation()}
        className="modal-panel w-full max-w-xs rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-2xl shadow-black/10 dark:shadow-black/40"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-gray-900 dark:text-white">
              {day.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </p>
            <p className="text-xs text-gray-500">
              {day.count} workout{day.count === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <ul className="mt-3 space-y-2">
          {day.workouts.map((workout) => (
            <li
              key={workout.id}
              className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 px-3 py-2"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {workout.exercise_name}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {workout.category}
                {workout.set_entries?.length > 0 &&
                  ` · ${workout.set_entries.length} set${
                    workout.set_entries.length === 1 ? "" : "s"
                  }`}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function WorkoutHeatmap({ workouts }) {
  const containerRef = useRef(null);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  // Phase 16 / Feature 3 — which day's popover (if any) is open. Kept
  // separate from `hoveredDay` since hover (desktop) and click/tap
  // (both desktop and mobile) are different interactions that can
  // coexist.
  const [selectedDay, setSelectedDay] = useState(null);

  function handleDayHover(day, event) {
    if (day.count === 0) return;
    setHoveredDay(day);
    const cellRect = event.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setTooltipPos({
      left: cellRect.left - containerRect.left + cellRect.width / 2,
      top: cellRect.top - containerRect.top,
    });
  }

  const monthBlocks = useMemo(() => buildMonthBlocks(workouts, 12), [workouts]);

  const totalActiveDays = useMemo(() => {
    const days = new Set();
    for (const block of monthBlocks) {
      for (const week of block.weeks) {
        for (const cell of week) {
          if (cell && cell.count > 0) days.add(cell.key);
        }
      }
    }
    return days.size;
  }, [monthBlocks]);

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-lg shadow-black/5 dark:shadow-black/10 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Workout Consistency
        </h3>
        <span className="text-xs text-gray-500">
          {totalActiveDays} active day{totalActiveDays === 1 ? "" : "s"} in the
          last year
        </span>
      </div>

      {/* Weekday labels + horizontally-scrollable strip of independent
          month calendars (Phase 16 / Feature 1) — replaces the old
          single continuous 53-week grid. `overflow-x-auto` lets it
          scroll on narrow screens (per this phase's polish notes) while
          each month block's own internal alignment never depends on
          anything outside itself. */}
      <div className="mt-4 flex gap-2">
        <div className="mt-6 flex flex-shrink-0 flex-col" style={{ gap: `${CELL_GAP}px` }}>
          {WEEKDAY_LABELS.map((label, i) => (
            <span
              key={i}
              style={{ height: CELL_SIZE }}
              className="flex items-center text-[9px] leading-none text-gray-400"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex gap-5">
            {monthBlocks.map((block) => (
              <MonthBlock
                key={`${block.year}-${block.monthIndex}`}
                block={block}
                onDayClick={setSelectedDay}
                onDayHover={handleDayHover}
                onDayLeave={() => setHoveredDay(null)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating hover tooltip — unchanged behavior from Phase 15,
          just now fed by per-month cell data instead of the old
          continuous grid. */}
      {hoveredDay && tooltipPos && (
        <div
          className="tooltip-fade-in pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs shadow-lg shadow-black/10 dark:shadow-black/40"
          style={{ left: tooltipPos.left, top: tooltipPos.top }}
        >
          <p className="font-semibold text-gray-900 dark:text-white">
            {hoveredDay.date.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className="mt-0.5 text-gray-500">
            {hoveredDay.count} workout{hoveredDay.count === 1 ? "" : "s"} — tap to view
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
        <span>Less</span>
        {LEVEL_CLASSES.map((cls, i) => (
          <span key={i} className={`h-[13px] w-[13px] rounded-sm ${cls}`} />
        ))}
        <span>More</span>
      </div>

      {selectedDay && <DayPopover day={selectedDay} onClose={() => setSelectedDay(null)} />}
    </div>
  );
}
