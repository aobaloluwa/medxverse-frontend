'use client';

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Activity,
  ListOrdered,
  BedDouble,
  Share2,
  Users,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Printer,
  X,
  Phone,
  Shield,
  User,
  RefreshCw,
  AlertCircle,
  LogIn,
  LogOut,
  Building,
  HeartPulse,
  ChevronRight,
  FileText,
  BadgeAlert,
  Loader2,
} from 'lucide-react';
import { FrontDeskService } from '@/services/frontDesk.service';
import { PatientApiService } from '@/services/patient.service';
import { IPatient } from '@/types/patient';

export default function FrontDeskPage() {
  const [activeTab, setActiveTab] = useState<'registration' | 'triage' | 'queue' | 'admissions' | 'referrals' | 'visitors'>('registration');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalPatients: 0,
    queueWaiting: 0,
    activeAdmissions: 0,
    pendingReferrals: 0,
    activeVisitors: 0,
  });

  // State collections
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [queueTickets, setQueueTickets] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState('Outpatient');

  const [admissions, setAdmissions] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referralFilter, setReferralFilter] = useState<'ALL' | 'INWARD' | 'OUTWARD'>('ALL');

  const [visitors, setVisitors] = useState<any[]>([]);

  // Modals
  const [showRegModal, setShowRegModal] = useState(false);
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [printedPass, setPrintedPass] = useState<any>(null);

  // Form states
  const [regForm, setRegForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'MALE',
    phone: '',
    email: '',
    address: '',
    bloodGroup: 'O+',
    genotype: 'AA',
    emergencyContact: { name: '', phone: '', relationship: 'FAMILY' },
  });

  const [triageForm, setTriageForm] = useState({
    patientId: '',
    scale: 'ESI',
    level: 3,
    chiefComplaint: '',
    temperature: '36.8',
    bpSystolic: '120',
    bpDiastolic: '80',
    heartRate: '75',
    respiratoryRate: '16',
    oxygenSaturation: '98',
  });

  const [queueForm, setQueueForm] = useState({
    patientId: '',
    providerId: '650000000000000000000001',
    department: 'Outpatient',
    priority: 'ROUTINE',
    notes: '',
  });

  const [admissionForm, setAdmissionForm] = useState({
    patientId: '',
    admittingDoctorId: '650000000000000000000001',
    wardId: 'WARD-A',
    bedNumber: 'A-101',
    bedType: 'GENERAL',
    admissionReason: '',
  });

  const [dischargeSummary, setDischargeSummary] = useState('');

  const [referralForm, setReferralForm] = useState({
    patientId: '',
    type: 'OUTWARD',
    referringFacility: 'MedXVerse Central Hospital',
    receivingFacility: '',
    referringDoctorName: '',
    receivingDoctorName: '',
    specialtyRequired: 'Cardiology',
    reason: '',
    urgency: 'ROUTINE',
    transportRequired: false,
    notes: '',
  });

  const [visitorForm, setVisitorForm] = useState({
    patientId: '',
    visitorName: '',
    visitorPhone: '',
    visitorIdNumber: '',
    relationship: 'FAMILY',
    wardId: 'WARD-A',
    bedNumber: 'A-101',
    validHours: 8,
    notes: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ptsData, queueData, admData, refData, visData] = await Promise.all([
        PatientApiService.getPatients({ limit: 50 }).catch(() => ({ patients: [], total: 0 })),
        FrontDeskService.getQueue().catch(() => ({ data: [] })),
        FrontDeskService.getAdmissions().catch(() => ({ admissions: [], total: 0 })),
        FrontDeskService.getReferrals().catch(() => ({ data: [] })),
        FrontDeskService.getVisitorPasses().catch(() => ({ data: [] })),
      ]);

      const fetchedPatients = ptsData.patients || [];
      const fetchedQueue = queueData.data || queueData.tickets || [];
      const fetchedAdmissions = admData.admissions || admData.data || [];
      const fetchedReferrals = refData.data || refData.referrals || [];
      const fetchedVisitors = visData.data || visData.passes || [];

      setPatients(fetchedPatients);
      setQueueTickets(fetchedQueue);
      setAdmissions(fetchedAdmissions);
      setReferrals(fetchedReferrals);
      setVisitors(fetchedVisitors);

      setStats({
        totalPatients: ptsData.total || fetchedPatients.length,
        queueWaiting: fetchedQueue.filter((q: any) => q.status === 'WAITING').length,
        activeAdmissions: fetchedAdmissions.filter((a: any) => a.status === 'ADMITTED').length,
        pendingReferrals: fetchedReferrals.filter((r: any) => r.status === 'PENDING').length,
        activeVisitors: fetchedVisitors.filter((v: any) => v.status === 'CHECKED_IN').length,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load Front Desk data');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await PatientApiService.registerPatient(regForm as any);
      setSuccessMsg('Patient registered successfully!');
      setShowRegModal(false);
      setRegForm({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'MALE',
        phone: '',
        email: '',
        address: '',
        bloodGroup: 'O+',
        genotype: 'AA',
        emergencyContact: { name: '', phone: '', relationship: 'FAMILY' },
      });
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssueQueueToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await FrontDeskService.createWalkInQueue(queueForm);
      setSuccessMsg('Queue token issued successfully!');
      setShowQueueModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to issue queue token');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateQueueStatus = async (ticketId: string, status: string) => {
    try {
      await FrontDeskService.updateQueueTicket(ticketId, status);
      setSuccessMsg(`Ticket status updated to ${status}`);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Status update failed');
    }
  };

  const handleAdmitPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await FrontDeskService.admitPatient(admissionForm);
      setSuccessMsg('Patient admitted successfully!');
      setShowAdmissionModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Admission failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) return;
    setActionLoading(true);
    setError(null);
    try {
      await FrontDeskService.dischargePatient(selectedAdmission._id, dischargeSummary);
      setSuccessMsg('Patient discharged successfully!');
      setShowDischargeModal(false);
      setSelectedAdmission(null);
      setDischargeSummary('');
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Discharge failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await FrontDeskService.createReferral(referralForm);
      setSuccessMsg('Referral recorded successfully!');
      setShowReferralModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to create referral');
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssueVisitorPass = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      const res = await FrontDeskService.issueVisitorPass(visitorForm);
      setSuccessMsg('Visitor Pass issued successfully!');
      setPrintedPass(res.data || res);
      setShowVisitorModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to issue visitor pass');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckInVisitor = async (passId: string) => {
    try {
      await FrontDeskService.checkInVisitor(passId);
      setSuccessMsg('Visitor checked in.');
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Check-in failed');
    }
  };

  const handleCheckOutVisitor = async (passId: string) => {
    try {
      await FrontDeskService.checkOutVisitor(passId);
      setSuccessMsg('Visitor checked out.');
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Check-out failed');
    }
  };

  const filteredPatients = patients.filter(
    (p) =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.mrn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1b7b68] to-[#145e50] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <Building className="w-4 h-4" /> Hospital Management System
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Front Desk & Patient Access Hub</h1>
            <p className="text-teal-100 text-sm mt-1">
              Centralized desk for patient registration, triage scoring, queue tokens, admissions, referrals, and digital visitor passes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowRegModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#1b7b68] rounded-xl font-bold text-xs hover:bg-teal-50 transition shadow-md"
            >
              <UserPlus className="w-4 h-4" /> Register Walk-in
            </button>
            <button
              onClick={() => setShowQueueModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600/60 border border-teal-400/40 text-white rounded-xl font-bold text-xs hover:bg-teal-600 transition shadow-sm"
            >
              <ListOrdered className="w-4 h-4" /> Issue Token
            </button>
            <button
              onClick={fetchInitialData}
              className="p-2.5 bg-teal-600/40 hover:bg-teal-600/60 text-white rounded-xl transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
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

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-[#1b7b68] rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Registered Patients</p>
            <p className="text-lg font-bold text-slate-800">{stats.totalPatients}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">In Queue</p>
            <p className="text-lg font-bold text-slate-800">{stats.queueWaiting}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <BedDouble className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Active IPD</p>
            <p className="text-lg font-bold text-slate-800">{stats.activeAdmissions}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Pending Referrals</p>
            <p className="text-lg font-bold text-slate-800">{stats.pendingReferrals}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Active Visitors</p>
            <p className="text-lg font-bold text-slate-800">{stats.activeVisitors}</p>
          </div>
        </div>
      </div>

      {/* Main Tab Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex flex-wrap gap-1">
        {[
          { id: 'registration', label: 'Patient Registration', icon: UserPlus },
          { id: 'triage', label: 'Triage Desk', icon: Activity },
          { id: 'queue', label: 'Queue & Calling', icon: ListOrdered },
          { id: 'admissions', label: 'Admissions & Discharge', icon: BedDouble },
          { id: 'referrals', label: 'Referrals (In/Out)', icon: Share2 },
          { id: 'visitors', label: 'Visitor Management', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition ${
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

      {/* TAB CONTENT 1: REGISTRATION & LOOKUP */}
      {activeTab === 'registration' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Patient Directory & Registration</h2>
              <p className="text-xs text-slate-400">Search existing EMR patient records or issue new MRN.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search MRN, Name, Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68] w-64"
                />
              </div>
              <button
                onClick={() => setShowRegModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-[#1b7b68] text-white rounded-xl font-bold text-xs hover:bg-[#145e50] transition"
              >
                <Plus className="w-4 h-4" /> New Patient
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">MRN</th>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Gender / Age</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Blood Group</th>
                  <th className="p-3">Emergency Contact</th>
                  <th className="p-3 text-right rounded-r-xl">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No patients found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((p: any) => (
                    <tr key={p._id || p.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-bold text-[#1b7b68]">{p.mrn || 'PENDING'}</td>
                      <td className="p-3 font-semibold text-slate-800">
                        {p.firstName} {p.lastName}
                      </td>
                      <td className="p-3 text-slate-600">
                        {p.gender || 'N/A'} {p.dateOfBirth ? `(${new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear()}y)` : ''}
                      </td>
                      <td className="p-3 text-slate-600">{p.phone || 'N/A'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-md text-[10px]">
                          {p.bloodGroup || 'O+'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">
                        {p.emergencyContact?.name
                          ? `${p.emergencyContact.name} (${p.emergencyContact.phone})`
                          : p.nextOfKin
                          ? p.nextOfKin
                          : 'None'}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setQueueForm({ ...queueForm, patientId: p._id || p.id });
                            setShowQueueModal(true);
                          }}
                          className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg font-bold text-[11px] hover:bg-amber-100 transition"
                        >
                          Queue
                        </button>
                        <button
                          onClick={() => {
                            setAdmissionForm({ ...admissionForm, patientId: p._id || p.id });
                            setShowAdmissionModal(true);
                          }}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-[11px] hover:bg-indigo-100 transition"
                        >
                          Admit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: TRIAGE DESK */}
      {activeTab === 'triage' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Front Desk Triage & Acuity Scoring</h2>
              <p className="text-xs text-slate-400">Perform rapid acuity assessment (ESI Level 1-5 / CTAS) and capture initial vitals.</p>
            </div>
            <button
              onClick={() => setShowTriageModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-700 transition"
            >
              <Activity className="w-4 h-4" /> New Triage Assessment
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { level: 'ESI 1 - Resuscitation', desc: 'Immediate life-saving intervention required', color: 'bg-rose-50 border-rose-300 text-rose-800', badge: 'RED' },
              { level: 'ESI 2 - Emergent', desc: 'High risk, confused, severe pain / distress', color: 'bg-orange-50 border-orange-300 text-orange-800', badge: 'ORANGE' },
              { level: 'ESI 3 - Urgent', desc: 'Stable, requires multiple diagnostic resources', color: 'bg-amber-50 border-amber-300 text-amber-800', badge: 'YELLOW' },
              { level: 'ESI 4 - Less Urgent', desc: 'Requires one diagnostic or simple procedure', color: 'bg-emerald-50 border-emerald-300 text-emerald-800', badge: 'GREEN' },
              { level: 'ESI 5 - Non-Urgent', desc: 'Routine consultation, no labs required', color: 'bg-blue-50 border-blue-300 text-blue-800', badge: 'BLUE' },
            ].map((esi, idx) => (
              <div key={idx} className={`p-4 rounded-xl border ${esi.color} space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs">{esi.level}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-white/70">
                    {esi.badge}
                  </span>
                </div>
                <p className="text-[11px] leading-snug opacity-90">{esi.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
            <HeartPulse className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Ready for Patient Acuity Tagging</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Click the button above to record vital signs (BP, Pulse, SpO2, Temp) and assign Emergency Severity Index priority to route patients to ER or OPD.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: QUEUE MANAGEMENT */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Token Queue & Patient Calling</h2>
              <p className="text-xs text-slate-400">Manage real-time department queues and trigger token call audio/display.</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68]"
              >
                <option value="Outpatient">Outpatient Clinic</option>
                <option value="Emergency">Emergency</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Laboratory">Laboratory</option>
                <option value="Radiology">Radiology</option>
                <option value="Billing">Billing</option>
              </select>
              <button
                onClick={() => setShowQueueModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-[#1b7b68] text-white rounded-xl font-bold text-xs hover:bg-[#145e50] transition"
              >
                <Plus className="w-4 h-4" /> Issue Ticket
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Ticket #</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Checked In</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queueTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No active queue tickets currently waiting.
                    </td>
                  </tr>
                ) : (
                  queueTickets.map((t: any) => (
                    <tr key={t._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-extrabold text-[#1b7b68] text-sm">{t.ticketNumber || t.code || 'TK-001'}</td>
                      <td className="p-3 font-semibold text-slate-800">
                        {t.patientId?.firstName ? `${t.patientId.firstName} ${t.patientId.lastName}` : 'Walk-In Patient'}
                      </td>
                      <td className="p-3 text-slate-600">{t.department || 'Outpatient'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 font-bold rounded-md text-[10px] ${
                            t.priority === 'EMERGENCY'
                              ? 'bg-rose-100 text-rose-800'
                              : t.priority === 'URGENT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.priority || 'ROUTINE'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{t.checkedInAt ? new Date(t.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            t.status === 'CALLED'
                              ? 'bg-indigo-100 text-indigo-700 animate-pulse'
                              : t.status === 'IN_SERVICE'
                              ? 'bg-emerald-100 text-emerald-700'
                              : t.status === 'COMPLETED'
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        {t.status === 'WAITING' && (
                          <button
                            onClick={() => handleUpdateQueueStatus(t._id, 'CALLED')}
                            className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-bold text-[11px] hover:bg-indigo-700 transition"
                          >
                            Call Patient
                          </button>
                        )}
                        {t.status === 'CALLED' && (
                          <button
                            onClick={() => handleUpdateQueueStatus(t._id, 'IN_SERVICE')}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition"
                          >
                            Start Service
                          </button>
                        )}
                        {t.status === 'IN_SERVICE' && (
                          <button
                            onClick={() => handleUpdateQueueStatus(t._id, 'COMPLETED')}
                            className="px-2.5 py-1 bg-slate-700 text-white rounded-lg font-bold text-[11px] hover:bg-slate-800 transition"
                          >
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: ADMISSIONS & DISCHARGE */}
      {activeTab === 'admissions' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Inpatient Admissions & Discharge Desk</h2>
              <p className="text-xs text-slate-400">Process bed allocations, IPD admissions, and discharge clearance.</p>
            </div>
            <button
              onClick={() => setShowAdmissionModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition"
            >
              <BedDouble className="w-4 h-4" /> New Admission
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Patient</th>
                  <th className="p-3">Ward / Bed</th>
                  <th className="p-3">Bed Type</th>
                  <th className="p-3">Admitted At</th>
                  <th className="p-3">Admission Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No inpatient admissions found.
                    </td>
                  </tr>
                ) : (
                  admissions.map((adm: any) => (
                    <tr key={adm._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-semibold text-slate-800">
                        {adm.patientId?.firstName ? `${adm.patientId.firstName} ${adm.patientId.lastName}` : 'Admitted Patient'}
                      </td>
                      <td className="p-3 font-bold text-indigo-700">
                        {adm.wardId} - {adm.bedNumber}
                      </td>
                      <td className="p-3 text-slate-600">{adm.bedType}</td>
                      <td className="p-3 text-slate-500">{new Date(adm.admittedAt || adm.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{adm.admissionReason}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            adm.status === 'ADMITTED'
                              ? 'bg-indigo-100 text-indigo-700'
                              : adm.status === 'DISCHARGED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {adm.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {adm.status === 'ADMITTED' && (
                          <button
                            onClick={() => {
                              setSelectedAdmission(adm);
                              setShowDischargeModal(true);
                            }}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg font-bold text-[11px] hover:bg-rose-100 transition"
                          >
                            Discharge
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: REFERRALS (IN / OUT) */}
      {activeTab === 'referrals' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Hospital Referrals (Inward & Outward)</h2>
              <p className="text-xs text-slate-400">Track patients referred from outside clinics or transferred to specialty care facilities.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['ALL', 'INWARD', 'OUTWARD'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setReferralFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      referralFilter === type ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowReferralModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition"
              >
                <Plus className="w-4 h-4" /> Create Referral
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Type</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Referring Facility</th>
                  <th className="p-3">Receiving Facility</th>
                  <th className="p-3">Specialty</th>
                  <th className="p-3">Urgency</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referrals.filter((r) => referralFilter === 'ALL' || r.type === referralFilter).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No referral records found.
                    </td>
                  </tr>
                ) : (
                  referrals
                    .filter((r) => referralFilter === 'ALL' || r.type === referralFilter)
                    .map((ref: any) => (
                      <tr key={ref._id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3 font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              ref.type === 'INWARD' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {ref.type}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          {ref.patientId?.firstName ? `${ref.patientId.firstName} ${ref.patientId.lastName}` : 'Patient'}
                        </td>
                        <td className="p-3 text-slate-600">{ref.referringFacility}</td>
                        <td className="p-3 text-slate-600">{ref.receivingFacility}</td>
                        <td className="p-3 font-bold text-slate-700">{ref.specialtyRequired}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 font-bold rounded text-[10px] ${
                              ref.urgency === 'EMERGENCY' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {ref.urgency}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                            {ref.status}
                          </span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: VISITOR MANAGEMENT */}
      {activeTab === 'visitors' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Digital Visitor Pass & Access Control</h2>
              <p className="text-xs text-slate-400">Issue visitor badges, track active check-ins, and enforce maximum visitor limits.</p>
            </div>
            <button
              onClick={() => setShowVisitorModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition"
            >
              <Shield className="w-4 h-4" /> Issue Visitor Pass
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Pass Code</th>
                  <th className="p-3">Visitor Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Ward / Bed</th>
                  <th className="p-3">Valid Until</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visitors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No visitor passes issued today.
                    </td>
                  </tr>
                ) : (
                  visitors.map((v: any) => (
                    <tr key={v._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-extrabold text-emerald-700">{v.passCode}</td>
                      <td className="p-3 font-semibold text-slate-800">{v.visitorName}</td>
                      <td className="p-3 text-slate-600">{v.visitorPhone}</td>
                      <td className="p-3 text-slate-800">{v.patientId?.firstName ? `${v.patientId.firstName} ${v.patientId.lastName}` : 'Patient'}</td>
                      <td className="p-3 font-bold text-slate-700">
                        {v.wardId} - {v.bedNumber}
                      </td>
                      <td className="p-3 text-slate-500">{new Date(v.validUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            v.status === 'CHECKED_IN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : v.status === 'CHECKED_OUT'
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {v.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleCheckInVisitor(v._id)}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition"
                          >
                            Check In
                          </button>
                        )}
                        {v.status === 'CHECKED_IN' && (
                          <button
                            onClick={() => handleCheckOutVisitor(v._id)}
                            className="px-2.5 py-1 bg-slate-700 text-white rounded-lg font-bold text-[11px] hover:bg-slate-800 transition"
                          >
                            Check Out
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTER PATIENT */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#1b7b68]" /> Register Walk-In Patient
              </h3>
              <button onClick={() => setShowRegModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRegisterPatient} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={regForm.firstName}
                    onChange={(e) => setRegForm({ ...regForm, firstName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={regForm.lastName}
                    onChange={(e) => setRegForm({ ...regForm, lastName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={regForm.dateOfBirth}
                    onChange={(e) => setRegForm({ ...regForm, dateOfBirth: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Gender</label>
                  <select
                    value={regForm.gender}
                    onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={regForm.address}
                  onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#1b7b68] text-white rounded-xl font-bold hover:bg-[#145e50]"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register & Generate MRN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: QUEUE TICKET */}
      {showQueueModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-[#1b7b68]" /> Issue Queue Ticket
              </h3>
              <button onClick={() => setShowQueueModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleIssueQueueToken} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Patient</label>
                <select
                  required
                  value={queueForm.patientId}
                  onChange={(e) => setQueueForm({ ...queueForm, patientId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p: any) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.firstName} {p.lastName} ({p.mrn || 'No MRN'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Department Queue</label>
                <select
                  value={queueForm.department}
                  onChange={(e) => setQueueForm({ ...queueForm, department: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none"
                >
                  <option value="Outpatient">Outpatient Clinic</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Laboratory">Laboratory</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Billing">Billing</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Priority</label>
                <select
                  value={queueForm.priority}
                  onChange={(e) => setQueueForm({ ...queueForm, priority: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none"
                >
                  <option value="ROUTINE">Routine</option>
                  <option value="PRIORITY">Priority</option>
                  <option value="URGENT">Urgent</option>
                  <option value="EMERGENCY">Emergency</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQueueModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#1b7b68] text-white rounded-xl font-bold hover:bg-[#145e50]"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Issue Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADMIT PATIENT */}
      {showAdmissionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-indigo-600" /> Inpatient Admission & Bed Allocation
              </h3>
              <button onClick={() => setShowAdmissionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdmitPatient} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Patient</label>
                <select
                  required
                  value={admissionForm.patientId}
                  onChange={(e) => setAdmissionForm({ ...admissionForm, patientId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:border-indigo-600 outline-none"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p: any) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.firstName} {p.lastName} ({p.mrn || 'No MRN'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Ward</label>
                  <input
                    type="text"
                    required
                    value={admissionForm.wardId}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, wardId: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Bed Number</label>
                  <input
                    type="text"
                    required
                    value={admissionForm.bedNumber}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, bedNumber: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Admission Reason</label>
                <textarea
                  required
                  rows={2}
                  value={admissionForm.admissionReason}
                  onChange={(e) => setAdmissionForm({ ...admissionForm, admissionReason: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:border-indigo-600 outline-none"
                  placeholder="Primary clinical reason for IPD stay..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdmissionModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Admission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DISCHARGE PATIENT */}
      {showDischargeModal && selectedAdmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <LogOut className="w-4 h-4 text-rose-600" /> Patient Discharge Clearance
              </h3>
              <button onClick={() => setShowDischargeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleDischarge} className="space-y-3 text-xs">
              <p className="text-slate-600">
                Confirm discharge for <span className="font-bold text-slate-800">{selectedAdmission.patientId?.firstName || 'Patient'}</span> from bed{' '}
                <span className="font-bold text-indigo-700">{selectedAdmission.wardId}-{selectedAdmission.bedNumber}</span>.
              </p>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Discharge Summary</label>
                <textarea
                  required
                  rows={3}
                  value={dischargeSummary}
                  onChange={(e) => setDischargeSummary(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:border-rose-600 outline-none"
                  placeholder="Summary of treatment given and post-discharge instructions..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDischargeModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Clear & Discharge Bed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CREATE REFERRAL */}
      {showReferralModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-600" /> Create Patient Referral
              </h3>
              <button onClick={() => setShowReferralModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateReferral} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Referral Direction</label>
                <select
                  value={referralForm.type}
                  onChange={(e) => setReferralForm({ ...referralForm, type: e.target.value as any })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:border-purple-600 outline-none"
                >
                  <option value="OUTWARD">Outward (Referred to External Facility)</option>
                  <option value="INWARD">Inward (Referred from External Facility)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Patient</label>
                <select
                  required
                  value={referralForm.patientId}
                  onChange={(e) => setReferralForm({ ...referralForm, patientId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:border-purple-600 outline-none"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p: any) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.firstName} {p.lastName} ({p.mrn || 'No MRN'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Referring Facility</label>
                  <input
                    type="text"
                    required
                    value={referralForm.referringFacility}
                    onChange={(e) => setReferralForm({ ...referralForm, referringFacility: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-purple-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Receiving Facility</label>
                  <input
                    type="text"
                    required
                    value={referralForm.receivingFacility}
                    onChange={(e) => setReferralForm({ ...referralForm, receivingFacility: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-purple-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Specialty</label>
                  <input
                    type="text"
                    required
                    value={referralForm.specialtyRequired}
                    onChange={(e) => setReferralForm({ ...referralForm, specialtyRequired: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-purple-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Urgency</label>
                  <select
                    value={referralForm.urgency}
                    onChange={(e) => setReferralForm({ ...referralForm, urgency: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-purple-600 outline-none"
                  >
                    <option value="ROUTINE">Routine</option>
                    <option value="URGENT">Urgent</option>
                    <option value="EMERGENCY">Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Reason for Referral</label>
                <textarea
                  required
                  rows={2}
                  value={referralForm.reason}
                  onChange={(e) => setReferralForm({ ...referralForm, reason: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:border-purple-600 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReferralModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Referral'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: ISSUE VISITOR PASS */}
      {showVisitorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" /> Issue Digital Visitor Pass
              </h3>
              <button onClick={() => setShowVisitorModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleIssueVisitorPass} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Visitor Full Name</label>
                <input
                  type="text"
                  required
                  value={visitorForm.visitorName}
                  onChange={(e) => setVisitorForm({ ...visitorForm, visitorName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Visitor Phone</label>
                  <input
                    type="tel"
                    required
                    value={visitorForm.visitorPhone}
                    onChange={(e) => setVisitorForm({ ...visitorForm, visitorPhone: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-emerald-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Relationship</label>
                  <input
                    type="text"
                    required
                    value={visitorForm.relationship}
                    onChange={(e) => setVisitorForm({ ...visitorForm, relationship: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Patient to Visit</label>
                <select
                  required
                  value={visitorForm.patientId}
                  onChange={(e) => setVisitorForm({ ...visitorForm, patientId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:border-emerald-600 outline-none"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p: any) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.firstName} {p.lastName} ({p.mrn || 'No MRN'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Ward</label>
                  <input
                    type="text"
                    required
                    value={visitorForm.wardId}
                    onChange={(e) => setVisitorForm({ ...visitorForm, wardId: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-emerald-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Bed Number</label>
                  <input
                    type="text"
                    required
                    value={visitorForm.bedNumber}
                    onChange={(e) => setVisitorForm({ ...visitorForm, bedNumber: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowVisitorModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Badge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT BADGE PREVIEW MODAL */}
      {printedPass && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-emerald-100">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                VISITOR PASS BADGE
              </span>
              <h3 className="text-xl font-black text-slate-800 mt-2">{printedPass.passCode || 'VP-98214'}</h3>
              <p className="text-xs font-bold text-slate-700 mt-1">{printedPass.visitorName}</p>
              <p className="text-[11px] text-slate-400">Visiting Ward: {printedPass.wardId} (Bed {printedPass.bedNumber})</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-left text-xs space-y-1 text-slate-600">
              <p><span className="font-semibold text-slate-800">Phone:</span> {printedPass.visitorPhone}</p>
              <p><span className="font-semibold text-slate-800">Relation:</span> {printedPass.relationship}</p>
              <p><span className="font-semibold text-slate-800">Valid Until:</span> {new Date(printedPass.validUntil || Date.now()).toLocaleTimeString()}</p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => setPrintedPass(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Badge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
