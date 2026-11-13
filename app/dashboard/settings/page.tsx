'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  Download,
  RotateCcw,
  Save,
  Upload,
} from 'lucide-react';
import { useEstaviaStore } from '@/stores/useEstaviaStore';
import { createBackupJson } from '@/lib/storage/repository';

export default function WorkspaceSettingsPage() {
  const {
    dataset,
    settings,
    theme,
    setTheme,
    sidebarCollapsed,
    setSidebarCollapsed,
    updateSettings,
    restoreFromBackupJson,
    resetDemoWorkspace,
  } = useEstaviaStore();

  const [formState, setFormState] = useState(settings);
  const [restoreJsonInput, setRestoreJsonInput] = useState('');
  const [restoreErrors, setRestoreErrors] = useState<string[]>([]);

  const handleDownloadBackup = () => {
    const json = createBackupJson(dataset, settings);
    if (typeof window !== 'undefined') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estavia-backup-${dataset.referenceDate}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Workspace Settings & Data Persistence
        </h1>
        <p className="text-xs text-[#71807B] dark:text-[#9CB0AA] mt-1">
          Configure company identity, lease defaults, explicit late-fee demonstration rules, theme preferences, and validated LocalStorage JSON backups.
        </p>
      </div>

      {/* Company & Leasing Configuration */}
      <form
        className="p-6 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          updateSettings(formState);
        }}
      >
        <h2 className="text-sm font-semibold border-b border-[#E1E9E5] dark:border-[#304540] pb-2.5">
          Company Profile & Lease Defaults
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[#71807B] mb-1">Company Name</label>
            <input
              type="text"
              value={formState.companyName}
              onChange={(e) =>
                setFormState({ ...formState, companyName: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
            />
          </div>
          <div>
            <label className="block text-[#71807B] mb-1">Portfolio Name</label>
            <input
              type="text"
              value={formState.portfolioName}
              onChange={(e) =>
                setFormState({ ...formState, portfolioName: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D]"
            />
          </div>
          <div>
            <label className="block text-[#71807B] mb-1">Default Rent Due Day (1–28)</label>
            <input
              type="number"
              min={1}
              max={28}
              value={formState.defaultRentDueDay}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  defaultRentDueDay: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-mono"
            />
          </div>
          <div>
            <label className="block text-[#71807B] mb-1">
              Explicit Late-Fee Demonstration Flat Rule ($)
            </label>
            <input
              type="number"
              min={0}
              value={formState.lateFeeFlatAmount}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  lateFeeFlatAmount: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-[#71807B]">
            Note: Late fees are never silently applied; they follow explicit demonstration rules and do not claim local rental-law compliance.
          </p>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C63] text-white text-xs font-medium"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Theme & Interface Behavior */}
      <div className="p-6 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-4">
        <h2 className="text-sm font-semibold border-b border-[#E1E9E5] dark:border-[#304540] pb-2.5">
          Appearance & Navigation Preferences
        </h2>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`px-4 py-2 rounded-lg border font-medium ${
              theme === 'light'
                ? 'border-[#146C63] bg-[#E9F5F1] text-[#146C63]'
                : 'border-[#E1E9E5] dark:border-[#304540]'
            }`}
          >
            Light Architectural Palette
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`px-4 py-2 rounded-lg border font-medium ${
              theme === 'dark'
                ? 'border-[#5BC4B4] bg-[#203530] text-[#5BC4B4]'
                : 'border-[#E1E9E5] dark:border-[#304540]'
            }`}
          >
            Dark Architectural Palette
          </button>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="px-4 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] font-medium"
          >
            {sidebarCollapsed ? 'Expand Sidebar Labels' : 'Use Icon-Only Sidebar'}
          </button>
        </div>
      </div>

      {/* JSON Backup, Restore & Reset */}
      <div className="p-6 rounded-xl border border-[#E1E9E5] dark:border-[#304540] bg-white dark:bg-[#192A27] space-y-4">
        <h2 className="text-sm font-semibold border-b border-[#E1E9E5] dark:border-[#304540] pb-2.5">
          LocalStorage Backup, Validated Restore & Demo Reset
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C63] text-white text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON Backup</span>
          </button>

          <button
            type="button"
            onClick={resetDemoWorkspace}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#DC2626]/40 text-[#DC2626] text-xs font-medium hover:bg-[#DC2626]/10"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data to Seed</span>
          </button>
        </div>

        <div className="pt-3 space-y-2 text-xs">
          <label className="block font-medium text-[#71807B]">
            Restore from Validated JSON Backup (Paste JSON below)
          </label>
          {restoreErrors.length > 0 && (
            <div className="p-3 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Invalid Backup Rejected: {restoreErrors.join('; ')}</span>
            </div>
          )}
          <textarea
            rows={4}
            value={restoreJsonInput}
            onChange={(e) => setRestoreJsonInput(e.target.value)}
            placeholder='{"version": 1, "referenceDate": "2026-11-13", ...}'
            className="w-full p-3 rounded-lg border border-[#E1E9E5] dark:border-[#304540] bg-[#F8FAF9] dark:bg-[#121F1D] font-mono text-xs"
          />
          <button
            type="button"
            onClick={() => {
              setRestoreErrors([]);
              const res = restoreFromBackupJson(restoreJsonInput);
              if (!res.ok) {
                setRestoreErrors(res.errors);
              } else {
                setRestoreJsonInput('');
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E1E9E5] dark:border-[#304540] text-xs font-medium hover:bg-[#F8FAF9]"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Validate & Restore JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
}
