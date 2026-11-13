import Decimal from 'decimal.js';
import {
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceStage,
  Property,
  PropertyExpense,
  Unit,
  Vendor,
} from '../types';

export const MAINTENANCE_STAGES: MaintenanceStage[] = [
  'New',
  'Reviewed',
  'Assigned',
  'In Progress',
  'Resolved',
  'Closed',
  'Cancelled',
];

export const OPEN_MAINTENANCE_STAGES: MaintenanceStage[] = [
  'New',
  'Reviewed',
  'Assigned',
  'In Progress',
];

export function isMaintenanceRequestOpen(request: MaintenanceRequest): boolean {
  return OPEN_MAINTENANCE_STAGES.includes(request.stage);
}

export function resolveMaintenanceTechnician(
  request: MaintenanceRequest,
  vendors: Vendor[]
): {
  technicianKey: string;
  technicianName: string;
  vendorName: string;
  vendorId?: string;
} {
  if (request.vendorId) {
    const vendor = vendors.find((v) => v.id === request.vendorId);
    if (vendor) {
      return {
        technicianKey: vendor.contactName,
        technicianName: vendor.contactName,
        vendorName: vendor.businessName,
        vendorId: vendor.id,
      };
    }
  }
  return {
    technicianKey: 'Unassigned',
    technicianName: 'Unassigned',
    vendorName: 'No Vendor Assigned',
  };
}

export interface MaintenanceReportFilterInput {
  requests: MaintenanceRequest[];
  vendors: Vendor[];
  properties?: Property[];
  units?: Unit[];
  referenceDate: string;
  onlyOpen?: boolean;
  category?: MaintenanceCategory | 'all';
  technician?: string | 'all'; // 'all', 'Unassigned', or technician contactName / vendorId
  priority?: MaintenancePriority | 'all';
  propertyId?: string | 'all';
  stage?: MaintenanceStage | 'all';
  searchQuery?: string;
}

export interface TechnicianWorkloadItem {
  technicianName: string;
  vendorName: string;
  vendorId?: string;
  openCount: number;
  emergencyCount: number;
  highCount: number;
  overdueCount: number;
  estimatedCost: number;
}

export interface CategoryBreakdownItem {
  category: MaintenanceCategory;
  count: number;
  emergencyOrHighCount: number;
  estimatedCost: number;
}

export interface PriorityBreakdownItem {
  priority: MaintenancePriority;
  count: number;
  estimatedCost: number;
}

export interface MaintenanceReportSummary {
  filteredRequests: MaintenanceRequest[];
  totalOpenCount: number;
  emergencyCount: number;
  highPriorityCount: number;
  emergencyAndHighCount: number;
  overdueCount: number;
  assignedCount: number;
  unassignedCount: number;
  assignmentRate: number;
  totalEstimatedCost: number;
  byCategory: CategoryBreakdownItem[];
  byPriority: PriorityBreakdownItem[];
  byTechnician: TechnicianWorkloadItem[];
}

