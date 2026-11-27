'use client';

import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Pill,
  FileText,
  Utensils,
  Plus,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Clock,
  User,
  Building,
  ShieldAlert,
  Droplets,
  AlertTriangle,
  ClipboardCheck,
  Check,
  Ban,
  Activity,
} from 'lucide-react';
import { NursingService } from '@/services/nursing.service';
import { PatientApiService } from '@/services/patient.service';

export default function NursingInpatientCarePage() {
  const [activeTab, setActiveTab] = useState<'station' | 'mar' | 'notes' | 'dietetics'>('station');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [patients, setPatients] = useState<any[]>([]);
  const [marLogs, setMarLogs] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [stationSummary, setStationSummary] = useState({
    scheduledMarCount: 0,
    administeredMarCount: 0,
    highRiskPatientCount: 0,
    handoverNotesCount: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [fluidBalanceData, setFluidBalanceData] = useState<any>(null);

  // Modals
  const [showMarModal, setShowMarModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showFluidModal, setShowFluidModal] = useState(false);
  const [showDietaryModal, setShowDietaryModal] = useState(false);

  // Form states
  const [marForm, setMarForm] = useState({
    patientId: '',
    medicationName: '',
    dosage: '1 tablet',
    route: 'Oral',
    scheduledTime: new Date().toISOString().slice(0, 16),
    notes: '',
  });

  const [noteForm, setNoteForm] = useState({
    patientId: '',
    noteType: 'SHIFT_HANDOVER',
    shiftType: 'MORNING',
    situation: '',
    background: '',
    assessment: '',
    recommendation: '',
    content: '',
    isHighRisk: false,
    isolationPrecautions: false,
    isNpo: false,
  });

  const [fluidForm, setFluidForm] = useState({
    patientId: '',
    oralIntakeMl: 250,
    ivIntakeMl: 500,
    tubeFeedMl: 0,
    urineOutputMl: 350,
    drainOutputMl: 0,
    vomitOutputMl: 0,
    notes: 'Shift fluid intake/output recorded.',
  });

  const [dietaryForm, setDietaryForm] = useState({
    patientId: '',
    dietType: 'REGULAR',
    specialInstructions: 'No added salt. Low sodium diet.',
  });

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [marRes, notesRes, summaryRes, ptsRes] = await Promise.all([
        NursingService.getMarLogs().catch(() => ({ data: [] })),
        NursingService.getNursingNotes().catch(() => ({ data: [] })),
        NursingService.getStationSummary().catch(() => ({ data: {} })),
        PatientApiService.getPatients({ limit: 50 }).catch(() => ({ patients: [] })),
      ]);

      setMarLogs(marRes.data || []);
      setNotes(notesRes.data || []);
      setStationSummary({
        scheduledMarCount: summaryRes.data?.scheduledMarCount || 0,
        administeredMarCount: summaryRes.data?.administeredMarCount || 0,
        highRiskPatientCount: summaryRes.data?.highRiskPatientCount || 0,
        handoverNotesCount: summaryRes.data?.handoverNotesCount || 0,
      });
      setPatients(ptsRes.patients || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch nursing station records.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFluidBalanceForPatient = async (patientId: string) => {
    if (!patientId) return;
    try {
      const res = await NursingService.getFluidBalance(patientId);
      setFluidBalanceData(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch fluid balance.');
    }
  };

  const handleCreateMar = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await NursingService.createMarLog(marForm);
      setSuccessMsg('Prescription added to eMAR schedule!');
      setShowMarModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule MAR log.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateMar = async (id: string, status: string, reason?: string) => {
    try {
      await NursingService.updateMarStatus(id, status, reason);
      setSuccessMsg(`MAR updated: ${status}`);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to update MAR status.');
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      const payload = {
        patientId: noteForm.patientId,
        noteType: noteForm.noteType,
        shiftType: noteForm.shiftType,
        sbar: noteForm.noteType === 'SHIFT_HANDOVER' ? {
          situation: noteForm.situation,
          background: noteForm.background,
          assessment: noteForm.assessment,
          recommendation: noteForm.recommendation,
        } : undefined,
        content: noteForm.content,
        isHighRisk: noteForm.isHighRisk,
        isolationPrecautions: noteForm.isolationPrecautions,
        isNpo: noteForm.isNpo,
      };

      await NursingService.createNursingNote(payload);
      setSuccessMsg('Nursing note / SBAR handover saved!');
      setShowNoteModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to save nursing note.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateFluid = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await NursingService.createFluidBalance(fluidForm);
      setSuccessMsg('Fluid balance entry logged!');
      setShowFluidModal(false);
      if (selectedPatientId) fetchFluidBalanceForPatient(selectedPatientId);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to record fluid balance.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPatients = patients.filter(
    (p) =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.mrn?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#1b7b68] text-xs font-semibold uppercase tracking-wider mb-1">
              <Building className="w-4 h-4" /> Inpatient Nursing Desk
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Nursing Station & Inpatient Care Hub</h1>
            <p className="text-slate-500 text-xs mt-1 max-w-2xl">
              Electronic Medication Administration Record (eMAR), SBAR shift handover notes, fluid balance calculations, and patient dietary orders.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowNoteModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1b7b68] text-white rounded-xl font-bold text-xs hover:bg-[#145e50] transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> SBAR Shift Handover
            </button>
            <button
              onClick={() => setShowMarModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-200 transition shadow-sm"
            >
              <Pill className="w-4 h-4 text-slate-600" /> Schedule eMAR
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

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">MAR Scheduled</p>
            <p className="text-lg font-bold text-slate-800">{stationSummary.scheduledMarCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">MAR Administered</p>
            <p className="text-lg font-bold text-slate-800">{stationSummary.administeredMarCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-700 rounded-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">High Risk Patients</p>
            <p className="text-lg font-bold text-slate-800">{stationSummary.highRiskPatientCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-700 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">SBAR Handovers</p>
            <p className="text-lg font-bold text-slate-800">{stationSummary.handoverNotesCount}</p>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex flex-wrap gap-1">
        {[
          { id: 'station', label: 'Nursing Station', icon: HeartPulse },
          { id: 'mar', label: 'Medication Administration (MAR)', icon: Pill },
          { id: 'notes', label: 'Notes & Shift Handover', icon: FileText },
          { id: 'dietetics', label: 'Dietetics & Nutrition', icon: Utensils },
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

      {/* TAB CONTENT 1: NURSING STATION */}
      {activeTab === 'station' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Inpatient Ward Oversight & Risk Flags</h2>
              <p className="text-xs text-slate-400">Monitor active ward beds, fall risk scores, NPO status, and fluid balance.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFluidModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition"
              >
                <Droplets className="w-4 h-4" /> Log Fluid Balance
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-700">Patient Risk Flags</span>
                <ShieldAlert className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-xs text-slate-500">High Fall Risk, Isolation Precautions, and NPO status active for ward beds.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-700">Fluid Intake / Output</span>
                <Droplets className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xs text-slate-500">Track IV fluids, tube feeds, urine output, and drains per 8-hour shift.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-700">Nursing Tasks</span>
                <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-500">Vital signs rounds, wound dressing changes, and IV line flushes.</p>
            </div>
          </div>

          {/* Fluid Balance Inspector */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-indigo-600" /> Fluid Balance Chart Inspector
              </h3>
              <select
                value={selectedPatientId}
                onChange={(e) => {
                  setSelectedPatientId(e.target.value);
                  fetchFluidBalanceForPatient(e.target.value);
                }}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white outline-none"
              >
                <option value="">-- Select Patient to View Fluid Chart --</option>
                {patients.map((p: any) => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.firstName} {p.lastName} ({p.mrn || 'No MRN'})
                  </option>
                ))}
              </select>
            </div>

            {fluidBalanceData && (
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 font-bold">
                  Total Intake: {fluidBalanceData.totalIntakeMl || 0} mL
                </div>
                <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 font-bold">
                  Total Output: {fluidBalanceData.totalOutputMl || 0} mL
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-800 rounded-xl border border-indigo-200 font-bold">
                  Net Balance: {fluidBalanceData.netBalanceMl || 0} mL
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: MEDICATION ADMINISTRATION RECORD (MAR) */}
      {activeTab === 'mar' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Electronic Medication Administration Record (eMAR)</h2>
              <p className="text-xs text-slate-400">Scheduled inpatient medications and nurse administration sign-off.</p>
            </div>
            <button
              onClick={() => setShowMarModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#1b7b68] text-white rounded-xl font-bold text-xs hover:bg-[#145e50] transition"
            >
              <Plus className="w-4 h-4" /> Add eMAR Prescription
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Scheduled Time</th>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Medication & Dosage</th>
                  <th className="p-3">Route</th>
                  <th className="p-3">Administered By</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {marLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No eMAR scheduled entries found.
                    </td>
                  </tr>
                ) : (
                  marLogs.map((m: any) => (
                    <tr key={m._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-bold text-slate-700">
                        {new Date(m.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {m.patientId?.firstName ? `${m.patientId.firstName} ${m.patientId.lastName}` : 'Inpatient'}
                      </td>
                      <td className="p-3 font-bold text-[#1b7b68]">
                        {m.medicationName} ({m.dosage})
                      </td>
                      <td className="p-3 text-slate-600">{m.route || 'Oral'}</td>
                      <td className="p-3 text-slate-600">
                        {m.administeredBy?.firstName ? `Nurse ${m.administeredBy.firstName}` : 'Pending'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            m.status === 'GIVEN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.status === 'HELD'
                              ? 'bg-amber-100 text-amber-800'
                              : m.status === 'REFUSED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        {m.status === 'SCHEDULED' && (
                          <>
                            <button
                              onClick={() => handleUpdateMar(m._id, 'GIVEN')}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition"
                            >
                              Sign Given
                            </button>
                            <button
                              onClick={() => handleUpdateMar(m._id, 'HELD', 'Patient NPO')}
                              className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg font-bold text-[11px] hover:bg-amber-100 transition"
                            >
                              Hold
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

      {/* TAB CONTENT 3: NOTES & HANDOVER */}
      {activeTab === 'notes' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">SBAR Shift Handover & Nursing Progress Notes</h2>
              <p className="text-xs text-slate-400">Structured Situation-Background-Assessment-Recommendation shift transitions.</p>
            </div>
            <button
              onClick={() => setShowNoteModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs hover:bg-purple-700 transition"
            >
              <Plus className="w-4 h-4" /> New SBAR Handover Note
            </button>
          </div>

          <div className="space-y-4">
            {notes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                No shift handover notes logged today.
              </div>
            ) : (
              notes.map((n: any) => (
                <div key={n._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800">
                        {n.patientId?.firstName ? `${n.patientId.firstName} ${n.patientId.lastName}` : 'Inpatient'}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-[10px]">
                        {n.shiftType || 'MORNING'} SHIFT HANDOVER
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>

                  {n.sbar ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                      <div className="p-2 bg-white rounded-lg border border-slate-100">
                        <span className="font-bold text-slate-700 block">S - Situation:</span>
                        <p className="text-slate-600">{n.sbar.situation}</p>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-100">
                        <span className="font-bold text-slate-700 block">B - Background:</span>
                        <p className="text-slate-600">{n.sbar.background}</p>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-100">
                        <span className="font-bold text-slate-700 block">A - Assessment:</span>
                        <p className="text-slate-600">{n.sbar.assessment}</p>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-100">
                        <span className="font-bold text-slate-700 block">R - Recommendation:</span>
                        <p className="text-slate-600">{n.sbar.recommendation}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">{n.content}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: DIETETICS & NUTRITION */}
      {activeTab === 'dietetics' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Dietetics, Clinical Nutrition & Meal Orders</h2>
              <p className="text-xs text-slate-400">Specialized dietary prescriptions (Diabetic, Renal, Low Sodium, NPO) and meal delivery logs.</p>
            </div>
          </div>

          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
            <Utensils className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Patient Dietary Prescription Manager</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Prescribe therapeutic inpatient diets, manage food allergy alerts, and track kitchen meal prep & bed delivery status.
            </p>
          </div>
        </div>
      )}

      {/* MODAL: MAR LOG */}
      {showMarModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Pill className="w-4 h-4 text-[#1b7b68]" /> Schedule eMAR Prescription
              </h3>
              <button onClick={() => setShowMarModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateMar} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Patient</label>
                <select
                  required
                  value={marForm.patientId}
                  onChange={(e) => setMarForm({ ...marForm, patientId: e.target.value })}
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
                <label className="block font-semibold text-slate-600 mb-1">Medication Name</label>
                <input
                  type="text"
                  required
                  value={marForm.medicationName}
                  onChange={(e) => setMarForm({ ...marForm, medicationName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Dosage</label>
                  <input
                    type="text"
                    required
                    value={marForm.dosage}
                    onChange={(e) => setMarForm({ ...marForm, dosage: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Route</label>
                  <input
                    type="text"
                    required
                    value={marForm.route}
                    onChange={(e) => setMarForm({ ...marForm, route: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMarModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#1b7b68] text-white rounded-xl font-bold hover:bg-[#145e50]"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Schedule Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SBAR NOTE */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" /> Record SBAR Shift Handover Note
              </h3>
              <button onClick={() => setShowNoteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateNote} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Patient</label>
                <select
                  required
                  value={noteForm.patientId}
                  onChange={(e) => setNoteForm({ ...noteForm, patientId: e.target.value })}
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
                <label className="block font-semibold text-slate-600 mb-1">Shift Type</label>
                <select
                  value={noteForm.shiftType}
                  onChange={(e) => setNoteForm({ ...noteForm, shiftType: e.target.value as any })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="MORNING">Morning Shift</option>
                  <option value="AFTERNOON">Afternoon Shift</option>
                  <option value="NIGHT">Night Shift</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">S - Situation</label>
                <input
                  type="text"
                  required
                  value={noteForm.situation}
                  onChange={(e) => setNoteForm({ ...noteForm, situation: e.target.value })}
                  placeholder="Current patient condition, chief issue..."
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">B - Background</label>
                <input
                  type="text"
                  required
                  value={noteForm.background}
                  onChange={(e) => setNoteForm({ ...noteForm, background: e.target.value })}
                  placeholder="Clinical history, admission reason, allergies..."
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">A - Assessment</label>
                <input
                  type="text"
                  required
                  value={noteForm.assessment}
                  onChange={(e) => setNoteForm({ ...noteForm, assessment: e.target.value })}
                  placeholder="Current vitals, pain level, mental status..."
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">R - Recommendation</label>
                <input
                  type="text"
                  required
                  value={noteForm.recommendation}
                  onChange={(e) => setNoteForm({ ...noteForm, recommendation: e.target.value })}
                  placeholder="Action items for incoming shift nurse..."
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Handover Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FLUID BALANCE */}
      {showFluidModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Droplets className="w-4 h-4 text-indigo-600" /> Log Fluid Balance
              </h3>
              <button onClick={() => setShowFluidModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFluid} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Patient</label>
                <select
                  required
                  value={fluidForm.patientId}
                  onChange={(e) => setFluidForm({ ...fluidForm, patientId: e.target.value })}
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
                  <label className="block font-semibold text-slate-600 mb-1">Oral Intake (mL)</label>
                  <input
                    type="number"
                    value={fluidForm.oralIntakeMl}
                    onChange={(e) => setFluidForm({ ...fluidForm, oralIntakeMl: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">IV Intake (mL)</label>
                  <input
                    type="number"
                    value={fluidForm.ivIntakeMl}
                    onChange={(e) => setFluidForm({ ...fluidForm, ivIntakeMl: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Urine Output (mL)</label>
                  <input
                    type="number"
                    value={fluidForm.urineOutputMl}
                    onChange={(e) => setFluidForm({ ...fluidForm, urineOutputMl: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Drain Output (mL)</label>
                  <input
                    type="number"
                    value={fluidForm.drainOutputMl}
                    onChange={(e) => setFluidForm({ ...fluidForm, drainOutputMl: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFluidModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Fluid Chart'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
