# Surplus Bus: Premium UI/UX Specification

**Role:** Principal Product Designer + Design Systems Lead + UX Writer
**Goal:** Produce a 100% premium, permanent UI that feels like Stripe/Linear-level quality and is ready to build.

---

## 1) Visual Direction: "Quantum Ledger"

The chosen theme is **Quantum Ledger**. This direction emphasizes precision, security, and institutional trust, moving away from a typical startup aesthetic to a fintech-grade platform.

| Attribute | Description |
| :--- | :--- |
| **Theme Name** | **Quantum Ledger** |
| **Mood Keywords** | Secure, Precise, Institutional, Minimal, High-Contrast |
| **Color Palette** | Deep Navy/Black background, Electric Teal/Cyan accents, High-contrast White text. |
| **Typography** | Clean, modern sans-serif for body (Inter), Monospace for data/code (Fira Code). |
| **Button/Card Styles** | Sharp corners (low radius), subtle inner shadows on cards, high-contrast borders. |
| **Icon Style** | Monoline, filled when active, highly geometric. |
| **Animation Style** | Subtle, fast (200ms), focused on state changes (hover, focus, data update) using smooth easing. |

---

## 2) Permanent Design System

This system provides the foundational tokens for a consistent and scalable interface.

### Color Tokens

| Token | HEX Value | Usage |
| :--- | :--- | :--- |
| **Background** | `#0A0A0F` | Primary application background. |
| **Surface** | `#14141A` | Card backgrounds, sidebars, modals. |
| **Border** | `#2C2C35` | Separators, card outlines, input fields. |
| **Text** | `#FFFFFF` | Primary text for high contrast. |
| **Muted Text** | `#A0A0B0` | Secondary text, labels, helper text. |
| **Accent** | `#00C8C8` | Primary call-to-action, active states, key data points (Electric Teal). |
| **Success** | `#10B981` | Positive feedback, closed deals. |
| **Danger** | `#EF4444` | Errors, irreversible actions, warnings. |

### Spacing, Radius, and Shadows

| Token | Value | Usage |
| :--- | :--- | :--- |
| **Spacing Scale** | 4px base (4, 8, 12, 16, 24, 32, 48, 64) | Consistent padding and margin. |
| **Radius Scale** | `r-sm`: 4px, `r-md`: 8px, `r-lg`: 12px | Minimal rounding for a sharp, modern look. |
| **Shadows** | **Subtle Inner Shadow** on cards (`0 1px 3px rgba(0, 0, 0, 0.1)`), **Accent Glow** on focus (`0 0 0 2px #00C8C8`). | Emphasis on depth and focus state. |

### Typography Scale (Inter / Fira Code)

| Token | Font | Size / Weight | Usage |
| :--- | :--- | :--- | :--- |
| **H1** | Inter | 48px / Bold | Landing page hero, major section titles. |
| **H2** | Inter | 30px / Semi-Bold | Page titles (`/operator`, `/buyer`). |
| **Body** | Inter | 16px / Regular | Standard paragraph text. |
| **Small** | Inter | 12px / Medium | Microcopy, timestamps, labels. |
| **Mono** | Fira Code | 14px / Regular | Deal IDs, audit log metadata, referral codes. |

### Component Rules

| Component | When to Use | Rationale |
| :--- | :--- | :--- |
| **Modals** | Irreversible actions (e.g., `CLOSED_PAID`, Buyer Commit), complex forms (e.g., Criteria Form). | Forces user focus and requires explicit confirmation for high-stakes actions. |
| **Toasts** | Transient, non-blocking feedback (e.g., "Link copied," "Data saved," "Login successful"). | Quick, non-intrusive confirmation. |
| **Banners** | Persistent, system-wide warnings or information (e.g., "Supabase connection error," "Account not verified"). | Requires user attention but does not block workflow. |

### Accessibility Checklist

*   **Color Contrast:** All text/background combinations meet WCAG AA standards (especially white on `#0A0A0F` and `#14141A`).
*   **Focus States:** Every interactive element (buttons, links, inputs) must have a visible, high-contrast focus ring (using the Accent Glow shadow).
*   **Keyboard Navigation:** All workflows must be fully navigable using only the keyboard (Tab, Enter, Space).
*   **Semantic HTML:** Use correct semantic elements (e.g., `<button>`, `<nav>`, `<main>`) for screen reader compatibility.

---

## 3) Page-by-page Premium UX Spec

### /auth (Authentication)

| Element | Layout/Behavior | Microcopy | Confirmation/Error |
| :--- | :--- | :--- | :--- |
| **Layout** | Centered, minimal card on a dark background. | **Headline:** "Access Your Quantum Ledger" **Subtext:** "Enter your email to receive a secure, single-use login link." | **Success Toast:** "Magic Link Sent. Check your inbox (and spam folder) for a secure login link." |
| **Email Input** | Standard input field. | **Placeholder:** `your.email@institution.com` | **Error Toast:** "Invalid email format or user not found. Please try again." |
| **CTA Button** | Full width, Accent color. | "Send Secure Link" | **Loading State:** "Sending..." (Spinner) |

