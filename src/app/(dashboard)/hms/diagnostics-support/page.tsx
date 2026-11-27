'use client';

import React, { useState, useEffect } from 'react';
import {
  Pill,
  Droplet,
  Microscope,
  HeartPulse,
  Flame,
  ShieldAlert,
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
  Activity,
  FileText,
  BadgeAlert,
  ChevronRight,
  Shield,
  Sparkles,
  Check,
} from 'lucide-react';
import { DiagnosticsSupportService } from '@/services/diagnosticsSupport.service';
import { PatientApiService } from '@/services/patient.service';

export default function DiagnosticsSupportPage() {
  const [activeTab, setActiveTab] = useState<
    'pharmacy' | 'blood' | 'pathology' | 'cardiac' | 'cssd' | 'ipc' | 'mortuary'
  >('pharmacy');

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [patients, setPatients] = useState<any[]>([]);
  const [stats, setStats] = useState({
    pathologyPendingCount: 0,
    cardiacReportsCount: 0,
    cssdActiveBatchesCount: 0,
    mortuaryOccupiedCount: 0,
  });

  // Tab Data Collections
  const [pathologyList, setPathologyList] = useState<any[]>([]);
  const [cardiacList, setCardiacList] = useState<any[]>([]);
  const [cssdList, setCssdList] = useState<any[]>([]);
  const [ipcList, setIpcList] = useState<any[]>([]);
  const [mortuaryList, setMortuaryList] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showPathologyModal, setShowPathologyModal] = useState(false);
  const [showCardiacModal, setShowCardiacModal] = useState(false);
  const [showCssdModal, setShowCssdModal] = useState(false);
  const [showIpcModal, setShowIpcModal] = useState(false);
  const [showMortuaryModal, setShowMortuaryModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [selectedMortuaryId, setSelectedMortuaryId] = useState<string>('');
  const [releasedToName, setReleasedToName] = useState('Next-of-Kin');

  // Form states
  const [pathologyForm, setPathologyForm] = useState({
    patientId: '',
    specimenType: 'Tissue Biopsy',
    organOrSite: 'Liver Left Lobe',
    clinicalDiagnosis: 'Suspected hepatic lesion',
    grossDescription: 'Specimen in formalin weighing 12g',
    microscopicDescription: 'H&E stain shows well-differentiated hepatocytes',
    pathologistImpression: 'Benign liver tissue with mild fatty changes',
  });

  const [cardiacForm, setCardiacForm] = useState({
    patientId: '',
    type: 'ECHOCARDIOGRAM',
    ejectionFractionPercent: 62,
    rhythm: 'Normal Sinus Rhythm',
    valvularStatus: 'Trace mitral regurgitation, no stenosis',
    wallMotionSummary: 'Normal LVK wall motion',
    impression: 'Preserved left ventricular systolic function (EF 62%).',
  });

  const [cssdForm, setCssdForm] = useState({
    batchCode: 'AUT-2025-084',
    autoclaveMachineId: 'Autoclave #2 (Steam Sterilizer)',
    trayDescription: 'Major Laparotomy Surgical Tray #4',
    cycleTemperatureCelsius: 134,
    cyclePressureBar: 2.1,
    validDays: 30,
  });

  const [ipcForm, setIpcForm] = useState({
    patientId: '',
    wardId: 'ICU Ward A',
    pathogenIsolated: 'Methicillin-Resistant Staphylococcus Aureus (MRSA)',
    infectionSite: 'Wound / Surgical Site',
    surveillanceType: 'NOSOCOMIAL',
    isolationPrecautionsRequired: true,
    notes: 'Contact isolation initiated. Dedicated nursing staff assigned.',
  });

  const [mortuaryForm, setMortuaryForm] = useState({
    deceasedName: '',
    gender: 'MALE',
    dateOfDeath: new Date().toISOString().slice(0, 10),
    causeOfDeath: 'Cardiorespiratory arrest secondary to severe sepsis',
    chamberBayNumber: 'Cold Bay #06',
    nextOfKinName: '',
    nextOfKinPhone: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, pathRes, cardRes, cssdRes, ipcRes, morRes, ptsRes] = await Promise.all([
        DiagnosticsSupportService.getStats().catch(() => ({ data: {} })),
        DiagnosticsSupportService.getPathology().catch(() => ({ data: [] })),
        DiagnosticsSupportService.getCardiac().catch(() => ({ data: [] })),
        DiagnosticsSupportService.getCssd().catch(() => ({ data: [] })),
        DiagnosticsSupportService.getIpc().catch(() => ({ data: [] })),
        DiagnosticsSupportService.getMortuary().catch(() => ({ data: [] })),
        PatientApiService.getPatients({ limit: 50 }).catch(() => ({ patients: [] })),
      ]);

      setStats({
        pathologyPendingCount: statsRes.data?.pathologyPendingCount || 0,
        cardiacReportsCount: statsRes.data?.cardiacReportsCount || 0,
        cssdActiveBatchesCount: statsRes.data?.cssdActiveBatchesCount || 0,
        mortuaryOccupiedCount: statsRes.data?.mortuaryOccupiedCount || 0,
      });

      setPathologyList(pathRes.data || []);
      setCardiacList(cardRes.data || []);
      setCssdList(cssdRes.data || []);
      setIpcList(ipcRes.data || []);
      setMortuaryList(morRes.data || []);
      setPatients(ptsRes.patients || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load diagnostics records');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePathology = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await DiagnosticsSupportService.createPathology(pathologyForm);
      setSuccessMsg('Pathology specimen report created!');
      setShowPathologyModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to log pathology specimen');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCardiac = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await DiagnosticsSupportService.createCardiac(cardiacForm);
      setSuccessMsg('Cardiac diagnostic report saved!');
      setShowCardiacModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to save cardiac report');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCssd = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await DiagnosticsSupportService.createCssd(cssdForm);
      setSuccessMsg('CSSD Autoclave batch logged & sterile cleared!');
      setShowCssdModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to record CSSD batch');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateIpc = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await DiagnosticsSupportService.createIpc(ipcForm);
      setSuccessMsg('IPC Surveillance log saved!');
      setShowIpcModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to record IPC log');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateMortuary = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await DiagnosticsSupportService.createMortuary(mortuaryForm);
      setSuccessMsg('Mortuary record created & Body Tag generated!');
      setShowMortuaryModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to create mortuary record');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseBody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMortuaryId) return;
    setActionLoading(true);
    setError(null);
    try {
      await DiagnosticsSupportService.releaseMortuaryBody(selectedMortuaryId, releasedToName);
      setSuccessMsg('Mortuary body release cleared to Next-of-Kin!');
      setShowReleaseModal(false);
      setSelectedMortuaryId('');
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to clear body release');
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
              <Building className="w-4 h-4" /> Hospital Diagnostics Suite
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Diagnostics & Clinical Support Hub</h1>
            <p className="text-slate-500 text-xs mt-1 max-w-2xl">
              Centralized support suite for Pharmacy, Blood Bank, Pathology, Cardiac Echo/ECG, CSSD Sterilization, IPC Surveillance, and Mortuary.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                if (activeTab === 'pathology') setShowPathologyModal(true);
                else if (activeTab === 'cardiac') setShowCardiacModal(true);
                else if (activeTab === 'cssd') setShowCssdModal(true);
                else if (activeTab === 'ipc') setShowIpcModal(true);
                else if (activeTab === 'mortuary') setShowMortuaryModal(true);
                else setShowPathologyModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1b7b68] text-white rounded-xl font-bold text-xs hover:bg-[#145e50] transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Log Entry
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

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-700 rounded-lg">
            <Microscope className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Pathology Biopsies</p>
            <p className="text-lg font-bold text-slate-800">{pathologyList.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-red-50 text-red-700 rounded-lg">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Cardiac Reports</p>
            <p className="text-lg font-bold text-slate-800">{stats.cardiacReportsCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">CSSD Sterile Batches</p>
            <p className="text-lg font-bold text-slate-800">{stats.cssdActiveBatchesCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-[#64748b]/10 text-slate-700 rounded-lg">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Mortuary Occupancy</p>
            <p className="text-lg font-bold text-slate-800">{stats.mortuaryOccupiedCount}</p>
          </div>
        </div>
      </div>

      {/* 7 Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex flex-wrap gap-1">
        {[
          { id: 'pharmacy', label: 'Pharmacy & Dispensary', icon: Pill },
          { id: 'blood', label: 'Blood Bank', icon: Droplet },
          { id: 'pathology', label: 'Pathology & Histology', icon: Microscope },
          { id: 'cardiac', label: 'Cardiac Diagnostics (ECG/Echo)', icon: HeartPulse },
          { id: 'cssd', label: 'CSSD Sterilization', icon: Flame },
          { id: 'ipc', label: 'Infection Control (IPC)', icon: ShieldAlert },
          { id: 'mortuary', label: 'Mortuary Management', icon: Building },
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

      {/* TAB CONTENT 1: PHARMACY & DISPENSARY */}
      {activeTab === 'pharmacy' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 text-center">
          <Pill className="w-10 h-10 text-[#1b7b68] mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Hospital Pharmacy & Dispensary Integration</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Integrated with Pharmacy module (`/hms/pharmacy`) for e-prescribing queue, drug interaction checks, and stock dispensing.
          </p>
        </div>
      )}

      {/* TAB CONTENT 2: BLOOD BANK */}
      {activeTab === 'blood' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 text-center">
          <Droplet className="w-10 h-10 text-rose-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Blood Bank & Transfusion Safety Hub</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Blood group unit inventory (A+, B+, O-, etc.), crossmatch verification, and transfusion safety release clearance.
          </p>
        </div>
      )}

      {/* TAB CONTENT 3: PATHOLOGY & HISTOLOGY */}
      {activeTab === 'pathology' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Pathology & Histology Specimen Registry</h2>
              <p className="text-xs text-slate-400">Tissue biopsy processing (Grossing &rarr; Sectioning &rarr; Staining &rarr; Microscopy).</p>
            </div>
            <button
              onClick={() => setShowPathologyModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs hover:bg-purple-700 transition"
            >
              <Plus className="w-4 h-4" /> Log Biopsy Specimen
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Patient</th>
                  <th className="p-3">Specimen & Site</th>
                  <th className="p-3">Clinical Diagnosis</th>
                  <th className="p-3">Received At</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pathologyList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No pathology specimen records found.
                    </td>
                  </tr>
                ) : (
                  pathologyList.map((p: any) => (
                    <tr key={p._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-semibold text-slate-800">
                        {p.patientId?.firstName ? `${p.patientId.firstName} ${p.patientId.lastName}` : 'Patient'}
                      </td>
                      <td className="p-3 font-bold text-purple-700">{p.specimenType} ({p.organOrSite})</td>
                      <td className="p-3 text-slate-600">{p.clinicalDiagnosis || 'Under Evaluation'}</td>
                      <td className="p-3 text-slate-500">{new Date(p.receivedAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full font-bold text-[10px]">
                          {p.status}
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

      {/* TAB CONTENT 4: CARDIAC DIAGNOSTICS */}
      {activeTab === 'cardiac' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Cardiac Diagnostics (ECG, Echocardiogram, Holter)</h2>
              <p className="text-xs text-slate-400">Echocardiogram Ejection Fraction %, Valvular regurgitation, and ECG reports.</p>
            </div>
            <button
              onClick={() => setShowCardiacModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition"
            >
              <Plus className="w-4 h-4" /> Save Cardiac Report
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Patient</th>
                  <th className="p-3">Test Type</th>
                  <th className="p-3">Ejection Fraction (EF)</th>
                  <th className="p-3">Rhythm & Valves</th>
                  <th className="p-3">Cardiologist Impression</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cardiacList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No cardiac diagnostic reports found.
                    </td>
                  </tr>
                ) : (
                  cardiacList.map((c: any) => (
                    <tr key={c._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-semibold text-slate-800">
                        {c.patientId?.firstName ? `${c.patientId.firstName} ${c.patientId.lastName}` : 'Patient'}
                      </td>
                      <td className="p-3 font-bold text-red-700">{c.type}</td>
                      <td className="p-3 font-bold text-slate-800">
                        {c.ejectionFractionPercent ? `${c.ejectionFractionPercent}%` : 'N/A'}
                      </td>
                      <td className="p-3 text-slate-600">{c.rhythm || c.valvularStatus || 'Normal'}</td>
                      <td className="p-3 text-slate-700 font-medium max-w-xs truncate">{c.impression}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: CSSD STERILIZATION */}
      {activeTab === 'cssd' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Central Sterile Supply Department (CSSD)</h2>
              <p className="text-xs text-slate-400">Autoclave sterilization batch logs, indicator tape verification, and sterile expiry dates.</p>
            </div>
            <button
              onClick={() => setShowCssdModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition"
            >
              <Plus className="w-4 h-4" /> Log Autoclave Batch
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Batch Code</th>
                  <th className="p-3">Tray Description</th>
                  <th className="p-3">Sterilization Parameters</th>
                  <th className="p-3">Indicator Tape</th>
                  <th className="p-3">Expires At</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cssdList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No CSSD batch sterilization records found.
                    </td>
                  </tr>
                ) : (
                  cssdList.map((cs: any) => (
                    <tr key={cs._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-extrabold text-emerald-700">{cs.batchCode}</td>
                      <td className="p-3 font-semibold text-slate-800">{cs.trayDescription}</td>
                      <td className="p-3 text-slate-600">{cs.cycleTemperatureCelsius}°C | {cs.cyclePressureBar} bar</td>
                      <td className="p-3 font-bold text-emerald-600">
                        {cs.indicatorTapePassed ? 'PASSED (PASSED)' : 'FAILED'}
                      </td>
                      <td className="p-3 text-slate-500">{new Date(cs.expiresAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                          {cs.status}
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

      {/* TAB CONTENT 6: INFECTION PREVENTION & CONTROL (IPC) */}
      {activeTab === 'ipc' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Infection Prevention & Control (IPC) Surveillance</h2>
              <p className="text-xs text-slate-400">Nosocomial infection surveillance, pathogen culture alerts (MRSA, ESBL), and isolation precautions.</p>
            </div>
            <button
              onClick={() => setShowIpcModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition"
            >
              <Plus className="w-4 h-4" /> Log IPC Alert
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Ward / Location</th>
                  <th className="p-3">Pathogen Isolated</th>
                  <th className="p-3">Infection Site</th>
                  <th className="p-3">Isolation Precautions</th>
                  <th className="p-3">Surveillance Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ipcList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No IPC surveillance flags active.
                    </td>
                  </tr>
                ) : (
                  ipcList.map((ipc: any) => (
                    <tr key={ipc._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-bold text-slate-800">{ipc.wardId || 'Hospital Wide'}</td>
                      <td className="p-3 font-bold text-rose-700">{ipc.pathogenIsolated || 'MRSA'}</td>
                      <td className="p-3 text-slate-600">{ipc.infectionSite || 'Surgical Site'}</td>
                      <td className="p-3 font-bold">
                        {ipc.isolationPrecautionsRequired ? (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-[10px]">
                            CONTACT ISOLATION
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                            STANDARD
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{ipc.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 7: MORTUARY MANAGEMENT */}
      {activeTab === 'mortuary' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Mortuary Management & Cold Chamber Registry</h2>
              <p className="text-xs text-slate-400">Deceased body reception, cold chamber bay allocation, death certificates, and body release.</p>
            </div>
            <button
              onClick={() => setShowMortuaryModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-900 transition"
            >
              <Plus className="w-4 h-4" /> Mortuary Reception
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Body Tag Code</th>
                  <th className="p-3">Deceased Name</th>
                  <th className="p-3">Cold Chamber Bay</th>
                  <th className="p-3">Date of Death & Cause</th>
                  <th className="p-3">Next-of-Kin Contact</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mortuaryList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No mortuary records found.
                    </td>
                  </tr>
                ) : (
                  mortuaryList.map((m: any) => (
                    <tr key={m._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-extrabold text-[#1b7b68]">{m.bodyTagCode}</td>
                      <td className="p-3 font-semibold text-slate-800">{m.deceasedName}</td>
                      <td className="p-3 font-bold text-slate-700">{m.chamberBayNumber}</td>
                      <td className="p-3 text-slate-600">
                        {new Date(m.dateOfDeath).toLocaleDateString()} - {m.causeOfDeath}
                      </td>
                      <td className="p-3 text-slate-600">
                        {m.nextOfKinName} ({m.nextOfKinPhone})
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            m.status === 'RELEASED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {m.status !== 'RELEASED' && (
                          <button
                            onClick={() => {
                              setSelectedMortuaryId(m._id);
                              setShowReleaseModal(true);
                            }}
                            className="px-2.5 py-1 bg-slate-800 text-white rounded-lg font-bold text-[11px] hover:bg-slate-900 transition"
                          >
                            Clear Body Release
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

      {/* MODAL: PATHOLOGY */}
      {showPathologyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Microscope className="w-4 h-4 text-purple-600" /> Log Pathology Biopsy Specimen
              </h3>
              <button onClick={() => setShowPathologyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreatePathology} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Patient</label>
                <select
                  required
                  value={pathologyForm.patientId}
                  onChange={(e) => setPathologyForm({ ...pathologyForm, patientId: e.target.value })}
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
                  <label className="block font-semibold text-slate-600 mb-1">Specimen Type</label>
                  <input
                    type="text"
                    required
                    value={pathologyForm.specimenType}
                    onChange={(e) => setPathologyForm({ ...pathologyForm, specimenType: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Organ / Site</label>
                  <input
                    type="text"
                    required
                    value={pathologyForm.organOrSite}
                    onChange={(e) => setPathologyForm({ ...pathologyForm, organOrSite: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Pathologist Impression</label>
                <textarea
                  rows={2}
                  value={pathologyForm.pathologistImpression}
                  onChange={(e) => setPathologyForm({ ...pathologyForm, pathologistImpression: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPathologyModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Specimen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CARDIAC */}
      {showCardiacModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-red-600" /> Save Cardiac Diagnostic Report
              </h3>
              <button onClick={() => setShowCardiacModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCardiac} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Patient</label>
                <select
                  required
                  value={cardiacForm.patientId}
                  onChange={(e) => setCardiacForm({ ...cardiacForm, patientId: e.target.value })}
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
                  <label className="block font-semibold text-slate-600 mb-1">Test Type</label>
                  <select
                    value={cardiacForm.type}
                    onChange={(e) => setCardiacForm({ ...cardiacForm, type: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="ECHOCARDIOGRAM">Echocardiogram</option>
                    <option value="ECG">12-Lead ECG</option>
                    <option value="HOLTER_MONITOR">Holter Monitor</option>
                    <option value="STRESS_TEST">Treadmill Stress Test</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Ejection Fraction (EF %)</label>
                  <input
                    type="number"
                    min="10"
                    max="90"
                    value={cardiacForm.ejectionFractionPercent}
                    onChange={(e) => setCardiacForm({ ...cardiacForm, ejectionFractionPercent: parseInt(e.target.value) || 60 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Cardiologist Impression</label>
                <textarea
                  required
                  rows={2}
                  value={cardiacForm.impression}
                  onChange={(e) => setCardiacForm({ ...cardiacForm, impression: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCardiacModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Cardiac Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CSSD */}
      {showCssdModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-600" /> Log CSSD Sterilization Batch
              </h3>
              <button onClick={() => setShowCssdModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCssd} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Batch Code</label>
                <input
                  type="text"
                  required
                  value={cssdForm.batchCode}
                  onChange={(e) => setCssdForm({ ...cssdForm, batchCode: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Instrument Tray Description</label>
                <input
                  type="text"
                  required
                  value={cssdForm.trayDescription}
                  onChange={(e) => setCssdForm({ ...cssdForm, trayDescription: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCssdModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Sterile Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MORTUARY */}
      {showMortuaryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-800" /> Mortuary Deceased Reception
              </h3>
              <button onClick={() => setShowMortuaryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateMortuary} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Deceased Full Name</label>
                <input
                  type="text"
                  required
                  value={mortuaryForm.deceasedName}
                  onChange={(e) => setMortuaryForm({ ...mortuaryForm, deceasedName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Cold Chamber Bay #</label>
                  <input
                    type="text"
                    required
                    value={mortuaryForm.chamberBayNumber}
                    onChange={(e) => setMortuaryForm({ ...mortuaryForm, chamberBayNumber: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Cause of Death</label>
                  <input
                    type="text"
                    required
                    value={mortuaryForm.causeOfDeath}
                    onChange={(e) => setMortuaryForm({ ...mortuaryForm, causeOfDeath: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Next-of-Kin Name</label>
                  <input
                    type="text"
                    required
                    value={mortuaryForm.nextOfKinName}
                    onChange={(e) => setMortuaryForm({ ...mortuaryForm, nextOfKinName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Next-of-Kin Phone</label>
                  <input
                    type="tel"
                    required
                    value={mortuaryForm.nextOfKinPhone}
                    onChange={(e) => setMortuaryForm({ ...mortuaryForm, nextOfKinPhone: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMortuaryModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register Body & Issue Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MORTUARY RELEASE BODY */}
      {showReleaseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Building className="w-4 h-4 text-[#1b7b68]" /> Clear Body Release to Next-of-Kin
              </h3>
              <button onClick={() => setShowReleaseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleReleaseBody} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Released To (Name & Relationship)</label>
                <input
                  type="text"
                  required
                  value={releasedToName}
                  onChange={(e) => setReleasedToName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReleaseModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#1b7b68] text-white rounded-xl font-bold hover:bg-[#145e50]"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Release Clearance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