export function aggregateOpenWorkOrdersReport(
  input: MaintenanceReportFilterInput
): MaintenanceReportSummary {
  const {
    requests,
    vendors,
    properties = [],
    units = [],
    referenceDate,
    onlyOpen = true,
    category = 'all',
    technician = 'all',
    priority = 'all',
    propertyId = 'all',
    stage = 'all',
    searchQuery = '',
  } = input;

  const q = searchQuery.trim().toLowerCase();

  const filteredRequests = requests.filter((req) => {
    if (onlyOpen && !isMaintenanceRequestOpen(req)) {
      return false;
    }
    if (stage !== 'all' && req.stage !== stage) {
      return false;
    }
    if (propertyId !== 'all' && req.propertyId !== propertyId) {
      return false;
    }
    if (category !== 'all' && req.category !== category) {
      return false;
    }
    if (priority !== 'all' && req.priority !== priority) {
      return false;
    }

    const techInfo = resolveMaintenanceTechnician(req, vendors);
    if (technician !== 'all') {
      if (technician === 'Unassigned') {
        if (techInfo.technicianName !== 'Unassigned') return false;
      } else if (
        techInfo.technicianName.toLowerCase() !== technician.toLowerCase() &&
        req.vendorId !== technician
      ) {
        return false;
      }
    }

    if (q) {
      const prop = properties.find((p) => p.id === req.propertyId);
      const unit = units.find((u) => u.id === req.unitId);
      const matchesCode = req.code.toLowerCase().includes(q);
      const matchesTitle = req.title.toLowerCase().includes(q);
      const matchesCategory = req.category.toLowerCase().includes(q);
      const matchesTech =
        techInfo.technicianName.toLowerCase().includes(q) ||
        techInfo.vendorName.toLowerCase().includes(q);
      const matchesProp =
        prop?.name.toLowerCase().includes(q) ||
        prop?.code.toLowerCase().includes(q);
      const matchesUnit = unit?.unitNumber.toLowerCase().includes(q);

      if (
        !matchesCode &&
        !matchesTitle &&
        !matchesCategory &&
        !matchesTech &&
        !matchesProp &&
        !matchesUnit
      ) {
        return false;
      }
    }

    return true;
  });

  let totalEstimatedDec = new Decimal(0);
  let emergencyCount = 0;
  let highPriorityCount = 0;
  let overdueCount = 0;
  let assignedCount = 0;
  let unassignedCount = 0;

  const categories: MaintenanceCategory[] = [
    'HVAC',
    'Plumbing',
    'Electrical',
    'Appliances',
    'Structural',
    'Locks & Security',
    'Common Area',
    'General',
  ];

  const priorities: MaintenancePriority[] = [
    'Emergency',
    'High',
    'Medium',
    'Low',
  ];

  const categoryMap = new Map<
    MaintenanceCategory,
    { count: number; emergencyOrHighCount: number; costDec: Decimal }
  >();
  categories.forEach((c) =>
    categoryMap.set(c, { count: 0, emergencyOrHighCount: 0, costDec: new Decimal(0) })
  );

  const priorityMap = new Map<
    MaintenancePriority,
    { count: number; costDec: Decimal }
  >();
  priorities.forEach((p) =>
    priorityMap.set(p, { count: 0, costDec: new Decimal(0) })
  );

  const techMap = new Map<
    string,
    {
      technicianName: string;
      vendorName: string;
      vendorId?: string;
      openCount: number;
      emergencyCount: number;
      highCount: number;
      overdueCount: number;
      costDec: Decimal;
    }
  >();

  for (const req of filteredRequests) {
    const costDec = new Decimal(req.estimatedCost || 0);
    totalEstimatedDec = totalEstimatedDec.plus(costDec);

    const isOverdue =
      isMaintenanceRequestOpen(req) && req.dueDate < referenceDate;
    if (isOverdue) overdueCount++;

    if (req.priority === 'Emergency') emergencyCount++;
    if (req.priority === 'High') highPriorityCount++;

    const techInfo = resolveMaintenanceTechnician(req, vendors);
    if (techInfo.technicianName === 'Unassigned') {
      unassignedCount++;
    } else {
      assignedCount++;
    }

    const catEntry = categoryMap.get(req.category);
    if (catEntry) {
      catEntry.count += 1;
      if (req.priority === 'Emergency' || req.priority === 'High') {
        catEntry.emergencyOrHighCount += 1;
      }
      catEntry.costDec = catEntry.costDec.plus(costDec);
    }

    const prioEntry = priorityMap.get(req.priority);
    if (prioEntry) {
      prioEntry.count += 1;
      prioEntry.costDec = prioEntry.costDec.plus(costDec);
    }

    const existingTech = techMap.get(techInfo.technicianKey);
    if (existingTech) {
      existingTech.openCount += 1;
      if (req.priority === 'Emergency') existingTech.emergencyCount += 1;
      if (req.priority === 'High') existingTech.highCount += 1;
      if (isOverdue) existingTech.overdueCount += 1;
      existingTech.costDec = existingTech.costDec.plus(costDec);
    } else {
      techMap.set(techInfo.technicianKey, {
        technicianName: techInfo.technicianName,
        vendorName: techInfo.vendorName,
        vendorId: techInfo.vendorId,
        openCount: 1,
        emergencyCount: req.priority === 'Emergency' ? 1 : 0,
        highCount: req.priority === 'High' ? 1 : 0,
        overdueCount: isOverdue ? 1 : 0,
        costDec,
      });
    }
  }

  const totalOpenCount = filteredRequests.length;
  const assignmentRate =
    totalOpenCount > 0
      ? Number(((assignedCount / totalOpenCount) * 100).toFixed(1))
      : 100;

  const byCategory: CategoryBreakdownItem[] = categories
    .map((categoryName) => {
      const item = categoryMap.get(categoryName)!;
      return {
        category: categoryName,
        count: item.count,
        emergencyOrHighCount: item.emergencyOrHighCount,
        estimatedCost: item.costDec.toNumber(),
      };
    })
    .filter((c) => c.count > 0);

  const byPriority: PriorityBreakdownItem[] = priorities.map((pName) => {
    const item = priorityMap.get(pName)!;
    return {
      priority: pName,
      count: item.count,
      estimatedCost: item.costDec.toNumber(),
    };
  });

  const byTechnician: TechnicianWorkloadItem[] = Array.from(techMap.values())
    .map((t) => ({
      technicianName: t.technicianName,
      vendorName: t.vendorName,
      vendorId: t.vendorId,
      openCount: t.openCount,
      emergencyCount: t.emergencyCount,
      highCount: t.highCount,
      overdueCount: t.overdueCount,
      estimatedCost: t.costDec.toNumber(),
    }))
    .sort((a, b) => {
      if (a.technicianName === 'Unassigned') return 1;
      if (b.technicianName === 'Unassigned') return -1;
      return b.openCount - a.openCount;
    });

  return {
    filteredRequests,
    totalOpenCount,
    emergencyCount,
    highPriorityCount,
    emergencyAndHighCount: emergencyCount + highPriorityCount,
    overdueCount,
    assignedCount,
    unassignedCount,
    assignmentRate,
    totalEstimatedCost: totalEstimatedDec.toNumber(),
    byCategory,
    byPriority,
    byTechnician,
  };
}