### /onboarding/role (Role Selection)

| Element | Layout/Behavior | Microcopy | Confirmation/Warning |
| :--- | :--- | :--- | :--- |
| **Layout** | Centered, two-column card with role options. | **Headline:** "Welcome to Surplus Bus" **Subtext:** "Select your primary role. This defines your portal access and system permissions." | **Warning Banner:** "Your role is permanent. Choose carefully." |
| **Role Options** | Large, distinct cards for Buyer/Referrer (Operator is manually assigned). | **Buyer:** "Acquirer. I am here to commit to deals." **Referrer:** "Originator. I am here to submit leads and earn commission." | **CTA Button:** "Confirm Role & Enter Portal" |

### /operator (Operator Portal)

| Element | Layout/Behavior | Microcopy | Confirmation/Warning |
| :--- | :--- | :--- | :--- |
| **Layout** | Wide, data-dense dashboard with left-hand navigation. | **H2:** "Operator Command Center" | **Success Toast:** "Deal status updated. Audit log entry created." |
| **Default View** | **Action Required** tab. Filtered list of deals requiring immediate attention (`NEEDS_CLARIFICATION`, `WON_PENDING_CLOSE`). | **Empty State:** "All systems clear. No immediate action required." | **Warning Banner (NEEDS_CLARIFICATION):** "Buyer is blocked. Send a message to unblock the workflow." |
| **Status Change** | Button opens a **Confirmation Modal**. | **Modal Headline:** "Confirm Irreversible Status Change" **Internal Note Field:** "Mandatory: Enter reason for audit log." | **CTA Button:** "Confirm & Update Status" |
| **Payout Button** | Button on `CLOSED_PAID` deals. | "Mark as Paid (Irreversible)" | **Payout Modal:** "Warning: This action is final and creates a permanent audit record. Confirm payment has been sent." |

### /buyer (Buyer Portal)

| Element | Layout/Behavior | Microcopy | Confirmation/Warning |
| :--- | :--- | :--- | :--- |
| **Layout** | Progress-focused dashboard with a central criteria form. | **H2:** "Acquisition Pipeline" | **Success Toast:** "Criteria updated. Matching engine notified." |
| **Progress Tracker** | Timeline component showing stages: Criteria > Matching > Offer > Commitment > Close. | **Active Stage:** "Awaiting Offer" **Completed Stage:** "Criteria Locked" | **Countdown Timer:** "Exclusive Window Ends In: 71h 59m 59s" (Accent color) |
| **Criteria Form** | Modal or dedicated section. Must include `property_type` and `max_price`. | **Empty State:** "Define your acquisition criteria to begin matching." | **Error State:** "Criteria incomplete. Please define property type and max price." |
| **Commit Flow** | Button on an active offer. Opens a **Commitment Modal**. | **Commit CTA:** "Commit to Bid & Lock Exclusivity" | **Commitment Modal:** "I understand and accept the **5% Buyer Success Fee** and the **72-Hour Exclusive Window** terms." |

### /referrer (Referrer Portal)

| Element | Layout/Behavior | Microcopy | Confirmation/Warning |
| :--- | :--- | :--- | :--- |
| **Layout** | Tier-focused dashboard with link generator. | **H2:** "Originator Dashboard" | **Success Toast:** "Link copied. Start sharing!" |
| **Tier Progress** | Visual component (e.g., progress bar) showing points to next tier. | **Current Tier:** "Proven (3/7 points to Elite)" | **Tier Benefit:** "Unlock 25% commission split." |
| **Link Generator** | Input field with copy button. | **Placeholder:** `https://surplusbus.com/r/short-code` | **Warning:** "Do not self-refer. This will result in immediate account downgrade." |
| **Deal Tracker** | Simplified list of referred deals. | **Status Masking:** Shows only: `Submitted`, `In Progress`, `Closed Paid`, `Rejected`. | **Microcopy:** "Deal status is simplified for privacy. Contact Operator for details." |

### /dashboard (Redirect Screen / Unified Shell Fallback)

| Element | Layout/Behavior | Microcopy | Confirmation/Error |
| :--- | :--- | :--- | :--- |
| **Layout** | Minimal, centered screen. | **Headline:** "Routing to Your Portal..." **Subtext:** "Please wait while we verify your credentials and permissions." | **Error State:** "Access Denied. Your role is not recognized. Contact support." |
| **Fallback** | If user is authenticated but has no assigned role (e.g., new user before onboarding). | **Headline:** "Welcome. Please Select Your Role." | **CTA Button:** "Go to Onboarding" (Links to `/onboarding/role`) |

---

## 4) Component Inventory (Build Plan)

### Global Shell Components

| Component | Props Needed | States |
| :--- | :--- | :--- |
| **Topbar** | `user: Profile`, `isAuth: boolean` | None |
| **Sidebar** | `activeRole: string`, `activeRoute: string` | None |
| **RoleBadge** | `role: string` | None |
| **NotificationToast** | `type: 'success' | 'danger' | 'info'`, `message: string` | Hidden, Visible (auto-dismiss) |

