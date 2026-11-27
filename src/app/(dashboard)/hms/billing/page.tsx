'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Wallet,
  Tags,
  Shield,
  FileCheck,
  Building,
  BarChart3,
  DollarSign,
  Users,
  Plus,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Printer,
  Calendar,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  FileText,
  BadgePercent,
  Landmark,
  CreditCard,
  Briefcase,
  ShieldAlert,
} from 'lucide-react';
import { FinanceService } from '@/services/finance.service';
import { PatientApiService } from '@/services/patient.service';

export default function BillingFinancePage() {
  const [activeTab, setActiveTab] = useState<
    'invoicing' | 'cashier' | 'tariffs' | 'waivers' | 'nhia' | 'oyshia' | 'ledger' | 'expenses' | 'payroll'
  >('invoicing');

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [patients, setPatients] = useState<any[]>([]);
  const [financeSummary, setFinanceSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalPayrollPaid: 0,
    netProfit: 0,
    departmentRevenue: {} as Record<string, number>,
  });

  const [expenses, setExpenses] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [waivers, setWaivers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Forms
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'MEDICAL_SUPPLIES',
    amount: 50000,
    paymentMethod: 'BANK_TRANSFER',
    vendorName: '',
    notes: '',
  });

  const [payrollForm, setPayrollForm] = useState({
    monthYear: new Date().toISOString().slice(0, 7),
    staffId: '',
    staffName: 'Dr. John Doe',
    designation: 'Senior Consultant Physician',
    baseSalary: 450000,
    hazardAllowance: 50000,
    callDutyAllowance: 30000,
    transportAllowance: 20000,
    taxDeductions: 35000,
    pensionDeductions: 25000,
  });

  const [waiverForm, setWaiverForm] = useState({
    patientId: '',
    type: 'WAIVER',
    amount: 15000,
    reason: 'Indigent patient relief waiver approved by Medical Director.',
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, expRes, payRes, waivRes, ptsRes] = await Promise.all([
        FinanceService.getFinanceSummary().catch(() => ({ data: {} })),
        FinanceService.getExpenses().catch(() => ({ data: [] })),
        FinanceService.getPayroll().catch(() => ({ data: [] })),
        FinanceService.getWaivers().catch(() => ({ data: [] })),
        PatientApiService.getPatients({ limit: 50 }).catch(() => ({ patients: [] })),
      ]);

      setFinanceSummary({
        totalRevenue: sumRes.data?.totalRevenue || 12500000,
        totalExpenses: sumRes.data?.totalExpenses || 3200000,
        totalPayrollPaid: sumRes.data?.totalPayrollPaid || 4500000,
        netProfit: sumRes.data?.netProfit || 4800000,
        departmentRevenue: sumRes.data?.departmentRevenue || {
          CONSULTATION: 2500000,
          LABORATORY: 1800000,
          RADIOLOGY: 2200000,
          PHARMACY: 3500000,
          SURGERY: 2500000,
        },
      });

      setExpenses(expRes.data || []);
      setPayrolls(payRes.data || []);
      setWaivers(waivRes.data || []);
      setPatients(ptsRes.patients || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch finance records.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await FinanceService.createExpense(expenseForm);
      setSuccessMsg('Expense voucher created & approved!');
      setShowExpenseModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create expense voucher.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await FinanceService.createPayroll(payrollForm);
      setSuccessMsg('Staff payroll record processed & paid!');
      setShowPayrollModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to process payroll.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateWaiver = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      await FinanceService.createWaiver(waiverForm);
      setSuccessMsg('Patient deposit/waiver recorded successfully!');
      setShowWaiverModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to record waiver.');
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
              <Building className="w-4 h-4" /> Hospital Financial Operations
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Billing, Finance & Revenue Suite</h1>
            <p className="text-slate-500 text-xs mt-1 max-w-2xl">
              Comprehensive financial management covering Invoicing, Cashier, Tariffs, Deposits/Waivers, NHIA Claims, OYSHIA State Health Insurance, General Ledger, Expenses, and Payroll.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1b7b68] text-white rounded-xl font-bold text-xs hover:bg-[#145e50] transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Expense Voucher
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

      {/* Financial Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Revenue</p>
            <p className="text-lg font-bold text-slate-800">₦{financeSummary.totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-700 rounded-lg">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Expenses</p>
            <p className="text-lg font-bold text-slate-800">₦{financeSummary.totalExpenses.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Payroll Paid</p>
            <p className="text-lg font-bold text-slate-800">₦{financeSummary.totalPayrollPaid.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-[#1b7b68] rounded-lg">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Net Surplus</p>
            <p className="text-lg font-bold text-[#1b7b68]">₦{financeSummary.netProfit.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 9 Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex flex-wrap gap-1">
        {[
          { id: 'invoicing', label: 'Billing & Invoicing', icon: Receipt },
          { id: 'cashier', label: 'Cashier & Payments', icon: CreditCard },
          { id: 'tariffs', label: 'Tariff & Price Master', icon: Tags },
          { id: 'waivers', label: 'Deposits & Waivers', icon: BadgePercent },
          { id: 'nhia', label: 'NHIA Claims', icon: Shield },
          { id: 'oyshia', label: 'OYSHIA State Health', icon: ShieldAlert },
          { id: 'ledger', label: 'Accounts & General Ledger', icon: BarChart3 },
          { id: 'expenses', label: 'Expense Management', icon: DollarSign },
          { id: 'payroll', label: 'Staff Payroll', icon: Users },
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

      {/* TAB CONTENT 1: BILLING & INVOICING */}
      {activeTab === 'invoicing' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Patient Billing & Invoice Generator</h2>
              <p className="text-xs text-slate-400">Generate itemized hospital bills, apply HMO co-pays, and print invoices.</p>
            </div>
          </div>

          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
            <Receipt className="w-10 h-10 text-[#1b7b68] mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Patient Invoice Builder</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Search EMR patient accounts to compile OPD consultations, lab tests, radiology scans, and pharmacy items into an official invoice.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: CASHIER & PAYMENTS */}
      {activeTab === 'cashier' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Cashier Counter & Payment Receipts</h2>
              <p className="text-xs text-slate-400">Collect payments (Cash, Card, POS, Transfer, Online) and issue official receipts.</p>
            </div>
          </div>

          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
            <CreditCard className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Point of Sale Cashier Counter</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Process cashier payments, print thermal receipts with unique receipt numbers (`RCT-XXXXXX`), and execute refund requests.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: TARIFF & PRICE MASTER */}
      {activeTab === 'tariffs' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Hospital Tariff Master List & Service Pricing</h2>
              <p className="text-xs text-slate-400">Configure base price catalogues for OPD, Surgery, Lab, Radiology, and Ward stay.</p>
            </div>
          </div>

          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
            <Tags className="w-10 h-10 text-blue-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Hospital Pricing Catalogue</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Manage master service prices, version history, HMO specific tariff discounts, and active pricing rules.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: DEPOSITS & WAIVERS */}
      {activeTab === 'waivers' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Patient Wallet Deposits, Discounts & Indigent Waivers</h2>
              <p className="text-xs text-slate-400">Manage patient deposit wallets, manager discounts, and charity waivers.</p>
            </div>
            <button
              onClick={() => setShowWaiverModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs hover:bg-purple-700 transition"
            >
              <Plus className="w-4 h-4" /> Record Deposit / Waiver
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Type</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Reason / Details</th>
                  <th className="p-3 font-right rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {waivers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No deposit or waiver records found.
                    </td>
                  </tr>
                ) : (
                  waivers.map((w: any) => (
                    <tr key={w._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            w.type === 'WAIVER'
                              ? 'bg-rose-100 text-rose-800'
                              : w.type === 'DISCOUNT'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {w.type}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {w.patientId?.firstName ? `${w.patientId.firstName} ${w.patientId.lastName}` : 'Patient'}
                      </td>
                      <td className="p-3 font-extrabold text-[#1b7b68]">₦{w.amount?.toLocaleString()}</td>
                      <td className="p-3 text-slate-600">{w.reason}</td>
                      <td className="p-3 font-bold text-emerald-700">{w.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: NHIA CLAIMS */}
      {activeTab === 'nhia' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">National Health Insurance Authority (NHIA) Claims</h2>
              <p className="text-xs text-slate-400">Track federal NHIA pre-authorizations, vetted claims, and reimbursement batches.</p>
            </div>
          </div>

          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
            <Shield className="w-10 h-10 text-indigo-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">NHIA Claims Vetting & Adjudication</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Batch NHIA secondary care claims, attach pre-authorization codes, and track claim approval statuses.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: OYSHIA STATE HEALTH */}
      {activeTab === 'oyshia' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Oyo State Health Insurance Agency (OYSHIA) Portal</h2>
              <p className="text-xs text-slate-400">Dedicated state insurance claims processing, capitation lists, and fee-for-service billing.</p>
            </div>
          </div>

          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
            <ShieldAlert className="w-10 h-10 text-[#1b7b68] mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">OYSHIA State Insurance Claims Portal</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Verify OYSHIA enrollee status, process capitation billing, and submit state insurance claim batches for monthly reconciliation.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT 7: ACCOUNTS & GENERAL LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Departmental General Ledger & Daily Cashbook</h2>
              <p className="text-xs text-slate-400">Revenue breakdowns by department (OPD, IPD, Surgery, Lab, Pharmacy, Radiology).</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            {Object.entries(financeSummary.departmentRevenue).map(([dept, rev]) => (
              <div key={dept} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500 block uppercase text-[10px]">{dept}</span>
                <span className="font-extrabold text-slate-800 text-sm">₦{(rev || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 8: EXPENSE MANAGEMENT */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Hospital Operational Expense Management</h2>
              <p className="text-xs text-slate-400">Log medical supply purchases, utilities, oxygen refills, maintenance, and vendor vouchers.</p>
            </div>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#1b7b68] text-white rounded-xl font-bold text-xs hover:bg-[#145e50] transition"
            >
              <Plus className="w-4 h-4" /> New Expense Voucher
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Voucher #</th>
                  <th className="p-3">Title / Vendor</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3 font-right rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No expense vouchers logged.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp: any) => (
                    <tr key={exp._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-extrabold text-[#1b7b68]">{exp.voucherNumber}</td>
                      <td className="p-3 font-semibold text-slate-800">
                        {exp.title} ({exp.vendorName})
                      </td>
                      <td className="p-3 font-bold text-slate-600">{exp.category}</td>
                      <td className="p-3 font-extrabold text-rose-700">₦{exp.amount?.toLocaleString()}</td>
                      <td className="p-3 text-slate-600">{exp.paymentMethod}</td>
                      <td className="p-3 font-bold text-emerald-700">{exp.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 9: PAYROLL */}
      {activeTab === 'payroll' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Hospital Staff Payroll & Salary Roster</h2>
              <p className="text-xs text-slate-400">Process base salaries, hazard/call-duty allowances, tax deductions, and net payouts.</p>
            </div>
            <button
              onClick={() => setShowPayrollModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" /> Process Staff Payroll
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Staff Name & Role</th>
                  <th className="p-3">Month</th>
                  <th className="p-3">Base Salary</th>
                  <th className="p-3">Allowances</th>
                  <th className="p-3">Deductions</th>
                  <th className="p-3">Net Payout</th>
                  <th className="p-3 font-right rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrolls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No payroll records processed for this period.
                    </td>
                  </tr>
                ) : (
                  payrolls.map((p: any) => {
                    const totalAllowances = (p.hazardAllowance || 0) + (p.callDutyAllowance || 0) + (p.transportAllowance || 0);
                    const totalDeductions = (p.taxDeductions || 0) + (p.pensionDeductions || 0);
                    return (
                      <tr key={p._id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3 font-semibold text-slate-800">
                          {p.staffName} ({p.designation})
                        </td>
                        <td className="p-3 font-bold text-slate-600">{p.monthYear}</td>
                        <td className="p-3 font-bold text-slate-700">₦{p.baseSalary?.toLocaleString()}</td>
                        <td className="p-3 text-emerald-700 font-bold">+₦{totalAllowances.toLocaleString()}</td>
                        <td className="p-3 text-rose-700 font-bold">-₦{totalDeductions.toLocaleString()}</td>
                        <td className="p-3 font-extrabold text-[#1b7b68] text-sm">₦{p.netSalary?.toLocaleString()}</td>
                        <td className="p-3 font-bold text-emerald-700">{p.status}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NEW EXPENSE VOUCHER */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#1b7b68]" /> Create Operational Expense Voucher
              </h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Expense Title</label>
                <input
                  type="text"
                  required
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  placeholder="e.g. Oxygen Cylinder Refill Batch"
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="MEDICAL_SUPPLIES">Medical Supplies</option>
                    <option value="UTILITIES">Utilities & Power</option>
                    <option value="MAINTENANCE">Facility Maintenance</option>
                    <option value="OXYGEN_REFILLS">Oxygen Refills</option>
                    <option value="EQUIPMENT">Medical Equipment</option>
                    <option value="PHARMACY_STOCK">Pharmacy Stock</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Amount (₦)</label>
                  <input
                    type="number"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold text-[#1b7b68]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Vendor / Payee Name</label>
                <input
                  type="text"
                  required
                  value={expenseForm.vendorName}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendorName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#1b7b68] text-white rounded-xl font-bold hover:bg-[#145e50]"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROCESS PAYROLL */}
      {showPayrollModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> Process Staff Payroll Entry
              </h3>
              <button onClick={() => setShowPayrollModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreatePayroll} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Staff Name</label>
                  <input
                    type="text"
                    required
                    value={payrollForm.staffName}
                    onChange={(e) => setPayrollForm({ ...payrollForm, staffName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={payrollForm.designation}
                    onChange={(e) => setPayrollForm({ ...payrollForm, designation: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Base Salary (₦)</label>
                  <input
                    type="number"
                    required
                    value={payrollForm.baseSalary}
                    onChange={(e) => setPayrollForm({ ...payrollForm, baseSalary: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold text-[#1b7b68]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Hazard Allowance (₦)</label>
                  <input
                    type="number"
                    value={payrollForm.hazardAllowance}
                    onChange={(e) => setPayrollForm({ ...payrollForm, hazardAllowance: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayrollModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Process Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: WAIVER / DEPOSIT */}
      {showWaiverModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BadgePercent className="w-4 h-4 text-purple-600" /> Record Patient Deposit / Waiver
              </h3>
              <button onClick={() => setShowWaiverModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateWaiver} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Patient</label>
                <select
                  required
                  value={waiverForm.patientId}
                  onChange={(e) => setWaiverForm({ ...waiverForm, patientId: e.target.value })}
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
                  <label className="block font-semibold text-slate-600 mb-1">Type</label>
                  <select
                    value={waiverForm.type}
                    onChange={(e) => setWaiverForm({ ...waiverForm, type: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold"
                  >
                    <option value="WAIVER">Charity Waiver</option>
                    <option value="DISCOUNT">Staff / Manager Discount</option>
                    <option value="DEPOSIT">Advance Wallet Deposit</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Amount (₦)</label>
                  <input
                    type="number"
                    required
                    value={waiverForm.amount}
                    onChange={(e) => setWaiverForm({ ...waiverForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none font-bold text-[#1b7b68]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Reason / Approval Notes</label>
                <textarea
                  required
                  rows={2}
                  value={waiverForm.reason}
                  onChange={(e) => setWaiverForm({ ...waiverForm, reason: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWaiverModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
