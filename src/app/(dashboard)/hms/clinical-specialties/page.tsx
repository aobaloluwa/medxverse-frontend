'use client';

import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Brain,
  Bone,
  Flame,
  Activity,
  Droplet,
  Eye,
  Smile,
  Sparkles,
  Stethoscope,
  Baby,
  Syringe,
  Pill,
  Search,
  Plus,
  X,
  FileText,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  ChevronRight,
  ClipboardList,
  ShieldAlert,
  Building,
} from 'lucide-react';
import { ClinicalSpecialtyService } from '@/services/clinicalSpecialty.service';
import { PatientApiService } from '@/services/patient.service';

const SPECIALTY_CONFIG: {
  key: string;
  name: string;
  category: string;
  description: string;
  icon: any;
  color: string;
  bg: string;
}[] = [
  {
    key: 'INTERNAL_MEDICINE',
    name: 'Internal Medicine',
    category: 'General',
    description: 'Comprehensive adult health, chronic illness, and complex systemic disorders.',
    icon: Stethoscope,
    color: 'text-teal-700',
    bg: 'bg-teal-50 border-teal-200',
  },
  {
    key: 'PEDIATRICS',
    name: 'Pediatrics',
    category: 'Child Health',
    description: 'Comprehensive infant, child, and adolescent medical care and vaccinations.',
    icon: Baby,
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
  },
  {
    key: 'NICU',
    name: 'Neonatal ICU (NICU)',
    category: 'Critical Care',
    description: 'Intensive care for premature babies and critically ill newborns.',
    icon: Activity,
    color: 'text-rose-700',
    bg: 'bg-rose-50 border-rose-200',
  },
  {
    key: 'CARDIOLOGY',
    name: 'Cardiology',
    category: 'Cardiovascular',
    description: 'Heart disease diagnosis, ECG, Echo, hypertension, and arrhythmia management.',
    icon: HeartPulse,
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
  },
  {
    key: 'NEUROLOGY',
    name: 'Neurology',
    category: 'Neuroscience',
    description: 'Brain, spinal cord, nerve disorders, epilepsy, stroke, and EEG evaluations.',
    icon: Brain,
    color: 'text-purple-700',
    bg: 'bg-purple-50 border-purple-200',
  },
  {
    key: 'ORTHOPEDICS',
    name: 'Orthopedics & Trauma',
    category: 'Musculoskeletal',
    description: 'Bone fractures, joint replacements, trauma care, and sports medicine.',
    icon: Bone,
    color: 'text-[#64748b]',
    bg: 'bg-slate-100 border-slate-300',
  },
  {
    key: 'ONCOLOGY',
    name: 'Oncology',
    category: 'Cancer Care',
    description: 'Cancer diagnosis, chemotherapy protocols, tumor staging, and radiation.',
    icon: Flame,
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
  },
  {
    key: 'NEPHROLOGY_DIALYSIS',
    name: 'Nephrology & Dialysis',
    category: 'Renal',
    description: 'Kidney disease management, hemodialysis sessions, and fluid balance.',
    icon: Droplet,
    color: 'text-cyan-700',
    bg: 'bg-cyan-50 border-cyan-200',
  },
  {
    key: 'UROLOGY',
    name: 'Urology',
    category: 'Renal & Surgical',
    description: 'Urinary tract, prostate, bladder, and male reproductive system care.',
    icon: Droplet,
    color: 'text-indigo-700',
    bg: 'bg-indigo-50 border-indigo-200',
  },
  {
    key: 'GASTROENTEROLOGY_ENDOSCOPY',
    name: 'Gastroenterology & Endoscopy',
    category: 'Digestive System',
    description: 'GI tract disorders, liver disease, colonoscopy, and upper endoscopy.',
    icon: Activity,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  {
    key: 'PULMONOLOGY',
    name: 'Pulmonology',
    category: 'Respiratory',
    description: 'Lungs, asthma, COPD, pneumonia, sleep apnea, and bronchoscopy.',
    icon: Activity,
    color: 'text-sky-700',
    bg: 'bg-sky-50 border-sky-200',
  },
  {
    key: 'ENDOCRINOLOGY_DIABETES',
    name: 'Endocrinology & Diabetes',
    category: 'Metabolism',
    description: 'Diabetes mellitus, thyroid management, hormone therapy, and metabolic care.',
    icon: Sparkles,
    color: 'text-yellow-700',
    bg: 'bg-yellow-50 border-yellow-200',
  },
  {
    key: 'ENT',
    name: 'ENT (Ear, Nose & Throat)',
    category: 'Head & Neck',
    description: 'Sinusitis, hearing loss, vertigo, tonsillitis, and audiometry.',
    icon: Stethoscope,
    color: 'text-violet-700',
    bg: 'bg-violet-50 border-violet-200',
  },
  {
    key: 'OPHTHALMOLOGY',
    name: 'Ophthalmology',
    category: 'Vision Care',
    description: 'Eye exams, cataracts, glaucoma, refraction, and slit-lamp exams.',
    icon: Eye,
    color: 'text-teal-700',
    bg: 'bg-teal-50 border-teal-200',
  },
  {
    key: 'DERMATOLOGY',
    name: 'Dermatology',
    category: 'Skin & Allergy',
    description: 'Skin lesions, eczema, psoriasis, acne, biopsies, and cosmetic procedures.',
    icon: Sparkles,
    color: 'text-pink-700',
    bg: 'bg-pink-50 border-pink-200',
  },
  {
    key: 'DENTAL',
    name: 'Dental Clinic',
    category: 'Oral Health',
    description: 'Teeth extractions, root canals, fillings, orthodontics, and scaling.',
    icon: Smile,
    color: 'text-sky-700',
    bg: 'bg-sky-50 border-sky-200',
  },
  {
    key: 'PSYCHIATRY',
    name: 'Psychiatry & Mental Health',
    category: 'Behavioral',
    description: 'Depression, anxiety, mood disorders, psychotherapy, and psychiatric evaluation.',
    icon: Brain,
    color: 'text-fuchsia-700',
    bg: 'bg-fuchsia-50 border-fuchsia-200',
  },
  {
    key: 'ANESTHESIOLOGY',
    name: 'Anesthesiology',
    category: 'Perioperative',
    description: 'Pre-op anesthesia evaluation, nerve blocks, sedation, and pain management.',
    icon: Syringe,
    color: 'text-orange-700',
    bg: 'bg-orange-50 border-orange-200',
  },
  {
    key: 'PHYSIOTHERAPY',
    name: 'Physiotherapy & Rehabilitation',
    category: 'Physical Therapy',
    description: 'Post-stroke rehab, mobility exercises, joint manipulation, and physical therapy.',
    icon: Activity,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
  },
];

export default function ClinicalSpecialtiesPage() {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [patients, setPatients] = useState<any[]>([]);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [selectedEncounterDetail, setSelectedEncounterDetail] = useState<any>(null);

  const [form, setForm] = useState({
    patientId: '',
    doctorId: '650000000000000000000001',
    specialty: 'INTERNAL_MEDICINE',
    chiefComplaint: '',
    historyOfPresentIllness: '',
    physicalExamination: '',
    primaryDiagnosis: '',
    secondaryDiagnosis: '',
    treatmentPlan: '',
    medicationName: '',
    dosage: '',
    frequency: '',
    duration: '',
    procedureName: '',
    specialtyParam1: '',
    specialtyParam2: '',
  });

  useEffect(() => {
    fetchData();
  }, [selectedSpecialty]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams: any = {};
      if (selectedSpecialty !== 'ALL') queryParams.specialty = selectedSpecialty;

      const [encData, statsData, ptsData] = await Promise.all([
        ClinicalSpecialtyService.getEncounters(queryParams).catch(() => ({ data: [] })),
        ClinicalSpecialtyService.getStats().catch(() => ({ data: {} })),
        PatientApiService.getPatients({ limit: 50 }).catch(() => ({ patients: [] })),
      ]);

      setEncounters(encData.data || encData.encounters || []);
      setStats(statsData.data || {});
      setPatients(ptsData.patients || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch clinical specialty records.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      const payload = {
        patientId: form.patientId,
        doctorId: form.doctorId,
        specialty: form.specialty,
        chiefComplaint: form.chiefComplaint,
        historyOfPresentIllness: form.historyOfPresentIllness,
        physicalExamination: form.physicalExamination,
        diagnoses: [
          ...(form.primaryDiagnosis ? [{ description: form.primaryDiagnosis, type: 'PRIMARY' }] : []),
          ...(form.secondaryDiagnosis ? [{ description: form.secondaryDiagnosis, type: 'SECONDARY' }] : []),
        ],
        prescriptions: form.medicationName
          ? [
              {
                medicationName: form.medicationName,
                dosage: form.dosage || '1 tablet',
                frequency: form.frequency || 'TID',
                duration: form.duration || '5 days',
              },
            ]
          : [],
        proceduresPerformed: form.procedureName
          ? [
              {
                procedureName: form.procedureName,
                performedAt: new Date(),
              },
            ]
          : [],
        treatmentPlan: form.treatmentPlan,
        specialtyData: {
          parameter1: form.specialtyParam1,
          parameter2: form.specialtyParam2,
        },
      };

      await ClinicalSpecialtyService.createEncounter(payload);
      setSuccessMsg('Specialty consultation recorded successfully!');
      setShowModal(false);
      setForm({
        patientId: '',
        doctorId: '650000000000000000000001',
        specialty: 'INTERNAL_MEDICINE',
        chiefComplaint: '',
        historyOfPresentIllness: '',
        physicalExamination: '',
        primaryDiagnosis: '',
        secondaryDiagnosis: '',
        treatmentPlan: '',
        medicationName: '',
        dosage: '',
        frequency: '',
        duration: '',
        procedureName: '',
        specialtyParam1: '',
        specialtyParam2: '',
      });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to record specialty encounter');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredEncounters = encounters.filter(
    (enc) =>
      `${enc.patientId?.firstName || ''} ${enc.patientId?.lastName || ''}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      enc.chiefComplaint?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enc.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-[#1b7b68] to-slate-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <Building className="w-4 h-4" /> Comprehensive Clinical Care
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Clinical Specialties & Outpatient Clinics</h1>
            <p className="text-teal-100 text-sm mt-1 max-w-2xl">
              Unified multi-specialty clinical system supporting 19 clinical departments, specialty-tailored assessments, and procedure logs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#1b7b68] rounded-xl font-bold text-xs hover:bg-teal-50 transition shadow-md"
            >
              <Plus className="w-4 h-4" /> New Consultation
            </button>
            <button
              onClick={fetchData}
              className="p-2.5 bg-teal-700/60 hover:bg-teal-700 text-white rounded-xl transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Alert Notices */}
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

      {/* 19 Specialty Grid Display */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Clinical Departments ({SPECIALTY_CONFIG.length})</h2>
          <span className="text-xs text-slate-400 font-medium">Click any specialty to filter encounters</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <button
            onClick={() => setSelectedSpecialty('ALL')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
              selectedSpecialty === 'ALL'
                ? 'bg-[#1b7b68] text-white border-[#1b7b68] shadow-md'
                : 'bg-white border-slate-200 hover:border-teal-400 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs">All Specialties</span>
              <Building className="w-4 h-4 opacity-80" />
            </div>
            <p className="text-[10px] opacity-80">View all clinical encounter logs</p>
            <span className="text-xs font-extrabold mt-1">
              {Object.values(stats).reduce((a, b) => a + b, 0)} cases
            </span>
          </button>

          {SPECIALTY_CONFIG.map((spec) => {
            const Icon = spec.icon;
            const isSelected = selectedSpecialty === spec.key;
            const count = stats[spec.key] || 0;

            return (
              <button
                key={spec.key}
                onClick={() => setSelectedSpecialty(spec.key)}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'bg-[#1b7b68] text-white border-[#1b7b68] shadow-md'
                    : `${spec.bg} hover:shadow-sm`
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-xs truncate max-w-[120px] ${isSelected ? 'text-white' : spec.color}`}>
                    {spec.name}
                  </span>
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : spec.color}`} />
                </div>
                <p className={`text-[10px] line-clamp-2 leading-tight ${isSelected ? 'text-teal-100' : 'text-slate-500'}`}>
                  {spec.description}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100/40">
                  <span className={`text-[9px] font-extrabold uppercase ${isSelected ? 'text-teal-200' : 'text-slate-400'}`}>
                    {spec.category}
                  </span>
                  <span className={`text-xs font-extrabold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                    {count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Specialty Consultations Ledger{' '}
              {selectedSpecialty !== 'ALL' && (
                <span className="text-xs font-normal text-[#1b7b68] bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200 ml-2">
                  Filtered by: {SPECIALTY_CONFIG.find((s) => s.key === selectedSpecialty)?.name || selectedSpecialty}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">Search patient consultations, diagnosis records, and prescriptions.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient or chief complaint..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#1b7b68] w-64"
              />
            </div>
            <button
              onClick={() => {
                setForm({ ...form, specialty: selectedSpecialty === 'ALL' ? 'INTERNAL_MEDICINE' : selectedSpecialty });
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#1b7b68] text-white rounded-xl font-bold text-xs hover:bg-[#145e50] transition"
            >
              <Plus className="w-4 h-4" /> New Record
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3 rounded-l-xl">Date</th>
                <th className="p-3">Specialty</th>
                <th className="p-3">Patient</th>
                <th className="p-3">Chief Complaint</th>
                <th className="p-3">Primary Diagnosis</th>
                <th className="p-3">Attending Physician</th>
                <th className="p-3 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEncounters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No clinical specialty consultation records found.
                  </td>
                </tr>
              ) : (
                filteredEncounters.map((enc: any) => {
                  const specObj = SPECIALTY_CONFIG.find((s) => s.key === enc.specialty);
                  return (
                    <tr key={enc._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 text-slate-500 font-medium">
                        {new Date(enc.encounterDate || enc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 font-bold text-slate-700">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${specObj?.bg || 'bg-slate-100 text-slate-700'}`}>
                          {specObj?.name || enc.specialty}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {enc.patientId?.firstName ? `${enc.patientId.firstName} ${enc.patientId.lastName}` : 'Patient'}
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{enc.chiefComplaint}</td>
                      <td className="p-3 font-bold text-[#1b7b68]">
                        {enc.diagnoses?.[0]?.description || 'Under Evaluation'}
                      </td>
                      <td className="p-3 text-slate-600">
                        {enc.doctorId?.firstName ? `Dr. ${enc.doctorId.firstName} ${enc.doctorId.lastName}` : 'Physician'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedEncounterDetail(enc)}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold text-[11px] hover:bg-slate-200 transition"
                        >
                          View Notes
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

      {/* RECORD SPECIALTY CONSULTATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-[#1b7b68]" /> Record Clinical Specialty Consultation
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateEncounter} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Clinical Specialty</label>
                  <select
                    value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none font-bold"
                  >
                    {SPECIALTY_CONFIG.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.name} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Select Patient</label>
                  <select
                    required
                    value={form.patientId}
                    onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none"
                  >
                    <option value="">-- Select Patient --</option>
                    {patients.map((p: any) => (
                      <option key={p._id || p.id} value={p._id || p.id}>
                        {p.firstName} {p.lastName} ({p.mrn || 'No MRN'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Chief Complaint</label>
                <input
                  type="text"
                  required
                  value={form.chiefComplaint}
                  onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
                  placeholder="Primary symptom or consultation reason..."
                  className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">History of Present Illness (HPI)</label>
                  <textarea
                    rows={2}
                    value={form.historyOfPresentIllness}
                    onChange={(e) => setForm({ ...form, historyOfPresentIllness: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none"
                    placeholder="Onset, duration, severity, modifying factors..."
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Physical Examination</label>
                  <textarea
                    rows={2}
                    value={form.physicalExamination}
                    onChange={(e) => setForm({ ...form, physicalExamination: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none"
                    placeholder="Physical exam findings, auscultation, palpation..."
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                <span className="font-bold text-slate-700 block">Diagnoses & Treatment Plan</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Primary Diagnosis</label>
                    <input
                      type="text"
                      required
                      value={form.primaryDiagnosis}
                      onChange={(e) => setForm({ ...form, primaryDiagnosis: e.target.value })}
                      className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none bg-white"
                      placeholder="e.g., Essential Hypertension / Type 2 Diabetes"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Secondary Diagnosis (Optional)</label>
                    <input
                      type="text"
                      value={form.secondaryDiagnosis}
                      onChange={(e) => setForm({ ...form, secondaryDiagnosis: e.target.value })}
                      className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none bg-white"
                      placeholder="e.g., Hyperlipidemia"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Treatment Plan</label>
                  <textarea
                    rows={2}
                    value={form.treatmentPlan}
                    onChange={(e) => setForm({ ...form, treatmentPlan: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:border-[#1b7b68] outline-none bg-white"
                    placeholder="Management plan, follow-up instructions..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-xl space-y-2">
                  <span className="font-bold text-[#1b7b68] block">Prescribe Medication</span>
                  <input
                    type="text"
                    value={form.medicationName}
                    onChange={(e) => setForm({ ...form, medicationName: e.target.value })}
                    className="w-full p-1.5 border border-slate-200 rounded-lg outline-none bg-white"
                    placeholder="Medication Name"
                  />
                  <div className="grid grid-cols-3 gap-1">
                    <input
                      type="text"
                      value={form.dosage}
                      onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                      className="p-1.5 border border-slate-200 rounded-lg outline-none bg-white text-[11px]"
                      placeholder="Dosage (500mg)"
                    />
                    <input
                      type="text"
                      value={form.frequency}
                      onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                      className="p-1.5 border border-slate-200 rounded-lg outline-none bg-white text-[11px]"
                      placeholder="Freq (BD/TID)"
                    />
                    <input
                      type="text"
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      className="p-1.5 border border-slate-200 rounded-lg outline-none bg-white text-[11px]"
                      placeholder="Days (7 days)"
                    />
                  </div>
                </div>

                <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl space-y-2">
                  <span className="font-bold text-purple-800 block">Procedure Performed</span>
                  <input
                    type="text"
                    value={form.procedureName}
                    onChange={(e) => setForm({ ...form, procedureName: e.target.value })}
                    className="w-full p-1.5 border border-slate-200 rounded-lg outline-none bg-white"
                    placeholder="Procedure Name (e.g., Endoscopy / Joint Infiltration)"
                  />
                  <span className="text-[10px] text-purple-600 block">Recorded directly into patient's EHR timeline.</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#1b7b68] text-white rounded-xl font-bold hover:bg-[#145e50]"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Specialty Encounter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL PREVIEW MODAL */}
      {selectedEncounterDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-teal-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#1b7b68] bg-teal-50 px-2 py-0.5 rounded">
                  {selectedEncounterDetail.specialty} CONSULTATION
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-1">
                  {selectedEncounterDetail.patientId?.firstName} {selectedEncounterDetail.patientId?.lastName}
                </h3>
              </div>
              <button onClick={() => setSelectedEncounterDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p><span className="font-bold text-slate-800">Chief Complaint:</span> {selectedEncounterDetail.chiefComplaint}</p>
                {selectedEncounterDetail.historyOfPresentIllness && (
                  <p><span className="font-bold text-slate-800">HPI:</span> {selectedEncounterDetail.historyOfPresentIllness}</p>
                )}
                {selectedEncounterDetail.physicalExamination && (
                  <p><span className="font-bold text-slate-800">Exam:</span> {selectedEncounterDetail.physicalExamination}</p>
                )}
              </div>

              <div>
                <span className="font-bold text-slate-800 block mb-1">Diagnoses:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedEncounterDetail.diagnoses?.map((d: any, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-teal-50 text-[#1b7b68] font-bold rounded text-[10px]">
                      {d.type}: {d.description}
                    </span>
                  ))}
                </div>
              </div>

              {selectedEncounterDetail.treatmentPlan && (
                <div>
                  <span className="font-bold text-slate-800 block mb-0.5">Treatment Plan:</span>
                  <p className="p-2.5 bg-slate-50 rounded-xl">{selectedEncounterDetail.treatmentPlan}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedEncounterDetail(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
