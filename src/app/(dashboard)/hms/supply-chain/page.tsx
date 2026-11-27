'use client';

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Truck,
  Wrench,
  Activity,
  Sparkles,
  Utensils,
  Trash2,
  Ambulance,
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
  Shield,
  FileText,
  Package,
} from 'lucide-react';
import { SupplyChainService } from '@/services/supplyChain.service';

export default function SupplyChainFacilitiesPage() {
  const [activeTab, setActiveTab] = useState<
    'inventory' | 'procurement' | 'maintenance' | 'biomedical' | 'laundry' | 'catering' | 'waste' | 'fleet'
  >('inventory');

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [stats, setStats] = useState({
    openWorkOrdersCount: 0,
    dueCalibrationsCount: 0,
    activeFleetCount: 0,
    totalWasteWeightKg: 0,
  });

  // Tab Data Collections
  const [biomedicalList, setBiomedicalList] = useState<any[]>([]);
  const [workOrdersList, setWorkOrdersList] = useState<any[]>([]);
  const [laundryList, setLaundryList] = useState<any[]>([]);
  const [wasteList, setWasteList] = useState<any[]>([]);
  const [fleetList, setFleetList] = useState<any[]>([]);

  // Modals
  const [showBiomedicalModal, setShowBiomedicalModal] = useState(false);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [showLaundryModal, setShowLaundryModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [showFleetModal, setShowFleetModal] = useState(false);

  // Forms
  const [biomedicalForm, setBiomedicalForm] = useState({
    equipmentName: 'Defibrillator Unit #2',
    assetTag: 'AST-DEF-002',
    validMonths: 6,
    safetyTestPassed: true,
    notes: 'Electrical safety test passed. Battery health 98%.',
  });

  const [workOrderForm, setWorkOrderForm] = useState({
    assetTag: 'AST-OT-014',
    equipmentName: 'Anesthesia Workstation',
    departmentName: 'Main Operating Theatre',
    description: 'Vaporizer flow meter fluctuation requires recalibration.',
    priority: 'HIGH',
    assignedTechnicianName: 'Engr. David Okon',
  });

  const [laundryForm, setLaundryForm] = useState({
    wardId: 'Inpatient Ward B',
    linenCategory: 'Bed Sheets & Pillow Cases',
    piecesCount: 45,
  });

  const [wasteForm, setWasteForm] = useState({
    category: 'INFECTIOUS',
    weightKg: 18.5,
    disposalMethod: 'High Temperature Incineration',
    contractorName: 'State Biohazard Disposal Corp',
  });

  const [fleetForm, setFleetForm] = useState({
    plateNumber: 'KJA-892-XX',
    vehicleType: 'AMBULANCE',
    modelName: 'Toyota HiAce Type C Intensive Care Ambulance',
    driverName: 'Sgt. Ahmed Bello',
    fuelLevelPercent: 90,
  });

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, bioRes, woRes, launRes, wasteRes, fleetRes] = await Promise.all([
        SupplyChainService.getStats().catch(() => ({ data: {} })),
        SupplyChainService.getBiomedical().catch(() => ({ data: [] })),
        SupplyChainService.getWorkOrders().catch(() => ({ data: [] })),
        SupplyChainService.getLaundry().catch(() => ({ data: [] })),
        SupplyChainService.getWaste().catch(() => ({ data: [] })),
        SupplyChainService.getFleet().catch(() => ({ data: [] })),
      ]);

      setStats({
        openWorkOrdersCount: statsRes.data?.openWorkOrdersCount || 0,
        dueCalibrationsCount: statsRes.data?.dueCalibrationsCount || 0,
        activeFleetCount: statsRes.data?.activeFleetCount || 0,
        totalWasteWeightKg: statsRes.data?.totalWasteWeightKg || 0,
      });

      setBiomedicalList(bioRes.data || []);
      setWorkOrdersList(woRes.data || []);
      setLaundryList(launRes.data || []);
      setWasteList(wasteRes.data || []);
      setFleetList(fleetRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load supply chain records');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBiomedical = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await SupplyChainService.createBiomedical(biomedicalForm);
      setSuccessMsg('Biomedical equipment calibration logged!');
      setShowBiomedicalModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to log calibration');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await SupplyChainService.createWorkOrder(workOrderForm);
      setSuccessMsg('Maintenance work order created!');
      setShowWorkOrderModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to create work order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateLaundry = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await SupplyChainService.createLaundry(laundryForm);
      setSuccessMsg('Linen laundry wash batch recorded!');
      setShowLaundryModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to record laundry batch');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await SupplyChainService.createWaste(wasteForm);
      setSuccessMsg('Biohazard waste manifest logged!');
      setShowWasteModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to log waste manifest');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateFleet = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await SupplyChainService.createFleet(fleetForm);
      setSuccessMsg('Fleet vehicle registered in database!');
      setShowFleetModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to register fleet vehicle');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateWorkOrderStatus = async (id: string, status: string) => {
    try {
      await SupplyChainService.updateWorkOrder(id, status);
      setSuccessMsg(`Work order status updated to ${status}`);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to update work order');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#1b7b68] text-xs font-semibold uppercase tracking-wider mb-1">
              <Building className="w-4 h-4" /> Hospital Operations & Facilities
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Supply Chain & Facilities Hub</h1>
            <p className="text-slate-500 text-xs mt-1 max-w-2xl">
              Centralized operations for Inventory, Procurement, Asset Maintenance, Biomedical Engineering, Housekeeping, Catering, Waste Disposal, and Fleet.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                if (activeTab === 'biomedical') setShowBiomedicalModal(true);
                else if (activeTab === 'maintenance') setShowWorkOrderModal(true);
                else if (activeTab === 'laundry') setShowLaundryModal(true);
                else if (activeTab === 'waste') setShowWasteModal(true);
                else if (activeTab === 'fleet') setShowFleetModal(true);
                else setShowWorkOrderModal(true);
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

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Open Work Orders</p>
            <p className="text-lg font-bold text-slate-800">{stats.openWorkOrdersCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Due Calibrations</p>
            <p className="text-lg font-bold text-slate-800">{stats.dueCalibrationsCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
            <Ambulance className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Active Fleet</p>
            <p className="text-lg font-bold text-slate-800">{stats.activeFleetCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-700 rounded-lg">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Waste (kg)</p>
            <p className="text-lg font-bold text-slate-800">{stats.totalWasteWeightKg.toFixed(1)} kg</p>
          </div>
        </div>
      </div>

      {/* 8 Sub-Module Tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex flex-wrap gap-1">
        {[
          { id: 'inventory', label: 'Inventory & Stores', icon: Boxes },
          { id: 'procurement', label: 'Procurement & Suppliers', icon: Truck },
          { id: 'maintenance', label: 'Asset Maintenance', icon: Wrench },
          { id: 'biomedical', label: 'Biomedical Engineering', icon: Activity },
          { id: 'laundry', label: 'Housekeeping & Laundry', icon: Sparkles },
          { id: 'catering', label: 'Kitchen & Catering', icon: Utensils },
          { id: 'waste', label: 'Waste Management', icon: Trash2 },
          { id: 'fleet', label: 'Fleet Management', icon: Ambulance },
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

      {/* TAB CONTENT 1: INVENTORY & STORES */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 text-center">
          <Boxes className="w-10 h-10 text-[#1b7b68] mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Hospital Central Stores & Warehouse Inventory</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Centralized stock monitoring, reorder alerts, location shelf tags, and stock transfer requests.
          </p>
        </div>
      )}

      {/* TAB CONTENT 2: PROCUREMENT & SUPPLIERS */}
      {activeTab === 'procurement' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 text-center">
          <Truck className="w-10 h-10 text-blue-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Procurement & Vendor Directory</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Supplier catalogue, purchase order generation (`PO-XXXXXX`), and goods delivery verification.
          </p>
        </div>
      )}

      {/* TAB CONTENT 3: ASSET MAINTENANCE */}
      {activeTab === 'maintenance' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Hospital Asset & Facility Maintenance Work Orders</h2>
              <p className="text-xs text-slate-400">Track equipment repair work orders, technician assignments, and status.</p>
            </div>
            <button
              onClick={() => setShowWorkOrderModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-700 transition"
            >
              <Plus className="w-4 h-4" /> Create Work Order
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Asset Tag</th>
                  <th className="p-3">Equipment Name</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Assigned Tech</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workOrdersList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No active maintenance work orders.
                    </td>
                  </tr>
                ) : (
                  workOrdersList.map((wo: any) => (
                    <tr key={wo._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-extrabold text-[#1b7b68]">{wo.assetTag}</td>
                      <td className="p-3 font-semibold text-slate-800">{wo.equipmentName}</td>
                      <td className="p-3 text-slate-600">{wo.departmentName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px]">
                          {wo.priority}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{wo.assignedTechnicianName || 'Unassigned'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            wo.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {wo.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {wo.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleUpdateWorkOrderStatus(wo._id, 'COMPLETED')}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition"
                          >
                            Mark Completed
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

      {/* TAB CONTENT 4: BIOMEDICAL ENGINEERING */}
      {activeTab === 'biomedical' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Biomedical Engineering & Equipment Calibration</h2>
              <p className="text-xs text-slate-400">Medical device calibration, electrical safety testing, and compliance sign-offs.</p>
            </div>
            <button
              onClick={() => setShowBiomedicalModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" /> Log Calibration Test
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Asset Tag</th>
                  <th className="p-3">Equipment Name</th>
                  <th className="p-3">Calibration Date</th>
                  <th className="p-3">Next Due Date</th>
                  <th className="p-3">Safety Test</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {biomedicalList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No biomedical calibration logs found.
                    </td>
                  </tr>
                ) : (
                  biomedicalList.map((b: any) => (
                    <tr key={b._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-extrabold text-[#1b7b68]">{b.assetTag}</td>
                      <td className="p-3 font-semibold text-slate-800">{b.equipmentName}</td>
                      <td className="p-3 text-slate-600">{new Date(b.calibrationDate).toLocaleDateString()}</td>
                      <td className="p-3 font-bold text-blue-700">{new Date(b.nextCalibrationDue).toLocaleDateString()}</td>
                      <td className="p-3 font-bold text-emerald-600">
                        {b.safetyTestPassed ? 'PASSED (PASSED)' : 'FAILED'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: HOUSEKEEPING & LAUNDRY */}
      {activeTab === 'laundry' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Housekeeping & Linen Laundry Management</h2>
              <p className="text-xs text-slate-400">Ward cleaning rounds, bed linen wash batches, and turnaround tracking.</p>
            </div>
            <button
              onClick={() => setShowLaundryModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs hover:bg-purple-700 transition"
            >
              <Plus className="w-4 h-4" /> Log Laundry Batch
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Ward</th>
                  <th className="p-3">Linen Category</th>
                  <th className="p-3">Pieces Count</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {laundryList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      No active laundry wash batches.
                    </td>
                  </tr>
                ) : (
                  laundryList.map((l: any) => (
                    <tr key={l._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-bold text-slate-800">{l.wardId}</td>
                      <td className="p-3 font-semibold text-slate-700">{l.linenCategory}</td>
                      <td className="p-3 font-extrabold text-[#1b7b68]">{l.piecesCount} pcs</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full font-bold text-[10px]">
                          {l.status}
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

      {/* TAB CONTENT 6: KITCHEN & CATERING */}
      {activeTab === 'catering' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 text-center">
          <Utensils className="w-10 h-10 text-emerald-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Hospital Kitchen & Inpatient Catering Services</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Raw food inventory management, dietary tray preparation, and ward meal delivery log.
          </p>
        </div>
      )}

      {/* TAB CONTENT 7: WASTE MANAGEMENT */}
      {activeTab === 'waste' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Biohazard & Hospital Waste Management</h2>
              <p className="text-xs text-slate-400">Waste segregation (Red, Yellow, Sharps boxes), weight logs, and disposal manifests.</p>
            </div>
            <button
              onClick={() => setShowWasteModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition"
            >
              <Plus className="w-4 h-4" /> Log Waste Manifest
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Category</th>
                  <th className="p-3">Weight (kg)</th>
                  <th className="p-3">Disposal Method</th>
                  <th className="p-3">Disposal Contractor</th>
                  <th className="p-3 font-right rounded-r-xl">Date Disposed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wasteList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No waste manifest logs recorded.
                    </td>
                  </tr>
                ) : (
                  wasteList.map((w: any) => (
                    <tr key={w._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-bold text-rose-700">{w.category}</td>
                      <td className="p-3 font-extrabold text-slate-800">{w.weightKg} kg</td>
                      <td className="p-3 text-slate-600">{w.disposalMethod}</td>
                      <td className="p-3 text-slate-600">{w.contractorName || 'Internal Incinerator'}</td>
                      <td className="p-3 text-slate-500">{new Date(w.disposedAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 8: FLEET MANAGEMENT */}
      {activeTab === 'fleet' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Hospital Fleet Management & Ambulances</h2>
              <p className="text-xs text-slate-400">Vehicle availability, assigned drivers, fuel levels, and maintenance status.</p>
            </div>
            <button
              onClick={() => setShowFleetModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition"
            >
              <Plus className="w-4 h-4" /> Register Fleet Vehicle
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Plate Number</th>
                  <th className="p-3">Vehicle Model</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Assigned Driver</th>
                  <th className="p-3">Fuel Level</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fleetList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No fleet vehicles registered.
                    </td>
                  </tr>
                ) : (
                  fleetList.map((f: any) => (
                    <tr key={f._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-extrabold text-[#1b7b68]">{f.plateNumber}</td>
                      <td className="p-3 font-semibold text-slate-800">{f.modelName}</td>
                      <td className="p-3 font-bold text-slate-600">{f.vehicleType}</td>
                      <td className="p-3 text-slate-600">{f.driverName || 'Unassigned'}</td>
                      <td className="p-3 font-bold text-emerald-700">{f.fuelLevelPercent}%</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                          {f.status}
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

      {/* MODAL: BIOMEDICAL */}
      {showBiomedicalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" /> Log Biomedical Equipment Calibration
              </h3>
              <button onClick={() => setShowBiomedicalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateBiomedical} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Equipment Name</label>
                <input
                  type="text"
                  required
                  value={biomedicalForm.equipmentName}
                  onChange={(e) => setBiomedicalForm({ ...biomedicalForm, equipmentName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Asset Tag Code</label>
                <input
                  type="text"
                  required
                  value={biomedicalForm.assetTag}
                  onChange={(e) => setBiomedicalForm({ ...biomedicalForm, assetTag: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBiomedicalModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Calibration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: WORK ORDER */}
      {showWorkOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-600" /> Create Maintenance Work Order
              </h3>
              <button onClick={() => setShowWorkOrderModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateWorkOrder} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Asset Tag</label>
                  <input
                    type="text"
                    required
                    value={workOrderForm.assetTag}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, assetTag: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Equipment Name</label>
                  <input
                    type="text"
                    required
                    value={workOrderForm.equipmentName}
                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, equipmentName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Fault Description</label>
                <textarea
                  required
                  rows={2}
                  value={workOrderForm.description}
                  onChange={(e) => setWorkOrderForm({ ...workOrderForm, description: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWorkOrderModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Issue Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LAUNDRY */}
      {showLaundryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" /> Log Linen Laundry Batch
              </h3>
              <button onClick={() => setShowLaundryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateLaundry} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Ward Location</label>
                <input
                  type="text"
                  required
                  value={laundryForm.wardId}
                  onChange={(e) => setLaundryForm({ ...laundryForm, wardId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Linen Category</label>
                  <input
                    type="text"
                    required
                    value={laundryForm.linenCategory}
                    onChange={(e) => setLaundryForm({ ...laundryForm, linenCategory: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Pieces Count</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={laundryForm.piecesCount}
                    onChange={(e) => setLaundryForm({ ...laundryForm, piecesCount: parseInt(e.target.value) || 1 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold text-[#1b7b68]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLaundryModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Wash Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: WASTE */}
      {showWasteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" /> Log Biohazard Waste Manifest
              </h3>
              <button onClick={() => setShowWasteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateWaste} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Waste Category</label>
                  <select
                    value={wasteForm.category}
                    onChange={(e) => setWasteForm({ ...wasteForm, category: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="INFECTIOUS">Infectious Waste (Yellow Bag)</option>
                    <option value="SHARPS">Sharps Safety Container</option>
                    <option value="CHEMICAL">Chemical / Lab Waste</option>
                    <option value="GENERAL">General Municipal Waste</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={wasteForm.weightKg}
                    onChange={(e) => setWasteForm({ ...wasteForm, weightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold text-rose-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Disposal Method</label>
                <input
                  type="text"
                  required
                  value={wasteForm.disposalMethod}
                  onChange={(e) => setWasteForm({ ...wasteForm, disposalMethod: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWasteModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Manifest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FLEET */}
      {showFleetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Ambulance className="w-4 h-4 text-emerald-600" /> Register Fleet Vehicle
              </h3>
              <button onClick={() => setShowFleetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFleet} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Plate Number</label>
                  <input
                    type="text"
                    required
                    value={fleetForm.plateNumber}
                    onChange={(e) => setFleetForm({ ...fleetForm, plateNumber: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold text-[#1b7b68]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Vehicle Type</label>
                  <select
                    value={fleetForm.vehicleType}
                    onChange={(e) => setFleetForm({ ...fleetForm, vehicleType: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="AMBULANCE">Ambulance (ICU Equipped)</option>
                    <option value="VAN">Patient Transport Van</option>
                    <option value="UTILITY">Hospital Utility Vehicle</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Vehicle Model Name</label>
                <input
                  type="text"
                  required
                  value={fleetForm.modelName}
                  onChange={(e) => setFleetForm({ ...fleetForm, modelName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Assigned Driver Name</label>
                <input
                  type="text"
                  value={fleetForm.driverName}
                  onChange={(e) => setFleetForm({ ...fleetForm, driverName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFleetModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