const ALLOWED_STAGE_TRANSITIONS: Record<MaintenanceStage, MaintenanceStage[]> = {
  New: ['Reviewed', 'Assigned', 'In Progress', 'Cancelled'],
  Reviewed: ['Assigned', 'In Progress', 'Cancelled'],
  Assigned: ['In Progress', 'Resolved', 'Cancelled'],
  'In Progress': ['Assigned', 'Resolved', 'Cancelled'],
  Resolved: ['Closed', 'In Progress'],
  Closed: ['In Progress'], // Explicit reopen permitted
  Cancelled: ['New', 'Reviewed'],
};

export function canTransitionMaintenanceStage(
  fromStage: MaintenanceStage,
  toStage: MaintenanceStage
): boolean {
  if (fromStage === toStage) return true;
  return ALLOWED_STAGE_TRANSITIONS[fromStage]?.includes(toStage) ?? false;
}

export function transitionMaintenanceStage(
  request: MaintenanceRequest,
  targetStage: MaintenanceStage,
  referenceDate: string
): {
  valid: boolean;
  error?: string;
  updatedRequest?: MaintenanceRequest;
} {
  if (!canTransitionMaintenanceStage(request.stage, targetStage)) {
    return {
      valid: false,
      error: `Cannot transition work order from ${request.stage} to ${targetStage}.`,
    };
  }

  const updatedRequest: MaintenanceRequest = {
    ...request,
    stage: targetStage,
    resolvedAt:
      targetStage === 'Resolved' ? referenceDate : request.resolvedAt,
    closedAt: targetStage === 'Closed' ? referenceDate : request.closedAt,
  };

  return { valid: true, updatedRequest };
}

/**
 * Creates or updates a single linked PropertyExpense for a MaintenanceRequest's actual cost,
 * ensuring maintenance expenses are represented ONCE in financial summaries and never double-counted.
 */
export function syncMaintenanceActualCostToExpense(
  request: MaintenanceRequest,
  actualCost: number,
  existingExpenses: PropertyExpense[],
  referenceDate: string
): {
  updatedRequest: MaintenanceRequest;
  newExpense?: PropertyExpense;
  updatedExpense?: PropertyExpense;
} {
  if (request.linkedExpenseId) {
    const existing = existingExpenses.find((e) => e.id === request.linkedExpenseId);
    if (existing) {
      const updatedExpense: PropertyExpense = {
        ...existing,
        amount: actualCost,
        vendorId: request.vendorId,
      };
      return {
        updatedRequest: { ...request, actualCost },
        updatedExpense,
      };
    }
  }

  const seq = existingExpenses.length + 3001;
  const expenseId = `exp-maint-${request.id}`;
  const newExpense: PropertyExpense = {
    id: expenseId,
    code: `EXP-${seq}`,
    propertyId: request.propertyId,
    unitId: request.unitId,
    vendorId: request.vendorId,
    maintenanceRequestId: request.id,
    category: 'Repairs',
    description: `Work Order ${request.code}: ${request.title}`,
    date: referenceDate,
    amount: actualCost,
    status: 'Paid',
    reference: `WO-${request.code}`,
  };

  return {
    updatedRequest: {
      ...request,
      actualCost,
      linkedExpenseId: expenseId,
    },
    newExpense,
  };
}

