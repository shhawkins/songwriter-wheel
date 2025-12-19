# Songwriter Wheel - Pre-Deployment Testing Checklist

**Date:** December 19, 2025  
**Version:** Supabase Integration Release

---

## 🔐 Authentication Tests

### Sign Up Flow
- [ ] Click Sign Up from toast notification
- [ ] Sign up with email/password - verify email is sent
- [ ] Click confirmation link in email - verify redirect works
- [ ] Sign up with Google OAuth - verify successful sign in
- [ ] Verify welcome toast appears after sign in

### Sign In Flow
- [ ] Sign in with email/password
- [ ] Sign in with Google OAuth
- [ ] Verify "Successfully signed in as {email}" toast appears and auto-dismisses

### Password Reset Flow
- [ ] Click "Forgot Password" on sign in form
- [ ] Enter email and request reset
- [ ] Check email for reset link
- [ ] Click reset link - verify password reset form appears
- [ ] Enter new password and confirm it works

### Sign Out Flow
- [ ] Open account modal (click user icon)
- [ ] Click Sign Out
- [ ] Verify user is signed out

### Account Deletion
- [ ] Open account modal
- [ ] Click "Delete Account" 
- [ ] Confirm deletion in dialog
- [ ] Verify account is deleted and user is signed out

---

## 💾 Song Saving Tests

### Song Info Modal Save (NEW FEATURE)
- [ ] **Signed In:** Open Song Info modal → edit title → click Save
  - [ ] Verify song saves to cloud
  - [ ] Verify toast "{song} has been saved to cloud!" appears
  - [ ] Verify toast **auto-dismisses after ~3 seconds**
  
- [ ] **Not Signed In:** Open Song Info modal → edit title → click Save
  - [ ] Verify toast shows "Save to cloud? | Sign In or Sign Up | No"
  - [ ] Click "Sign In" → verify auth modal opens
  - [ ] Click "Sign Up" → verify auth modal opens to sign up view
  - [ ] Click "No" → verify toast dismisses, song info is saved locally

### Save Song Button (File Menu)
- [ ] Click Save in file menu while signed in - verify cloud save
- [ ] Click Save in file menu while signed out - verify auth prompt

### Load Songs
- [ ] Verify cloud songs appear in load menu when signed in
- [ ] Click a cloud song to load it
- [ ] Verify song loads correctly with all sections/chords

### Delete Songs
- [ ] Delete a cloud song from the load menu
- [ ] Verify confirmation dialog appears
- [ ] Confirm deletion - verify song is removed

---

## 🎹 Custom Instruments Tests

### Create Instrument (Signed In)
- [ ] Open Instrument Manager
- [ ] Click "Create New Instrument"
- [ ] Name the instrument
- [ ] Upload at least one sample
- [ ] Save the instrument
- [ ] Verify instrument appears in list
- [ ] Verify instrument plays correctly

### Create Instrument (Not Signed In)
- [ ] Try to create instrument while signed out
- [ ] Verify auth toast appears prompting sign in

### Delete Instrument
- [ ] Click delete on a custom instrument
- [ ] Confirm deletion
- [ ] Verify instrument is removed from list and cloud

---

## 🎡 Core Wheel Functionality

### Chord Selection
- [ ] Single-tap chord on wheel - verify it plays and details appear
- [ ] Double-tap chord - verify it adds to timeline
- [ ] Verify chord panel shows correct notes/voicings

### Key Selection
- [ ] Click key badge to open key selector
- [ ] Select different key
- [ ] Verify wheel rotates and all chords update

### Voicing Picker
- [ ] Click chord → verify voicing picker appears
- [ ] Select different voicing - verify chord updates
- [ ] Verify voicings play correctly

---

## 📱 Mobile/Responsive Tests

### Portrait Mode
- [ ] Timeline drawer opens/closes smoothly
- [ ] Chord details drawer opens/closes smoothly
- [ ] Both drawers work together
- [ ] Header hides in immersive mode (tap wheel background)

### Landscape Mode
- [ ] Layout adjusts correctly
- [ ] Wheel is visible and interactive
- [ ] Chord details panel is visible

---

## 🎵 Playback Tests

### Basic Playback
- [ ] Click play - verify song plays through sections
- [ ] Verify correct chords highlight during playback
- [ ] Click stop - verify playback stops
- [ ] Adjust tempo - verify playback speed changes

### Instrument Selection
- [ ] Change instrument from dropdown
- [ ] Verify new instrument sounds correct
- [ ] Test volume slider
- [ ] Test mute button

---

## 📤 Export Tests

- [ ] Export as PDF - verify it downloads and opens
- [ ] Verify PDF contains correct song info and chords

---

## 🔧 Edge Cases

- [ ] Create a new song (File > New)
- [ ] Undo/Redo work correctly (Cmd+Z / Cmd+Shift+Z)
- [ ] Delete chord with Delete/Backspace key
- [ ] Drag chords to reorder on timeline

---

## ✅ Pre-Deploy Checklist

- [ ] All critical paths tested above
- [ ] No console errors in browser dev tools
- [ ] Build completes without errors
- [ ] Environment variables configured for production

---

## Notes

_Add any issues found during testing here:_

