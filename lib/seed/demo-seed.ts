import {
  Activity,
  Building,
  DemoTeamMember,
  EstaviaDataset,
  Floor,
  Inspection,
  Lease,
  LeaseRenewal,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceStage,
  PaymentAllocation,
  Property,
  PropertyExpense,
  PropertyType,
  RentCharge,
  RentPayment,
  RentalApplication,
  SavedReport,
  SecurityDepositTransaction,
  Tenant,
  Unit,
  UnitType,
  Vendor,
  WorkspaceSettings,
} from '../types';
import { buildRentChargeIdempotencyKey, recalculateRentChargeState } from '../engines/rent-engine';

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  companyName: 'Aurelia Real Estate Partners',
  portfolioName: 'North American Core & Urban Portfolio',
  companyEmail: 'operations@aureliapartners.demo',
  companyPhone: '+1 (212) 555-0194',
  companyAddress: '450 Lexington Ave, Suite 2800, New York, NY 10017',
  currency: 'USD',
  dateFormat: 'MMM d, yyyy',
  timezone: 'America/New_York',
  defaultRentDueDay: 1,
  defaultLeaseTermMonths: 12,
  lateFeeEnabled: true,
  lateFeeGraceDays: 5,
  lateFeeFlatAmount: 75,
  prorationMethod: 'ActualDaysInMonth',
  defaultMaintenancePriority: 'Medium',
  notificationsEnabled: true,
};

const FIRST_NAMES = [
  'Eleanor', 'Marcus', 'Clara', 'Julian', 'Sofia', 'Harrison', 'Nadia', 'Sebastian',
  'Camille', 'Arthur', 'Vivian', 'Desmond', 'Helena', 'Gabriel', 'Lydia', 'Mateo',
  'Genevieve', 'Adrian', 'Celeste', 'Xavier', 'Naomi', 'Dominic', 'Audrey', 'logan',
  'Beatrice', 'Olivier', 'Maya', 'Theodore', 'Iris', 'Lucas', 'Penelope', 'Felix',
];

const LAST_NAMES = [
  'Vance', 'Sterling', 'Montague', 'Kensington', 'Chen', 'Alvarez', 'Lindqvist', 'Mercer',
  'Thorne', 'Rousseau', 'Hargrove', 'Castillo', 'Okafor', 'Sinclair', 'Takahashi', 'Davenport',
  'Kowalski', 'Delacroix', 'Bellingham', 'Moreau', 'Sorensen', 'Whitaker', 'Ashford', 'kapoor',
];

const EMPLOYERS = [
  'Vanguard Capital Group', 'Meridian Architecture', 'Solstice BioLabs', 'Northstar Legal LLP',
  'Aether Cloud Systems', 'St. Jude Medical Center', 'Kestrel Industrial Design', 'Bespoke Culinary Group',
  'Columbia University', 'Veritas Financial Advisory', 'Orion Aerospace', 'Pacific Media Collective',
];

const OCCUPATIONS = [
  'Senior Architect', 'Principal Software Engineer', 'Portfolio Strategist', 'Corporate Counsel',
  'Clinical Researcher', 'Product Director', 'Quantitative Analyst', 'Industrial Designer',
  'Managing Editor', 'Cardiology Fellow', 'Operations Director', 'UX Principal',
];

