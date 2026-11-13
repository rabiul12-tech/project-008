export type PropertyType =
  | 'Apartment Building'
  | 'Residential Complex'
  | 'Commercial Building'
  | 'Mixed-Use Property'
  | 'Single-Family Rental'
  | 'Townhouse Portfolio';

export type PropertyStatus = 'Active' | 'Under Renovation' | 'Archived';

export type UnitType =
  | 'Studio'
  | '1 Bedroom'
  | '2 Bedroom'
  | '3 Bedroom'
  | 'Penthouse'
  | 'Commercial Suite'
  | 'Retail Space'
  | 'Townhouse';

export type UnitAvailabilityMode =
  | 'Available'
  | 'Reserved'
  | 'Unavailable'
  | 'Under Maintenance';

export type DerivedOccupancyStatus =
  | 'Occupied'
  | 'Vacant'
  | 'Reserved'
  | 'Unavailable'
  | 'Under Maintenance';

export type ApplicationStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Converted';

export type LeaseStatus =
  | 'Draft'
  | 'Scheduled'
  | 'Active'
  | 'Expired'
  | 'Terminated'
  | 'Cancelled';

export type BillingFrequency = 'Monthly' | 'Quarterly';

export type RentChargeStatus =
  | 'Unpaid'
  | 'Partially Paid'
  | 'Paid'
  | 'Overdue'
  | 'Voided';

export type TransactionType =
  | 'Rent Payment'
  | 'Rent Credit'
  | 'Payment Reversal'
  | 'Security Deposit Receipt'
  | 'Security Deposit Deduction'
  | 'Security Deposit Return'
  | 'Expense Payment'
  | 'Other Adjustment';

export type ExpenseCategory =
  | 'Repairs'
  | 'Utilities'
  | 'Cleaning'
  | 'Insurance'
  | 'Property Taxes'
  | 'Management'
  | 'Landscaping'
  | 'Other';

export type ExpenseStatus = 'Pending' | 'Paid' | 'Archived';

export type MaintenanceStage =
  | 'New'
  | 'Reviewed'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Closed'
  | 'Cancelled';

export type MaintenancePriority = 'Low' | 'Medium' | 'High' | 'Emergency';

export type MaintenanceCategory =
  | 'Plumbing'
  | 'Electrical'
  | 'HVAC'
  | 'Appliances'
  | 'Structural'
  | 'Locks & Security'
  | 'Common Area'
  | 'General';

export type InspectionType =
  | 'Move-In'
  | 'Routine'
  | 'Move-Out'
  | 'Maintenance Follow-up';

export type InspectionStatus = 'Scheduled' | 'In Progress' | 'Completed';

export type ConditionRating = 'Excellent' | 'Good' | 'Fair' | 'Needs Repair';

export type TeamRole =
  | 'Property Owner'
  | 'Portfolio Manager'
  | 'Property Manager'
  | 'Leasing Agent'
  | 'Maintenance Coordinator'
  | 'Viewer';

export interface Property {
  id: string;
  code: string;
  name: string;
  type: PropertyType;
  address: string;
  city: string;
  state: string;
  country: string;
  floorsCount: number;
  targetUnitsCount: number;
  status: PropertyStatus;
  description: string;
  amenities: string[];
  imageUrl: string;
  notes: string;
  estimatedValue?: number; // Explicit fictional portfolio assumption
  yearBuilt: number;
  createdAt: string;
  archived?: boolean;
}

export interface Building {
  id: string;
  propertyId: string;
  name: string;
  code: string;
  floorsCount: number;
}

export interface Floor {
  id: string;
  propertyId: string;
  buildingId: string;
  floorNumber: number;
  label: string;
}

export interface Unit {
  id: string;
  propertyId: string;
  buildingId: string;
  floorId: string;
  floorNumber: number;
  unitNumber: string;
  type: UnitType;
  bedrooms: number;
  bathrooms: number;
  sqFt: number;
  askingRent: number;
  availabilityMode: UnitAvailabilityMode; // Manual override when no active lease (Reserved / Unavailable / Under Maintenance / Available)
  reservationNote?: string;
  amenities: string[];
  archived?: boolean;
}

export interface Tenant {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  occupation: string;
  employer: string;
  moveInDate?: string;
  notes: string;
  archived?: boolean;
  createdAt: string;
}

export interface RentalApplication {
  id: string;
  code: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  propertyId: string;
  unitId: string;
  applicationDate: string;
  requestedMoveInDate: string;
  proposedRent: number;
  monthlyIncome: number;
  employmentSummary: string;
  status: ApplicationStatus;
  notes: string;
  convertedTenantId?: string;
  convertedLeaseId?: string;
}

/**
 * Lease interval follows half-open convention [startDate, endDate) in ISO YYYY-MM-DD format.
 * Two leases conflict when startA < endB AND startB < endA.
 */
export interface Lease {
  id: string;
  code: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  startDate: string; // Inclusive YYYY-MM-DD
  endDate: string;   // Exclusive YYYY-MM-DD (Half-open interval [startDate, endDate))
  monthlyRent: number;
  securityDeposit: number;
  paymentDueDay: number; // 1..28
  billingFrequency: BillingFrequency;
  status: LeaseStatus;
  previousLeaseId?: string;
  renewedToLeaseId?: string;
  terminationDate?: string;
  terminationReason?: string;
  lateFeeRuleEnabled?: boolean;
  notes: string;
  createdAt: string;
}

