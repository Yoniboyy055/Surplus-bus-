# Cursor AI Commands - Fix All Surplus Bus Issues

Execute these commands in order. Each command is self-contained and can be run independently in Cursor AI.

---

## 🔴 PHASE 1: CRITICAL FIXES (Do These First)

### Command 1: Fix Authentication (Profile SELECT Policy)

```
URGENT: Fix the authentication bug that's causing "profile_lookup_failed" error.

ISSUE: Users cannot read their own profile from the database because RLS policies are missing SELECT permissions.

TASK: Create and apply SQL migration to add SELECT policies for the profiles table.

STEPS:
1. Create file: supabase/sql/012_fix_profile_select_policy.sql
2. Add this SQL:

DROP POLICY IF EXISTS self_select_profile ON public.profiles;
CREATE POLICY self_select_profile ON public.profiles 
FOR SELECT TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS operator_select_all_profiles ON public.profiles;
CREATE POLICY operator_select_all_profiles ON public.profiles 
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'operator'
  )
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

3. Apply this migration to the Supabase database at: https://supabase.com/dashboard/project/nycsuizssbpaqyhxxxup/sql/new
4. Test authentication flow by clicking a magic link

VERIFICATION:
- Magic link should redirect to correct portal based on role
- No more "profile_lookup_failed" error
- Users can see their dashboard

DO NOT PROCEED TO OTHER COMMANDS UNTIL THIS IS FIXED AND VERIFIED.
```

---

### Command 2: Create App Shell with Top Bar

```
Create a global app shell component with top bar for all authenticated pages.

REQUIREMENTS (from wireframe):
- Logo (Surplus Bus)
- Environment badge (PRODUCTION/STAGING)
- User email display
- Role badge with color coding (Operator/Buyer/Referrer)
- Logout button

TASKS:
1. Create app/components/AppShell.tsx with:
   - Top bar component
   - User info display (email from auth)
   - Role badge (fetch from profiles table)
   - Logout button (calls supabase.auth.signOut())
   - Environment badge (read from process.env.NODE_ENV)

2. Update app/layout.tsx to:
   - Check if user is authenticated
   - If authenticated, wrap children with AppShell
   - If not authenticated, show simple header

3. Style with Quantum Ledger theme:
   - Deep navy background (#0A0E27)
   - Cyan accents (#00D9FF)
   - Role badges: Operator (red), Buyer (green), Referrer (amber)

4. Remove old header from app/layout.tsx

VERIFICATION:
- Top bar appears on all authenticated pages
- Shows user email and role
- Logout button works
- Environment badge shows PRODUCTION or DEVELOPMENT
```

---

### Command 3: Create Operator Payouts Page

```
Create the missing /operator/payouts page for payout management.

REQUIREMENTS (from wireframe):
- Table with columns: Deal ID, Referrer, Amount, Status (Pending/Paid)
- "Mark as Paid" button (irreversible action)
- Confirmation modal with internal note requirement
- Only operators can access

TASKS:
1. Create app/operator/payouts/page.tsx with:
   - Fetch payouts from database (join with referrers and deals)
   - Display table with all columns
   - Filter by status (show pending first)
   - "Mark as Paid" button for pending payouts

2. Create app/components/ConfirmModal.tsx:
   - Reusable modal component
   - Props: title, message, onConfirm, onCancel
   - Input field for internal notes (required)
   - Warning for irreversible actions

3. Update app/api/payouts/route.ts:
   - Add PATCH endpoint to mark payout as paid
   - Require internal note
   - Verify user is operator
   - Create audit log entry
   - Return success/error

4. Add navigation link in sidebar (when created)

VERIFICATION:
- /operator/payouts page loads for operators
- Shows all payouts with correct data
- "Mark as Paid" requires confirmation and internal note
- Non-operators cannot access (redirect to /dashboard)
- Audit log is created when payout is marked as paid
```

---

## 🟡 PHASE 2: HIGH PRIORITY FIXES

