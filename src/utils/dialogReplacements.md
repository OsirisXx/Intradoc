# Dialog Replacement Guide

This guide shows how to replace all `alert()` and `confirm()` calls with the new custom dialog components.

## Setup

1. Import the dialog context in your component:
```typescript
import { useDialogContext } from '../ui/DialogProvider'
```

2. Use the dialog methods in your component:
```typescript
const { showSuccess, showError, showWarning, showInfo, confirmDelete, confirmAction } = useDialogContext()
```

## Replacements

### Alert() Replacements

**Before:**
```typescript
alert('Upload completed!')
alert('Error uploading document')
alert('Please provide either a file or a document URL')
```

**After:**
```typescript
showSuccess('Upload completed!')
showError('Error uploading document')
showError('Please provide either a file or a document URL')
```

### Confirm() Replacements

**Before:**
```typescript
if (!confirm('Remove this attachment?')) return
if (!confirm('Are you sure you want to delete this post?')) return
```

**After:**
```typescript
const confirmed = await confirmDelete('this attachment')
if (!confirmed) return

const confirmed = await confirmAction('Delete', 'this post', 'danger')
if (!confirmed) return
```

## Available Dialog Methods

### Alert Dialogs
- `showSuccess(message, title?)` - Green success dialog with auto-close
- `showError(message, title?)` - Red error dialog
- `showWarning(message, title?)` - Orange warning dialog
- `showInfo(message, title?)` - Blue info dialog

### Confirmation Dialogs
- `confirmDelete(itemName)` - Standard delete confirmation
- `confirmAction(action, itemName, type?)` - Custom action confirmation
- `confirm(config)` - Full control over confirmation dialog

### Full Control Example
```typescript
const confirmed = await confirm({
  title: 'Custom Action',
  message: 'Are you sure you want to perform this action?',
  type: 'warning',
  confirmText: 'Yes, do it',
  cancelText: 'No, cancel'
})
```

## Files That Need Updates

The following files contain alert() and confirm() calls that should be replaced:

### High Priority (User-facing actions)
- `ui/src/components/staff/StaffTaskDetail.tsx` ✅ (completed)
- `ui/src/components/section-unit-head/SectionUnitHeadTaskDetail.tsx`
- `ui/src/components/division-manager/DivisionManagerTaskDetail.tsx`
- `ui/src/components/staff/StaffTasks.tsx`
- `ui/src/components/section-unit-head/SectionUnitHeadTasks.tsx`
- `ui/src/components/auth/LoginPage.tsx` ✅ (partially completed)

### Medium Priority
- `ui/src/components/staff/StaffDocumentWorks.tsx`
- `ui/src/components/section-unit-head/SectionUnitHeadDocumentWorks.tsx`
- `ui/src/components/division-manager/DivisionManagerDocumentWorks.tsx`
- `ui/src/components/division-manager/DivisionManagerPosts.tsx`
- `ui/src/components/section-unit-head/SectionUnitHeadPosts.tsx`

### Lower Priority (Admin functions)
- `ui/src/components/admin/AdminAccountManagement.tsx`
- `ui/src/components/admin/AdminApprovals.tsx`
- `ui/src/components/regional-director/RegionalDirectorReview.tsx`

## Benefits

1. **Consistent Design** - All dialogs now match the application's design system
2. **Better UX** - Custom animations, better typography, and mobile responsiveness
3. **Accessibility** - Better keyboard navigation and screen reader support
4. **Customization** - Different types (success, error, warning, info) with appropriate colors and icons
5. **Promise-based** - Cleaner async/await syntax instead of blocking confirm() calls
