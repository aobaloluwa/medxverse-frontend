'use client';

import React, { useState, useEffect } from 'react';
import {
  Baby,
  HeartPulse,
  Syringe,
  Activity,
  Plus,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Calendar,
  User,
  Building,
  Heart,
  Shield,
  FileText,
  Scale,
  Clock,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { MchService } from '@/services/mch.service';
import { PatientApiService } from '@/services/patient.service';

export default function MaternalChildHealthPage() {
  const [activeTab, setActiveTab] = useState<'anc' | 'labour' | 'family-planning' | 'immunization'>('anc');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [patients, setPatients] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({
    ancActive: 0,
    deliveriesCount: 0,
    familyPlanningActive: 0,
    immunizationDosesGiven: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<any>(null);

  // Modals
  const [showRegisterMchModal, setShowRegisterMchModal] = useState(false);
  const [showAncVisitModal, setShowAncVisitModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showPartographModal, setShowPartographModal] = useState(false);
  const [showFpModal, setShowFpModal] = useState(false);
  const [showImmunizationModal, setShowImmunizationModal] = useState(false);
  const [showGrowthModal, setShowGrowthModal] = useState(false);

  const [selectedRecordId, setSelectedRecordId] = useState<string>('');

  // Forms
  const [registerForm, setRegisterForm] = useState({
    patientId: '',
    careType: 'ANTENATAL',
    gravida: 1,
    para: 0,
    lastMenstrualPeriod: '',
    estimatedDeliveryDate: '',
  });

  const [ancVisitForm, setAncVisitForm] = useState({
    gestationalAgeWeeks: 12,
    weightKg: 65,
    bloodPressure: '120/80',
    fundalHeightCm: 14,
    fetalHeartRateBpm: 140,
    fetalPosition: 'Cephalic',
    urineProtein: 'Nil',
    urineSugar: 'Nil',
    hemoglobinGdl: 12.5,
    notes: 'Routine ANC assessment, maternal vitals stable.',
  });

  const [deliveryForm, setDeliveryForm] = useState({
    deliveryDate: new Date().toISOString().slice(0, 10),
    deliveryType: 'SPONTANEOUS_VAGINAL',
    outcome: 'LIVE_BIRTH',
    birthWeightKg: 3.2,
    apgarScore1Min: 8,
    apgarScore5Min: 10,
    infantGender: 'FEMALE',
    complications: 'None',
    notes: 'Normal vaginal delivery. Infant active and breathing well.',
  });

  const [partographForm, setPartographForm] = useState({
    cervicalDilationCm: 5,
    contractionFrequency: '3 in 10 mins (40 secs)',
    fetalHeartRateBpm: 144,
    amnioticFluid: 'Clear',
    maternalBp: '120/80',
    notes: 'Active phase labor progressing steadily.',
  });

  const [fpForm, setFpForm] = useState({
    method: 'INJECTABLE_DEPO',
    nextDueDate: '',
    sideEffects: 'None',
    notes: 'Depo-Provera injection administered. Next dose in 12 weeks.',
  });

  const [immunizationForm, setImmunizationForm] = useState({
    vaccineName: 'PENTAVALENT',
    doseNumber: 1,
    batchNumber: 'VAC-2025-01',
    nextDueDate: '',
    notes: 'First dose administered into left thigh.',
  });

  const [growthForm, setGrowthForm] = useState({
    weightKg: 4.5,
    heightCm: 55,
    headCircumferenceCm: 38,
    muacCm: 12,
    milestonesNotes: 'Normal head turn and social smile.',
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const careTypeMap: Record<string, string> = {
        anc: 'ANTENATAL',
        labour: 'ANTENATAL',
        'family-planning': 'FAMILY_PLANNING',
        immunization: 'CHILD_HEALTH',
      };

      const [mchData, statsData, ptsData] = await Promise.all([
        MchService.getRecords({ careType: careTypeMap[activeTab] }).catch(() => ({ data: [] })),
        MchService.getStats().catch(() => ({ data: {} })),
        PatientApiService.getPatients({ limit: 50 }).catch(() => ({ patients: [] })),
      ]);

      setRecords(mchData.data || []);
      setStats({
        ancActive: statsData.data?.ancActive || 0,
        deliveriesCount: statsData.data?.deliveriesCount || 0,
        familyPlanningActive: statsData.data?.familyPlanningActive || 0,
        immunizationDosesGiven: statsData.data?.immunizationDosesGiven || 0,
      });
      setPatients(ptsData.patients || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load MCH records');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterMch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await MchService.createRecord(registerForm);
      setSuccessMsg('MCH care record registered successfully!');
      setShowRegisterMchModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddAncVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordId) return;
    setActionLoading(true);
    setError(null);
    try {
      await MchService.addAncVisit(selectedRecordId, ancVisitForm);
      setSuccessMsg('ANC Visit logged successfully!');
      setShowAncVisitModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to record ANC visit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordId) return;
    setActionLoading(true);
    setError(null);
    try {
      await MchService.recordDelivery(selectedRecordId, deliveryForm);
      setSuccessMsg('Delivery record saved successfully!');
      setShowDeliveryModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to record delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddPartograph = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordId) return;
    setActionLoading(true);
    setError(null);
    try {
      await MchService.addPartograph(selectedRecordId, partographForm);
      setSuccessMsg('Partograph entry recorded!');
      setShowPartographModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to record partograph');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddFp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordId) return;
    setActionLoading(true);
    setError(null);
    try {
      await MchService.addFamilyPlanning(selectedRecordId, fpForm);
      setSuccessMsg('Family Planning record saved!');
      setShowFpModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save Family Planning entry');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddImmunization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordId) return;
    setActionLoading(true);
    setError(null);
    try {
      await MchService.addImmunization(selectedRecordId, immunizationForm);
      setSuccessMsg('Immunization administered & recorded!');
      setShowImmunizationModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to record immunization');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddGrowth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordId) return;
    setActionLoading(true);
    setError(null);
    try {
      await MchService.addChildGrowth(selectedRecordId, growthForm);
      setSuccessMsg('Child growth entry logged!');
      setShowGrowthModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to record child growth');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRecords = records.filter(
    (r) =>
      `${r.patientId?.firstName || ''} ${r.patientId?.lastName || ''}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      r.patientId?.mrn?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#1b7b68] text-xs font-semibold uppercase tracking-wider mb-1">
              <Baby className="w-4 h-4" /> Maternal & Child Health Suite
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Maternal, Newborn & Child Health Hub</h1>
            <p className="text-slate-500 text-xs mt-1 max-w-2xl">
              Antenatal care clinic, labor ward partograph monitoring, delivery records, family planning consultations, and pediatric immunizations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowRegisterMchModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1b7b68] text-white rounded-xl font-bold text-xs hover:bg-[#145e50] transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Register MCH Client
            </button>
            <button
              onClick={fetchData}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-pink-50 text-pink-700 rounded-lg">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Active ANC</p>
            <p className="text-lg font-bold text-slate-800">{stats.ancActive}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
            <Baby className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Deliveries Saved</p>
            <p className="text-lg font-bold text-slate-800">{stats.deliveriesCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-700 rounded-lg">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Family Planning</p>
            <p className="text-lg font-bold text-slate-800">{stats.familyPlanningActive}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
            <Syringe className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Vaccine Doses</p>
            <p className="text-lg font-bold text-slate-800">{stats.immunizationDosesGiven}</p>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex flex-wrap gap-1">
        {[
          { id: 'anc', label: 'Antenatal Clinic (ANC)', icon: Heart },
          { id: 'labour', label: 'Labour Ward & Delivery Suite', icon: Activity },
          { id: 'family-planning', label: 'Family Planning', icon: Shield },
          { id: 'immunization', label: 'Immunization & Child Welfare', icon: Syringe },
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

      {/* TAB CONTENT 1: ANTENATAL CLINIC */}
      {activeTab === 'anc' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Antenatal Care Registry & Routine Visits</h2>
              <p className="text-xs text-slate-400">Track gestational age, fundal height, fetal heart rate, and maternal vitals.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68] w-64"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Patient Name</th>
                  <th className="p-3">Gravida / Para</th>
                  <th className="p-3">LMP / EDD</th>
                  <th className="p-3">Total Visits</th>
                  <th className="p-3">Last Visit BP & FHR</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No active ANC care records found.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r: any) => {
                    const lastVisit = r.ancVisits?.[r.ancVisits.length - 1];
                    return (
                      <tr key={r._id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3 font-semibold text-slate-800">
                          {r.patientId?.firstName ? `${r.patientId.firstName} ${r.patientId.lastName}` : 'Patient'}
                        </td>
                        <td className="p-3 font-bold text-[#1b7b68]">
                          G{r.gravida || 1} P{r.para || 0}
                        </td>
                        <td className="p-3 text-slate-600">
                          {r.estimatedDeliveryDate ? new Date(r.estimatedDeliveryDate).toLocaleDateString() : 'EDD Pending'}
                        </td>
                        <td className="p-3 font-bold text-slate-700">{r.ancVisits?.length || 0} visits</td>
                        <td className="p-3 text-slate-600">
                          {lastVisit ? `${lastVisit.bloodPressure || '120/80'} | ${lastVisit.fetalHeartRateBpm || '140'} bpm` : 'No visits yet'}
                        </td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                            {r.pregnancyStatus || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedRecordId(r._id);
                              setShowAncVisitModal(true);
                            }}
                            className="px-2.5 py-1 bg-[#1b7b68] text-white rounded-lg font-bold text-[11px] hover:bg-[#145e50] transition"
                          >
                            + Log Visit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: LABOUR WARD & DELIVERY SUITE */}
      {activeTab === 'labour' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Labour Ward Partograph & Delivery Suite</h2>
              <p className="text-xs text-slate-400">Monitor labor stage partograph logs, cervical dilation, and delivery outcomes.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Maternal Patient</th>
                  <th className="p-3">Gravida/Para</th>
                  <th className="p-3">Partograph Logs</th>
                  <th className="p-3">Delivery Outcome</th>
                  <th className="p-3">Birth Weight & Apgar</th>
                  <th className="p-3 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No active labor ward cases.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r: any) => (
                    <tr key={r._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-semibold text-slate-800">
                        {r.patientId?.firstName ? `${r.patientId.firstName} ${r.patientId.lastName}` : 'Maternal Patient'}
                      </td>
                      <td className="p-3 font-bold text-slate-700">G{r.gravida || 1} P{r.para || 0}</td>
                      <td className="p-3 text-slate-600 font-medium">
                        {r.partographLogs?.length || 0} labor stage notes
                      </td>
                      <td className="p-3">
                        {r.deliveryRecord ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                            {r.deliveryRecord.outcome} ({r.deliveryRecord.deliveryType})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                            IN LABOUR
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 font-medium">
                        {r.deliveryRecord ? `${r.deliveryRecord.birthWeightKg}kg | Apgar ${r.deliveryRecord.apgarScore1Min}/${r.deliveryRecord.apgarScore5Min}` : 'Pending'}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedRecordId(r._id);
                            setShowPartographModal(true);
                          }}
                          className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg font-bold text-[11px] hover:bg-purple-100 transition"
                        >
                          Partograph
                        </button>
                        {!r.deliveryRecord && (
                          <button
                            onClick={() => {
                              setSelectedRecordId(r._id);
                              setShowDeliveryModal(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition"
                          >
                            Record Delivery
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

      {/* TAB CONTENT 3: FAMILY PLANNING */}
      {activeTab === 'family-planning' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Family Planning & Reproductive Health</h2>
              <p className="text-xs text-slate-400">Contraceptive method selection, insertion records, and refill schedules.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Client Name</th>
                  <th className="p-3">Active Method</th>
                  <th className="p-3">Initiated Date</th>
                  <th className="p-3">Next Refill / Due Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No family planning client records found.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r: any) => {
                    const lastFp = r.familyPlanningRecords?.[r.familyPlanningRecords.length - 1];
                    return (
                      <tr key={r._id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3 font-semibold text-slate-800">
                          {r.patientId?.firstName ? `${r.patientId.firstName} ${r.patientId.lastName}` : 'Client'}
                        </td>
                        <td className="p-3 font-bold text-purple-700">{lastFp?.method || 'Consultation'}</td>
                        <td className="p-3 text-slate-600">{lastFp?.initiatedAt ? new Date(lastFp.initiatedAt).toLocaleDateString() : 'N/A'}</td>
                        <td className="p-3 text-slate-600">{lastFp?.nextDueDate ? new Date(lastFp.nextDueDate).toLocaleDateString() : 'Routine'}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                            {lastFp?.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedRecordId(r._id);
                              setShowFpModal(true);
                            }}
                            className="px-2.5 py-1 bg-purple-600 text-white rounded-lg font-bold text-[11px] hover:bg-purple-700 transition"
                          >
                            + Record Method
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: IMMUNIZATION & CHILD WELFARE */}
      {activeTab === 'immunization' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Immunization & Child Welfare Registry</h2>
              <p className="text-xs text-slate-400">National pediatric vaccine matrix, growth logs, and developmental milestones.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Child Patient</th>
                  <th className="p-3">Doses Administered</th>
                  <th className="p-3">Latest Vaccine Dose</th>
                  <th className="p-3">Latest Weight & Height</th>
                  <th className="p-3 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No child immunization & growth records found.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r: any) => {
                    const lastVac = r.immunizations?.[r.immunizations.length - 1];
                    const lastGrowth = r.growthLogs?.[r.growthLogs.length - 1];
                    return (
                      <tr key={r._id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3 font-semibold text-slate-800">
                          {r.patientId?.firstName ? `${r.patientId.firstName} ${r.patientId.lastName}` : 'Child Patient'}
                        </td>
                        <td className="p-3 font-bold text-blue-700">{r.immunizations?.length || 0} vaccines given</td>
                        <td className="p-3 text-slate-600">
                          {lastVac ? `${lastVac.vaccineName} (Dose ${lastVac.doseNumber})` : 'None yet'}
                        </td>
                        <td className="p-3 text-slate-600">
                          {lastGrowth ? `${lastGrowth.weightKg}kg | ${lastGrowth.heightCm || '--'}cm` : 'Not recorded'}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedRecordId(r._id);
                              setShowImmunizationModal(true);
                            }}
                            className="px-2.5 py-1 bg-blue-600 text-white rounded-lg font-bold text-[11px] hover:bg-blue-700 transition"
                          >
                            + Give Vaccine
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRecordId(r._id);
                              setShowGrowthModal(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-[11px] hover:bg-emerald-100 transition"
                          >
                            + Log Growth
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER NEW MCH RECORD */}
      {showRegisterMchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Baby className="w-4 h-4 text-[#1b7b68]" /> Register MCH Care Client
              </h3>
              <button onClick={() => setShowRegisterMchModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRegisterMch} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Patient</label>
                <select
                  required
                  value={registerForm.patientId}
                  onChange={(e) => setRegisterForm({ ...registerForm, patientId: e.target.value })}
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
                <label className="block font-semibold text-slate-600 mb-1">Care Type</label>
                <select
                  value={registerForm.careType}
                  onChange={(e) => setRegisterForm({ ...registerForm, careType: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none"
                >
                  <option value="ANTENATAL">Antenatal Care (ANC)</option>
                  <option value="POSTNATAL">Postnatal Care (PNC)</option>
                  <option value="FAMILY_PLANNING">Family Planning</option>
                  <option value="CHILD_HEALTH">Child Health & Immunization</option>
                </select>
              </div>

              {registerForm.careType === 'ANTENATAL' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Gravida</label>
                      <input
                        type="number"
                        min="1"
                        value={registerForm.gravida}
                        onChange={(e) => setRegisterForm({ ...registerForm, gravida: parseInt(e.target.value) || 1 })}
                        className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Para</label>
                      <input
                        type="number"
                        min="0"
                        value={registerForm.para}
                        onChange={(e) => setRegisterForm({ ...registerForm, para: parseInt(e.target.value) || 0 })}
                        className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">LMP Date</label>
                      <input
                        type="date"
                        value={registerForm.lastMenstrualPeriod}
                        onChange={(e) => setRegisterForm({ ...registerForm, lastMenstrualPeriod: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">EDD Date</label>
                      <input
                        type="date"
                        value={registerForm.estimatedDeliveryDate}
                        onChange={(e) => setRegisterForm({ ...registerForm, estimatedDeliveryDate: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterMchModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#1b7b68] text-white rounded-xl font-bold hover:bg-[#145e50]"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG ANC VISIT */}
      {showAncVisitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-600" /> Record Routine ANC Visit
              </h3>
              <button onClick={() => setShowAncVisitModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddAncVisit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Gestational Age (Wks)</label>
                  <input
                    type="number"
                    required
                    value={ancVisitForm.gestationalAgeWeeks}
                    onChange={(e) => setAncVisitForm({ ...ancVisitForm, gestationalAgeWeeks: parseInt(e.target.value) || 1 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Maternal BP</label>
                  <input
                    type="text"
                    required
                    value={ancVisitForm.bloodPressure}
                    onChange={(e) => setAncVisitForm({ ...ancVisitForm, bloodPressure: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Fundal Height (cm)</label>
                  <input
                    type="number"
                    value={ancVisitForm.fundalHeightCm}
                    onChange={(e) => setAncVisitForm({ ...ancVisitForm, fundalHeightCm: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Fetal Heart Rate (bpm)</label>
                  <input
                    type="number"
                    value={ancVisitForm.fetalHeartRateBpm}
                    onChange={(e) => setAncVisitForm({ ...ancVisitForm, fetalHeartRateBpm: parseInt(e.target.value) || 140 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Clinical Notes</label>
                <textarea
                  rows={2}
                  value={ancVisitForm.notes}
                  onChange={(e) => setAncVisitForm({ ...ancVisitForm, notes: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAncVisitModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#1b7b68] text-white rounded-xl font-bold hover:bg-[#145e50]"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save ANC Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PARTOGRAPH LOG */}
      {showPartographModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" /> Labour Partograph Entry
              </h3>
              <button onClick={() => setShowPartographModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddPartograph} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Cervical Dilation (cm)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    required
                    value={partographForm.cervicalDilationCm}
                    onChange={(e) => setPartographForm({ ...partographForm, cervicalDilationCm: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Fetal HR (bpm)</label>
                  <input
                    type="number"
                    required
                    value={partographForm.fetalHeartRateBpm}
                    onChange={(e) => setPartographForm({ ...partographForm, fetalHeartRateBpm: parseInt(e.target.value) || 140 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Contraction Frequency</label>
                <input
                  type="text"
                  required
                  value={partographForm.contractionFrequency}
                  onChange={(e) => setPartographForm({ ...partographForm, contractionFrequency: e.target.value })}
                  placeholder="e.g. 3 in 10 mins (40s duration)"
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPartographModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Partograph'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELIVERY SUMMARY */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Baby className="w-4 h-4 text-emerald-600" /> Record Delivery Outcome
              </h3>
              <button onClick={() => setShowDeliveryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRecordDelivery} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Delivery Type</label>
                  <select
                    value={deliveryForm.deliveryType}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryType: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="SPONTANEOUS_VAGINAL">Spontaneous Vaginal</option>
                    <option value="ASSISTED_VAGINAL">Assisted Vaginal</option>
                    <option value="CESAREAN_SECTION">Cesarean Section</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Outcome</label>
                  <select
                    value={deliveryForm.outcome}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, outcome: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="LIVE_BIRTH">Live Birth</option>
                    <option value="STILL_BIRTH">Still Birth</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Birth Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={deliveryForm.birthWeightKg}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, birthWeightKg: parseFloat(e.target.value) || 3.0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Apgar (1 min)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={deliveryForm.apgarScore1Min}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, apgarScore1Min: parseInt(e.target.value) || 8 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Apgar (5 mins)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={deliveryForm.apgarScore5Min}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, apgarScore5Min: parseInt(e.target.value) || 10 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Delivery Summary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FAMILY PLANNING */}
      {showFpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600" /> Family Planning Method Record
              </h3>
              <button onClick={() => setShowFpModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddFp} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Contraceptive Method</label>
                <select
                  value={fpForm.method}
                  onChange={(e) => setFpForm({ ...fpForm, method: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold"
                >
                  <option value="INJECTABLE_DEPO">Injectable (Depo-Provera)</option>
                  <option value="IMPLANT_NORPLANT">Hormonal Implant (Jadelle/Norplant)</option>
                  <option value="IUD_COPPER">IUD (Copper T)</option>
                  <option value="ORAL_PILLS">Combined Oral Contraceptives</option>
                  <option value="CONDOMS">Barrier (Condoms)</option>
                  <option value="TUBAL_LIGATION">Bilateral Tubal Ligation</option>
                  <option value="VASECTOMY">Vasectomy</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Next Refill / Follow-Up Date</label>
                <input
                  type="date"
                  value={fpForm.nextDueDate}
                  onChange={(e) => setFpForm({ ...fpForm, nextDueDate: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFpModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMMUNIZATION */}
      {showImmunizationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Syringe className="w-4 h-4 text-blue-600" /> Administer Pediatric Vaccine
              </h3>
              <button onClick={() => setShowImmunizationModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddImmunization} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Vaccine Name</label>
                  <select
                    value={immunizationForm.vaccineName}
                    onChange={(e) => setImmunizationForm({ ...immunizationForm, vaccineName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold"
                  >
                    <option value="BCG">BCG (Birth)</option>
                    <option value="OPV">OPV (Oral Polio Vaccine)</option>
                    <option value="PENTAVALENT">Pentavalent (DTP-HepB-Hib)</option>
                    <option value="PCV">PCV (Pneumococcal Conjugate)</option>
                    <option value="ROTAVIRUS">Rotavirus</option>
                    <option value="MEASLES">Measles Vaccine</option>
                    <option value="YELLOW_FEVER">Yellow Fever</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Dose Number</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={immunizationForm.doseNumber}
                    onChange={(e) => setImmunizationForm({ ...immunizationForm, doseNumber: parseInt(e.target.value) || 1 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Vaccine Batch #</label>
                <input
                  type="text"
                  value={immunizationForm.batchNumber}
                  onChange={(e) => setImmunizationForm({ ...immunizationForm, batchNumber: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowImmunizationModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Dose'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHILD GROWTH */}
      {showGrowthModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-600" /> Log Child Growth & Milestones
              </h3>
              <button onClick={() => setShowGrowthModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddGrowth} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={growthForm.weightKg}
                    onChange={(e) => setGrowthForm({ ...growthForm, weightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={growthForm.heightCm}
                    onChange={(e) => setGrowthForm({ ...growthForm, heightCm: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Developmental Milestones Notes</label>
                <textarea
                  rows={2}
                  value={growthForm.milestonesNotes}
                  onChange={(e) => setGrowthForm({ ...growthForm, milestonesNotes: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGrowthModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Growth Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
