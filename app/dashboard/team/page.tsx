'use client';

import React, { useState } from 'react';
import { Shield, Users } from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { TeamRole } from '@/lib/types';

const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  'Property Owner': 'Executive visibility into portfolio cash flow, occupancy, and asset valuations.',
  'Portfolio Manager': 'Full operational command across properties, leases, rent rolls, and budgets.',
  'Property Manager': 'Day-to-day management of assigned properties, units, inspections, and expenses.',
  'Leasing Agent': 'Manages rental applications, tenant onboarding, lease creation, and renewals.',
  'Maintenance Coordinator': 'Triages work orders, assigns service vendors, and audits repair expenses.',
  Viewer: 'Read-only access to dashboards, analytics, and financial reporting exports.',
};

export default function TeamManagementPage() {
  const { dataset } = useEstaviaStore();
  const [selectedRole, setSelectedRole] = useState<TeamRole | 'all'>('all');

  const members = dataset.teamMembers.filter(
    (m) => selectedRole === 'all' || m.role === selectedRole
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Demo Team & Role Assignments
        </h1>
        <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
          Fictional staff directory and role capability previews. Browser-local demonstration (no external authentication or server-side RBAC enforcement).
        </p>
      </div>

      {/* Role Filter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Object.keys(ROLE_DESCRIPTIONS) as TeamRole[]).map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setSelectedRole(selectedRole === role ? 'all' : role)}
            className={`text-left p-4 rounded-xl border transition-colors ${
              selectedRole === role
                ? 'border-[#146C63] bg-[#E9F5F1]/60 dark:bg-[#203530]'
                : 'border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#146C63] dark:text-[#5BC4B4]">
                {role}
              </span>
              <Shield className="w-3.5 h-3.5 text-[#71807B]" />
            </div>
            <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1.5 leading-relaxed">
              {ROLE_DESCRIPTIONS[role]}
            </p>
          </button>
        ))}
      </div>

      {/* Staff Table */}
      <div className="rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E1E9E5] dark:border-[#304540] text-[#71807B]">
              <th className="py-3 px-4">Team Member</th>
              <th className="py-3 px-4">Role & Title</th>
              <th className="py-3 px-4">Fictional Contact</th>
              <th className="py-3 px-4">Assigned Properties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E9E5] dark:divide-[#304540]">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="py-3 px-4 font-semibold flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#146C63]/15 text-[#146C63] dark:text-[#5BC4B4] flex items-center justify-center font-mono text-xs">
                    {m.avatarInitials}
                  </div>
                  <span>{m.name}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-medium block">{m.role}</span>
                  <span className="text-[11px] text-[#71807B]">{m.title}</span>
                </td>
                <td className="py-3 px-4 text-[#71807B]">
                  {m.email} · {m.phone}
                </td>
                <td className="py-3 px-4 font-mono text-[#71807B]">
                  {m.assignedPropertyIds.length} Properties Assigned
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
