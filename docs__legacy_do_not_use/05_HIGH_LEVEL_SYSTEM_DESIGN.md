# High-Level Surplus Management System Design

This document outlines the strategic enhancements and architectural improvements required to elevate the existing **Surplus Referral Platform** scaffold into a robust, high-level surplus management system. The focus is on automation, intelligence, and a comprehensive user experience across all defined roles.

## I. Strategic Vision: From Scaffold to Intelligent Platform

The current repository provides a strong foundation with a well-defined business logic captured in the Supabase schema and documentation. The next step is to build the application layer that leverages this logic for automation and intelligence.

| Current State (MVP Scaffold) | High-Level System (Target) | Impact |
| :--- | :--- | :--- |
| Core logic defined in SQL/Docs | Logic implemented in API routes and Edge Functions | **Automation:** Self-regulating system, reduced operator workload. |
| Minimal UI (Auth/Dashboard) | Dedicated Portals (Operator, Buyer, Referrer) | **UX/Adoption:** Professional, role-specific workflows, increased user engagement. |
| "Matching" is a status | Intelligent Deal Matching Engine | **Efficiency:** Faster deal qualification, higher conversion rates. |
| Manual status updates | Automated Reputation & Track Management | **Governance:** Enforced compliance and objective buyer behavior tracking. |

## II. Architectural Enhancements

The system will maintain its Next.js/Supabase architecture but will introduce new layers for better separation of concerns and scalability.

### A. Data & Logic Layer (Supabase/Postgres)

The existing data model is excellent and should be preserved. Enhancements focus on leveraging the database's capabilities:

1.  **Intelligent Matching Data:** Introduce a new `properties` table (or integrate with an external property data source) to store potential surplus deals. This table will be the target for the matching engine.
2.  **Automated Reputation Triggers:** Implement PostgreSQL triggers or Supabase Database Webhooks to automatically update the `buyers.track` and `buyers.reputation_score` based on events logged in `buyer_reputation_events` (e.g., on `exclusive_reset_count` increment, or `CLOSED_PAID` status).
3.  **Complex Fee Calculation View:** Create a read-only SQL View (`v_deal_payout_summary`) that joins `deals`, `referrers`, and `payouts` to provide a real-time, auditable calculation of the 5% success fee split (Operator vs. Referrer) for the Operator Dashboard.

### B. Application Layer (Next.js)

The Next.js application will be structured to support the three distinct user portals.

| Component | Description | Technology |
| :--- | :--- | :--- |
| **Data Access Layer** | Server-side functions (`/lib/data`) to abstract Supabase calls, ensuring strict type safety and data validation. | TypeScript, Supabase Server Client |
| **API Routes** | Secure, authenticated endpoints for transactional actions (e.g., `/api/deal/submit`, `/api/deal/commit-bid`). | Next.js API Routes, Zod for validation |
| **Intelligent Matching Service** | A dedicated service that runs the matching algorithm, potentially as a Supabase Edge Function for low-latency, isolated execution. | Supabase Edge Functions (Deno/TypeScript) |

## III. Key Feature Implementation

### 1. Intelligent Deal Matching Engine

This is the core value-add for the Operator.

*   **Input:** `deals.criteria` (JSONB) from the buyer.
*   **Process:** The engine compares the buyer's criteria (e.g., location, property type, price range) against the `properties` data.
*   **Output:** A ranked list of matching properties, with a **Match Confidence Score** (e.g., 0-100) that the Operator can use to prioritize offers.

### 2. Dedicated User Portals

The existing `/dashboard` must be replaced with role-specific portals.

#### A. Operator Portal (`/operator`)

*   **Deal Pipeline:** A Kanban-style board visualizing all deals by their `status` (NEW_SUBMISSION, QUALIFIED, MATCHING, etc.).
*   **Payout Management:** View of the `v_deal_payout_summary` view, allowing the Operator to mark `payouts` as `paid` and generate payment reports.
*   **Governance & Audit:** Real-time feed of `audit_logs` and reputation changes.

#### B. Buyer Portal (`/buyer`)

*   **Criteria Management:** A form to update and refine their property criteria (`deals.criteria`).
*   **Active Deals:** A list of deals where they are the `buyer_profile_id`. For deals in `EXCLUSIVE_WINDOW_ACTIVE`, a prominent countdown timer (72 hours) and clear "Commit to Bid" action button.
*   **Communication:** An integrated messaging interface using the `messages` table for direct communication with the Operator.

#### C. Referrer Portal (`/referrer`)

*   **Performance Metrics:** Clear display of `points_closed_paid`, current `tier`, and calculated `commission_rate`.
*   **Referral Tools:** Management of `referral_links` and a shareable link generator.
*   **Deal Status Tracker:** A filtered view of their referred deals, showing only the `status` and a masked deal ID (to maintain privacy boundaries as per the blueprint).

## IV. Implementation Roadmap (Phase 3 Focus)

The implementation phase should focus on the following sequence:

1.  **Data Layer Refinement:** Implement the `properties` table and the `v_deal_payout_summary` SQL View.
2.  **Core API Routes:** Build the essential server actions: `submitCriteria`, `updateDealStatus`, `commitToBid`.
3.  **Role-Based Routing:** Implement the logic to redirect users from `/dashboard` to their respective role portals (`/operator`, `/buyer`, `/referrer`).
4.  **Operator Portal MVP:** Build the Deal Pipeline view to enable the core business workflow.

This design transforms the **surplus-bus** scaffold into a powerful, intelligent, and scalable platform ready for production use.

***

*This document was generated by Manus AI based on the analysis of the `surplus-bus` repository's blueprint and schema.*
