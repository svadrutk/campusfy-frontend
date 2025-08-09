## TODO: Cache Refresh UX Improvements

- [x] Coalesce concurrent loads (dedupe overlapping refreshes)
  - Maintain a single in‑flight refresh pipeline (no parallel Supabase/IDB work).
  - Expose a shared Promise and a progress subscriber list; subsequent calls attach as listeners instead of polling.
  - Replace the "Waiting for previous operation to complete..." spin with immediate attachment to the active progress stream.
  - Keep per-batch network timeouts; allow callers to pass an AbortSignal to stop listening (does not cancel the shared refresh).

- [x] Non‑blocking refresh when cache exists
  - If `hasCachedData()` is true, render UI immediately from cache and run `getOrLoadClassData` in the background.
  - Show a non‑blocking banner/toast while refreshing; use a blocking overlay only on cold starts (no cache).

- [x] Determinate, granular progress indicator
  - Phase‑based progress with weights and frequent updates:
    - Initial check (5%)
    - Read metadata/count (10%)
    - Fetch updates in batches (40%)
    - Merge (10%)
    - Write to IndexedDB in chunks (30%)
    - Finalize/meta write (5%)
  - Emit steady progress ticks every ~200–300ms; fall back to indeterminate when totals are unknown.

- [x] Prevent UI "boredom" (visual polish)
  - ✅ Enhanced status messages with gradient typography and better visual hierarchy.
  - ✅ Animated progress bar with subtle easing and shimmer; fallback to indeterminate stripes when needed.
  - ✅ Glassmorphism design with backdrop blur, gradients, shadows, and visual feedback.
  - ✅ Phase-specific helper text that changes based on progress.
  - ✅ Explicitly exclude: minimize button and "skip for now" actions.

- [ ] Stall handling and responsiveness
  - If no progress events for ~3–5s, switch to indeterminate mode and show a small message like "Continuing in background".
  - Always keep the UI responsive; never block when cached content is available.

- [ ] Debounce re‑runs (optional)
  - Avoid starting a new refresh if one finished within the last 5–10 minutes.

- [ ] Telemetry (optional)
  - Capture durations per phase to tune batch sizes and weights.

- [ ] Implementation touchpoints
  - `src/utils/cacheUtils.ts`: shared in‑flight refresh + progress emitter, ✅ background mode, tighter timeouts.
  - `src/components/common/CacheLoadingOverlay.tsx`: ✅ non‑blocking banner/toast on warm loads, determinate progress UI with rotating messages.
  - `src/components/common/BackgroundRefreshBanner.tsx`: ✅ New non-blocking banner component for background refresh notifications.
  - `src/components/features/search/ClassSearch.tsx`: ✅ Updated to use background mode when cache exists.


