# Implementation Plan: Teacher Dashboard Fixes

## Task Overview
Fix non-working buttons and missing toast notifications across all teacher dashboard pages in the السراج platform.

## Issues to Fix (from user report)

1. **صفحة إدارة الصفحات (teacher-content.js)**: زر الحذف لا يعمل
2. **صفحة إدارة التحديات (teacher-challenges.js)**: الإشعارات لا تظهر في أعلى الصفحة، زر الحذف لا يعمل، لا توجد إشعارات عند حفظ البيانات
3. **صفحة إدارة بنك الأسئلة (teacher-questions.js)**: زر الحذف لا يعمل
4. **صفحة إدارة البحث العلمي والتحكيم (teacher-research.js)**: زر الحذف وزر التحكيم لا يعملان
5. **صفحة سجل المشاركين والنتائج (teacher-participants.js)**: زر العرض وزر الحذف وزر تفاصيل المشاركة لا يعملون
6. **صفحة إدارة الطلاب والمستخدمين (teacher-users.js)**: زر تعديل وزر السجل لا يعملان، لا يوجد زر حذف (يجب إضافته)
7. **صفحة الملفات والوسائط (teacher-media.js)**: زر الحذف وزر رفع ملف جديد لا يعملان
8. **تسجيل الخروج**: زر تسجيل الخروج لا يعمل في شريط التنقل، صفحة الملف الشخصي، وheader td-header

## Root Cause Analysis (from exploration)

All affected files follow the same event binding pattern:
1. Data is loaded from Supabase
2. Table/grid is rendered with buttons
3. Event listeners are bound via `querySelectorAll` after rendering

The pattern is correct, but potential issues:
- Buttons may not exist in HTML (empty data)
- Event listeners not re-bound after table updates
- Selectors don't match button classes in render output
- tbody/container elements missing or null

## Implementation Plan

### FEAT-001: Fix Delete Buttons Across All Pages
**Files**: teacher-content.js, teacher-questions.js, teacher-research.js, teacher-participants.js, teacher-users.js, teacher-media.js, teacher-challenges.js

**Steps**:
1. For each file, verify button selector matches renderTable/renderGrid output:
   - teacher-content.js: `.btn-delete-page` (line ~115 renders, ~181 binds)
   - teacher-questions.js: `.btn-delete-q` (line ~145 renders, ~158 binds)
   - teacher-research.js: `.btn-delete-res` (line ~140 renders, ~175 binds)
   - teacher-participants.js: `.btn-delete-item` (line ~310 renders, bindActionButtons)
   - teacher-users.js: `.btn-delete-usr` (line ~120 renders, ~158 binds) — **ALSO ADD delete button to renderTable output**
   - teacher-media.js: `.btn-del-file` (line ~180 renders, ~210 binds)
   - teacher-challenges.js: `.btn-delete-chal`, `.btn-delete-level`, `.btn-delete-lq`

2. For teacher-users.js, ADD a delete button to the actions column in renderTable (currently missing):
   ```javascript
   <button class="btn btn-outline-danger btn-sm btn-delete-usr" data-id="${u.id}" data-name="${escapeHtml(u.full_name || 'المستخدم')}" title="حذف الحساب">🗑️</button>
   ```

3. For each file, ensure event binding happens AFTER rendering and tbody/container is not null
4. Add console.log in event handlers for debugging if needed
5. Ensure all delete operations:
   - Show confirmation modal via `showConfirmModal`
   - Call Toast.success on success
   - Call Toast.error on error

**Verification**:
- Open each teacher-*.html page
- Click delete button on any item
- Verify confirmation modal appears
- Confirm deletion
- Verify toast success message
- Verify table refreshes

---

### FEAT-002: Fix View/Edit/Upload/Judging Buttons
**Files**: teacher-participants.js, teacher-users.js, teacher-media.js, teacher-research.js

**Steps**:
1. Fix teacher-participants.js `.btn-view-item`:
   - Verify buttons rendered in renderTable (line ~280) and renderCards (line ~340)
   - Verify bindActionButtons called after renderData
   - Verify openDetailModal opens modal with ID 'part-detail-modal'

2. Fix teacher-users.js `.btn-edit-usr` and `.btn-view-act`:
   - Verify buttons rendered in renderTable (line ~120)
   - Event listeners bound at lines ~158-170
   - openEditModal opens 'edit-user-modal'
   - openActivityModal opens 'user-activity-modal' and loads data

3. Fix teacher-media.js `btn-upload-media`:
   - Verify button in HTML
   - setupEvents binds it to open 'media-upload-modal'
   - File input triggers on click

4. Fix teacher-research.js `.btn-eval-res`:
   - Verify buttons rendered in renderTable (line ~140)
   - Bound at lines ~175-180
   - openEvalModal opens 'eval-modal' with rubric form

**Verification**:
- teacher-participants.html: click 'عرض' → detail modal opens
- teacher-users.html: click 'تعديل' → edit modal opens
- teacher-users.html: click 'السجل' → activity modal opens and loads data
- teacher-media.html: click 'رفع ملف جديد' → upload modal opens
- teacher-research.html: click 'تحكيم البحث' → evaluation modal opens

---

### FEAT-003: Ensure Toast Notifications Appear at Top
**Files**: src/utils/toast.js, all teacher-*.js files

**Steps**:
1. Read src/utils/toast.js and verify ToastManager creates `.toast-container` appended to document.body