### Command 4: Add Left Sidebar Navigation

```
Add role-specific left sidebar navigation to all authenticated pages.

REQUIREMENTS (from wireframe):
- Minimal icons + labels
- Role-specific menu items
- No dead links
- Only show actions that exist

TASKS:
1. Create app/components/Sidebar.tsx with:
   - Vertical sidebar on left side
   - Role-based menu items:
     * Operator: Dashboard, Payouts, Audit Logs
     * Buyer: Dashboard, Submit Criteria, Active Deals
     * Referrer: Dashboard, Generate Links, My Referrals
   - Active state highlighting
   - Icons for each menu item (use lucide-react or heroicons)

2. Update app/components/AppShell.tsx:
   - Add Sidebar component
   - Layout: Top bar + Sidebar + Main content area
   - Make responsive (collapse on mobile)

3. Style with Quantum Ledger theme:
   - Dark background (#0F1629)
   - Cyan hover states (#00D9FF)
   - Active item highlighted

VERIFICATION:
- Sidebar appears on all authenticated pages
- Shows correct menu items based on role
- Active page is highlighted
- Links work correctly
- Responsive on mobile
```

---

### Command 5: Show All Active Deals in Buyer Portal

```
Update buyer portal to show list of ALL active deals, not just the most recent one.

CURRENT ISSUE: Only shows single most recent deal

TASKS:
1. Update app/buyer/page.tsx:
   - Change query to fetch ALL active deals (not just limit 1)
   - Create deals list component
   - Show each deal in a card with:
     * Deal ID (masked)
     * Status
     * Criteria summary
     * Created date
     * Action button (if applicable)

2. Create app/components/DealCard.tsx:
   - Reusable deal card component
   - Props: deal data, onAction callback
   - Show status badge
   - Show exclusive window timer (if active)
   - "Commit to Bid" button (if status allows)

3. Update layout:
   - Left column: Criteria form OR deals list
   - Right column: Portal info

VERIFICATION:
- Buyer sees all their active deals
- Can interact with each deal independently
- Exclusive window timers show correctly
- Can commit to bid on any deal with active window
```

---

### Command 6: Create Deal Detail Drawer

```
Create a slide-in drawer component for viewing deal details in operator portal.

REQUIREMENTS (from wireframe):
- Deal Summary
- Buyer Info (limited, no PII leak)
- Referrer (masked)
- Status Controls (GUARDED)
- Audit Timeline
- Internal Notes

TASKS:
1. Create app/components/DealDetailDrawer.tsx:
   - Slide-in from right side
   - Close button (X)
   - Sections:
     * Deal Summary (ID, status, dates, criteria)
     * Buyer Info (track, reputation, no email/name)
     * Referrer (masked ID, tier)
     * Status Controls (dropdown + confirm button)
     * Audit Timeline (fetch from audit_logs table)
     * Internal Notes (text area + save button)

2. Update app/operator/page.tsx:
   - Add state for selected deal
   - Click deal card → open drawer with deal ID
   - Pass deal data to drawer
   - Refresh data when drawer closes

3. Create app/components/AuditTimeline.tsx:
   - Fetch audit logs for deal
   - Display as vertical timeline
   - Show: timestamp, actor, action, from/to status, notes

4. Style with Quantum Ledger theme:
   - Drawer slides in with animation
   - Dark background with border
   - Sections clearly separated

VERIFICATION:
- Click deal card → drawer opens
- Shows all deal information
- Audit timeline displays correctly
- Status changes work from drawer
- Drawer closes properly
```

---

## 🟢 PHASE 3: MEDIUM PRIORITY FIXES

### Command 7: Implement Kanban Board for Operator Portal