export interface LeaseRenewal {
  id: string;
  originalLeaseId: string;
  newLeaseId: string;
  renewedAt: string;
  previousRent: number;
  newRent: number;
  notes: string;
}

export interface RentCharge {
  id: string;
  code: string;
  idempotencyKey: string; // `${leaseId}:${billingPeriod}:${chargeType}`
  leaseId: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  billingPeriod: string; // YYYY-MM
  chargeType: 'Base Rent' | 'Late Fee' | 'Prorated Rent';
  dueDate: string; // YYYY-MM-DD
  amount: number;
  amountPaid: number;
  creditsApplied: number;
  balance: number;
  status: RentChargeStatus;
  notes?: string;
  createdAt: string;
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  rentChargeId: string;
  amount: number;
}

export interface RentPayment {
  id: string;
  code: string;
  rentChargeId: string;
  leaseId: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  date: string;
  amount: number;
  type: 'Payment' | 'Credit' | 'Reversal';
  method: 'ACH Demo Transfer' | 'Check Record' | 'Wire Demo' | 'Card Demo' | 'Credit Adjustment';
  reference: string;
  reversedPaymentId?: string;
  isReversed?: boolean;
  notes: string;
  createdAt: string;
}

export interface SecurityDepositTransaction {
  id: string;
  code: string;
  leaseId: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  date: string;
  type: 'Receipt' | 'Deduction' | 'Return';
  amount: number;
  reference: string;
  notes: string;
}

export interface PropertyExpense {
  id: string;
  code: string;
  propertyId: string;
  unitId?: string;
  vendorId?: string;
  maintenanceRequestId?: string;
  category: ExpenseCategory;
  description: string;
  date: string;
  amount: number;
  status: ExpenseStatus;
  reference: string;
  archived?: boolean;
}

export interface MaintenanceComment {
  id: string;
  requestId: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
  content: string;
}

export interface MaintenanceRequest {
  id: string;
  code: string;
  propertyId: string;
  unitId: string;
  tenantId?: string;
  vendorId?: string;
  title: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  description: string;
  reportedDate: string;
  dueDate: string;
  estimatedCost: number;
  actualCost: number;
  linkedExpenseId?: string;
  stage: MaintenanceStage;
  comments: MaintenanceComment[];
  resolvedAt?: string;
  closedAt?: string;
}

export interface Vendor {
  id: string;
  code: string;
  businessName: string;
  category: MaintenanceCategory | 'Landscaping' | 'Cleaning' | 'General Contracting';
  contactName: string;
  email: string;
  phone: string;
  hourlyRate: number;
  rating: number;
  archived?: boolean;
}

export interface InspectionChecklistItem {
  id: string;
  area: string;
  item: string;
  condition: ConditionRating;
  notes: string;
}

export interface Inspection {
  id: string;
  code: string;
  propertyId: string;
  unitId: string;
  leaseId?: string;
  type: InspectionType;
  date: string;
  inspectorName: string;
  status: InspectionStatus;
  checklist: InspectionChecklistItem[];
  overallNotes: string;
}

export interface Activity {
  id: string;
  timestamp: string;
  type:
    | 'Property Created'
    | 'Property Updated'
    | 'Unit Added'
    | 'Tenant Created'
    | 'Application Reviewed'
    | 'Lease Created'
    | 'Lease Activated'
    | 'Lease Renewed'
    | 'Lease Terminated'
    | 'Rent Charged'
    | 'Payment Recorded'
    | 'Payment Reversed'
    | 'Maintenance Created'
    | 'Maintenance Assigned'
    | 'Maintenance Closed'
    | 'Deposit Recorded'
    | 'Deposit Returned'
    | 'Expense Recorded'
    | 'Inspection Completed';
  title: string;
  description: string;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  leaseId?: string;
  actor: string;
}

export interface DemoTeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: TeamRole;
  title: string;
  assignedPropertyIds: string[];
  active: boolean;
  avatarInitials: string;
}

export interface SavedReport {
  id: string;
  name: string;
  reportType: string;
  propertyId: string;
  dateRange: string;
  createdAt: string;
}

export interface WorkspaceSettings {
  companyName: string;
  portfolioName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD';
  dateFormat: 'MMM d, yyyy' | 'yyyy-MM-dd' | 'dd/MM/yyyy';
  timezone: string;
  defaultRentDueDay: number;
  defaultLeaseTermMonths: number;
  lateFeeEnabled: boolean;
  lateFeeGraceDays: number;
  lateFeeFlatAmount: number;
  prorationMethod: 'ActualDaysInMonth' | 'Standard30Day';
  defaultMaintenancePriority: MaintenancePriority;
  notificationsEnabled: boolean;
}

export interface EstaviaDataset {
  version: number;
  referenceDate: string; // e.g., '2026-11-13'
  properties: Property[];
  buildings: Building[];
  floors: Floor[];
  units: Unit[];
  tenants: Tenant[];
  applications: RentalApplication[];
  leases: Lease[];
  leaseRenewals: LeaseRenewal[];
  rentCharges: RentCharge[];
  rentPayments: RentPayment[];
  paymentAllocations: PaymentAllocation[];
  depositTransactions: SecurityDepositTransaction[];
  expenses: PropertyExpense[];
  maintenanceRequests: MaintenanceRequest[];
  vendors: Vendor[];
  inspections: Inspection[];
  activities: Activity[];
  teamMembers: DemoTeamMember[];
  savedReports: SavedReport[];
}
