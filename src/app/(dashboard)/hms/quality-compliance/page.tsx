'use client';

import React, { useState, useEffect } from 'react';
import {
  Scale,
  ShieldAlert,
  FileCheck2,
  Archive,
  Baby,
  Activity,
  FileSpreadsheet,
  Lock,
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
  Printer,
} from 'lucide-react';
import { QualityComplianceService } from '@/services/qualityCompliance.service';
import { PatientApiService } from '@/services/patient.service';

export default function QualityCompliancePage() {
  const [activeTab, setActiveTab] = useState<
    'qa' | 'incidents' | 'consents' | 'archive' | 'birth-death' | 'surveillance' | 'regulatory' | 'ndpa'
  >('incidents');

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [patients, setPatients] = useState<any[]>([]);
  const [stats, setStats] = useState({
    openIncidentsCount: 0,
    signedConsentsCount: 0,
    registeredBirthsCount: 0,
    registeredDeathsCount: 0,
    activeSurveillanceCases: 0,
  });

  // Tab Data Collections
  const [incidents, setIncidents] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [birthDeathList, setBirthDeathList] = useState<any[]>([]);
  const [surveillanceList, setSurveillanceList] = useState<any[]>([]);
  const [ndpaAuditLogs, setNdpaAuditLogs] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showBirthDeathModal, setShowBirthDeathModal] = useState(false);
  const [showSurveillanceModal, setShowSurveillanceModal] = useState(false);

  // Forms
  const [incidentForm, setIncidentForm] = useState({
    patientId: '',
    incidentType: 'MEDICATION_ERROR',
    severity: 'MODERATE',
    departmentName: 'Inpatient Ward A',
    description: 'Dose timing discrepancy noted during shift change eMAR audit.',
  });

  const [consentForm, setConsentForm] = useState({
    patientId: '',
    procedureName: 'Emergency Exploratory Laparotomy',
    patientSignatureName: 'Mrs. Fatima Bello',
    risksAcknowledged: ['Bleeding', 'Infection', 'Anesthesia Reactions'],
  });

  const [birthDeathForm, setBirthDeathForm] = useState({
    patientId: '',
    type: 'BIRTH',
    subjectName: 'Baby Girl Bello',
    gender: 'FEMALE',
    eventDate: new Date().toISOString().slice(0, 10),
    primaryCauseOrDetails: 'Spontaneous live birth, 3.2kg, Apgar 9/10.',
    icdCode: 'Z38.0',
  });

  const [surveillanceForm, setSurveillanceForm] = useState({
    patientId: '',
    disease: 'LASSA_FEVER',
    caseDefinition: 'SUSPECTED',
    labConfirmationDetails: 'PCR sample sent to NCDC Central Public Health Lab.',
    onsetStartDate: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, incRes, conRes, bdRes, surRes, ndpaRes, ptsRes] = await Promise.all([
        QualityComplianceService.getStats().catch(() => ({ data: {} })),
        QualityComplianceService.getIncidents().catch(() => ({ data: [] })),
        QualityComplianceService.getConsents().catch(() => ({ data: [] })),
        QualityComplianceService.getBirthDeath().catch(() => ({ data: [] })),
        QualityComplianceService.getSurveillance().catch(() => ({ data: [] })),
        QualityComplianceService.getNdpaAuditLogs().catch(() => ({ data: [] })),
        PatientApiService.getPatients({ limit: 50 }).catch(() => ({ patients: [] })),
      ]);

      setStats({
        openIncidentsCount: statsRes.data?.openIncidentsCount || 0,
        signedConsentsCount: statsRes.data?.signedConsentsCount || 0,
        registeredBirthsCount: statsRes.data?.registeredBirthsCount || 0,
        registeredDeathsCount: statsRes.data?.registeredDeathsCount || 0,
        activeSurveillanceCases: statsRes.data?.activeSurveillanceCases || 0,
      });

      setIncidents(incRes.data || []);
      setConsents(conRes.data || []);
      setBirthDeathList(bdRes.data || []);
      setSurveillanceList(surRes.data || []);
      setNdpaAuditLogs(ndpaRes.data || []);
      setPatients(ptsRes.patients || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load Quality & Compliance records');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await QualityComplianceService.createIncident(incidentForm);
      setSuccessMsg('Adverse incident report logged for investigation!');
      setShowIncidentModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to log incident report');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await QualityComplianceService.createConsent(consentForm);
      setSuccessMsg('Electronic procedural consent signed & archived!');
      setShowConsentModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to create consent form');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateBirthDeath = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await QualityComplianceService.createBirthDeath(birthDeathForm);
      setSuccessMsg('Official Birth/Death certificate issued & MOH notified!');
      setShowBirthDeathModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to issue certificate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSurveillance = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await QualityComplianceService.createSurveillance(surveillanceForm);
      setSuccessMsg('Disease surveillance case reported & NCDC notified!');
      setShowSurveillanceModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to report disease surveillance case');
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
              <Building className="w-4 h-4" /> Hospital Governance & Regulatory Compliance
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Quality, Compliance & Risk Management</h1>
            <p className="text-slate-500 text-xs mt-1 max-w-2xl">
              Quality assurance audits, incident reporting, electronic consents, birth/death registry, disease surveillance, DHIS2 reports, and NDPA audit trail.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                if (activeTab === 'incidents') setShowIncidentModal(true);
                else if (activeTab === 'consents') setShowConsentModal(true);
                else if (activeTab === 'birth-death') setShowBirthDeathModal(true);
                else if (activeTab === 'surveillance') setShowSurveillanceModal(true);
                else setShowIncidentModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1b7b68] text-white rounded-xl font-bold text-xs hover:bg-[#145e50] transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Log Record
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
          <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Open Incidents</p>
            <p className="text-lg font-bold text-slate-800">{stats.openIncidentsCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-[#1b7b68]/10 text-[#1b7b68] rounded-lg">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Signed Consents</p>
            <p className="text-lg font-bold text-slate-800">{stats.signedConsentsCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
            <Baby className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Births & Deaths</p>
            <p className="text-lg font-bold text-slate-800">{stats.registeredBirthsCount + stats.registeredDeathsCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-700 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Disease Surveillance</p>
            <p className="text-lg font-bold text-slate-800">{stats.activeSurveillanceCases}</p>
          </div>
        </div>
      </div>

      {/* 8 Sub-Module Tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex flex-wrap gap-1">
        {[
          { id: 'incidents', label: 'Incident & Risk Reporting', icon: ShieldAlert },
          { id: 'consents', label: 'Consent Forms & e-Signatures', icon: FileCheck2 },
          { id: 'birth-death', label: 'Birth & Death Registration', icon: Baby },
          { id: 'surveillance', label: 'Disease Surveillance (NCDC)', icon: Activity },
          { id: 'qa', label: 'Quality Audit (QA)', icon: Scale },
          { id: 'archive', label: 'Medical Records Archive', icon: Archive },
          { id: 'regulatory', label: 'Regulatory Reports (MOH/DHIS2)', icon: FileSpreadsheet },
          { id: 'ndpa', label: 'NDPA Data Privacy & Audit Trail', icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs transition ${
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

      {/* TAB CONTENT 1: INCIDENTS */}
      {activeTab === 'incidents' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Adverse Incident & Clinical Risk Reporting</h2>
              <p className="text-xs text-slate-400">Log medication errors, patient falls, equipment failures, near misses, and investigation status.</p>
            </div>
            <button
              onClick={() => setShowIncidentModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-700 transition"
            >
              <Plus className="w-4 h-4" /> Log Incident
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Type</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Investigation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No adverse incidents reported.
                    </td>
                  </tr>
                ) : (
                  incidents.map((inc: any) => (
                    <tr key={inc._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-bold text-slate-800">{inc.incidentType}</td>
                      <td className="p-3 font-semibold text-slate-700">{inc.departmentName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded text-[10px]">
                          {inc.severity}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{inc.description}</td>
                      <td className="p-3 font-bold text-amber-700">{inc.investigationStatus}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: CONSENTS */}
      {activeTab === 'consents' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Electronic Surgical & Procedural Consent Forms</h2>
              <p className="text-xs text-slate-400">Digital patient signatures, procedure risk acknowledgments, and doctor sign-offs.</p>
            </div>
            <button
              onClick={() => setShowConsentModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#1b7b68] text-white rounded-xl font-bold text-xs hover:bg-[#145e50] transition"
            >
              <Plus className="w-4 h-4" /> New Consent Form
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Patient</th>
                  <th className="p-3">Procedure Name</th>
                  <th className="p-3">Patient Signature</th>
                  <th className="p-3">Attending Physician</th>
                  <th className="p-3">Signed At</th>
                  <th className="p-3 font-right rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {consents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No electronic consent forms archived.
                    </td>
                  </tr>
                ) : (
                  consents.map((c: any) => (
                    <tr key={c._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-semibold text-slate-800">
                        {c.patientId?.firstName ? `${c.patientId.firstName} ${c.patientId.lastName}` : 'Patient'}
                      </td>
                      <td className="p-3 font-bold text-[#1b7b68]">{c.procedureName}</td>
                      <td className="p-3 text-slate-700 font-medium">{c.patientSignatureName}</td>
                      <td className="p-3 text-slate-600">
                        {c.doctorSignatureId?.firstName ? `Dr. ${c.doctorSignatureId.firstName} ${c.doctorSignatureId.lastName}` : 'Surgeon'}
                      </td>
                      <td className="p-3 text-slate-500">{new Date(c.signedAt).toLocaleString()}</td>
                      <td className="p-3 font-bold text-emerald-700">{c.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: BIRTH & DEATH */}
      {activeTab === 'birth-death' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Official Birth & Death Certificate Registry</h2>
              <p className="text-xs text-slate-400">Generate certificates, cause of death ICD-10 codes, and MOH statutory notifications.</p>
            </div>
            <button
              onClick={() => setShowBirthDeathModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" /> Issue Certificate
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Cert #</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Subject Name</th>
                  <th className="p-3">Event Date</th>
                  <th className="p-3">Cause / Details</th>
                  <th className="p-3">MOH Notified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {birthDeathList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No birth or death certificates issued.
                    </td>
                  </tr>
                ) : (
                  birthDeathList.map((bd: any) => (
                    <tr key={bd._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-extrabold text-[#1b7b68]">{bd.certificateNumber}</td>
                      <td className="p-3 font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${bd.type === 'BIRTH' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'}`}>
                          {bd.type}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{bd.subjectName}</td>
                      <td className="p-3 text-slate-500">{new Date(bd.eventDate).toLocaleDateString()}</td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{bd.primaryCauseOrDetails}</td>
                      <td className="p-3 font-bold text-emerald-600">NOTIFIED</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: SURVEILLANCE */}
      {activeTab === 'surveillance' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Disease Surveillance & Epidemic Alert (NCDC / MOH)</h2>
              <p className="text-xs text-slate-400">Reportable infectious diseases (Lassa Fever, Cholera, Mpox, Measles, Yellow Fever) and NCDC alert triggers.</p>
            </div>
            <button
              onClick={() => setShowSurveillanceModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition"
            >
              <Plus className="w-4 h-4" /> Report Case
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Patient</th>
                  <th className="p-3">Reported Disease</th>
                  <th className="p-3">Case Definition</th>
                  <th className="p-3">Onset Date</th>
                  <th className="p-3">NCDC Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {surveillanceList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No active disease surveillance cases reported.
                    </td>
                  </tr>
                ) : (
                  surveillanceList.map((s: any) => (
                    <tr key={s._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-semibold text-slate-800">
                        {s.patientId?.firstName ? `${s.patientId.firstName} ${s.patientId.lastName}` : 'Patient'}
                      </td>
                      <td className="p-3 font-bold text-rose-700">{s.disease}</td>
                      <td className="p-3 font-bold text-slate-700">{s.caseDefinition}</td>
                      <td className="p-3 text-slate-500">{new Date(s.onsetStartDate).toLocaleDateString()}</td>
                      <td className="p-3 font-bold text-emerald-600">ALERT TRANSMITTED</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: QA AUDIT */}
      {activeTab === 'qa' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 text-center">
          <Scale className="w-10 h-10 text-[#1b7b68] mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Quality Assurance & Clinical Audit Engine</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Clinical indicator audit checklist, Mortality & Morbidity (M&M) review logs, and hospital quality scoring.
          </p>
        </div>
      )}

      {/* TAB CONTENT 6: MEDICAL RECORDS ARCHIVE */}
      {activeTab === 'archive' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 text-center">
          <Archive className="w-10 h-10 text-indigo-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Medical Records Digital & Physical Archive</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Inpatient paper record digital archive index, shelf/box location tracker, and physical record retrieval logs.
          </p>
        </div>
      )}

      {/* TAB CONTENT 7: REGULATORY REPORTS */}
      {activeTab === 'regulatory' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 text-center">
          <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Regulatory Reports (MOH, NHIA, DHIS2) Export</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Automated DHIS2 indicator data package exports, Ministry of Health statutory monthly reports, and NHIA compliance packages.
          </p>
        </div>
      )}

      {/* TAB CONTENT 8: NDPA AUDIT TRAIL */}
      {activeTab === 'ndpa' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Nigeria Data Protection Act (NDPA) Compliance Audit Trail</h2>
              <p className="text-xs text-slate-400">Immutable audit log recording user access to sensitive EMR medical records.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Timestamp</th>
                  <th className="p-3">User Practitioner</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Resource Type</th>
                  <th className="p-3">Resource ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ndpaAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No EMR access audit logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  ndpaAuditLogs.map((log: any) => (
                    <tr key={log._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-mono text-slate-500">{new Date(log.performedAt || log.createdAt).toLocaleString()}</td>
                      <td className="p-3 font-semibold text-slate-800">
                        {log.userId?.firstName ? `${log.userId.firstName} ${log.userId.lastName}` : 'System User'}
                      </td>
                      <td className="p-3 font-bold text-[#1b7b68]">{log.action}</td>
                      <td className="p-3 text-slate-600">{log.resourceType}</td>
                      <td className="p-3 font-mono text-slate-500">{log.resourceId || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: INCIDENT */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" /> Log Adverse Incident Report
              </h3>
              <button onClick={() => setShowIncidentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateIncident} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Incident Type</label>
                  <select
                    value={incidentForm.incidentType}
                    onChange={(e) => setIncidentForm({ ...incidentForm, incidentType: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold"
                  >
                    <option value="MEDICATION_ERROR">Medication Error</option>
                    <option value="PATIENT_FALL">Patient Fall</option>
                    <option value="EQUIPMENT_FAILURE">Equipment Failure</option>
                    <option value="NEEDLE_STICK">Needle Stick Injury</option>
                    <option value="NEAR_MISS">Near Miss</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Severity</label>
                  <select
                    value={incidentForm.severity}
                    onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold"
                  >
                    <option value="MINOR">Minor</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="SEVERE">Severe</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Department</label>
                <input
                  type="text"
                  required
                  value={incidentForm.departmentName}
                  onChange={(e) => setIncidentForm({ ...incidentForm, departmentName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Incident Description</label>
                <textarea
                  required
                  rows={2}
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONSENT */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#1b7b68]" /> Sign Procedural Consent Form
              </h3>
              <button onClick={() => setShowConsentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateConsent} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Patient</label>
                <select
                  required
                  value={consentForm.patientId}
                  onChange={(e) => setConsentForm({ ...consentForm, patientId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
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
                <label className="block font-semibold text-slate-600 mb-1">Procedure Name</label>
                <input
                  type="text"
                  required
                  value={consentForm.procedureName}
                  onChange={(e) => setConsentForm({ ...consentForm, procedureName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold text-[#1b7b68]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Patient Printed Signature Name</label>
                <input
                  type="text"
                  required
                  value={consentForm.patientSignatureName}
                  onChange={(e) => setConsentForm({ ...consentForm, patientSignatureName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConsentModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#1b7b68] text-white rounded-xl font-bold hover:bg-[#145e50]"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign & Archive Consent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BIRTH / DEATH */}
      {showBirthDeathModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Baby className="w-4 h-4 text-blue-600" /> Issue Birth or Death Certificate
              </h3>
              <button onClick={() => setShowBirthDeathModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateBirthDeath} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Record Type</label>
                  <select
                    value={birthDeathForm.type}
                    onChange={(e) => setBirthDeathForm({ ...birthDeathForm, type: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold"
                  >
                    <option value="BIRTH">Birth Certificate</option>
                    <option value="DEATH">Death Certificate</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Subject Full Name</label>
                  <input
                    type="text"
                    required
                    value={birthDeathForm.subjectName}
                    onChange={(e) => setBirthDeathForm({ ...birthDeathForm, subjectName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Primary Cause / Event Details</label>
                <textarea
                  required
                  rows={2}
                  value={birthDeathForm.primaryCauseOrDetails}
                  onChange={(e) => setBirthDeathForm({ ...birthDeathForm, primaryCauseOrDetails: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBirthDeathModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Issue Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SURVEILLANCE */}
      {showSurveillanceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-600" /> Report Infectious Disease Case (NCDC)
              </h3>
              <button onClick={() => setShowSurveillanceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSurveillance} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Patient</label>
                <select
                  required
                  value={surveillanceForm.patientId}
                  onChange={(e) => setSurveillanceForm({ ...surveillanceForm, patientId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
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
                  <label className="block font-semibold text-slate-600 mb-1">Reportable Disease</label>
                  <select
                    value={surveillanceForm.disease}
                    onChange={(e) => setSurveillanceForm({ ...surveillanceForm, disease: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold text-rose-700"
                  >
                    <option value="LASSA_FEVER">Lassa Fever</option>
                    <option value="CHOLERA">Cholera</option>
                    <option value="MPOX">Mpox (Monkeypox)</option>
                    <option value="MEASLES">Measles</option>
                    <option value="YELLOW_FEVER">Yellow Fever</option>
                    <option value="COVID19">COVID-19</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Case Definition</label>
                  <select
                    value={surveillanceForm.caseDefinition}
                    onChange={(e) => setSurveillanceForm({ ...surveillanceForm, caseDefinition: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="SUSPECTED">Suspected Case</option>
                    <option value="PROBABLE">Probable Case</option>
                    <option value="CONFIRMED">Lab Confirmed</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSurveillanceModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Transmit NCDC Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
