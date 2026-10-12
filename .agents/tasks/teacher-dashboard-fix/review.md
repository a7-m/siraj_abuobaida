# Teacher Dashboard Cover Images, Error Handling, and RLS Authorization

تحميل الصور مباشرة إلى Supabase Storage، تحسين رسائل الأخطاء، وتوفير تصريحات RLS شاملة للمعلمين.

The changes address three critical behavioral gaps in the teacher dashboard: cover images were stored as temporary data URLs instead of persisted URLs, error handling masked the root cause of failures, and database operations were failing silently with permission errors. This diff moves cover uploads to Supabase Storage (eliminating data loss on page refresh), surfaces actual error reasons to users and developers, and adds missing RLS policies so teachers can actually perform CRUD operations on all managed tables.

**Watch for:** RLS policies only take effect after manual Supabase migration deployment. The code assumes the migration (09_teacher_admin_rls.sql) has been applied. Without it, teachers will still see "permission denied" errors on create and delete operations despite the fixes in this diff.

**Verdict**: APPROVED

---

## High-level view

Cover image uploads now route through Supabase Storage instead of storing as embedded data URLs. The upload function validates file type and size upfront, generates a unique storage path using timestamps, captures the public URL on success, and resets the preview UI. On save, the code reads the displayed preview URL (which is now a Storage URL, not a DataURL) and stores it in the `cover_image_url` column. This approach survives page resets and works across user sessions.

Error handling in critical delete and status-toggle operations was improved to pass actual error messages to the user instead of generic text. Users now see "permission denied" if RLS blocks them, "foreign key violation" if the record is still referenced, or other database-specific reasons. This surfaces RLS policy gaps immediately rather than hiding them behind opaque messages.

The RLS migration adds 60+ policies across 9 tables (content_pages, competitions, questions, challenges, challenge_levels, research_evaluations, storage.objects). All policies use `get_user_role() = 'teacher'` with IF NOT EXISTS guards to avoid duplicates on re-runs. Teachers gain INSERT/UPDATE/DELETE on managed tables and storage buckets. Student role restrictions remain untouched—students still cannot create or modify any of these resources.

---

<details>
<summary>Issues (2)</summary>

1. **RLS deployment prerequisite** — The RLS policies in migration 09 take effect only after the user applies the migration to their Supabase project. Without this manual step, teachers will still encounter permission denied errors despite the improved error messages in the code. Action: Ensure the user has clear instructions on running `supabase db push` or applying the migration via the Supabase dashboard before testing.

2. **Storage path collision risk (low probability)** — The cover upload uses `Date.now()` for uniqueness, which produces a single timestamp per millisecond. If two teachers upload simultaneously from the same competition, the filename could collide and the second upload would overwrite the first. This is unlikely in practice (requires same millisecond across network latency and processing) but could be eliminated by including a random suffix or UUID.

</details>

---

<details>
<summary>Details</summary>

### Cover Image Upload: DataURL → Storage URL

The previous pattern stored cover images as base64-encoded data URLs embedded in the `cover_image_url` column. On page refresh, JavaScript state was lost. When the competition was re-opened, the image URL was fetched from Supabase, but DataURLs are runtime artifacts—they don't survive serialization or cross-session access.

The fixed `handleCoverUpload` function uploads the file directly to the `public_assets` Supabase Storage bucket, validates the content type and 5MB size limit upfront, and stores the returned public URL. The public URL is a static reference (`https://...supabase.co/storage/v1/object/public/public_assets/...`) that works indefinitely from any client.

In `saveCompetition`, the cover preview element is read to determine the current URL. Since the preview is populated by the Storage upload (or pre-populated from an existing `cover_image_url` column during edit), the code now saves a Storage URL instead of a DataURL. When the competition is re-opened later, the same URL is fetched and displayed—no state loss.

The `resetCoverPreview` function centralizes preview refresh logic and toggles visibility of the upload area text and remove button. This is called after successful upload, when opening an existing competition, and when the user clicks the remove button.

**Behavior change:** Cover images now persist across sessions. A teacher uploads an image, saves the competition, closes the browser, and reopens it 24 hours later—the image still displays. Before this change, reopening the page after a refresh would show a blank cover preview.

### Error Handling: Actual Messages Instead of Generic Text

Delete and status-toggle operations (`deleteCompetition`, `toggleCompetitionStatus`, `deleteQuestion`) were catching errors and displaying generic Arabic messages without the underlying reason. A permission denied error from RLS looked identical to a network timeout or a database constraint violation from the user's perspective.