```
Replace list view with Kanban board layout in operator portal.

REQUIREMENTS (from wireframe):
- Columns: NEW_SUBMISSION, NEEDS_CLARIFICATION, QUALIFIED, MATCHING, BUYER_COMMITTED, WON_PENDING_CLOSE
- Drag and drop (optional, can use click to change status)
- Deal cards show: Masked ID, Buyer Track, Property Type, Price Range, Age

TASKS:
1. Create app/components/KanbanBoard.tsx:
   - Horizontal scrollable columns
   - Each column represents a status
   - Deal cards in each column
   - Count badge on column header
   - Highlight "Action Required" columns (NEW_SUBMISSION, NEEDS_CLARIFICATION, BUYER_COMMITTED)

2. Create app/components/KanbanDealCard.tsx:
   - Compact card design
   - Show: Masked ID, Buyer Track badge, Property Type, Max Price, Age
   - Click to open detail drawer
   - Color coding by track (A=green, B=yellow)

3. Update app/operator/page.tsx:
   - Fetch all deals (not just action required)
   - Group by status
   - Pass to KanbanBoard component
   - Remove old list view

4. Extract property_type and max_price from criteria JSON:
   - Parse criteria object
   - Display prominently on card
   - Handle missing fields gracefully

VERIFICATION:
- Kanban board displays with all columns
- Deals appear in correct columns
- Can click card to open detail drawer
- Shows buyer track, property type, price
- Action required columns are highlighted
```

---

### Command 8: Replace window.alert/confirm with Modal Components

```
Replace all window.alert() and window.confirm() calls with premium modal components.

CURRENT ISSUE: Using browser alerts (not premium UX)

TASKS:
1. Create app/components/Modal.tsx:
   - Base modal component
   - Props: isOpen, onClose, title, children
   - Backdrop with blur
   - Close on ESC key
   - Prevent body scroll when open

2. Create app/components/ConfirmDialog.tsx:
   - Extends Modal
   - Props: title, message, confirmText, cancelText, onConfirm, onCancel
   - Two buttons: Confirm (primary) and Cancel (secondary)
   - Optional input field for notes

3. Create app/components/AlertDialog.tsx:
   - Extends Modal
   - Props: title, message, type (success/error/warning/info)
   - Single "OK" button
   - Icon based on type

4. Update all portal pages:
   - Replace window.confirm() with ConfirmDialog
   - Replace window.alert() with AlertDialog
   - Add state management for modal visibility

5. Style with Quantum Ledger theme:
   - Dark modal background
   - Cyan primary buttons
   - Red destructive buttons
   - Smooth animations

VERIFICATION:
- No more browser alerts/confirms
- All confirmations use custom modals
- Modals look premium and match theme
- ESC key closes modals
- Backdrop click closes modals
```

---

### Command 9: Create Audit Timeline View

```
Create a dedicated audit timeline view for operators to see all deal history.

TASKS:
1. Create app/components/AuditTimeline.tsx (if not already created in Command 6):
   - Fetch audit_logs for a deal
   - Display as vertical timeline with:
     * Timestamp
     * Actor (operator name or "System")
     * Action description
     * Status transition (from → to)
     * Internal notes
     * Metadata (if any)

2. Add to DealDetailDrawer:
   - "Audit History" section
   - Show full timeline
   - Expandable/collapsible

3. Create app/operator/audit/page.tsx (optional):
   - Full page audit log viewer
   - Filter by deal, date range, actor
   - Search functionality
   - Export to CSV

4. Style with Quantum Ledger theme:
   - Timeline line on left
   - Dots for each event
   - Color coding by action type
   - Expandable notes

VERIFICATION:
- Timeline shows all audit events
- Events are in chronological order
- Shows who did what and when
- Internal notes are visible
- Operators can track deal history
```

---

## 🔵 PHASE 4: POLISH & REFINEMENTS

### Command 10: Create 401/403 Error Pages