2. Check if CSS for `.toast-container` exists in project. Search all .css files.

3. If CSS missing, add styles (inline or CSS file):
   ```css
   .toast-container {
     position: fixed;
     top: 1rem;
     right: 1rem; /* or left: 50%; transform: translateX(-50%); for center */
     z-index: 9999;
     display: flex;
     flex-direction: column;
     gap: 0.5rem;
   }
   ```

4. Audit all save operations and ensure they call Toast.success/Toast.error:
   - teacher-content.js: savePage (line ~235) ✓
   - teacher-questions.js: saveQuestion (line ~360) ✓
   - teacher-research.js: saveEvaluation (line ~185) ✓
   - teacher-users.js: saveUserProfile (line ~150) ✓
   - teacher-profile.js: saveProfileDetails (line ~85) ✓
   - teacher-challenges.js: saveChallenge (line ~260), saveLevel (line ~385), saveLevelQuestion (line ~680) ✓

5. If any save function missing toast calls, add them

**Verification**:
- Open each teacher-*.html page
- Perform save operations
- Verify toast appears at top of viewport
- Verify toast is visible for 4 seconds then fades
- Trigger multiple toasts → verify they stack vertically

---

### FEAT-004: Fix Logout Buttons in All Locations
**Files**: teacher-nav.js, teacher-profile.js, auth.js

**Steps**:
1. Read teacher-nav.js setupLogout function (lines 240-290):
   - Uses querySelectorAll to bind all logout buttons
   - Also uses event delegation on document as fallback
   - Calls bindLogoutButtons immediately and with setTimeout(200)

2. Verify sidebar button 'td-logout-btn' is rendered in renderSidebar (line ~140)
   - setupLogout is called AFTER renderSidebar in initTeacherAdmin

3. Verify header logout button 'header-logout-btn' is injected in setupHeaderControls (line ~200)

4. Read teacher-profile.js setupEvents (lines ~55-75):
   - Binds 'btn-hero-logout' and 'btn-danger-logout' to triggerLogout
   - triggerLogout calls logoutTeacher from teacher-nav.js

5. Read auth.js logout function (lines ~80-105):
   - Calls supabase.auth.signOut()
   - Clears localStorage keys starting with 'sb-'
   - Clears sessionStorage
   - Removes 'siraj-session'

6. If logout buttons still don't work:
   - Add explicit event.stopPropagation check
   - Verify buttons aren't nested in elements that stop propagation
   - Add console.log to confirm event listeners attached

**Verification**:
- Open teacher-dashboard.html, click sidebar logout → confirmation modal → confirm → redirect to login.html
- Open teacher-dashboard.html, click header logout → confirmation modal → confirm → redirect to login.html
- Open teacher-profile.html, click hero logout → confirmation modal → confirm → redirect to login.html
- Open teacher-profile.html, click danger zone logout → confirmation modal → confirm → redirect to login.html
- After logout, navigate to teacher-dashboard.html → should redirect to login.html (no valid session)

---

## Cross-FEAT Integration Verification

After all FEATs are complete:
1. Open EVERY teacher-*.html page in browser
2. Test ALL buttons:
   - Delete buttons on all pages
   - View/edit/upload/judging buttons
   - Logout buttons from all locations
3. Verify toast notifications appear at top on save/delete operations
4. Verify confirmation modals appear for all destructive operations
5. Verify error handling (disconnect network and trigger save → error toast)

## Commit Strategy

- FEAT-001: `fix(teacher-dashboard): fix delete buttons across all pages (FEAT-001)`
- FEAT-002: `fix(teacher-dashboard): fix view/edit/upload/judging buttons (FEAT-002)`
- FEAT-003: `fix(teacher-dashboard): ensure toast notifications appear at top (FEAT-003)`
- FEAT-004: `fix(teacher-dashboard): fix logout buttons in all locations (FEAT-004)`
- Integration fixes: `fix(teacher-dashboard): address integration review findings`

## Files Modified (expected)

- c:/Users/win 11/Desktop/siraj_abuobaida/src/scripts/teacher-content.js
- c:/Users/win 11/Desktop/siraj_abuobaida/src/scripts/teacher-challenges.js
- c:/Users/win 11/Desktop/siraj_abuobaida/src/scripts/teacher-questions.js
- c:/Users/win 11/Desktop/siraj_abuobaida/src/scripts/teacher-research.js
- c:/Users/win 11/Desktop/siraj_abuobaida/src/scripts/teacher-participants.js
- c:/Users/win 11/Desktop/siraj_abuobaida/src/scripts/teacher-users.js
- c:/Users/win 11/Desktop/siraj_abuobaida/src/scripts/teacher-media.js
- c:/Users/win 11/Desktop/siraj_abuobaida/src/scripts/teacher-nav.js
- c:/Users/win 11/Desktop/siraj_abuobaida/src/scripts/teacher-profile.js
- c:/Users/win 11/Desktop/siraj_abuobaida/src/utils/toast.js (possibly add inline styles)
- CSS file(s) if .toast-container styles need to be added

## Notes

- All paths must be absolute starting with c:/Users/win 11/Desktop/siraj_abuobaida/
- DO NOT push commits—user will push when ready
- Maintain Arabic comments and UI messages
- Follow existing code style (ES6 modules, async/await, showConfirmModal pattern)
- Event listeners must be bound AFTER DOM elements exist
