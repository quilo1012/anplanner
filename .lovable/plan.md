

# Fix: Export Template Button Not Downloading

## Problem
The "Export Template" button click handler creates a download link programmatically but doesn't append it to the DOM before clicking. In sandboxed iframes (like the Lovable preview), `a.click()` on a detached element silently fails — no download happens and no error is shown.

## Fix
In `src/components/PlanTemplateExport.tsx`, append the `<a>` element to `document.body` before calling `.click()`, then remove it afterward:

```typescript
// Current (broken in iframe):
const a = document.createElement('a');
a.href = url;
a.download = `production-plan-template.xlsx`;
a.click();

// Fixed:
const a = document.createElement('a');
a.href = url;
a.download = `production-plan-template.xlsx`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
```

## Files to Modify
| File | Change |
|------|--------|
| `src/components/PlanTemplateExport.tsx` | Append anchor to body before click, remove after |
| `src/components/PlanImport.tsx` | Check if same pattern exists for any downloads and fix similarly |