```
Create custom error pages for authentication and authorization failures.

TASKS:
1. Create app/401/page.tsx:
   - Title: "Authentication Required"
   - Message: "You need to sign in to access this page."
   - "Return to Login" button → /auth
   - Branded design matching Quantum Ledger theme

2. Create app/403/page.tsx:
   - Title: "Access Denied"
   - Message: "You don't have permission to access this resource."
   - "Return to Dashboard" button → /dashboard
   - Branded design matching Quantum Ledger theme

3. Update middleware.ts:
   - Redirect to /401 instead of /auth for unauthenticated users
   - Redirect to /403 for unauthorized role access

4. Create app/error.tsx:
   - Global error boundary
   - Catch all errors
   - Show user-friendly message
   - "Report Issue" button (optional)

VERIFICATION:
- Unauthenticated users see 401 page
- Wrong role access shows 403 page
- Error pages match app theme
- Buttons work correctly
```

---

### Command 11: Update Landing Page Copy

```
Update landing page to match wireframe specifications exactly.

CURRENT ISSUE: Copy doesn't match wireframe

TASKS:
1. Update app/page.tsx:
   - Change headline to: "Private surplus property access — governed, verified, operator-led."
   - Change CTA to: "Continue with Email"
   - Update 3 feature cards to match "How It Works":
     * Step 1: "Submit Criteria" - Buyers define their acquisition parameters
     * Step 2: "Operator Qualifies" - Our team verifies and matches opportunities
     * Step 3: "Success Fee on Close" - 5% buyer-paid fee, tiered referral commissions

2. Add compliance strip below CTA:
   - Text: "Operator-verified · Audit-logged · No spam"
   - Small text, subtle styling
   - Icons for each point

3. Remove "View Blueprint" button (not in wireframe)

4. Ensure design matches Quantum Ledger theme

VERIFICATION:
- Landing page copy matches wireframe exactly
- Compliance strip is visible
- CTA text is correct
- No extra buttons
```

---

### Command 12: Fix Referral Link Domain

```
Fix hardcoded referral link domain in referrer portal.

CURRENT ISSUE: Links use hardcoded 'surplus-bus.com' instead of actual deployment URL

TASKS:
1. Update app/referrer/page.tsx:
   - Replace hardcoded domain with environment variable
   - Use process.env.NEXT_PUBLIC_APP_URL or window.location.origin
   - Format: `${appUrl}/ref/${link.code}`

2. Add environment variable:
   - Create .env.local (if not exists)
   - Add: NEXT_PUBLIC_APP_URL=https://surplus-20wvxw8d4-yonatan-s-projects-5ea18957.vercel.app
   - Add to Vercel environment variables

3. Update referral link generation:
   - Use same environment variable in API route
   - Ensure consistency

VERIFICATION:
- Referral links use correct domain
- Links work when clicked
- Domain changes with environment (dev/staging/prod)
```

---

### Command 13: Add Reputation Score Tooltip

```
Add tooltip to reputation score badge in buyer portal explaining the scoring system.

TASKS:
1. Install tooltip library (if not already):
   - npm install @radix-ui/react-tooltip
   - Or use native CSS tooltip

2. Update app/buyer/page.tsx:
   - Wrap reputation score badge with Tooltip component
   - Tooltip content:
     * "Reputation Score: 0-100"
     * "Affects your track status and priority"
     * "Earn points by closing deals"
     * "Lose points for expired windows"

3. Style tooltip:
   - Dark background
   - White text
   - Small arrow pointing to badge
   - Appears on hover

VERIFICATION:
- Hover over reputation badge → tooltip appears
- Tooltip explains scoring system
- Tooltip disappears when not hovering
- Works on mobile (tap to show)
```

---

### Command 14: Standardize Status Pills Component

