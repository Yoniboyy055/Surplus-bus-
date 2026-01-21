# Premium UI/UX Implementation Guide

## Overview

The **Surplus Bus** platform has been upgraded to a **Stripe/Linear-level** premium interface using the **Quantum Ledger** design system. This document outlines the implementation, components, and best practices for maintaining this high-end aesthetic.

---

## Design System: Quantum Ledger

### Color Palette

| Token | HEX Value | Usage |
| :--- | :--- | :--- |
| **Background** | `#0A0E27` | Primary application background |
| **Surface** | `#1A1F3A` | Card backgrounds, sidebars, modals |
| **Border** | `#252B47` | Separators, card outlines, input fields |
| **Text** | `#FFFFFF` | Primary text for high contrast |
| **Muted Text** | `#A0A0B0` | Secondary text, labels, helper text |
| **Accent (Primary)** | `#00D9FF` | Primary CTA, active states, key data points |
| **Success** | `#10B981` | Positive feedback, closed deals |
| **Danger** | `#EF4444` | Errors, irreversible actions, warnings |

### Typography

*   **Font Stack:** Inter (body), Fira Code (monospace)
*   **Scale:** XS (12px) → 5XL (48px)
*   **Weight:** 400 (Regular), 500 (Medium), 600 (Semi-Bold), 700 (Bold)

### Component Library

#### Button Component

```tsx
import { Button } from '@/components';

// Variants: primary, secondary, danger, ghost
// Sizes: sm, md, lg
// States: loading, disabled

<Button variant="primary" size="md" loading={false}>
  Send Secure Link
</Button>
```

**Features:**
*   Smooth hover animations
*   Loading spinner
*   Icon support (left/right)
*   Full width option
*   Keyboard accessible

#### Card Component

```tsx
import { Card } from '@/components';

<Card icon="🎯" title="Strategic Buyer" subtitle="Acquirer">
  Content goes here
</Card>
```

**Features:**
*   Icon and title support
*   Interactive mode (hover effects)
*   Shadow elevation on hover
*   Responsive padding

#### Modal Component

```tsx
import { Modal } from '@/components';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  subtitle="This action is irreversible"
  footer={<Button>Confirm</Button>}
>
  Content goes here
</Modal>
```

**Features:**
*   Backdrop blur
*   Smooth animations
*   Keyboard escape to close
*   Scroll lock on body
*   Customizable size (sm, md, lg)

#### Toast Component

```tsx
import { Toast } from '@/components';

<Toast
  message="Deal updated successfully"
  type="success"
  duration={4000}
  onClose={() => {}}
/>
```

**Features:**
*   Auto-dismiss
*   Type variants (success, error, info, warning)
*   Icon indicators
*   Auto-positioned

#### Badge Component

```tsx
import { Badge } from '@/components';

<Badge variant="success" size="md" icon="✓">
  Completed
</Badge>
```

**Features:**
*   Multiple variants
*   Icon support
*   Size options

#### Input Component

```tsx
import { Input } from '@/components';

<Input
  label="Email Address"
  placeholder="your.email@institution.com"
  error={error}
  hint="We'll send you a secure link"
  icon="📧"
  fullWidth
/>
```

**Features:**
*   Label, error, and hint text
*   Icon support (left/right)
*   Error state styling
*   Full width option

---

## Animations & Micro-interactions

### Available Animations

*   **Entrance:** `fadeInUp`, `fadeInDown`, `fadeInLeft`, `fadeInRight`, `scaleIn`, `bounceIn`
*   **Slide:** `slideInLeft`, `slideInRight`, `slideOutLeft`, `slideOutRight`
*   **Flip/Rotate:** `flipIn`, `rotateIn`
*   **Effects:** `pulse`, `glow`, `glowText`, `spin`, `shimmer`

### Usage

```css
/* Apply animation via class */
<div className="animate-fade-in-up">Content</div>

/* Or via inline styles */
<div style={{ animation: 'fadeInUp 0.5s ease-out' }}>Content</div>
```

### Hover States

*   `.hover-lift` — Elevates on hover with shadow
*   `.hover-glow` — Glows with cyan shadow on hover
*   `.hover-scale` — Scales up on hover, down on click

---

## Page Implementations

### /auth (Authentication)

**Features:**
*   Centered card layout
*   Gradient background
*   Email input with validation
*   Magic link submission
*   Success/error messaging
*   Loading state with spinner

**Key Components:**
*   `Input` (email field)
*   `Button` (submit)
*   `Toast` (feedback)

### /onboarding/role (Role Selection)

**Features:**
*   Role selection cards with icons
*   Visual feedback on selection
*   Warning banner for permanent choice
*   Smooth transitions
*   Loading state on confirmation

**Key Components:**
*   `Card` (role options)
*   `Button` (confirm)
*   Custom styling for role selection

### /operator (Operator Portal)

