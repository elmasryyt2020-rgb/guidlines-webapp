# User Profile Modal Design Specification

## Overview
This specification details the design and implementation of a centered brutalist profile modal for the Egyptian Ministry of Health (MOH) Guidelines Assistant. The modal allows authenticated clinicians to edit their profile metadata (Full Name, Specialty/Role, Hospital/Affiliation) and sign out.

---

## User Interface & Design System

The modal aligns with the app's established Neo-brutalist theme:
- **Thick Outlines**: `border-4 border-black`
- **Zero-Blur Box Shadows**: `shadow-[8px_8px_0px_0px_#000]`
- **Physical Press Effects**: Hover and active transitions on all buttons.
- **Palette**: Bright Yellow (`#FACC15`) for headers, White (`#FFFFFF`) for background, Lime Green (`#A3E635`) for save buttons, Fuchsia/Pink (`#D946EF`) for destructive actions.
- **Typography**: Display headers in `Outfit` (sans-serif uppercase tracking-tight), form inputs/details in `Inter` (clean, highly readable).
- **Icons**: Clean, stroke-based icons from `lucide-react` (no emojis).

### Layout Structure
- **Backdrop Overlay**: Fixed full-screen container with a semi-transparent dark backdrop and subtle blur:
  ```html
  <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  ```
- **Modal Box**: Centered, responsive container (`w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col`).
- **Header**: Yellow-brutal title bar with user profile icon and close button.
- **Body**: Form fields stacked vertically:
  1. **Email Address** (read-only): Displayed in a styled disabled container.
  2. **Full Name** (text input): Bound to `user.user_metadata.full_name`.
  3. **Specialty/Role** (text input): Bound to `user.user_metadata.specialty`.
  4. **Hospital/Workplace** (text input): Bound to `user.user_metadata.hospital`.
- **Footer**: Side-by-side or stacked brutalist buttons:
  - **Cancel** (close modal without saving)
  - **Sign Out** (pink background, immediate sign-out)
  - **Save Changes** (lime background, submits change to Supabase)

---

## Technical Architecture & State Management

### 1. Component Architecture
We will create a new component `ProfileModal.tsx` under `components/auth/ProfileModal.tsx` or modify `UserMenu.tsx` to handle the modal state.
Following the "lazy senior dev" (ponytail) approach, we can define the modal state locally in `components/ui/Sidebar.tsx` or `components/auth/UserMenu.tsx`, and trigger it when the bottom profile card is clicked.
Let's convert the existing `UserMenu.tsx` into a `ProfileModal` manager, or import a simple React Modal element directly.

### 2. Supabase Integration
To save changes:
```typescript
const { data, error } = await supabase.auth.updateUser({
  data: {
    full_name: fullName,
    specialty: specialty,
    hospital: hospital,
  }
});
```

### 3. Application State Reactivity
* The client session utilizes the `useSupabaseSession()` hook which reacts to `onAuthStateChange`.
* Any updates to the user metadata via `updateUser` are propagated automatically to the active session object.
* The sidebar and user displays will update immediately without requiring page reloads.

---

## Verification Plan

### Manual Verification
1. Click the profile card/avatar in the bottom left of the sidebar.
2. Verify that the modal opens in the center of the screen with a blurred background.
3. Edit the Full Name, Specialty, and Hospital.
4. Click "Save Changes" and verify that the sidebar updates immediately.
5. Open the modal again, click "Sign Out", and verify redirect to sign-in page.
6. Verify validation: empty values fallback gracefully.
