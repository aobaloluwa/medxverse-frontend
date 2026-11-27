'use client';

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Calendar,
  ShieldCheck,
  GraduationCap,
  Award,
  Building,
  Plus,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Clock,
  User,
  Users,
  Star,
  FileText,
  BadgeAlert,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { HrService } from '@/services/hr.service';
import { StaffApiService } from '@/services/staff.service';

export default function HumanResourcesPage() {
  const [activeTab, setActiveTab] = useState<
    'recruitment' | 'leave' | 'licenses' | 'cme' | 'appraisals'
  >('recruitment');

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [staffList, setStaffList] = useState<any[]>([]);
  const [stats, setStats] = useState({
    activeCandidatesCount: 0,
    pendingLeaveCount: 0,
    expiringLicensesCount: 0,
    totalCmeUnitsEarned: 0,
  });

  // Tab Data Collections
  const [applications, setApplications] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [cmeCourses, setCmeCourses] = useState<any[]>([]);
  const [appraisals, setAppraisals] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showCmeModal, setShowCmeModal] = useState(false);
  const [showAppraisalModal, setShowAppraisalModal] = useState(false);

  // Forms
  const [applicationForm, setApplicationForm] = useState({
    applicantName: 'Dr. Amina Abubakar',
    email: 'amina.abubakar@example.com',
    phone: '+2348031234567',
    positionApplied: 'Consultant Obstetrician',
    departmentName: 'Obstetrics & Gynecology',
  });

  const [leaveForm, setLeaveForm] = useState({
    staffId: '',
    leaveType: 'ANNUAL',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    reason: 'Annual vacation leave.',
  });

  const [licenseForm, setLicenseForm] = useState({
    staffId: '',
    issuingCouncil: 'MDCN',
    licenseNumber: 'MDCN-REG-2025-984',
    issueDate: '2024-01-01',
    expiryDate: '2025-12-31',
    notes: 'Medical Council Practicing License.',
  });

  const [cmeForm, setCmeForm] = useState({
    staffId: '',
    courseTitle: 'Advanced Life Support in Obstetrics (ALSO)',
    providerName: 'MedxLearn Platform',
    cmeUnitsEarned: 10,
  });

  const [appraisalForm, setAppraisalForm] = useState({
    staffId: '',
    evaluationPeriod: '2025-Q1',
    clinicalCompetenceRating: 5,
    punctualityRating: 4,
    patientSatisfactionRating: 5,
    teamworkRating: 4,
    reviewerComments: 'Exemplary clinical competence and teamwork in emergency protocols.',
  });

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, appRes, leaveRes, licRes, cmeRes, apprRes, staffRes] = await Promise.all([
        HrService.getStats().catch(() => ({ data: {} })),
        HrService.getApplications().catch(() => ({ data: [] })),
        HrService.getLeaveRequests().catch(() => ({ data: [] })),
        HrService.getLicenses().catch(() => ({ data: [] })),
        HrService.getCmeCourses().catch(() => ({ data: [] })),
        HrService.getAppraisals().catch(() => ({ data: [] })),
        StaffApiService.getStaff({}).catch(() => ({ data: [] })),
      ]);

      setStats({
        activeCandidatesCount: statsRes.data?.activeCandidatesCount || 0,
        pendingLeaveCount: statsRes.data?.pendingLeaveCount || 0,
        expiringLicensesCount: statsRes.data?.expiringLicensesCount || 0,
        totalCmeUnitsEarned: statsRes.data?.totalCmeUnitsEarned || 0,
      });

      setApplications(appRes.data || []);
      setLeaveRequests(leaveRes.data || []);
      setLicenses(licRes.data || []);
      setCmeCourses(cmeRes.data || []);
      setAppraisals(apprRes.data || []);
      setStaffList(staffRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load HR records');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await HrService.createApplication(applicationForm);
      setSuccessMsg('Job application registered into pipeline!');
      setShowApplicationModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to register job application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateApplicationStage = async (id: string, stage: string) => {
    try {
      await HrService.updateApplicationStage(id, stage);
      setSuccessMsg(`Candidate stage updated to ${stage}`);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to update candidate stage');
    }
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await HrService.createLeaveRequest(leaveForm);
      setSuccessMsg('Staff leave request submitted!');
      setShowLeaveModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateLeaveStatus = async (id: string, status: string) => {
    try {
      await HrService.updateLeaveStatus(id, status);
      setSuccessMsg(`Leave request ${status}`);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to update leave status');
    }
  };

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await HrService.createLicense(licenseForm);
      setSuccessMsg('Medical Council license recorded!');
      setShowLicenseModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to record license credential');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCme = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await HrService.createCmeCourse(cmeForm);
      setSuccessMsg('MedxLearn CME course & units logged!');
      setShowCmeModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to log CME course');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await HrService.createAppraisal(appraisalForm);
      setSuccessMsg('Staff performance appraisal saved!');
      setShowAppraisalModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to save appraisal evaluation');
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
              <Building className="w-4 h-4" /> Hospital Human Resources Suite
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Human Resources & Personnel Management</h1>
            <p className="text-slate-500 text-xs mt-1 max-w-2xl">
              Recruitment pipeline, staff leave approvals, Medical Council credentialing, MedxLearn CME training, and performance appraisals.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowApplicationModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1b7b68] text-white rounded-xl font-bold text-xs hover:bg-[#145e50] transition shadow-sm"
            >
              <UserPlus className="w-4 h-4" /> New Job Candidate
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
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Recruitment Candidates</p>
            <p className="text-lg font-bold text-slate-800">{stats.activeCandidatesCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Pending Leave</p>
            <p className="text-lg font-bold text-slate-800">{stats.pendingLeaveCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-700 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Licenses Expiring Soon</p>
            <p className="text-lg font-bold text-slate-800">{stats.expiringLicensesCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">CME Units Earned</p>
            <p className="text-lg font-bold text-slate-800">{stats.totalCmeUnitsEarned} pts</p>
          </div>
        </div>
      </div>

      {/* 5 Sub-Module Tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex flex-wrap gap-1">
        {[
          { id: 'recruitment', label: 'Recruitment & Onboarding', icon: UserPlus },
          { id: 'leave', label: 'Leave & Attendance', icon: Calendar },
          { id: 'licenses', label: 'Credentialing & Licenses', icon: ShieldCheck },
          { id: 'cme', label: 'MedxLearn CME Training', icon: GraduationCap },
          { id: 'appraisals', label: 'Performance Appraisals', icon: Award },
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

      {/* TAB CONTENT 1: RECRUITMENT */}
      {activeTab === 'recruitment' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Recruitment & Staff Onboarding Pipeline</h2>
              <p className="text-xs text-slate-400">Track candidate applications, interviews, offers, and hiring stages.</p>
            </div>
            <button
              onClick={() => setShowApplicationModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition"
            >
              <UserPlus className="w-4 h-4" /> Add Candidate
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Applicant Name</th>
                  <th className="p-3">Position & Dept</th>
                  <th className="p-3">Email & Phone</th>
                  <th className="p-3">Applied Date</th>
                  <th className="p-3">Pipeline Stage</th>
                  <th className="p-3 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No active job applications.
                    </td>
                  </tr>
                ) : (
                  applications.map((app: any) => (
                    <tr key={app._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-semibold text-slate-800">{app.applicantName}</td>
                      <td className="p-3 font-bold text-[#1b7b68]">{app.positionApplied} ({app.departmentName})</td>
                      <td className="p-3 text-slate-600">{app.email} | {app.phone}</td>
                      <td className="p-3 text-slate-500">{new Date(app.appliedDate).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full font-bold text-[10px]">
                          {app.stage}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        {app.stage === 'APPLIED' && (
                          <button
                            onClick={() => handleUpdateApplicationStage(app._id, 'INTERVIEW_SCHEDULED')}
                            className="px-2.5 py-1 bg-blue-600 text-white rounded-lg font-bold text-[11px] hover:bg-blue-700 transition"
                          >
                            Schedule Interview
                          </button>
                        )}
                        {app.stage === 'INTERVIEW_SCHEDULED' && (
                          <button
                            onClick={() => handleUpdateApplicationStage(app._id, 'OFFER_EXTENDED')}
                            className="px-2.5 py-1 bg-purple-600 text-white rounded-lg font-bold text-[11px] hover:bg-purple-700 transition"
                          >
                            Extend Offer
                          </button>
                        )}
                        {app.stage === 'OFFER_EXTENDED' && (
                          <button
                            onClick={() => handleUpdateApplicationStage(app._id, 'HIRED')}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition"
                          >
                            Hire & Onboard
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

      {/* TAB CONTENT 2: LEAVE & ATTENDANCE */}
      {activeTab === 'leave' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Staff Leave Applications & Approval Workflow</h2>
              <p className="text-xs text-slate-400">Annual, sick, maternity, and CME study leave approval tracking.</p>
            </div>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-700 transition"
            >
              <Plus className="w-4 h-4" /> Submit Leave Request
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Staff Member</th>
                  <th className="p-3">Leave Type</th>
                  <th className="p-3">Period</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No staff leave requests submitted.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((l: any) => (
                    <tr key={l._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-semibold text-slate-800">
                        {l.staffId?.firstName ? `${l.staffId.firstName} ${l.staffId.lastName}` : 'Staff Member'}
                      </td>
                      <td className="p-3 font-bold text-amber-700">{l.leaveType}</td>
                      <td className="p-3 text-slate-600">
                        {new Date(l.startDate).toLocaleDateString()} &rarr; {new Date(l.endDate).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{l.reason}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            l.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        {l.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleUpdateLeaveStatus(l._id, 'APPROVED')}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateLeaveStatus(l._id, 'REJECTED')}
                              className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg font-bold text-[11px] hover:bg-rose-100 transition"
                            >
                              Reject
                            </button>
                          </>
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

      {/* TAB CONTENT 3: CREDENTIALS & LICENSES */}
      {activeTab === 'licenses' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Medical Council Credentialing & License Expiration Tracker</h2>
              <p className="text-xs text-slate-400">MDCN, NMCN, PCN, MLSCN, and RRBN practicing license verification.</p>
            </div>
            <button
              onClick={() => setShowLicenseModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#1b7b68] text-white rounded-xl font-bold text-xs hover:bg-[#145e50] transition"
            >
              <Plus className="w-4 h-4" /> Add License Credential
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Staff Member</th>
                  <th className="p-3">Issuing Council</th>
                  <th className="p-3">License Number</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3 font-right rounded-r-xl">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {licenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No medical council license records found.
                    </td>
                  </tr>
                ) : (
                  licenses.map((lic: any) => (
                    <tr key={lic._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-semibold text-slate-800">
                        {lic.staffId?.firstName ? `${lic.staffId.firstName} ${lic.staffId.lastName}` : 'Staff Practitioner'}
                      </td>
                      <td className="p-3 font-bold text-[#1b7b68]">{lic.issuingCouncil}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">{lic.licenseNumber}</td>
                      <td className="p-3 text-slate-600 font-medium">{new Date(lic.expiryDate).toLocaleDateString()}</td>
                      <td className="p-3 font-bold text-emerald-600">{lic.verificationStatus}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: TRAINING & CME (MEDXLEARN) */}
      {activeTab === 'cme' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">MedxLearn Training & CME Credit Units Tracker</h2>
              <p className="text-xs text-slate-400">Continuing Medical Education course completions & license renewal credits.</p>
            </div>
            <button
              onClick={() => setShowCmeModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition"
            >
              <Plus className="w-4 h-4" /> Log CME Course
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Staff Practitioner</th>
                  <th className="p-3">Course Title</th>
                  <th className="p-3">Provider</th>
                  <th className="p-3">CME Units Earned</th>
                  <th className="p-3 font-right rounded-r-xl">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cmeCourses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No CME course records logged.
                    </td>
                  </tr>
                ) : (
                  cmeCourses.map((c: any) => (
                    <tr key={c._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-semibold text-slate-800">
                        {c.staffId?.firstName ? `${c.staffId.firstName} ${c.staffId.lastName}` : 'Practitioner'}
                      </td>
                      <td className="p-3 font-bold text-slate-800">{c.courseTitle}</td>
                      <td className="p-3 text-slate-600">{c.providerName || 'MedxLearn Platform'}</td>
                      <td className="p-3 font-extrabold text-emerald-700">+{c.cmeUnitsEarned} CME units</td>
                      <td className="p-3 text-slate-500">{new Date(c.completedAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: PERFORMANCE APPRAISALS */}
      {activeTab === 'appraisals' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Staff Performance Appraisals & KPI Evaluations</h2>
              <p className="text-xs text-slate-400">Clinical competence, punctuality, patient satisfaction, and teamwork ratings.</p>
            </div>
            <button
              onClick={() => setShowAppraisalModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs hover:bg-purple-700 transition"
            >
              <Plus className="w-4 h-4" /> New Appraisal Evaluation
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Staff Member</th>
                  <th className="p-3">Period</th>
                  <th className="p-3">Overall Rating</th>
                  <th className="p-3">Reviewer Comments</th>
                  <th className="p-3 font-right rounded-r-xl">Evaluated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appraisals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No staff performance appraisals evaluated.
                    </td>
                  </tr>
                ) : (
                  appraisals.map((a: any) => (
                    <tr key={a._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-semibold text-slate-800">
                        {a.staffId?.firstName ? `${a.staffId.firstName} ${a.staffId.lastName}` : 'Staff Member'}
                      </td>
                      <td className="p-3 font-bold text-slate-700">{a.evaluationPeriod}</td>
                      <td className="p-3 font-extrabold text-[#1b7b68] flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {a.overallRating?.toFixed(1)} / 5.0
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{a.reviewerComments}</td>
                      <td className="p-3 text-slate-500">{new Date(a.evaluatedAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: APPLICATION */}
      {showApplicationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" /> Register Candidate Job Application
              </h3>
              <button onClick={() => setShowApplicationModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateApplication} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Applicant Name</label>
                <input
                  type="text"
                  required
                  value={applicationForm.applicantName}
                  onChange={(e) => setApplicationForm({ ...applicationForm, applicantName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={applicationForm.email}
                    onChange={(e) => setApplicationForm({ ...applicationForm, email: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={applicationForm.phone}
                    onChange={(e) => setApplicationForm({ ...applicationForm, phone: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Position</label>
                  <input
                    type="text"
                    required
                    value={applicationForm.positionApplied}
                    onChange={(e) => setApplicationForm({ ...applicationForm, positionApplied: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold text-[#1b7b68]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={applicationForm.departmentName}
                    onChange={(e) => setApplicationForm({ ...applicationForm, departmentName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowApplicationModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LEAVE REQUEST */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" /> Submit Staff Leave Application
              </h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateLeave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Staff Member</label>
                <select
                  required
                  value={leaveForm.staffId}
                  onChange={(e) => setLeaveForm({ ...leaveForm, staffId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="">-- Choose Staff Member --</option>
                  {staffList.map((s: any) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.firstName} {s.lastName} ({s.role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Leave Type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value as any })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold"
                >
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="MATERNITY">Maternity Leave</option>
                  <option value="PATERNITY">Paternity Leave</option>
                  <option value="STUDY_CME">Study / CME Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Reason</label>
                <textarea
                  required
                  rows={2}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LICENSE CREDENTIAL */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1b7b68]" /> Record Medical Council License
              </h3>
              <button onClick={() => setShowLicenseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateLicense} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Practitioner</label>
                <select
                  required
                  value={licenseForm.staffId}
                  onChange={(e) => setLicenseForm({ ...licenseForm, staffId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="">-- Choose Practitioner --</option>
                  {staffList.map((s: any) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.firstName} {s.lastName} ({s.role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Issuing Council</label>
                  <select
                    value={licenseForm.issuingCouncil}
                    onChange={(e) => setLicenseForm({ ...licenseForm, issuingCouncil: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold"
                  >
                    <option value="MDCN">MDCN (Medical Council)</option>
                    <option value="NMCN">NMCN (Nursing Council)</option>
                    <option value="PCN">PCN (Pharmacy Council)</option>
                    <option value="MLSCN">MLSCN (Lab Science Council)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">License Number</label>
                  <input
                    type="text"
                    required
                    value={licenseForm.licenseNumber}
                    onChange={(e) => setLicenseForm({ ...licenseForm, licenseNumber: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={licenseForm.issueDate}
                    onChange={(e) => setLicenseForm({ ...licenseForm, issueDate: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={licenseForm.expiryDate}
                    onChange={(e) => setLicenseForm({ ...licenseForm, expiryDate: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLicenseModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#1b7b68] text-white rounded-xl font-bold hover:bg-[#145e50]"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm License'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CME COURSE */}
      {showCmeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-600" /> Log MedxLearn CME Units
              </h3>
              <button onClick={() => setShowCmeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCme} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Practitioner</label>
                <select
                  required
                  value={cmeForm.staffId}
                  onChange={(e) => setCmeForm({ ...cmeForm, staffId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="">-- Choose Practitioner --</option>
                  {staffList.map((s: any) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.firstName} {s.lastName} ({s.role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={cmeForm.courseTitle}
                  onChange={(e) => setCmeForm({ ...cmeForm, courseTitle: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">CME Credit Units Earned</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={cmeForm.cmeUnitsEarned}
                  onChange={(e) => setCmeForm({ ...cmeForm, cmeUnitsEarned: parseInt(e.target.value) || 1 })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold text-emerald-700"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCmeModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record CME Units'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APPRAISAL */}
      {showAppraisalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" /> Record Performance Appraisal
              </h3>
              <button onClick={() => setShowAppraisalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateAppraisal} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Staff Member</label>
                <select
                  required
                  value={appraisalForm.staffId}
                  onChange={(e) => setAppraisalForm({ ...appraisalForm, staffId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="">-- Choose Staff Member --</option>
                  {staffList.map((s: any) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.firstName} {s.lastName} ({s.role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Evaluation Period</label>
                <input
                  type="text"
                  required
                  value={appraisalForm.evaluationPeriod}
                  onChange={(e) => setAppraisalForm({ ...appraisalForm, evaluationPeriod: e.target.value })}
                  placeholder="e.g. 2025-Q1 or 2024-ANNUAL"
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Clinical Competence (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    required
                    value={appraisalForm.clinicalCompetenceRating}
                    onChange={(e) => setAppraisalForm({ ...appraisalForm, clinicalCompetenceRating: parseInt(e.target.value) || 5 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Teamwork Rating (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    required
                    value={appraisalForm.teamworkRating}
                    onChange={(e) => setAppraisalForm({ ...appraisalForm, teamworkRating: parseInt(e.target.value) || 5 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Reviewer Comments</label>
                <textarea
                  required
                  rows={2}
                  value={appraisalForm.reviewerComments}
                  onChange={(e) => setAppraisalForm({ ...appraisalForm, reviewerComments: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAppraisalModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Appraisal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