**Planned Features:**
*   Action Required dashboard
*   Deal pipeline view
*   Status change modals with confirmations
*   Payout verification flow
*   Audit log sidebar

**Key Components:**
*   `Card` (deal cards)
*   `Modal` (status changes, payouts)
*   `Badge` (status indicators)
*   `Button` (actions)

### /buyer (Buyer Portal)

**Planned Features:**
*   Progress tracker (timeline)
*   Criteria form with validation
*   Offer cards
*   Commitment flow with fee disclosure
*   Countdown timer for exclusive window

**Key Components:**
*   `Input` (criteria form)
*   `Card` (offer cards)
*   `Modal` (commitment confirmation)
*   `Badge` (status)
*   Custom timer component

### /referrer (Referrer Portal)

**Planned Features:**
*   Tier progress visualization
*   Referral link generator
*   Deal tracker with masked statuses
*   Commission breakdown

**Key Components:**
*   `Card` (tier progress, link generator)
*   `Input` (link display)
*   `Badge` (tier status)
*   Custom progress bar

---

## Best Practices

### 1. Consistency

*   Always use the design system tokens (colors, spacing, typography)
*   Avoid inline styles; use Tailwind classes
*   Use the component library for standard UI elements

### 2. Accessibility

*   Ensure all interactive elements have focus states
*   Use semantic HTML (`<button>`, `<nav>`, `<main>`)
*   Provide alt text for icons
*   Test keyboard navigation

### 3. Performance

*   Use CSS animations over JavaScript where possible
*   Lazy-load images and heavy components
*   Minimize re-renders in React components
*   Use `React.memo` for expensive components

### 4. Responsiveness

*   Mobile-first approach
*   Test on multiple screen sizes
*   Use Tailwind's responsive prefixes (`md:`, `lg:`, etc.)
*   Ensure touch targets are at least 44x44px

### 5. Dark Mode

*   The entire platform is dark-themed
*   Use the quantum color palette consistently
*   Ensure sufficient contrast for accessibility
*   Test with color blindness simulators

---

## Color Usage Guidelines

### Primary Accent (Cyan #00D9FF)

*   Primary CTAs (buttons)
*   Active states
*   Focus rings
*   Hover effects on interactive elements
*   Key data highlights

### Success (Green #10B981)

*   Positive confirmations
*   Completed deals
*   Success messages
*   Checkmarks

### Danger (Red #EF4444)

*   Error messages
*   Irreversible actions
*   Warnings
*   Delete buttons

### Info (Blue #3B82F6)

*   Informational messages
*   Help text
*   Secondary CTAs

### Warning (Amber #F59E0B)

*   Caution messages
*   Warnings that require attention
*   Pending states

---

## Typography Guidelines

### Headings

*   **H1 (48px, Bold):** Page titles, hero sections
*   **H2 (36px, Bold):** Section titles, modal titles
*   **H3 (30px, Semi-Bold):** Subsection titles
*   **H4 (24px, Semi-Bold):** Card titles

### Body Text

*   **Base (16px, Regular):** Standard paragraph text
*   **Small (14px, Regular):** Secondary text, descriptions
*   **XS (12px, Medium):** Labels, helper text, timestamps

### Monospace

*   **Fira Code (14px):** Deal IDs, referral codes, audit logs, code snippets

---

## Spacing Guidelines

| Token | Value | Usage |
| :--- | :--- | :--- |
| **xs** | 4px | Tight spacing between elements |
| **sm** | 8px | Small gaps |
| **md** | 12px | Medium gaps |
| **lg** | 16px | Standard padding |
| **xl** | 24px | Large sections |
| **2xl** | 32px | Major sections |
| **3xl** | 48px | Page-level spacing |
| **4xl** | 64px | Hero sections |

---

## Shadow & Elevation

| Shadow | Usage |
| :--- | :--- |
| **inner-subtle** | Inset shadows on cards for depth |
| **card** | Default card shadow |
| **card-hover** | Card shadow on hover |
| **glow-cyan** | Cyan glow for focus/active states |
| **glow-cyan-lg** | Large cyan glow for emphasis |

---

## Future Enhancements

*   **Dark/Light Mode Toggle:** Add light mode option
*   **Custom Themes:** Allow users to customize accent colors
*   **Advanced Animations:** Add page transition animations
*   **Accessibility Improvements:** Add ARIA labels, keyboard shortcuts
*   **Performance Optimization:** Code splitting, lazy loading
*   **Mobile App:** Native iOS/Android versions

---

## Support & Maintenance

For questions or issues with the design system, refer to:

*   **Component Library:** `/components/index.ts`
*   **Global Styles:** `/app/globals.css`
*   **Tailwind Config:** `/tailwind.config.ts`
*   **Animations:** `/app/animations.css`

---

**Last Updated:** January 21, 2026
**Design System Version:** 1.0 (Quantum Ledger)
**Status:** Production Ready