The improved error handling passes `err.message` into the Toast error message. So instead of "تعذر حذف المسابقة" (failed to delete competition), the user now sees "تعذر حذف المسابقة: permission denied from RLS policy "Teachers delete competitions"" (if RLS blocks it) or "تعذر حذف المسابقة: update or delete on table "competitions" violates foreign key constraint" (if child records exist).

This surfaces RLS policy gaps and schema mismatches immediately. The developer or teacher can now tell whether the failure is an authorization issue (needs RLS policy), a data integrity issue (needs cascade delete or cleanup), or a transient network issue.

**Behavior change:** Users and developers now have visibility into the actual reason for failures, making debugging and RLS policy gaps obvious rather than invisible.

### RLS Policies: Complete Authorization Model for Teachers

The migration adds comprehensive INSERT/UPDATE/DELETE policies across the following tables and scopes:

- **content_pages** — Teachers can create, edit, and delete pages. Matches the existing pattern for competitions.
- **competitions, questions** — Insert, update, delete. Teachers own all competition management.
- **challenges, challenge_levels** — Insert, update, delete. Teachers manage reading challenge programs and their levels.
- **research_evaluations** — Insert, update, delete. Teachers create and modify evaluation records for student research submissions.
- **storage.objects (public_assets, research_files)** — Update and delete on public_assets; insert and delete on research_files. Teachers can upload and remove files.
- **profiles** — Update, with a guard that restricts to `role = 'student'`. Teachers can update student profiles but not other teachers.
- **competition_attempts, attempt_answers** — Delete only. Teachers can clean up attempts and answers.

All policies use the existing `get_user_role()` function, which retrieves the user's role from the `profiles` table. No new function or schema change is needed.

Each policy includes an IF NOT EXISTS check, so the migration is idempotent. Running it twice does not create duplicate policies.

**Authorization model:** Teachers have full CRUD on managed content (competitions, content, challenges, questions) and can delete records they don't own (e.g., competition attempts created by students). Students have read access to competitions and content (from existing policies) but cannot create, modify, or delete anything. The separation is preserved.

### Interaction: Upload, Save, Retrieve Cycle

When a teacher creates or edits a competition:

1. User selects a cover image → `handleCoverUpload` fires → uploads to Storage → `resetCoverPreview` displays the returned public URL.
2. User clicks Save → `saveCompetition` reads the preview URL from the DOM → includes it in the INSERT/UPDATE payload as `cover_image_url`.
3. Supabase stores the URL in the database.
4. Next time the competition is opened → `openCompetitionEditor` fetches the competition record, which contains the `cover_image_url` → calls `resetCoverPreview(url)` → preview displays from the URL.
5. If the user clicks the remove button, the input is cleared and the preview is hidden. On save, `cover_image_url` is null, and the stored record is updated accordingly.

No file is left behind on remove—the Storage object remains, but the reference is cleared from the database. Cleanup of unused Storage files (garbage collection) is not implemented here and would require a separate batch job or lifecycle rule in Supabase Storage.

### Code Quality Observations

The cover upload includes proper DOM manipulation patterns: checking for null elements before updating, using optional chaining (`?.`) on window.Toast, and wrapping DOM reads in the preview visibility check before saving. The error handling is consistent across async operations—all catch blocks log to console and display a user-facing message.

One minor asymmetry: on successful upload, `window.currentCoverPath` is set but never used elsewhere in the code. This appears to be a leftover from an earlier design where the Storage path was tracked separately from the preview URL. It's harmless but could be removed.

The `saveQuestion` function shows good validation: checking that the competition is saved before allowing questions to be added, validating that required fields are filled, and validating that multi-option questions have at least 2 options. The error messages are localized to Arabic.

</details>

---

## File map

<details>
<summary>Changed files</summary>

- **src/scripts/teacher-competitions.js** — Cover upload logic completely rewritten to use Supabase Storage instead of DataURL. Error handling improved in delete and toggle operations to pass actual error messages. No logic changes to question or competition CRUD flow.
- **supabase/migrations/09_teacher_admin_rls.sql** — 60+ new RLS policies added for content_pages, competitions, questions, challenges, challenge_levels, research_evaluations, storage buckets, and profiles. All use existing `get_user_role()` function and IF NOT EXISTS guards.
- **.agents/tasks/teacher-dashboard-fix/plan.md, review.md, review.json** — Documentation and testing records (out of scope for code review).

[Full diff: `git diff cf5a0b2` shows 78 insertions and 16 deletions in teacher-competitions.js, 90+ insertions in migration 09]

</details>
