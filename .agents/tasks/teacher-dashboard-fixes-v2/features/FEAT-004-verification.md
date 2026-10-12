# FEAT-004 Verification Guide

## Feature: Fix Logout Buttons in All Locations

### Changes Made

1. **teacher-nav.js** (setupLogout function):
   - Added `e.preventDefault()` to direct event listeners in bindLogoutButtons
   - Fixed event delegation to properly handle all logout buttons
   - Event delegation now serves as fallback for dynamically-added buttons

2. **teacher-profile.js** (setupEvents function):
   - Added `e.preventDefault()` parameter handling to triggerLogout function
   - Ensures proper event handling for profile page logout buttons

3. **auth.js** (logout function):
   - Already properly implemented - clears Supabase session, localStorage, sessionStorage

### Root Cause

The event delegation in setupLogout had a logical approach where:
- Direct binding marks buttons with `_logoutBound` flag
- Event delegation only catches buttons without the flag (fallback)
- Both direct listeners and event delegation now properly call `e.preventDefault()`

### Verification Steps

#### 1. Sidebar Logout Button (td-logout-btn)
- Open any teacher page (e.g., teacher-dashboard.html)
- Click the "🚪 تسجيل الخروج" button in the sidebar footer
- **Expected**: Confirmation modal appears with "تسجيل الخروج" title
- Click "نعم، تسجيل خروج"
- **Expected**: Redirected to login.html, session cleared

#### 2. Header Logout Button (header-logout-btn)
- Open any teacher page
- Click the "🚪 خروج" button in the top header
- **Expected**: Confirmation modal appears
- Confirm logout
- **Expected**: Redirected to login.html, session cleared

#### 3. Profile Hero Logout Button (btn-hero-logout)
- Open teacher-profile.html
- Click the "🚪 تسجيل الخروج" button in the hero section (top)
- **Expected**: Confirmation modal appears
- Confirm logout
- **Expected**: Redirected to login.html, session cleared

#### 4. Profile Danger Zone Logout Button (btn-danger-logout)
- Open teacher-profile.html
- Scroll to the danger zone section
- Click the red "تسجيل الخروج الآن" button
- **Expected**: Confirmation modal appears
- Confirm logout
- **Expected**: Redirected to login.html, session cleared

#### 5. Session Clearing Verification
- After logout from any location
- Try to navigate directly to teacher-dashboard.html
- **Expected**: Should redirect to login.html (no valid session exists)
- Check localStorage: no 'siraj-session' or 'sb-*' keys should exist
- Check sessionStorage: should be empty

### Technical Details

**Logout Flow:**
1. User clicks logout button → `triggerLogoutConfirm()` called
2. Confirmation modal appears via `showConfirmModal()`
3. User confirms → `logoutTeacher()` called
4. `authService.logout()` clears Supabase session
5. localStorage and sessionStorage cleared
6. Success toast displayed
7. Redirect to login.html after 350ms

**Button Binding Strategy:**
- Direct binding via `querySelectorAll` (immediate + setTimeout 200ms)
- Event delegation as fallback for any unbound buttons
- Both approaches use `e.preventDefault()` to prevent default behavior

### Files Modified
- `src/scripts/teacher-nav.js`
- `src/scripts/teacher-profile.js`
- `.agents/tasks/teacher-dashboard-fixes-v2/features/FEAT-004.json`

### Commit
```
fix(teacher-dashboard): fix logout buttons in all locations (FEAT-004)
```
