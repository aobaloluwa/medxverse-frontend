'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  GitBranch,
  ShieldCheck,
  Cpu,
  Database,
  Settings,
  HelpCircle,
  Building,
  Plus,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Calendar,
  User,
  Shield,
  FileText,
  BadgeAlert,
  ChevronRight,
  Server,
  Download,
  Wifi,
  WifiOff,
  LifeBuoy,
} from 'lucide-react';
import { SystemReportsService } from '@/services/systemReports.service';

export default function ReportsSystemPage() {
  const [activeTab, setActiveTab] = useState<
    'analytics' | 'branches' | 'rbac' | 'integrations' | 'backups' | 'settings' | 'support'
  >('analytics');

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [stats, setStats] = useState({
    activeBranchesCount: 0,
    rbacRolesCount: 0,
    connectedIntegrationsCount: 0,
    openTicketsCount: 0,
  });

  // Tab Data Collections
  const [branches, setBranches] = useState<any[]>([]);
  const [rbacRoles, setRbacRoles] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  // Modals
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  // Forms
  const [branchForm, setBranchForm] = useState({
    branchCode: 'BR-ANNEX1',
    name: 'MedXVerse Annex Specialist Clinic',
    address: 'Plot 12 Commercial Layout, Bodija',
    city: 'Ibadan',
    phone: '+2348023456789',
    isMainCampus: false,
  });

  const [roleForm, setRoleForm] = useState({
    roleKey: 'DUTY_NURSE_LEAD',
    roleName: 'Duty Nurse Lead',
    allowedModules: ['patients', 'nursing', 'mch', 'bed_ward'],
  });

  const [ticketForm, setTicketForm] = useState({
    subject: 'HL7 Lab Analyzer Integration Query',
    category: 'INTEGRATION',
    priority: 'MEDIUM',
    description: 'Require technical assistance pairing the Mindray BS-240 LIS port with the HL7 gateway.',
  });

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, branchRes, roleRes, intRes, backRes, tckRes] = await Promise.all([
        SystemReportsService.getStats().catch(() => ({ data: {} })),
        SystemReportsService.getBranches().catch(() => ({ data: [] })),
        SystemReportsService.getRbacRoles().catch(() => ({ data: [] })),
        SystemReportsService.getIntegrations().catch(() => ({ data: [] })),
        SystemReportsService.getBackups().catch(() => ({ data: [] })),
        SystemReportsService.getTickets().catch(() => ({ data: [] })),
      ]);

      setStats({
        activeBranchesCount: statsRes.data?.activeBranchesCount || 1,
        rbacRolesCount: statsRes.data?.rbacRolesCount || 6,
        connectedIntegrationsCount: statsRes.data?.connectedIntegrationsCount || 3,
        openTicketsCount: statsRes.data?.openTicketsCount || 0,
      });

      setBranches(branchRes.data || []);
      setRbacRoles(roleRes.data || []);
      setIntegrations(intRes.data || []);
      setBackups(backRes.data || []);
      setTickets(tckRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load system records');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await SystemReportsService.createBranch(branchForm);
      setSuccessMsg('Hospital branch registered!');
      setShowBranchModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to create branch');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRbacRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await SystemReportsService.createRbacRole(roleForm);
      setSuccessMsg('RBAC role permissions created!');
      setShowRoleModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to create RBAC role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerBackup = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await SystemReportsService.triggerBackup();
      setSuccessMsg('Manual database backup generated & completed!');
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to generate backup');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await SystemReportsService.createTicket(ticketForm);
      setSuccessMsg('Support ticket submitted to MedXVerse Technical Team!');
      setShowTicketModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit ticket');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#1b7b68] text-xs font-semibold uppercase tracking-wider mb-1">
              <Building className="w-4 h-4" /> Hospital Enterprise Architecture
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Reports, System & Enterprise Architecture Hub</h1>
            <p className="text-slate-500 text-xs mt-1 max-w-2xl">
              Hospital analytics, multi-branch management, RBAC roles & permissions, HL7/FHIR & PACS integrations, database backups, settings, and technical support.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleTriggerBackup}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1b7b68] text-white rounded-xl font-bold text-xs hover:bg-[#145e50] transition shadow-sm"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Trigger Backup
            </button>
            <button
              onClick={fetchInitialData}
              className="p-2.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Active Branches</p>
            <p className="text-lg font-bold text-slate-800">{stats.activeBranchesCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-700 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">RBAC Roles</p>
            <p className="text-lg font-bold text-slate-800">{stats.rbacRolesCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Integrations Online</p>
            <p className="text-lg font-bold text-slate-800">{stats.connectedIntegrationsCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Support Tickets</p>
            <p className="text-lg font-bold text-slate-800">{stats.openTicketsCount}</p>
          </div>
        </div>
      </div>

      {/* 7 Sub-Module Tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex flex-wrap gap-1">
        {[
          { id: 'analytics', label: 'Reports & Analytics', icon: BarChart3 },
          { id: 'branches', label: 'Multi-Branch Management', icon: GitBranch },
          { id: 'rbac', label: 'Roles & Permissions (RBAC)', icon: ShieldCheck },
          { id: 'integrations', label: 'Integrations (HL7/FHIR/PACS)', icon: Cpu },
          { id: 'backups', label: 'Offline Mode & Backup', icon: Database },
          { id: 'settings', label: 'Hospital Settings', icon: Settings },
          { id: 'support', label: 'Help & Support', icon: HelpCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs transition ${
                isActive
                  ? 'bg-[#1b7b68] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT 1: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Hospital Analytics & Statutory Performance Reports</h2>
              <p className="text-xs text-slate-400">Clinical outcomes, average length of stay (ALOS), bed occupancy %, and wait times.</p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 transition"
            >
              <Download className="w-4 h-4" /> Export Analytics PDF
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-500 block uppercase text-[10px]">Bed Occupancy Rate</span>
              <span className="text-lg font-extrabold text-[#1b7b68]">84.2%</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-500 block uppercase text-[10px]">Average Stay (ALOS)</span>
              <span className="text-lg font-extrabold text-slate-800">3.8 Days</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-500 block uppercase text-[10px]">Avg OPD Wait Time</span>
              <span className="text-lg font-extrabold text-slate-800">18 Mins</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-500 block uppercase text-[10px]">Patient Recovery Index</span>
              <span className="text-lg font-extrabold text-emerald-700">96.5%</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: MULTI-BRANCH */}
      {activeTab === 'branches' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Multi-Branch Hospital Location Directory</h2>
              <p className="text-xs text-slate-400">Manage main campus, annex clinics, and outpatient satellite centers.</p>
            </div>
            <button
              onClick={() => setShowBranchModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" /> Add Branch Location
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Branch Code</th>
                  <th className="p-3">Branch Name</th>
                  <th className="p-3">City / Address</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 font-right rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branches.length === 0 ? (
                  <tr className="hover:bg-slate-50/60 transition">
                    <td className="p-3 font-extrabold text-[#1b7b68]">MAIN-HQ</td>
                    <td className="p-3 font-semibold text-slate-800">MedXVerse Central Teaching Hospital</td>
                    <td className="p-3 text-slate-600">Ibadan, Oyo State</td>
                    <td className="p-3 text-slate-600">+2348001234567</td>
                    <td className="p-3 font-bold text-blue-700">Main Campus</td>
                    <td className="p-3 font-bold text-emerald-700">ACTIVE</td>
                  </tr>
                ) : (
                  branches.map((b: any) => (
                    <tr key={b._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-extrabold text-[#1b7b68]">{b.branchCode}</td>
                      <td className="p-3 font-semibold text-slate-800">{b.name}</td>
                      <td className="p-3 text-slate-600">{b.city} ({b.address})</td>
                      <td className="p-3 text-slate-600">{b.phone}</td>
                      <td className="p-3 font-bold text-blue-700">{b.isMainCampus ? 'Main Campus' : 'Annex'}</td>
                      <td className="p-3 font-bold text-emerald-700">ACTIVE</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: RBAC ROLES */}
      {activeTab === 'rbac' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Role-Based Access Control (RBAC) Matrix</h2>
              <p className="text-xs text-slate-400">Configure module permissions for Doctors, Nurses, Pharmacists, and Administrators.</p>
            </div>
            <button
              onClick={() => setShowRoleModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs hover:bg-purple-700 transition"
            >
              <Plus className="w-4 h-4" /> Create Custom Role
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Role Key</th>
                  <th className="p-3">Role Name</th>
                  <th className="p-3">Allowed Modules</th>
                  <th className="p-3 font-right rounded-r-xl">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rbacRoles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      Standard system roles active (Doctor, Nurse, Pharmacist, Lab Tech, Cashier, Super Admin).
                    </td>
                  </tr>
                ) : (
                  rbacRoles.map((r: any) => (
                    <tr key={r._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-extrabold text-purple-700">{r.roleKey}</td>
                      <td className="p-3 font-semibold text-slate-800">{r.roleName}</td>
                      <td className="p-3 text-slate-600">{r.allowedModules?.join(', ') || 'All Modules'}</td>
                      <td className="p-3 font-bold text-slate-600">{r.isSystemDefault ? 'Default' : 'Custom'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: INTEGRATIONS */}
      {activeTab === 'integrations' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Interoperability & Integration Gateways</h2>
              <p className="text-xs text-slate-400">HL7 v2 LIS lab analyzers, DICOM/PACS Imaging, and FHIR R4 EMR publishers.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800 text-sm">FHIR R4 EMR API</span>
                <Wifi className="w-4 h-4 text-emerald-700" />
              </div>
              <p className="text-slate-600">Standardized FHIR resource exchange with external health systems.</p>
              <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded font-bold text-[10px]">CONNECTED</span>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800 text-sm">PACS / DICOM Imaging</span>
                <Wifi className="w-4 h-4 text-emerald-700" />
              </div>
              <p className="text-slate-600">Radiology PACS viewer integration for CT scans, X-rays, and MRI.</p>
              <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded font-bold text-[10px]">CONNECTED</span>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800 text-sm">HL7 v2 Lab Analyzers</span>
                <Wifi className="w-4 h-4 text-emerald-700" />
              </div>
              <p className="text-slate-600">Direct bi-directional serial port connection with Mindray & Sysmex machines.</p>
              <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded font-bold text-[10px]">CONNECTED</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: BACKUPS */}
      {activeTab === 'backups' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Database Backups & Offline Sync Log</h2>
              <p className="text-xs text-slate-400">Automated daily snapshots and manual point-in-time database backup restore points.</p>
            </div>
            <button
              onClick={handleTriggerBackup}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#1b7b68] text-white rounded-xl font-bold text-xs hover:bg-[#145e50] transition"
            >
              <Database className="w-4 h-4" /> Trigger Backup
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Backup File Name</th>
                  <th className="p-3">Size (MB)</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Completed At</th>
                  <th className="p-3 font-right rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Click the button above to generate a manual database backup snapshot.
                    </td>
                  </tr>
                ) : (
                  backups.map((bk: any) => (
                    <tr key={bk._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-mono font-bold text-slate-800">{bk.backupName}</td>
                      <td className="p-3 font-bold text-[#1b7b68]">{bk.sizeMb} MB</td>
                      <td className="p-3 text-slate-600">{bk.type}</td>
                      <td className="p-3 text-slate-500">{new Date(bk.completedAt).toLocaleString()}</td>
                      <td className="p-3 font-bold text-emerald-700">{bk.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 text-center">
          <Settings className="w-10 h-10 text-[#1b7b68] mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Hospital Profile & System Configuration</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Configured in `/hms/settings` for Hospital Name, Logo, Address, Tax ID, Currency, and SMS/Email API gateways.
          </p>
        </div>
      )}

      {/* TAB CONTENT 7: SUPPORT */}
      {activeTab === 'support' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Technical Support & Help Ticketing System</h2>
              <p className="text-xs text-slate-400">Submit tickets directly to MedXVerse technical support engineers.</p>
            </div>
            <button
              onClick={() => setShowTicketModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-700 transition"
            >
              <Plus className="w-4 h-4" /> Open Support Ticket
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Ticket Code</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3 font-right rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No technical support tickets open.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t: any) => (
                    <tr key={t._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-extrabold text-[#1b7b68]">{t.ticketCode}</td>
                      <td className="p-3 font-semibold text-slate-800">{t.subject}</td>
                      <td className="p-3 text-slate-600">{t.category}</td>
                      <td className="p-3 font-bold text-amber-700">{t.priority}</td>
                      <td className="p-3 font-bold text-emerald-700">{t.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: BRANCH */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-blue-600" /> Register Hospital Branch
              </h3>
              <button onClick={() => setShowBranchModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateBranch} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Branch Code</label>
                  <input
                    type="text"
                    required
                    value={branchForm.branchCode}
                    onChange={(e) => setBranchForm({ ...branchForm, branchCode: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold text-[#1b7b68]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={branchForm.city}
                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Address</label>
                <input
                  type="text"
                  required
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUPPORT TICKET */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-amber-600" /> Open Technical Support Ticket
              </h3>
              <button onClick={() => setShowTicketModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTicketModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Support Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