### Data Components

| Component | Props Needed | States |
| :--- | :--- | :--- |
| **DealCard** | `deal: Deal`, `role: string` | `loading`, `error`, `active` |
| **StatCard** | `title: string`, `value: string`, `icon: string` | `loading` (skeleton) |
| **StatusPill** | `status: string` | None (color based on status) |
| **TierProgress** | `currentPoints: number`, `nextTierPoints: number`, `tier: string` | `loading`, `empty` |

### Workflow Components

| Component | Props Needed | States |
| :--- | :--- | :--- |
| **CommitModal** | `deal: Deal`, `onConfirm: func` | `loading`, `error`, `disabled` (if terms not accepted) |
| **PayoutConfirmModal** | `deal: Deal`, `onConfirm: func` | `loading`, `error`, `disabled` (if internal note empty) |
| **CriteriaFormModal** | `initialCriteria: object`, `onSave: func` | `loading`, `error` (validation) |

### Messaging Components

| Component | Props Needed | States |
| :--- | :--- | :--- |
| **MessageThread** | `dealId: string`, `messages: Message[]` | `loading`, `empty` |
| **OperatorMessageComposer** | `dealId: string`, `onSend: func` | `disabled` (if deal is terminal), `loading` |

---

## 5) Premium Copy Pack

| Element | Copy |
| :--- | :--- |
| **Core App Tagline** | **Surplus Bus:** The Institutional Ledger for Off-Market Assets. |
| **Operator Portal Header** | **Command Center:** Action Required. |
| **Buyer Portal Header** | **Acquisition Pipeline:** Commitment is Key. |
| **Referrer Portal Header** | **Originator Dashboard:** Track Your Commission. |
| **Fee Disclosure Copy** | **5% Buyer Success Fee:** A 5% fee is due only upon successful closing of a deal you commit to. This fee funds the referral commission and platform operations. |
| **72 Hour Exclusivity** | **Exclusive Window:** You have 72 hours from offer acceptance to commit to the bid. This is a hard deadline to maintain market integrity. |
| **Operator Authority Disclosure** | **Final Authority:** The Operator reserves the right to verify all deal statuses and payouts. All terminal status changes require Operator verification and audit logging. |

---

## 6) QA / Verification Checklist (UI-only)

---

## 6) QA / Verification Checklist (UI-only)

| Test Case | Verification Step |
| :--- | :--- |
| **Auth Redirect** | Unauthenticated user attempts to access `/operator`. Must land on `/auth`. |
| **Role-Based Routing** | Buyer logs in. Must land on `/buyer` (via `/dashboard`). |
| **Privacy Masking** | Referrer views their deal list. Deal status must be simplified (e.g., `In Progress`, not `OFFER_SENT`). |
| **Commitment Modal** | Buyer clicks "Commit to Bid." A modal must appear requiring explicit fee acceptance. |
| **Irreversible Warning** | Operator clicks "Mark as Paid." A modal must appear requiring an internal note and confirming the action is irreversible. |
| **Error State** | API call fails (e.g., 400/401). A non-blocking `NotificationToast` must appear with a clear error message. |
| **Mobile Layout** | View on a small screen. Primary content must stack cleanly; navigation must collapse into a hamburger menu. |

---

## 7) "Permanent Premium" Upgrade Ideas (Optional)

| Upgrade Idea | Benefit | Effort (S/M/L) |
| :--- | :--- | :--- |
| **Deal Timeline View** | Increases transparency and reduces operator inquiries by showing all status changes and messages in a single chronological view. | **M** |
| **Trust Badges (Buyer)** | Displays "Verified Identity," "Track A," and "Closed Deals: 5+" badges on the Buyer profile to signal reliability to the Operator. | **S** |
| **Audit Export (Operator)** | Allows Operator to export the full `audit_logs` for a deal as a signed PDF for legal/compliance purposes. | **M** |
| **Referral Link Analytics** | Referrer can see basic stats (Clicks, Conversions) on their links to optimize sharing strategy. | **M** |
| **Evidence Uploads (Deal)** | Allows Buyers/Operators to upload signed documents or proof-of-funds directly to the deal record (S3 integration). | **L** |
| **Reputation Score History** | Buyer can view a graph of their reputation score changes over time, incentivizing good behavior. | **S** |
| **Operator "Away" Status** | Operator can set an "Away" status that automatically routes `NEEDS_CLARIFICATION` deals to a temporary holding state with an auto-response. | **M** |
| **Criteria Matching Confidence** | Buyer sees a "Confidence Score" (e.g., 85%) on their criteria, indicating how well it aligns with available properties. | **M** |
| **Custom Domain Support** | Allows Referrers/Buyers to access the platform via a custom subdomain (e.g., `app.mycompany.com`). | **L** |
| **Dark Mode Toggle** | Provides a standard light mode option, improving accessibility and user preference. | **S** |
