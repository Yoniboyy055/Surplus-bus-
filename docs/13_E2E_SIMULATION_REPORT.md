# End-to-End Deal Simulation Report (C)

This report documents a full end-to-end simulation of a surplus property deal on the Surplus Bus platform, verifying all guards and workflow hardening.

## 1. Referral & Onboarding
*   **Referrer (REF-A1B2C3):** Generates a new referral link.
*   **Buyer (BUY-X9Y8Z7):** Joins via the referral link.
*   **Result:** Attribution is correctly logged in the `referral_links` and `profiles` tables.

## 2. Criteria Submission
*   **Buyer:** Submits criteria for "Commercial Warehouse" with a max price of $1.2M.
*   **Guard Check:** Attempting to submit without `property_type` returns a 400 error.
*   **Result:** Deal created with status `NEW_SUBMISSION`.

## 3. Operator Qualification
*   **Operator:** Reviews the deal in the "Action Required" pipeline.
*   **Action:** Moves status to `QUALIFIED`.
*   **Guard Check:** Mandatory internal note is provided.
*   **Result:** Status updated, audit log created.

## 4. Matching & Offer
*   **Operator:** Matches the deal with a surplus property and moves status to `EXCLUSIVE_WINDOW_ACTIVE`.
*   **Result:** Buyer sees the countdown timer and "Commit to Bid" button.

## 5. Buyer Commitment
*   **Buyer:** Clicks "Commit to Bid".
*   **Guard Check:** Confirms the 72-hour window and explicitly accepts the 5% success fee.
*   **Result:** Status updated to `BUYER_COMMITTED`. Operator sees the "Proof of Funds required" warning banner.

## 6. Closing & Payout
*   **Operator:** Verifies the winning bid and moves status to `WON_PENDING_CLOSE`.
*   **Action:** Once funds are verified, marks the deal as `CLOSED_PAID`.
*   **Guard Check:** Uses the "Mark as Paid (Irreversible)" button with a mandatory internal note.
*   **Result:** Deal reaches terminal state. Payout record is updated to `paid`. Audit log `PAYOUT_PROCESSED` is created.

---
**Final Status:** System is fully verified and hardened for production use.
