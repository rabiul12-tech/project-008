# ESTAVIA — Premium Property & Real Estate Management SaaS

**Tagline:** *Every Property. Perfectly Managed.*

ESTAVIA (Project 009) is a comprehensive, browser-local Property and Rental Management SaaS application built with Next.js App Router, React 19, TypeScript, Tailwind CSS, Zustand, Recharts, Decimal.js, Zod, and jsPDF.

---

## Portfolio Demonstration vs Production Property Management Software

**Important Notice:** ESTAVIA is a browser-local portfolio demonstration engineered to showcase enterprise SaaS UI/UX architecture, domain modeling, lease conflict validation, and financial ledger accuracy.

- **Local-Only Persistence:** All records are stored exclusively in browser `localStorage` (`estavia:data`, `estavia:settings`, `estavia:ui`, `estavia:version`). No external database or cloud synchronization is used.
- **No Real Authentication or RBAC Enforcement:** Instant demo workspace access is provided without login or tenant authentication.
- **No Real Payment Processing:** All rent payments, credits, reversals, security deposit transactions, and expense disbursements operate on fictional demo records. No real money transfers or payment gateways are connected.
- **Non-Binding Sample Documents:** Client-side PDF lease documents are clearly watermarked `"SAMPLE LEASE — NOT A LEGAL AGREEMENT"` and do not provide legally enforceable electronic signatures.
- **Simplified Financial Ledger:** While financial calculations use `Decimal.js` and strictly separate security deposits from rental revenue, this demonstration is not a jurisdiction-compliant trust accounting or full double-entry general ledger system.

---

## Core Engines & Architecture

1. **Lease Lifecycle Engine (`lib/engines/lease-engine.ts`)**
   - Enforces half-open date intervals `[startDate, endDate)`.
   - Two leases conflict when `startA < endB AND startB < endA`, allowing seamless back-to-back leases while blocking overlapping exclusive `Active` or `Scheduled` leases.
   - Versioned lease renewals preserve historical lease snapshots and prevent duplicate renewals.

2. **Unit Occupancy Engine (`lib/engines/occupancy-engine.ts`)**
   - Derives unit occupancy (`Occupied`, `Vacant`, `Reserved`, `Under Maintenance`, `Unavailable`) directly from effective active leases and availability rules.
   - Future scheduled leases are classified as `Reserved` rather than current occupants.

3. **Idempotent Rent Generation Engine (`lib/engines/rent-engine.ts`)**
   - Uses `leaseId:billingPeriod:chargeType` idempotency keys to prevent duplicate monthly rent charges.
   - Supports partial payments, full payments, credit adjustments, overdue detection, and payment reversals using `Decimal.js`.

4. **Financial Calculation Engine (`lib/engines/financial-engine.ts`)**
   - Computes Scheduled Rent, Collected Rent, Outstanding Rent, Collection Rate, and Operating Cash Flow while excluding security deposits from rental income.

5. **Maintenance Workflow Engine (`lib/engines/maintenance-engine.ts`)**
   - Manages 7 workflow stages (`New`, `Reviewed`, `Assigned`, `In Progress`, `Resolved`, `Closed`, `Cancelled`) and syncs actual repair costs to a single linked expense record without double-counting.
