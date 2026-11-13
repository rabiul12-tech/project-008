'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Building2,
  CreditCard,
  DoorOpen,
  FileSignature,
  Receipt,
  Search,
  Sparkles,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import {
  ExpenseCategory,
  LeaseStatus,
  MaintenanceCategory,
  MaintenancePriority,
  PropertyType,
  UnitType,
} from '@/lib/types';
import { formatCurrency } from '@/lib/export/exporter';

export function QuickCreateModals() {
  const router = useRouter();
  const {
    quickModal,
    setQuickModal,
    dataset,
    settings,
    addProperty,
    addUnit,
    addTenant,
    createLease,
    recordRentPayment,
    addMaintenanceRequest,
    addExpense,
    toggleTheme,
  } = useEstaviaStore();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Global Cmd/Ctrl + K shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickModal(quickModal === 'global-search' ? null : 'global-search');
      } else if (e.key === 'Escape' && quickModal) {
        setQuickModal(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [quickModal, setQuickModal]);

  const closeQuickModal = () => {
    setErrorMsg(null);
    setQuickModal(null);
  };

  // 1. Add Property State
  const [propName, setPropName] = useState('');
  const [propCode, setPropCode] = useState('');
  const [propType, setPropType] = useState<PropertyType>('Apartment Building');
  const [propAddress, setPropAddress] = useState('');
  const [propCity, setPropCity] = useState('New York');
  const [propState, setPropState] = useState('NY');
  const [propFloors, setPropFloors] = useState(5);
  const [propTargetUnits, setPropTargetUnits] = useState(20);
  const [propValue, setPropValue] = useState(18500000);
  const [propDesc, setPropDesc] = useState('');

  // 2. Add Unit State
  const [unitPropId, setUnitPropId] = useState(dataset.properties[0]?.id || 'prop-1');
  const [unitNumber, setUnitNumber] = useState('');
  const [unitFloor, setUnitFloor] = useState(1);
  const [unitType, setUnitType] = useState<UnitType>('1 Bedroom');
  const [unitBeds, setUnitBeds] = useState(1);
  const [unitBaths, setUnitBaths] = useState(1);
  const [unitSqFt, setUnitSqFt] = useState(820);
  const [unitRent, setUnitRent] = useState(3200);
  const [unitMode, setUnitMode] = useState<'Available' | 'Reserved' | 'Unavailable' | 'Under Maintenance'>('Available');

  // 3. Add Tenant State
  const [tenFirst, setTenFirst] = useState('');
  const [tenLast, setTenLast] = useState('');
  const [tenEmail, setTenEmail] = useState('');
  const [tenPhone, setTenPhone] = useState('+1 (212) 555-0148');
  const [tenOcc, setTenOcc] = useState('Senior Architect');
  const [tenEmp, setTenEmp] = useState('Meridian Design Group');

  // 4. Create Lease State
  const [leasePropId, setLeasePropId] = useState(dataset.properties[0]?.id || 'prop-1');
  const [leaseUnitId, setLeaseUnitId] = useState('');
  const [leaseTenantId, setLeaseTenantId] = useState(dataset.tenants[0]?.id || '');
  const [leaseStart, setLeaseStart] = useState('2026-12-01');
  const [leaseEnd, setLeaseEnd] = useState('2027-12-01');
  const [leaseRent, setLeaseRent] = useState(3500);
  const [leaseDeposit, setLeaseDeposit] = useState(3500);
  const [leaseStatus, setLeaseStatus] = useState<LeaseStatus>('Scheduled');

  // 5. Record Payment State
  const unpaidCharges = useMemo(
    () =>
      dataset.rentCharges.filter(
        (c) => c.status !== 'Paid' && c.status !== 'Voided' && c.balance > 0
      ),
    [dataset.rentCharges]
  );
  const [payChargeId, setPayChargeId] = useState('');
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [payType, setPayType] = useState<'Payment' | 'Credit'>('Payment');
  const [payMethod, setPayMethod] = useState<'ACH Demo Transfer' | 'Wire Demo' | 'Check Record' | 'Card Demo'>('ACH Demo Transfer');
  const [payRef, setPayRef] = useState('');

  const effectivePayCharge = useMemo(
    () => unpaidCharges.find((c) => c.id === payChargeId) || unpaidCharges[0],
    [unpaidCharges, payChargeId]
  );
  const effectivePayChargeId = effectivePayCharge?.id || '';
  const effectivePayAmount = payAmount !== null ? payAmount : (effectivePayCharge?.balance || 0);

  // 6. Create Maintenance Request State
  const [maintPropId, setMaintPropId] = useState(dataset.properties[0]?.id || 'prop-1');
  const [maintUnitId, setMaintUnitId] = useState('');
  const [maintTitle, setMaintTitle] = useState('');
  const [maintCat, setMaintCat] = useState<MaintenanceCategory>('HVAC');
  const [maintPrio, setMaintPrio] = useState<MaintenancePriority>('High');
  const [maintEst, setMaintEst] = useState(350);
  const [maintDesc, setMaintDesc] = useState('');

  // 7. Record Expense State
  const [expPropId, setExpPropId] = useState(dataset.properties[0]?.id || 'prop-1');
  const [expCat, setExpCat] = useState<ExpenseCategory>('Repairs');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState(650);
  const [expStatus, setExpStatus] = useState<'Paid' | 'Pending'>('Paid');

  // 8. Global Search State
  const [searchQuery, setSearchQuery] = useState('');

  const unitsForLeaseProp = useMemo(
    () => dataset.units.filter((u) => !u.archived && u.propertyId === leasePropId),
    [dataset.units, leasePropId]
  );

  const effectiveLeaseUnit = useMemo(
    () => unitsForLeaseProp.find((u) => u.id === leaseUnitId) || unitsForLeaseProp[0],
    [unitsForLeaseProp, leaseUnitId]
  );
  const effectiveLeaseUnitId = effectiveLeaseUnit?.id || '';

  const unitsForMaintProp = useMemo(
    () => dataset.units.filter((u) => !u.archived && u.propertyId === maintPropId),
    [dataset.units, maintPropId]
  );

  const effectiveMaintUnitId = useMemo(
    () => (unitsForMaintProp.some((u) => u.id === maintUnitId) ? maintUnitId : (unitsForMaintProp[0]?.id || '')),
    [unitsForMaintProp, maintUnitId]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return {
        properties: dataset.properties.slice(0, 4),
        units: dataset.units.slice(0, 4),
        tenants: dataset.tenants.slice(0, 4),
        leases: dataset.leases.slice(0, 3),
        maintenance: dataset.maintenanceRequests.slice(0, 3),
      };
    }
    return {
      properties: dataset.properties
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            p.city.toLowerCase().includes(q)
        )
        .slice(0, 5),
      units: dataset.units
        .filter(
          (u) =>
            u.unitNumber.toLowerCase().includes(q) ||
            u.type.toLowerCase().includes(q)
        )
        .slice(0, 5),
      tenants: dataset.tenants
        .filter(
          (t) =>
            t.fullName.toLowerCase().includes(q) ||
            t.code.toLowerCase().includes(q) ||
            t.email.toLowerCase().includes(q)
        )
        .slice(0, 5),
      leases: dataset.leases
        .filter((l) => l.code.toLowerCase().includes(q))
        .slice(0, 5),
      maintenance: dataset.maintenanceRequests
        .filter(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            m.code.toLowerCase().includes(q)
        )
        .slice(0, 5),
    };
  }, [searchQuery, dataset]);

  if (!quickModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] text-[#1C2927] dark:text-[#F7FAF8] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E1E9E5] dark:border-[#304540]">
          <div className="flex items-center gap-2.5">
            {quickModal === 'add-property' && <Building2 className="w-5 h-5 text-[#146C63] dark:text-[#5BC4B4]" />}
            {quickModal === 'add-unit' && <DoorOpen className="w-5 h-5 text-[#146C63] dark:text-[#5BC4B4]" />}
            {quickModal === 'add-tenant' && <Users className="w-5 h-5 text-[#146C63] dark:text-[#5BC4B4]" />}
            {quickModal === 'create-lease' && <FileSignature className="w-5 h-5 text-[#146C63] dark:text-[#5BC4B4]" />}
            {quickModal === 'record-payment' && <CreditCard className="w-5 h-5 text-[#146C63] dark:text-[#5BC4B4]" />}
            {quickModal === 'create-maintenance' && <Wrench className="w-5 h-5 text-[#146C63] dark:text-[#5BC4B4]" />}
            {quickModal === 'record-expense' && <Receipt className="w-5 h-5 text-[#146C63] dark:text-[#5BC4B4]" />}
            {quickModal === 'global-search' && <Search className="w-5 h-5 text-[#146C63] dark:text-[#5BC4B4]" />}
            <h2 className="text-base font-semibold tracking-tight">
              {quickModal === 'add-property' && 'Add New Property'}
              {quickModal === 'add-unit' && 'Add Property Unit'}
              {quickModal === 'add-tenant' && 'Register Fictional Tenant'}
              {quickModal === 'create-lease' && 'Create Exclusive Lease Agreement'}
              {quickModal === 'record-payment' && 'Record Rent Payment or Credit'}
              {quickModal === 'create-maintenance' && 'Create Maintenance Work Order'}
              {quickModal === 'record-expense' && 'Record Property Operating Expense'}
              {quickModal === 'global-search' && 'ESTAVIA Command Palette & Global Search'}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeQuickModal}
            className="p-1.5 rounded-lg text-[#71807B] hover:text-[#1C2927] dark:hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/30 text-xs text-[#DC2626] dark:text-[#EF4444] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 max-h-[78vh] overflow-y-auto">
          {quickModal === 'add-property' && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const res = addProperty({
                  name: propName,
                  code: propCode || `EST-${propCity.slice(0, 3).toUpperCase()}-${dataset.properties.length + 1}`,
                  type: propType,
                  address: propAddress || '100 Architectural Plaza',
                  city: propCity,
                  state: propState,
                  country: 'United States',
                  floorsCount: Number(propFloors) || 4,
                  targetUnitsCount: Number(propTargetUnits) || 12,
                  status: 'Active',
                  description: propDesc || 'Architectural investment property managed in ESTAVIA.',
                  amenities: ['24/7 Concierge', 'Smart Access', 'EV Charging'],
                  imageUrl: 'architectural-custom',
                  notes: 'Added via Quick Create.',
                  estimatedValue: Number(propValue) || 15000000,
                  yearBuilt: 2022,
                });
                if (!res.ok) {
                  setErrorMsg(res.error || 'Could not create property.');
                } else {
                  setQuickModal(null);
                }
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Property Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={propName}
                    onChange={(e) => setPropName(e.target.value)}
                    placeholder="e.g., The Mayfair Residences"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Property Code
                  </label>
                  <input
                    type="text"
                    value={propCode}
                    onChange={(e) => setPropCode(e.target.value)}
                    placeholder="EST-NYC-14"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Property Type
                  </label>
                  <select
                    value={propType}
                    onChange={(e) => setPropType(e.target.value as PropertyType)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    <option value="Apartment Building">Apartment Building</option>
                    <option value="Residential Complex">Residential Complex</option>
                    <option value="Commercial Building">Commercial Building</option>
                    <option value="Mixed-Use Property">Mixed-Use Property</option>
                    <option value="Single-Family Rental">Single-Family Rental</option>
                    <option value="Townhouse Portfolio">Townhouse Portfolio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={propAddress}
                    onChange={(e) => setPropAddress(e.target.value)}
                    placeholder="420 Park Avenue South"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={propCity}
                    onChange={(e) => setPropCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    State / Region
                  </label>
                  <input
                    type="text"
                    value={propState}
                    onChange={(e) => setPropState(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Number of Floors
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    value={propFloors}
                    onChange={(e) => setPropFloors(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Target Units Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={propTargetUnits}
                    onChange={(e) => setPropTargetUnits(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                  Architectural & Operational Summary
                </label>
                <textarea
                  rows={2}
                  value={propDesc}
                  onChange={(e) => setPropDesc(e.target.value)}
                  placeholder="Describe building features, amenities, and operational profile..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickModal(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540] hover:bg-[#F8FAF9] dark:hover:bg-[#203530]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white"
                >
                  Create Property
                </button>
              </div>
            </form>
          )}

          {quickModal === 'add-unit' && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const res = addUnit({
                  propertyId: unitPropId,
                  floorNumber: Number(unitFloor) || 1,
                  unitNumber,
                  type: unitType,
                  bedrooms: Number(unitBeds),
                  bathrooms: Number(unitBaths),
                  sqFt: Number(unitSqFt),
                  askingRent: Number(unitRent),
                  availabilityMode: unitMode,
                  amenities: ['Hardwood Floors', 'Smart Lock'],
                });
                if (!res.ok) {
                  setErrorMsg(res.error || 'Could not add unit.');
                } else {
                  setQuickModal(null);
                }
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Property *
                  </label>
                  <select
                    value={unitPropId}
                    onChange={(e) => setUnitPropId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    {dataset.properties
                      .filter((p) => !p.archived)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Unit Number * (Unique per Building)
                  </label>
                  <input
                    type="text"
                    required
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    placeholder="e.g., 405 or PH-B"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Floor Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={unitFloor}
                    onChange={(e) => setUnitFloor(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Unit Category
                  </label>
                  <select
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value as UnitType)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    <option value="Studio">Studio</option>
                    <option value="1 Bedroom">1 Bedroom</option>
                    <option value="2 Bedroom">2 Bedroom</option>
                    <option value="3 Bedroom">3 Bedroom</option>
                    <option value="Penthouse">Penthouse</option>
                    <option value="Commercial Suite">Commercial Suite</option>
                    <option value="Retail Space">Retail Space</option>
                    <option value="Townhouse">Townhouse</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={unitBeds}
                    onChange={(e) => setUnitBeds(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    max={10}
                    value={unitBaths}
                    onChange={(e) => setUnitBaths(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Floor Area (Sq Ft)
                  </label>
                  <input
                    type="number"
                    min={200}
                    value={unitSqFt}
                    onChange={(e) => setUnitSqFt(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Monthly Asking Rent ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={unitRent}
                    onChange={(e) => setUnitRent(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickModal(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white"
                >
                  Add Unit
                </button>
              </div>
            </form>
          )}

          {quickModal === 'add-tenant' && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const res = addTenant({
                  firstName: tenFirst,
                  lastName: tenLast,
                  email: tenEmail || `${tenFirst.toLowerCase()}.${tenLast.toLowerCase()}@example.demo`,
                  phone: tenPhone,
                  emergencyContactName: `${tenLast} Family Contact`,
                  emergencyContactPhone: '+1 (646) 555-0190',
                  occupation: tenOcc,
                  employer: tenEmp,
                  notes: 'Fictional demonstration tenant profile.',
                });
                if (!res.ok) {
                  setErrorMsg(res.error || 'Could not register tenant.');
                } else {
                  setQuickModal(null);
                }
              }}
            >
              <p className="text-xs text-[#71807B] dark:text-[#9CB0AA]">
                Use fictional demonstration contact details only. No real personal or government ID records are collected.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={tenFirst}
                    onChange={(e) => setTenFirst(e.target.value)}
                    placeholder="Julian"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={tenLast}
                    onChange={(e) => setTenLast(e.target.value)}
                    placeholder="Kensington"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Fictional Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={tenEmail}
                    onChange={(e) => setTenEmail(e.target.value)}
                    placeholder="julian.kensington@example.demo"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Fictional Phone
                  </label>
                  <input
                    type="text"
                    value={tenPhone}
                    onChange={(e) => setTenPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={tenOcc}
                    onChange={(e) => setTenOcc(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Employer
                  </label>
                  <input
                    type="text"
                    value={tenEmp}
                    onChange={(e) => setTenEmp(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickModal(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white"
                >
                  Register Tenant
                </button>
              </div>
            </form>
          )}

          {quickModal === 'create-lease' && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const res = createLease({
                  propertyId: leasePropId,
                  unitId: effectiveLeaseUnitId,
                  tenantId: leaseTenantId,
                  startDate: leaseStart,
                  endDate: leaseEnd,
                  monthlyRent: Number(leaseRent),
                  securityDeposit: Number(leaseDeposit),
                  paymentDueDay: settings.defaultRentDueDay,
                  billingFrequency: 'Monthly',
                  status: leaseStatus,
                  lateFeeRuleEnabled: true,
                  notes: 'Created via Lease Lifecycle Engine with half-open interval conflict check.',
                });
                if (!res.ok) {
                  setErrorMsg(res.errors.join(' '));
                } else {
                  closeQuickModal();
                }
              }}
            >
              <div className="p-3 rounded-lg bg-[#E9F5F1] dark:bg-[#16302B] text-xs text-[#1C2927] dark:text-[#F7FAF8]">
                Half-open interval rule <span className="font-mono">[startDate, endDate)</span> enforced. Overlapping Active or Scheduled leases on the same unit are automatically blocked.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Property
                  </label>
                  <select
                    value={leasePropId}
                    onChange={(e) => {
                      const nextPropId = e.target.value;
                      setLeasePropId(nextPropId);
                      const firstUnit = dataset.units.find((u) => !u.archived && u.propertyId === nextPropId);
                      if (firstUnit) {
                        setLeaseUnitId(firstUnit.id);
                        setLeaseRent(firstUnit.askingRent);
                        setLeaseDeposit(firstUnit.askingRent);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    {dataset.properties
                      .filter((p) => !p.archived)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Unit
                  </label>
                  <select
                    value={effectiveLeaseUnitId}
                    onChange={(e) => {
                      setLeaseUnitId(e.target.value);
                      const u = unitsForLeaseProp.find((item) => item.id === e.target.value);
                      if (u) {
                        setLeaseRent(u.askingRent);
                        setLeaseDeposit(u.askingRent);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    {unitsForLeaseProp.map((u) => (
                      <option key={u.id} value={u.id}>
                        Unit {u.unitNumber} ({u.type} · ${u.askingRent}/mo)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Tenant
                  </label>
                  <select
                    value={leaseTenantId}
                    onChange={(e) => setLeaseTenantId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    {dataset.tenants
                      .filter((t) => !t.archived)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.fullName} ({t.code})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Initial Lease Status
                  </label>
                  <select
                    value={leaseStatus}
                    onChange={(e) => setLeaseStatus(e.target.value as LeaseStatus)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Active">Active</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Start Date (Inclusive)
                  </label>
                  <input
                    type="date"
                    required
                    value={leaseStart}
                    onChange={(e) => setLeaseStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    End Date (Exclusive)
                  </label>
                  <input
                    type="date"
                    required
                    value={leaseEnd}
                    onChange={(e) => setLeaseEnd(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Monthly Rent ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={leaseRent}
                    onChange={(e) => setLeaseRent(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Security Deposit ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={leaseDeposit}
                    onChange={(e) => setLeaseDeposit(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickModal(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white"
                >
                  Validate & Create Lease
                </button>
              </div>
            </form>
          )}

          {quickModal === 'record-payment' && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const res = recordRentPayment({
                  rentChargeId: effectivePayChargeId,
                  amount: Number(effectivePayAmount),
                  type: payType,
                  method: payType === 'Credit' ? 'Credit Adjustment' : payMethod,
                  date: dataset.referenceDate,
                  reference: payRef || `DEMO-${Date.now().toString().slice(-5)}`,
                  notes: 'Recorded via Quick Payment dialog.',
                });
                if (!res.ok) {
                  setErrorMsg(res.error || 'Could not record payment.');
                } else {
                  closeQuickModal();
                }
              }}
            >
              <div>
                <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                  Select Open Rent Invoice
                </label>
                <select
                  value={effectivePayChargeId}
                  onChange={(e) => {
                    setPayChargeId(e.target.value);
                    const ch = unpaidCharges.find((c) => c.id === e.target.value);
                    if (ch) setPayAmount(ch.balance);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                >
                  {unpaidCharges.map((c) => {
                    const ten = dataset.tenants.find((t) => t.id === c.tenantId);
                    const unit = dataset.units.find((u) => u.id === c.unitId);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.code} · {ten?.fullName} (Unit {unit?.unitNumber}) · {c.billingPeriod} · Bal: {formatCurrency(c.balance)}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={payType}
                    onChange={(e) => setPayType(e.target.value as 'Payment' | 'Credit')}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    <option value="Payment">Rent Payment (Partial or Full)</option>
                    <option value="Credit">Rent Credit Adjustment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={1}
                    required
                    value={effectivePayAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Payment Method Label
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    <option value="ACH Demo Transfer">ACH Demo Transfer</option>
                    <option value="Wire Demo">Wire Demo</option>
                    <option value="Check Record">Check Record</option>
                    <option value="Card Demo">Card Demo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Reference Code
                  </label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="ACH-202611-901"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickModal(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white"
                >
                  Apply to Invoice
                </button>
              </div>
            </form>
          )}

          {quickModal === 'create-maintenance' && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const res = addMaintenanceRequest({
                  propertyId: maintPropId,
                  unitId: effectiveMaintUnitId,
                  title: maintTitle || 'HVAC Zone Inspection',
                  category: maintCat,
                  priority: maintPrio,
                  description: maintDesc || 'Logged via Quick Maintenance Request modal.',
                  reportedDate: dataset.referenceDate,
                  dueDate: '2026-11-22',
                  estimatedCost: Number(maintEst) || 0,
                  stage: 'New',
                });
                if (!res.ok) {
                  setErrorMsg(res.error || 'Could not create work order.');
                } else {
                  closeQuickModal();
                }
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Property
                  </label>
                  <select
                    value={maintPropId}
                    onChange={(e) => setMaintPropId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    {dataset.properties
                      .filter((p) => !p.archived)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Unit
                  </label>
                  <select
                    value={effectiveMaintUnitId}
                    onChange={(e) => setMaintUnitId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    {unitsForMaintProp.map((u) => (
                      <option key={u.id} value={u.id}>
                        Unit {u.unitNumber} ({u.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Issue Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={maintTitle}
                    onChange={(e) => setMaintTitle(e.target.value)}
                    placeholder="e.g., Thermostatic Shower Mixing Valve Calibration"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Category
                  </label>
                  <select
                    value={maintCat}
                    onChange={(e) => setMaintCat(e.target.value as MaintenanceCategory)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    <option value="HVAC">HVAC</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Appliances">Appliances</option>
                    <option value="Structural">Structural</option>
                    <option value="Locks & Security">Locks & Security</option>
                    <option value="Common Area">Common Area</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Priority
                  </label>
                  <select
                    value={maintPrio}
                    onChange={(e) => setMaintPrio(e.target.value as MaintenancePriority)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Estimated Cost ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={maintEst}
                    onChange={(e) => setMaintEst(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                  Work Order Details
                </label>
                <textarea
                  rows={2}
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                  placeholder="Describe symptom, location, and access instructions..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickModal(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white"
                >
                  Create Work Order
                </button>
              </div>
            </form>
          )}

          {quickModal === 'record-expense' && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                addExpense({
                  propertyId: expPropId,
                  category: expCat,
                  description: expDesc || `${expCat} service invoice`,
                  date: dataset.referenceDate,
                  amount: Number(expAmount),
                  status: expStatus,
                  reference: `EXP-REF-${Date.now().toString().slice(-4)}`,
                });
                setQuickModal(null);
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Property
                  </label>
                  <select
                    value={expPropId}
                    onChange={(e) => setExpPropId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    {dataset.properties
                      .filter((p) => !p.archived)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Category
                  </label>
                  <select
                    value={expCat}
                    onChange={(e) => setExpCat(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    <option value="Repairs">Repairs</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Property Taxes">Property Taxes</option>
                    <option value="Management">Management</option>
                    <option value="Landscaping">Landscaping</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Payment Status
                  </label>
                  <select
                    value={expStatus}
                    onChange={(e) => setExpStatus(e.target.value as 'Paid' | 'Pending')}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#71807B] dark:text-[#9CB0AA] mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    placeholder="e.g., Seasonal Boiler & Hydronic Loop Inspection"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickModal(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#146C63] hover:bg-[#105A52] text-white"
                >
                  Save Expense
                </button>
              </div>
            </form>
          )}

          {quickModal === 'global-search' && (
            <div className="space-y-5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#71807B]" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search properties, units, tenants, leases, work orders, or run a command..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
                />
              </div>

              {/* Quick Actions */}
              <div>
                <p className="text-xs font-semibold text-[#71807B] dark:text-[#9CB0AA] mb-2">
                  Quick Commands
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Add Property', modal: 'add-property' as const },
                    { label: 'Add Unit', modal: 'add-unit' as const },
                    { label: 'Add Tenant', modal: 'add-tenant' as const },
                    { label: 'Create Lease', modal: 'create-lease' as const },
                    { label: 'Record Payment', modal: 'record-payment' as const },
                    { label: 'Create Work Order', modal: 'create-maintenance' as const },
                  ].map((cmd) => (
                    <button
                      key={cmd.label}
                      type="button"
                      onClick={() => setQuickModal(cmd.modal)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540] hover:bg-[#E9F5F1] dark:hover:bg-[#203530] transition-colors"
                    >
                      + {cmd.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme();
                      setQuickModal(null);
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E1E9E5] dark:border-[#304540] hover:bg-[#E9F5F1] dark:hover:bg-[#203530] transition-colors"
                  >
                    Switch Theme
                  </button>
                </div>
              </div>

              {/* Properties */}
              {searchResults.properties.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#71807B] dark:text-[#9CB0AA] mb-1.5">
                    Properties
                  </p>
                  <div className="divide-y divide-[#E1E9E5] dark:divide-[#304540] border border-[#E1E9E5] dark:border-[#304540] rounded-lg">
                    {searchResults.properties.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setQuickModal(null);
                          router.push(`/dashboard/properties/${p.id}`);
                        }}
                        className="w-full px-3.5 py-2.5 text-left flex items-center justify-between hover:bg-[#F8FAF9] dark:hover:bg-[#203530] text-xs"
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="text-[#71807B] dark:text-[#9CB0AA] font-mono">
                          {p.code} · {p.city}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tenants */}
              {searchResults.tenants.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#71807B] dark:text-[#9CB0AA] mb-1.5">
                    Tenants
                  </p>
                  <div className="divide-y divide-[#E1E9E5] dark:divide-[#304540] border border-[#E1E9E5] dark:border-[#304540] rounded-lg">
                    {searchResults.tenants.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setQuickModal(null);
                          router.push(`/dashboard/tenants/${t.id}`);
                        }}
                        className="w-full px-3.5 py-2.5 text-left flex items-center justify-between hover:bg-[#F8FAF9] dark:hover:bg-[#203530] text-xs"
                      >
                        <span className="font-medium">{t.fullName}</span>
                        <span className="text-[#71807B] dark:text-[#9CB0AA] font-mono">
                          {t.code} · {t.email}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Leases & Units */}
              {searchResults.leases.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#71807B] dark:text-[#9CB0AA] mb-1.5">
                    Leases
                  </p>
                  <div className="divide-y divide-[#E1E9E5] dark:divide-[#304540] border border-[#E1E9E5] dark:border-[#304540] rounded-lg">
                    {searchResults.leases.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          setQuickModal(null);
                          router.push(`/dashboard/leases/${l.id}`);
                        }}
                        className="w-full px-3.5 py-2.5 text-left flex items-center justify-between hover:bg-[#F8FAF9] dark:hover:bg-[#203530] text-xs"
                      >
                        <span className="font-medium font-mono">{l.code}</span>
                        <span className="text-[#71807B] dark:text-[#9CB0AA] font-mono">
                          [{l.startDate}, {l.endDate}) · {formatCurrency(l.monthlyRent)}/mo
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