export function generateDeterministicDemoDataset(): EstaviaDataset {
  const referenceDate = '2026-11-13';

  const propertyTemplates: Array<{
    id: string;
    code: string;
    name: string;
    type: PropertyType;
    address: string;
    city: string;
    state: string;
    floors: number;
    buildings: number;
    unitsPerFloor: number;
    baseRent: number;
    value: number;
    yearBuilt: number;
    imageUrl: string;
    description: string;
    amenities: string[];
  }> = [
    {
      id: 'prop-1',
      code: 'EST-NYC-01',
      name: 'The Sovereign at Gramercy',
      type: 'Apartment Building',
      address: '214 East 21st Street',
      city: 'New York',
      state: 'NY',
      floors: 6,
      buildings: 1,
      unitsPerFloor: 4,
      baseRent: 4200,
      value: 28500000,
      yearBuilt: 2019,
      imageUrl: 'architectural-gramercy',
      description: 'Limestone and bronze luxury mid-rise overlooking Gramercy Park corridor with private concierge and landscaped roof terrace.',
      amenities: ['24/7 Concierge', 'Rooftop Terrace', 'Fitness Studio', 'Bike Vault', 'Package Locker'],
    },
    {
      id: 'prop-2',
      code: 'EST-BOS-02',
      name: 'Beacon Hill Conservatory Lofts',
      type: 'Residential Complex',
      address: '88 Mount Vernon Street',
      city: 'Boston',
      state: 'MA',
      floors: 4,
      buildings: 2,
      unitsPerFloor: 3,
      baseRent: 3450,
      value: 22400000,
      yearBuilt: 2016,
      imageUrl: 'architectural-beacon',
      description: 'Historic brownstone façade reimagined with double-height timber lofts, private courtyard gardens, and heated underground parking.',
      amenities: ['Courtyard Garden', 'Heated Garage', 'EV Charging', 'Resident Lounge', 'Wine Cellar'],
    },
    {
      id: 'prop-3',
      code: 'EST-CHI-03',
      name: 'Fulton Market Foundry Tower',
      type: 'Mixed-Use Property',
      address: '340 North Morgan Street',
      city: 'Chicago',
      state: 'IL',
      floors: 5,
      buildings: 1,
      unitsPerFloor: 4,
      baseRent: 3100,
      value: 31200000,
      yearBuilt: 2021,
      imageUrl: 'architectural-fulton',
      description: 'Ground-floor flagship retail and architectural showroom with four upper stories of industrial-modern residences.',
      amenities: ['Ground Retail', 'Coworking Library', 'Sky Deck', 'Dog Spa', 'Smart Access'],
    },
    {
      id: 'prop-4',
      code: 'EST-SFO-04',
      name: 'Pacific Heights Atrium',
      type: 'Apartment Building',
      address: '2410 Broadway',
      city: 'San Francisco',
      state: 'CA',
      floors: 5,
      buildings: 1,
      unitsPerFloor: 3,
      baseRent: 4650,
      value: 26800000,
      yearBuilt: 2018,
      imageUrl: 'architectural-pacific',
      description: 'Panoramic bay-view residences featuring radiant floor heating, acoustic glazing, and seismic base isolation.',
      amenities: ['Bay View Lounge', 'Seismic Engineering', 'Private Storage', 'Valet Garage'],
    },
    {
      id: 'prop-5',
      code: 'EST-AUS-05',
      name: 'Shoal Creek Executive Plaza',
      type: 'Commercial Building',
      address: '605 West 5th Street',
      city: 'Austin',
      state: 'TX',
      floors: 4,
      buildings: 1,
      unitsPerFloor: 3,
      baseRent: 5800,
      value: 34000000,
      yearBuilt: 2022,
      imageUrl: 'architectural-shoal',
      description: 'LEED Platinum Class-A boutique commercial suites tailored for design firms, family offices, and technology studios.',
      amenities: ['LEED Platinum', 'Boardroom Suite', 'Fiber Redundancy', 'Tenant Shower Suites'],
    },
    {
      id: 'prop-6',
      code: 'EST-SEA-06',
      name: 'Alderwood Terrace Townhomes',
      type: 'Townhouse Portfolio',
      address: '1420 East Mercer Street',
      city: 'Seattle',
      state: 'WA',
      floors: 3,
      buildings: 2,
      unitsPerFloor: 2,
      baseRent: 3750,
      value: 16900000,
      yearBuilt: 2020,
      imageUrl: 'architectural-alderwood',
      description: 'Row of twelve architectural cedar-and-steel townhomes on Capitol Hill with private garages and green roofs.',
      amenities: ['Private Garage', 'Green Roof', 'Hydronic Heating', 'Private Patio'],
    },
    {
      id: 'prop-7',
      code: 'EST-DEN-07',
      name: 'Union Station Meridian Commons',
      type: 'Residential Complex',
      address: '1750 Wewatta Street',
      city: 'Denver',
      state: 'CO',
      floors: 4,
      buildings: 2,
      unitsPerFloor: 2,
      baseRent: 2750,
      value: 19500000,
      yearBuilt: 2019,
      imageUrl: 'architectural-meridian',
      description: 'Transit-oriented urban residences adjacent to Union Station with heated lap pool and mountain vista loggia.',
      amenities: ['Heated Pool', 'Ski & Gear Workshop', 'Co-Working Pods', 'Controlled Access'],
    },
    {
      id: 'prop-8',
      code: 'EST-MIA-08',
      name: 'Coconut Grove Bayfront Villas',
      type: 'Apartment Building',
      address: '2880 Tigertail Avenue',
      city: 'Miami',
      state: 'FL',
      floors: 4,
      buildings: 1,
      unitsPerFloor: 3,
      baseRent: 4100,
      value: 24100000,
      yearBuilt: 2021,
      imageUrl: 'architectural-bayfront',
      description: 'Tropical brutalist sanctuary framed by coral stone colonnades, Hurricane-impact glass, and saltwater plunge pools.',
      amenities: ['Saltwater Pool', 'Impact Glazing', 'Valet Parking', 'Tropical Botanical Court'],
    },
    {
      id: 'prop-9',
      code: 'EST-WAS-09',
      name: 'Georgetown Canal Row',
      type: 'Mixed-Use Property',
      address: '1055 Thomas Jefferson St NW',
      city: 'Washington',
      state: 'DC',
      floors: 4,
      buildings: 1,
      unitsPerFloor: 3,
      baseRent: 3850,
      value: 21700000,
      yearBuilt: 2017,
      imageUrl: 'architectural-georgetown',
      description: 'Masonry canal-side complex pairing boutique ground-level galleries with refined diplomatic residences above.',
      amenities: ['Canal Courtyard', 'Doorman', 'Private Elevators', 'Diplomatic Security'],
    },
    {
      id: 'prop-10',
      code: 'EST-CHA-10',
      name: 'King Street Heritage Portfolio',
      type: 'Single-Family Rental',
      address: '412 King Street',
      city: 'Charleston',
      state: 'SC',
      floors: 2,
      buildings: 2,
      unitsPerFloor: 2,
      baseRent: 3600,
      value: 11800000,
      yearBuilt: 2015,
      imageUrl: 'architectural-charleston',
      description: 'Curated collection of restored single-family carriage homes with double piazzas and walled jasmine courtyards.',
      amenities: ['Double Piazzas', 'Walled Garden', 'Off-Street Parking', 'Chef Kitchens'],
    },
    {
      id: 'prop-11',
      code: 'EST-POR-11',
      name: 'Pearl District Timber Exchange',
      type: 'Commercial Building',
      address: '1120 NW Couch Street',
      city: 'Portland',
      state: 'OR',
      floors: 4,
      buildings: 1,
      unitsPerFloor: 2,
      baseRent: 4900,
      value: 18400000,
      yearBuilt: 2023,
      imageUrl: 'architectural-timber',
      description: 'Cross-laminated mass timber commercial building featuring daylight atrium and net-zero energy systems.',
      amenities: ['Mass Timber Structure', 'Solar Array', 'End-of-Trip Bike Hub', 'Atrium Cafe'],
    },
    {
      id: 'prop-12',
      code: 'EST-NAS-12',
      name: 'Sylvan Park Veranda Row',
      type: 'Townhouse Portfolio',
      address: '4508 Murphy Road',
      city: 'Nashville',
      state: 'TN',
      floors: 3,
      buildings: 1,
      unitsPerFloor: 3,
      baseRent: 2950,
      value: 13200000,
      yearBuilt: 2021,
      imageUrl: 'architectural-sylvan',
      description: 'Contemporary brick townhomes featuring acoustic music studio rooms, screened verandas, and private two-car garages.',
      amenities: ['Acoustic Studio Room', 'Screened Veranda', 'Two-Car Garage', 'Smart Thermostat'],
    },
  ];

  const properties: Property[] = [];
  const buildings: Building[] = [];
  const floors: Floor[] = [];
  const units: Unit[] = [];
  const tenants: Tenant[] = [];
  const leases: Lease[] = [];
  const leaseRenewals: LeaseRenewal[] = [];
  const applications: RentalApplication[] = [];
  const rentCharges: RentCharge[] = [];
  const rentPayments: RentPayment[] = [];
  const paymentAllocations: PaymentAllocation[] = [];
  const depositTransactions: SecurityDepositTransaction[] = [];
  const expenses: PropertyExpense[] = [];
  const maintenanceRequests: MaintenanceRequest[] = [];
  const vendors: Vendor[] = [];
  const inspections: Inspection[] = [];
  const activities: Activity[] = [];

  let unitCounter = 1;
  let tenantCounter = 1;
  let leaseCounter = 101;
  let chargeCounter = 1001;
  let paymentCounter = 5001;
  let depositCounter = 7001;

  const unitTypesResidential: UnitType[] = ['Studio', '1 Bedroom', '2 Bedroom', '3 Bedroom', 'Penthouse'];
  const unitTypesCommercial: UnitType[] = ['Commercial Suite', 'Retail Space'];

  for (let pIdx = 0; pIdx < propertyTemplates.length; pIdx++) {
    const tpl = propertyTemplates[pIdx];
    const totalUnitsForProp = tpl.buildings * tpl.floors * tpl.unitsPerFloor;

    properties.push({
      id: tpl.id,
      code: tpl.code,
      name: tpl.name,
      type: tpl.type,
      address: tpl.address,
      city: tpl.city,
      state: tpl.state,
      country: 'United States',
      floorsCount: tpl.floors,
      targetUnitsCount: totalUnitsForProp,
      status: pIdx === 10 ? 'Under Renovation' : 'Active',
      description: tpl.description,
      amenities: tpl.amenities,
      imageUrl: tpl.imageUrl,
      notes: `Managed under ${DEFAULT_WORKSPACE_SETTINGS.portfolioName}. Routine inspections quarterly.`,
      estimatedValue: tpl.value,
      yearBuilt: tpl.yearBuilt,
      createdAt: '2025-01-10',
    });

    for (let bIdx = 1; bIdx <= tpl.buildings; bIdx++) {
      const buildingId = `bldg-${tpl.id}-${bIdx}`;
      const buildingName =
        tpl.buildings > 1
          ? `${tpl.name.split(' ')[0]} Wing ${String.fromCharCode(64 + bIdx)}`
          : 'Main Architectural Tower';

      buildings.push({
        id: buildingId,
        propertyId: tpl.id,
        name: buildingName,
        code: `${tpl.code}-B${bIdx}`,
        floorsCount: tpl.floors,
      });

      for (let fNum = 1; fNum <= tpl.floors; fNum++) {
        const floorId = `flr-${buildingId}-${fNum}`;
        floors.push({
          id: floorId,
          propertyId: tpl.id,
          buildingId,
          floorNumber: fNum,
          label: fNum === 1 ? 'Floor 1 (Ground)' : fNum === tpl.floors ? `Floor ${fNum} (Penthouse / Upper)` : `Floor ${fNum}`,
        });

        for (let uPos = 1; uPos <= tpl.unitsPerFloor; uPos++) {
          const unitId = `unit-${unitCounter++}`;
          const unitNumber =
            tpl.buildings > 1
              ? `${String.fromCharCode(64 + bIdx)}${fNum}0${uPos}`
              : `${fNum}0${uPos}`;

          const isComm = tpl.type === 'Commercial Building' || (tpl.type === 'Mixed-Use Property' && fNum === 1);
          const uType: UnitType = isComm
            ? unitTypesCommercial[(uPos + fNum) % unitTypesCommercial.length]
            : tpl.type === 'Townhouse Portfolio'
            ? 'Townhouse'
            : fNum === tpl.floors && uPos === tpl.unitsPerFloor
            ? 'Penthouse'
            : unitTypesResidential[(uPos + fNum - 2) % 4];

          const bedrooms =
            isComm ? 0 : uType === 'Studio' ? 0 : uType === '1 Bedroom' ? 1 : uType === '2 Bedroom' ? 2 : 3;
          const bathrooms = isComm ? 1 : bedrooms === 0 ? 1 : bedrooms === 1 ? 1 : bedrooms === 2 ? 2 : 2.5;
          const sqFt = isComm ? 1450 + uPos * 350 : 620 + bedrooms * 340 + fNum * 25;
          const askingRent = Math.round((tpl.baseRent + bedrooms * 550 + fNum * 85) / 25) * 25;

          // Deterministic occupancy distribution (~84% occupied, ~6% vacant, ~5% reserved, ~5% under maintenance/unavailable)
          const mod = (unitCounter + pIdx) % 20;
          let availabilityMode: Unit['availabilityMode'] = 'Available';
          if (mod === 17) availabilityMode = 'Reserved';
          else if (mod === 18) availabilityMode = 'Under Maintenance';
          else if (mod === 19 && pIdx === 10) availabilityMode = 'Unavailable';

          const unit: Unit = {
            id: unitId,
            propertyId: tpl.id,
            buildingId,
            floorId,
            floorNumber: fNum,
            unitNumber,
            type: uType,
            bedrooms,
            bathrooms,
            sqFt,
            askingRent,
            availabilityMode,
            amenities: ['Hardwood Floors', 'Smart Lock', 'In-Unit Laundry', 'Acoustic Glazing'].slice(0, 2 + (uPos % 3)),
          };
          units.push(unit);

          // Create tenant and active lease for occupied units (mod 0..14)
          if (mod <= 14 && availabilityMode === 'Available') {
            const tIdx = tenantCounter++;
            const firstName = FIRST_NAMES[(tIdx * 3) % FIRST_NAMES.length];
            const lastName = LAST_NAMES[(tIdx * 5) % LAST_NAMES.length];
            const capitalizedFirst = firstName.charAt(0).toUpperCase() + firstName.slice(1);
            const capitalizedLast = lastName.charAt(0).toUpperCase() + lastName.slice(1);
            const fullName = `${capitalizedFirst} ${capitalizedLast}`;
            const tenantId = `ten-${tIdx}`;

            // Stagger start dates across 2026 so some leases are expiring soon (Nov/Dec 2026)
            const startMonth = ((tIdx % 10) + 1);
            const startMonthStr = String(startMonth).padStart(2, '0');
            const startDate = startMonth >= 11 ? `2025-${startMonthStr}-01` : `2026-${startMonthStr}-01`;
            const endDate = startMonth >= 11
              ? `2026-${startMonthStr === '11' ? '12' : '12'}-01`
              : `2027-${startMonthStr}-01`;

            tenants.push({
              id: tenantId,
              code: `TEN-${1000 + tIdx}`,
              firstName: capitalizedFirst,
              lastName: capitalizedLast,
              fullName,
              email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${tIdx}@example.demo`,
              phone: `+1 (${212 + (pIdx * 17) % 700}) 555-${String(1000 + tIdx).slice(-4)}`,
              emergencyContactName: `${FIRST_NAMES[(tIdx + 7) % FIRST_NAMES.length]} ${capitalizedLast}`,
              emergencyContactPhone: `+1 (646) 555-${String(3000 + tIdx).slice(-4)}`,
              occupation: OCCUPATIONS[tIdx % OCCUPATIONS.length],
              employer: EMPLOYERS[tIdx % EMPLOYERS.length],
              moveInDate: startDate,
              notes: 'Verified fictional demonstration profile. enrolled in autopay demo ledger.',
              createdAt: startDate,
            });

            // For every 6th tenant, also create a prior historical expired lease in 2025-2026
            let previousLeaseId: string | undefined;
            if (tIdx % 6 === 0 && startDate.startsWith('2026-')) {
              const histLeaseId = `lease-hist-${leaseCounter}`;
              const histCode = `LSE-${leaseCounter++}`;
              const histRent = askingRent - 150;
              const prevStart = `2025-${startMonthStr}-01`;
              const prevEnd = startDate; // Half-open [prevStart, startDate) - back-to-back with zero overlap!

              const currLeaseId = `lease-${leaseCounter}`;
              leases.push({
                id: histLeaseId,
                code: histCode,
                propertyId: tpl.id,
                unitId: unit.id,
                tenantId,
                startDate: prevStart,
                endDate: prevEnd,
                monthlyRent: histRent,
                securityDeposit: histRent,
                paymentDueDay: 1,
                billingFrequency: 'Monthly',
                status: 'Expired',
                renewedToLeaseId: currLeaseId,
                notes: 'Initial 12-month lease term (renewed).',
                createdAt: prevStart,
              });

              leaseRenewals.push({
                id: `ren-${histLeaseId}`,
                originalLeaseId: histLeaseId,
                newLeaseId: currLeaseId,
                renewedAt: startDate,
                previousRent: histRent,
                newRent: askingRent,
                notes: 'Annual renewal with 3.8% rent adjustment.',
              });
              previousLeaseId = histLeaseId;
            }

            const activeLeaseId = `lease-${leaseCounter}`;
            const activeLeaseCode = `LSE-${leaseCounter++}`;
            const activeLease: Lease = {
              id: activeLeaseId,
              code: activeLeaseCode,
              propertyId: tpl.id,
              unitId: unit.id,
              tenantId,
              startDate,
              endDate,
              monthlyRent: askingRent,
              securityDeposit: askingRent,
              paymentDueDay: 1,
              billingFrequency: 'Monthly',
              status: 'Active',
              previousLeaseId,
              lateFeeRuleEnabled: true,
              notes: 'Standard residential/commercial demonstration lease agreement.',
              createdAt: startDate,
            };
            leases.push(activeLease);

            // Security deposit receipt
            depositTransactions.push({
              id: `dep-${depositCounter}`,
              code: `DEP-${depositCounter++}`,
              leaseId: activeLease.id,
              propertyId: tpl.id,
              unitId: unit.id,
              tenantId,
              date: startDate,
              type: 'Receipt',
              amount: askingRent,
              reference: `ESCROW-${1000 + tIdx}`,
              notes: 'Initial security deposit received at lease signing.',
            });

            // Generate monthly rent charges for Sep, Oct, Nov 2026 (plus earlier months for top properties)
            const billingMonths =
              pIdx < 4
                ? ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']
                : ['2026-09', '2026-10', '2026-11'];

            for (const period of billingMonths) {
              if (startDate > `${period}-01`) continue;
              const chargeId = `rc-${activeLease.id}-${period}`;
              const chargeCode = `INV-${chargeCounter++}`;
              const dueDate = `${period}-01`;
              const idempotencyKey = buildRentChargeIdempotencyKey(activeLease.id, period, 'Base Rent');

              // Determine payment state for November 2026 vs prior months
              let amountPaid = askingRent;
              let creditsApplied = 0;

              if (period === '2026-11') {
                if (tIdx % 11 === 0) {
                  // Unpaid overdue in Nov 2026
                  amountPaid = 0;
                } else if (tIdx % 7 === 0) {
                  // Partially paid in Nov 2026
                  amountPaid = Math.round(askingRent * 0.5);
                } else if (tIdx % 13 === 0) {
                  // Paid with a $150 credit adjustment
                  creditsApplied = 150;
                  amountPaid = askingRent - 150;
                }
              }

              const rawCharge: RentCharge = {
                id: chargeId,
                code: chargeCode,
                idempotencyKey,
                leaseId: activeLease.id,
                propertyId: tpl.id,
                unitId: unit.id,
                tenantId,
                billingPeriod: period,
                chargeType: 'Base Rent',
                dueDate,
                amount: askingRent,
                amountPaid,
                creditsApplied,
                balance: askingRent - amountPaid - creditsApplied,
                status: 'Paid',
                notes: `Monthly rent charge for ${period}`,
                createdAt: dueDate,
              };

              const finalizedCharge = recalculateRentChargeState(rawCharge, referenceDate);
              rentCharges.push(finalizedCharge);

              if (creditsApplied > 0) {
                const credId = `pay-cred-${paymentCounter}`;
                rentPayments.push({
                  id: credId,
                  code: `CRD-${paymentCounter++}`,
                  rentChargeId: chargeId,
                  leaseId: activeLease.id,
                  propertyId: tpl.id,
                  unitId: unit.id,
                  tenantId,
                  date: `${period}-02`,
                  amount: creditsApplied,
                  type: 'Credit',
                  method: 'Credit Adjustment',
                  reference: `CRED-${paymentCounter}`,
                  notes: 'Courtesy maintenance inconvenience credit.',
                  createdAt: `${period}-02`,
                });
              }

              if (amountPaid > 0) {
                const payId = `pay-${paymentCounter}`;
                const payCode = `PMT-${paymentCounter++}`;
                const methods: RentPayment['method'][] = [
                  'ACH Demo Transfer',
                  'Wire Demo',
                  'Check Record',
                  'Card Demo',
                ];
                rentPayments.push({
                  id: payId,
                  code: payCode,
                  rentChargeId: chargeId,
                  leaseId: activeLease.id,
                  propertyId: tpl.id,
                  unitId: unit.id,
                  tenantId,
                  date: `${period}-03`,
                  amount: amountPaid,
                  type: 'Payment',
                  method: methods[tIdx % methods.length],
                  reference: `ACH-${period.replace('-', '')}-${tIdx}`,
                  notes: amountPaid < askingRent - creditsApplied ? 'Partial installment received' : 'Full monthly rent settlement',
                  createdAt: `${period}-03`,
                });
                paymentAllocations.push({
                  id: `alloc-${payId}`,
                  paymentId: payId,
                  rentChargeId: chargeId,
                  amount: amountPaid,
                });
              }
            }
          } else if (availabilityMode === 'Reserved') {
            // Create a future Scheduled Lease starting Dec 1, 2026
            const tIdx = tenantCounter++;
            const firstName = FIRST_NAMES[(tIdx * 2) % FIRST_NAMES.length];
            const lastName = LAST_NAMES[(tIdx * 7) % LAST_NAMES.length];
            const fullName = `${firstName.charAt(0).toUpperCase() + firstName.slice(1)} ${lastName.charAt(0).toUpperCase() + lastName.slice(1)}`;
            const tenantId = `ten-${tIdx}`;

            tenants.push({
              id: tenantId,
              code: `TEN-${1000 + tIdx}`,
              firstName,
              lastName,
              fullName,
              email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${tIdx}@example.demo`,
              phone: `+1 (312) 555-${String(2000 + tIdx).slice(-4)}`,
              emergencyContactName: `Clara ${lastName}`,
              emergencyContactPhone: `+1 (312) 555-${String(4000 + tIdx).slice(-4)}`,
              occupation: OCCUPATIONS[tIdx % OCCUPATIONS.length],
              employer: EMPLOYERS[tIdx % EMPLOYERS.length],
              moveInDate: '2026-12-01',
              notes: 'Scheduled move-in December 1, 2026.',
              createdAt: '2026-11-01',
            });

            leases.push({
              id: `lease-${leaseCounter}`,
              code: `LSE-${leaseCounter++}`,
              propertyId: tpl.id,
              unitId: unit.id,
              tenantId,
              startDate: '2026-12-01',
              endDate: '2027-12-01',
              monthlyRent: askingRent,
              securityDeposit: askingRent,
              paymentDueDay: 1,
              billingFrequency: 'Monthly',
              status: 'Scheduled',
              notes: 'Future scheduled lease agreement; unit held as Reserved.',
              createdAt: '2026-11-02',
            });
          }
        }
      }
    }
  }

  // Vendors (18 realistic service providers)
  const vendorTemplates: Array<{
    name: string;
    cat: Vendor['category'];
    contact: string;
    rate: number;
    rating: number;
  }> = [
    { name: 'Apex Mechanical & HVAC Corp', cat: 'HVAC', contact: 'Robert Vance', rate: 145, rating: 4.9 },
    { name: 'ClearFlow Master Plumbing', cat: 'Plumbing', contact: 'Elena Rostova', rate: 130, rating: 4.8 },
    { name: 'VoltEdge Commercial Electrical', cat: 'Electrical', contact: 'Devon Brooks', rate: 140, rating: 4.9 },
    { name: 'SubZero & Miele Appliance Guild', cat: 'Appliances', contact: 'Hannah Abbott', rate: 125, rating: 4.7 },
    { name: 'Keystone Masonry & Structural', cat: 'Structural', contact: 'Omari Davis', rate: 165, rating: 4.8 },
    { name: 'Sentinel Access & Locksmiths', cat: 'Locks & Security', contact: 'Victor Chen', rate: 115, rating: 4.9 },
    { name: 'Verdant Urban Landscaping', cat: 'Landscaping', contact: 'Clara Soto', rate: 95, rating: 4.6 },
    { name: 'Pristine Atrium Maintenance', cat: 'Cleaning', contact: 'Grace Kim', rate: 85, rating: 4.8 },
    { name: 'Metropolitan Elevator & Lift', cat: 'General Contracting', contact: 'Warren Hale', rate: 190, rating: 4.7 },
    { name: 'Beacon Glass & Glazing', cat: 'Structural', contact: 'Milo Novak', rate: 150, rating: 4.8 },
    { name: 'Cascade Hydronic Systems', cat: 'Plumbing', contact: 'Tessa Lind', rate: 135, rating: 4.9 },
    { name: 'Harborview Fire & Safety', cat: 'Electrical', contact: 'Samuel Ortiz', rate: 155, rating: 5.0 },
  ];

  vendorTemplates.forEach((v, idx) => {
    vendors.push({
      id: `ven-${idx + 1}`,
      code: `VEN-${201 + idx}`,
      businessName: v.name,
      category: v.cat,
      contactName: v.contact,
      email: `dispatch@${v.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 14)}.demo`,
      phone: `+1 (800) 555-${String(6100 + idx).slice(-4)}`,
      hourlyRate: v.rate,
      rating: v.rating,
    });
  });

  // Maintenance Requests (36 across all 7 Kanban stages)
  const maintTitles: Array<{
    title: string;
    category: MaintenanceCategory;
    priority: MaintenancePriority;
    est: number;
    desc: string;
  }> = [
    {
      title: 'Variable Refrigerant HVAC Zone Sensor Calibration',
      category: 'HVAC',
      priority: 'High',
      est: 480,
      desc: 'Primary living zone thermostat reading 4 degrees above ambient setpoint; damper actuator inspection needed.',
    },
    {
      title: 'Under-Sink Low-Pressure Mixing Valve Drip',
      category: 'Plumbing',
      priority: 'Medium',
      est: 260,
      desc: 'Slow condensation drip observed at cold supply braided line beneath kitchen island.',
    },
    {
      title: 'Smart Fob Reader Intermittent Desync at Entry',
      category: 'Locks & Security',
      priority: 'High',
      est: 320,
      desc: 'Unit mortise smart lock requires battery bus replacement and firmware resync.',
    },
    {
      title: 'Induction Range Dual-Element Fault Code E4',
      category: 'Appliances',
      priority: 'Medium',
      est: 540,
      desc: 'Front left bridge induction coil displays E4 control board warning when set above level 7.',
    },
    {
      title: 'Dedicated 20A Kitchen Island GFCI Tripping',
      category: 'Electrical',
      priority: 'High',
      est: 290,
      desc: 'Breaker trips under combined espresso machine and dishwasher load; inspect AFCI/GFCI dual breaker.',
    },
    {
      title: 'Terrace Door Acoustic Weatherstripping Seal',
      category: 'Structural',
      priority: 'Low',
      est: 210,
      desc: 'Wind whistle audible along lower mullion seal during high coastal gusts.',
    },
    {
      title: 'Emergency Hot Water Recirculation Pump Fault',
      category: 'Plumbing',
      priority: 'Emergency',
      est: 1150,
      desc: 'Riser loop recirculation pump bearing noise and pressure drop on upper floors.',
    },
    {
      title: 'Lobby Recessed Linear LED Driver Flicker',
      category: 'Common Area',
      priority: 'Low',
      est: 380,
      desc: 'Cove architectural lighting driver on Floor 2 corridor requires 24V ballast swap.',
    },
  ];

  const allStages: MaintenanceStage[] = [
    'New',
    'Reviewed',
    'Assigned',
    'In Progress',
    'Resolved',
    'Closed',
    'Cancelled',
  ];

  for (let mIdx = 0; mIdx < 32; mIdx++) {
    const tpl = maintTitles[mIdx % maintTitles.length];
    const unit = units[(mIdx * 5) % units.length];
    const activeLease = leases.find((l) => l.unitId === unit.id && l.status === 'Active');
    const stage = allStages[mIdx % allStages.length];
    const vendor = stage !== 'New' && stage !== 'Reviewed' ? vendors[mIdx % vendors.length] : undefined;
    const isCompleted = stage === 'Resolved' || stage === 'Closed';
    const actualCost = isCompleted ? tpl.est + ((mIdx % 3) - 1) * 35 : 0;
    const reqId = `maint-${mIdx + 1}`;
    const reqCode = `WO-${4001 + mIdx}`;
    const reportedDay = String(Math.max(1, 28 - (mIdx % 25))).padStart(2, '0');
    const reportedDate = mIdx < 12 ? `2026-11-${String(Math.min(12, mIdx + 1)).padStart(2, '0')}` : `2026-10-${reportedDay}`;
    const dueDate = mIdx < 12 ? '2026-11-20' : '2026-11-05';

    let linkedExpenseId: string | undefined;
    if (isCompleted && actualCost > 0) {
      linkedExpenseId = `exp-maint-${reqId}`;
      expenses.push({
        id: linkedExpenseId,
        code: `EXP-${3001 + expenses.length}`,
        propertyId: unit.propertyId,
        unitId: unit.id,
        vendorId: vendor?.id,
        maintenanceRequestId: reqId,
        category: 'Repairs',
        description: `Work Order ${reqCode}: ${tpl.title}`,
        date: '2026-11-08',
        amount: actualCost,
        status: 'Paid',
        reference: `INV-${reqCode}`,
      });
    }

    maintenanceRequests.push({
      id: reqId,
      code: reqCode,
      propertyId: unit.propertyId,
      unitId: unit.id,
      tenantId: activeLease?.tenantId,
      vendorId: vendor?.id,
      title: tpl.title,
      category: tpl.category,
      priority: tpl.priority,
      description: tpl.desc,
      reportedDate,
      dueDate,
      estimatedCost: tpl.est,
      actualCost,
      linkedExpenseId,
      stage,
      resolvedAt: isCompleted ? '2026-11-09' : undefined,
      closedAt: stage === 'Closed' ? '2026-11-10' : undefined,
      comments: [
        {
          id: `cmt-${reqId}-1`,
          requestId: reqId,
          authorName: 'Lauren Vance',
          authorRole: 'Maintenance Coordinator',
          createdAt: reportedDate,
          content: 'Logged work order and verified unit access window with resident.',
        },
      ],
    });
  }

  // Additional Property Operating Expenses (Utilities, Insurance, Property Taxes, Cleaning, Landscaping, Management)
  const operatingCategories: Array<{
    cat: PropertyExpense['category'];
    desc: string;
    amt: number;
  }> = [
    { cat: 'Utilities', desc: 'Common Area Electric & Hydronic Boiler Service', amt: 1850 },
    { cat: 'Cleaning', desc: 'Bi-Weekly Atrium, Lobby & Corridor Detailing', amt: 940 },
    { cat: 'Insurance', desc: 'Commercial Property & Liability Monthly Installment', amt: 2400 },
    { cat: 'Property Taxes', desc: 'Municipal Real Estate Tax Escrow Reserve', amt: 4100 },
    { cat: 'Landscaping', desc: 'Courtyard Irrigation & Seasonal Botanical Care', amt: 680 },
    { cat: 'Management', desc: 'On-Site Concierge & Building Engineering Payroll', amt: 3200 },
  ];

  properties.forEach((prop, pIdx) => {
    operatingCategories.forEach((op, oIdx) => {
      const expIdx = expenses.length + 1;
      const month = oIdx % 2 === 0 ? '2026-11' : '2026-10';
      expenses.push({
        id: `exp-op-${pIdx}-${oIdx}`,
        code: `EXP-${3000 + expIdx}`,
        propertyId: prop.id,
        vendorId: vendors[(pIdx + oIdx) % vendors.length].id,
        category: op.cat,
        description: `${op.desc} — ${prop.name}`,
        date: `${month}-05`,
        amount: op.amt + pIdx * 120,
        status: month === '2026-11' && oIdx === 5 ? 'Pending' : 'Paid',
        reference: `OP-${month.replace('-', '')}-${pIdx}${oIdx}`,
      });
    });
  });

  // Rental Applications (18 realistic applications across Vacant / Reserved units)
  const vacantOrReservedUnits = units.filter((u) => u.availabilityMode === 'Available' || u.availabilityMode === 'Reserved');
  const appStatuses: RentalApplication['status'][] = [
    'Submitted',
    'Under Review',
    'Approved',
    'Draft',
    'Rejected',
    'Converted',
  ];

  for (let aIdx = 0; aIdx < 16; aIdx++) {
    const targetUnit = vacantOrReservedUnits[aIdx % vacantOrReservedUnits.length] || units[aIdx];
    const fn = FIRST_NAMES[(aIdx + 9) % FIRST_NAMES.length];
    const ln = LAST_NAMES[(aIdx + 11) % LAST_NAMES.length];
    const applicantName = `${fn.charAt(0).toUpperCase() + fn.slice(1)} ${ln.charAt(0).toUpperCase() + ln.slice(1)}`;
    applications.push({
      id: `app-${aIdx + 1}`,
      code: `APP-${801 + aIdx}`,
      applicantName,
      applicantEmail: `${fn.toLowerCase()}.${ln.toLowerCase()}.applicant@example.demo`,
      applicantPhone: `+1 (917) 555-${String(8200 + aIdx).slice(-4)}`,
      propertyId: targetUnit.propertyId,
      unitId: targetUnit.id,
      applicationDate: `2026-11-${String(Math.max(1, 12 - (aIdx % 10))).padStart(2, '0')}`,
      requestedMoveInDate: '2026-12-01',
      proposedRent: targetUnit.askingRent,
      monthlyIncome: targetUnit.askingRent * 3.6,
      employmentSummary: `${OCCUPATIONS[aIdx % OCCUPATIONS.length]} at ${EMPLOYERS[aIdx % EMPLOYERS.length]}`,
      status: appStatuses[aIdx % appStatuses.length],
      notes: 'Fictional demonstration rental application dossier; income-to-rent ratio exceeds 3.5x threshold.',
    });
  }

  // Property Inspections (20 records)
  const inspectionTypes: Inspection['type'][] = ['Move-In', 'Routine', 'Move-Out', 'Maintenance Follow-up'];
  for (let iIdx = 0; iIdx < 20; iIdx++) {
    const unit = units[(iIdx * 7) % units.length];
    const status: Inspection['status'] = iIdx < 6 ? 'Scheduled' : iIdx < 9 ? 'In Progress' : 'Completed';
    inspections.push({
      id: `insp-${iIdx + 1}`,
      code: `INSP-${901 + iIdx}`,
      propertyId: unit.propertyId,
      unitId: unit.id,
      type: inspectionTypes[iIdx % inspectionTypes.length],
      date: iIdx < 6 ? `2026-11-${15 + iIdx}` : `2026-11-${String(Math.max(1, 12 - (iIdx % 10))).padStart(2, '0')}`,
      inspectorName: iIdx % 2 === 0 ? 'Marcus Sterling' : 'Lauren Vance',
      status,
      overallNotes: 'Non-binding demonstration condition checklist for operational workflow tracking.',
      checklist: [
        { id: `chk-${iIdx}-1`, area: 'Kitchen', item: 'Induction Cooktop & Stone Countertops', condition: 'Excellent', notes: 'No surface chips or thermal marks.' },
        { id: `chk-${iIdx}-2`, area: 'Living Area', item: 'Wide-Plank Oak Flooring & Acoustic Glazing', condition: 'Good', notes: 'Minor wear near terrace threshold.' },
        { id: `chk-${iIdx}-3`, area: 'Mechanical', item: 'HVAC Filter, Thermostat & Smoke Detectors', condition: iIdx % 5 === 0 ? 'Needs Repair' : 'Excellent', notes: 'MERV-13 filter verified.' },
        { id: `chk-${iIdx}-4`, area: 'Bathrooms', item: 'Thermostatic Shower Valve & Grout Seal', condition: 'Good', notes: 'Proper drainage and pressure.' },
      ],
    });
  }

  // Team Members (8 demo staff)
  const teamMembers: DemoTeamMember[] = [
    {
      id: 'team-1',
      name: 'Victoria Sterling',
      email: 'v.sterling@aureliapartners.demo',
      phone: '+1 (212) 555-0101',
      role: 'Property Owner',
      title: 'Managing Partner',
      assignedPropertyIds: properties.map((p) => p.id),
      active: true,
      avatarInitials: 'VS',
    },
    {
      id: 'team-2',
      name: 'Alexander Mercer',
      email: 'a.mercer@aureliapartners.demo',
      phone: '+1 (212) 555-0102',
      role: 'Portfolio Manager',
      title: 'VP of Portfolio Operations',
      assignedPropertyIds: properties.map((p) => p.id),
      active: true,
      avatarInitials: 'AM',
    },
    {
      id: 'team-3',
      name: 'Claire Rousseau',
      email: 'c.rousseau@aureliapartners.demo',
      phone: '+1 (212) 555-0103',
      role: 'Property Manager',
      title: 'Senior Regional Property Manager (East)',
      assignedPropertyIds: ['prop-1', 'prop-2', 'prop-8', 'prop-9', 'prop-10'],
      active: true,
      avatarInitials: 'CR',
    },
    {
      id: 'team-4',
      name: 'Julian Vance',
      email: 'j.vance@aureliapartners.demo',
      phone: '+1 (415) 555-0104',
      role: 'Property Manager',
      title: 'Senior Regional Property Manager (West & Central)',
      assignedPropertyIds: ['prop-3', 'prop-4', 'prop-5', 'prop-6', 'prop-7', 'prop-11', 'prop-12'],
      active: true,
      avatarInitials: 'JV',
    },
    {
      id: 'team-5',
      name: 'Nadia Lindqvist',
      email: 'n.lindqvist@aureliapartners.demo',
      phone: '+1 (212) 555-0105',
      role: 'Leasing Agent',
      title: 'Director of Residential & Commercial Leasing',
      assignedPropertyIds: properties.slice(0, 8).map((p) => p.id),
      active: true,
      avatarInitials: 'NL',
    },
    {
      id: 'team-6',
      name: 'Lauren Vance',
      email: 'l.vance@aureliapartners.demo',
      phone: '+1 (312) 555-0106',
      role: 'Maintenance Coordinator',
      title: 'Facilities & Work Order Lead',
      assignedPropertyIds: properties.map((p) => p.id),
      active: true,
      avatarInitials: 'LV',
    },
    {
      id: 'team-7',
      name: 'Desmond Okafor',
      email: 'd.okafor@aureliapartners.demo',
      phone: '+1 (617) 555-0107',
      role: 'Leasing Agent',
      title: 'Senior Leasing Specialist',
      assignedPropertyIds: properties.slice(4).map((p) => p.id),
      active: true,
      avatarInitials: 'DO',
    },
    {
      id: 'team-8',
      name: 'Helena Takahashi',
      email: 'h.takahashi@aureliapartners.demo',
      phone: '+1 (212) 555-0108',
      role: 'Viewer',
      title: 'Portfolio Financial Analyst',
      assignedPropertyIds: properties.map((p) => p.id),
      active: true,
      avatarInitials: 'HT',
    },
  ];

  // Activity Timeline
  const sampleActivities: Activity[] = [
    {
      id: 'act-1',
      timestamp: '2026-11-13T09:15:00Z',
      type: 'Payment Recorded',
      title: 'Rent Payment Recorded — Unit 201 at The Sovereign at Gramercy',
      description: 'Recorded $4,200.00 via ACH Demo Transfer for November 2026 billing period.',
      propertyId: 'prop-1',
      unitId: units[0]?.id,
      tenantId: tenants[0]?.id,
      leaseId: leases[0]?.id,
      actor: 'Alexander Mercer',
    },
    {
      id: 'act-2',
      timestamp: '2026-11-12T16:40:00Z',
      type: 'Maintenance Assigned',
      title: 'Work Order WO-4003 Assigned to Sentinel Access & Locksmiths',
      description: 'Smart Fob Reader Intermittent Desync at Entry assigned for priority service.',
      propertyId: 'prop-1',
      unitId: units[2]?.id,
      actor: 'Lauren Vance',
    },
    {
      id: 'act-3',
      timestamp: '2026-11-11T14:20:00Z',
      type: 'Lease Renewed',
      title: 'Annual Lease Renewal Completed — Beacon Hill Conservatory Lofts',
      description: 'Created renewed 12-month lease term with zero overlap and preserved historical snapshot.',
      propertyId: 'prop-2',
      unitId: units[25]?.id,
      actor: 'Nadia Lindqvist',
    },
    {
      id: 'act-4',
      timestamp: '2026-11-10T11:05:00Z',
      type: 'Inspection Completed',
      title: 'Routine Inspection Completed — Fulton Market Foundry Tower',
      description: 'All 4 architectural & mechanical checklist areas rated Good or Excellent.',
      propertyId: 'prop-3',
      actor: 'Marcus Sterling',
    },
    {
      id: 'act-5',
      timestamp: '2026-11-08T15:30:00Z',
      type: 'Maintenance Closed',
      title: 'Work Order WO-4005 Closed & Linked Expense Paid',
      description: 'Dedicated 20A Kitchen Island GFCI Tripping resolved and single expense record logged.',
      propertyId: 'prop-2',
      actor: 'Lauren Vance',
    },
    {
      id: 'act-6',
      timestamp: '2026-11-01T08:00:00Z',
      type: 'Rent Charged',
      title: 'November 2026 Monthly Rent Roll Generated',
      description: 'Idempotent rent generation completed for all active portfolio leases.',
      actor: 'System Reconciliation',
    },
  ];
  activities.push(...sampleActivities);

  const savedReports: SavedReport[] = [
    {
      id: 'rep-1',
      name: 'Q4 2026 Executive Portfolio Performance',
      reportType: 'Operating Performance Report',
      propertyId: 'all',
      dateRange: '2026-11',
      createdAt: '2026-11-05',
    },
    {
      id: 'rep-2',
      name: 'Gramercy & Beacon Hill Rent Roll Audit',
      reportType: 'Rent Roll Report',
      propertyId: 'prop-1',
      dateRange: '2026-11',
      createdAt: '2026-11-10',
    },
    {
      id: 'rep-3',
      name: 'Upcoming 90-Day Lease Expirations',
      reportType: 'Lease Expiration Report',
      propertyId: 'all',
      dateRange: '2026-11',
      createdAt: '2026-11-12',
    },
  ];

  return {
    version: 1,
    referenceDate,
    properties,
    buildings,
    floors,
    units,
    tenants,
    applications,
    leases,
    leaseRenewals,
    rentCharges,
    rentPayments,
    paymentAllocations,
    depositTransactions,
    expenses,
    maintenanceRequests,
    vendors,
    inspections,
    activities,
    teamMembers,
    savedReports,
  };
}