```
Create a reusable StatusPill component and use it consistently across all portals.

CURRENT ISSUE: Status pills have inconsistent styling

TASKS:
1. Create app/components/StatusPill.tsx:
   - Props: status (string), size (sm/md/lg)
   - Color mapping:
     * NEW_SUBMISSION → blue
     * NEEDS_CLARIFICATION → yellow
     * QUALIFIED → green
     * MATCHING → purple
     * EXCLUSIVE_WINDOW_ACTIVE → orange
     * BUYER_COMMITTED → cyan
     * WON_PENDING_CLOSE → teal
     * CLOSED_PAID → green
     * LOST → red
     * WITHDRAWN → gray
     * REJECTED → red
   - Format status text: replace underscores with spaces, title case

2. Update all portal pages to use StatusPill:
   - app/operator/page.tsx
   - app/buyer/page.tsx
   - app/referrer/page.tsx
   - app/components/DealCard.tsx (if created)
   - app/components/KanbanDealCard.tsx (if created)

3. Add status icon (optional):
   - Map each status to an icon
   - Show icon before text

VERIFICATION:
- All status displays use StatusPill component
- Colors are consistent across portals
- Text formatting is consistent
- Icons display correctly (if added)
```

---

### Command 15: Add Empty States

```
Add empty state components for all lists that can be empty.

TASKS:
1. Create app/components/EmptyState.tsx:
   - Props: icon, title, message, action (optional)
   - Centered layout
   - Large icon
   - Title and description
   - Optional CTA button

2. Add empty states to:
   - Operator portal: "No deals require action right now. You're clear." ✅ (already exists)
   - Buyer portal: "No active deals yet. Submit your criteria to get started."
   - Referrer portal: "No referrals yet. Generate a link to start earning commissions." ✅ (already exists)
   - Payouts page: "No payouts pending. All commissions have been paid."

3. Style with Quantum Ledger theme:
   - Subtle icon
   - Gray text
   - Clear CTA button

VERIFICATION:
- Empty states show when lists are empty
- Messages are helpful and actionable
- CTAs work correctly
- Design matches app theme
```

---

## 🎯 EXECUTION STRATEGY

### Option A: Run All Commands Sequentially
Copy each command into Cursor AI one at a time, starting from Command 1. Wait for each to complete before moving to the next.

### Option B: Run by Phase
Run all commands in Phase 1, test thoroughly, then move to Phase 2, etc.

### Option C: Priority-Based
Run commands 1-3 immediately (critical), then assess which other fixes are most important for your use case.

---

## ✅ VERIFICATION CHECKLIST

After running all commands, verify:

- [ ] Authentication works (magic link → correct portal)
- [ ] Top bar shows user info, role, logout
- [ ] Sidebar navigation works for all roles
- [ ] Operator payouts page exists and functions
- [ ] Buyer can see all active deals
- [ ] Deal detail drawer opens and shows full info
- [ ] Kanban board displays correctly
- [ ] No more window.alert/confirm (all modals)
- [ ] Audit timeline shows deal history
- [ ] Error pages (401/403) display correctly
- [ ] Landing page copy matches wireframe
- [ ] Referral links use correct domain
- [ ] Reputation tooltip explains scoring
- [ ] Status pills are consistent
- [ ] Empty states show helpful messages

---

## 📊 ESTIMATED EFFORT

- **Phase 1 (Critical):** 6-9 hours
- **Phase 2 (High Priority):** 16-24 hours
- **Phase 3 (Medium Priority):** 18-24 hours
- **Phase 4 (Polish):** 8-12 hours

**Total:** 48-69 hours to complete all fixes

---

## 🚨 IMPORTANT NOTES

1. **Test after each command** - Don't move forward if something breaks
2. **Commit after each command** - Easy to rollback if needed
3. **Command 1 is CRITICAL** - Nothing else works until authentication is fixed
4. **Commands are independent** - You can skip/reorder Phase 3-4 commands as needed
5. **Use Cursor AI's context** - It can see your entire codebase and make smart decisions

---

## 💡 TIPS FOR CURSOR AI

- Be specific about file paths
- Reference existing components/patterns in the codebase
- Ask Cursor to follow the Quantum Ledger theme
- Request TypeScript types for all new components
- Ask for error handling in all API calls
- Request responsive design for all UI components

---

**Ready to start? Begin with Command 1! 🚀**
