import {
  Users,
  UserRoundPlus,
  Calendar,
  CalendarClock,
  FileCheck,
  ShieldCheck,
  BadgeCheck,
  Receipt,
  Bed,
  Pill,
  Building2,
  BarChart3,
  ChartNoAxesCombined,
  CreditCard,
  Settings,
  UserCog,
  Stethoscope,
  Syringe,
  ScanLine,
  FlaskConical,
  Siren,
  HeartPulse,
  Baby,
  BadgeDollarSign,
  ClipboardList,
  Ambulance,
} from 'lucide-react';

import { AccountType } from '@/types/auth.types';

export interface NavItem {
  label: string;
  href: string;
  icon: any;
  moduleKey?: string;
}

export const NAV_CONFIG: Record<AccountType, NavItem[]> = {
  [AccountType.HOSPITAL]: [
    {
      label: 'Hospital Overview',
      href: '/hms',
      icon: Building2,
    },

    {
      label: 'Patients EMR',
      href: '/hms/patients',
      icon: Users,
      moduleKey: 'patients',
    },

    {
      label: 'Emergency Department',
      href: '/hms/emergency',
      icon: Siren,
      moduleKey: 'emergency',
    },

    {
      label: 'MedXRescue Nexus',
      href: '/hms/medxrescue',
      icon: Ambulance,
    },

    {
      label: 'Intensive Care Unit',
      href: '/hms/icu',
      icon: HeartPulse,
      moduleKey: 'icu',
    },

    {
      label: 'Bed & Ward Management',
      href: '/hms/bed-ward',
      icon: Bed,
      moduleKey: 'bed_ward',
    },

    {
      label: 'Outpatient Clinic',
      href: '/hms/outpatients',
      icon: Stethoscope,
      moduleKey: 'outpatient',
    },

    {
      label: 'Obstetrics & Gynecology',
      href: '/hms/obgyn',
      icon: Baby,
    },

    {
      label: 'Surgery & OT',
      href: '/hms/surgery',
      icon: Syringe,
      moduleKey: 'surgery',
    },

    {
      label: 'Radiology',
      href: '/hms/radiology',
      icon: ScanLine,
      moduleKey: 'radiology',
    },

    {
      label: 'Laboratory',
      href: '/hms/lab',
      icon: FlaskConical,
      moduleKey: 'lab',
    },

    {
      label: 'Appointments',
      href: '/hms/appointments',
      icon: Calendar,
      moduleKey: 'appointments',
    },

    {
      label: 'Staff Management',
      href: '/hms/staff',
      icon: UserCog,
      moduleKey: 'staff',
    },

    {
      label: 'Staff Rostering',
      href: '/hms/staff-roster',
      icon: CalendarClock,
      moduleKey: 'staff_roster',
    },

    {
      label: 'Pharmacy',
      href: '/hms/pharmacy',
      icon: Pill,
      moduleKey: 'pharmacy',
    },

    {
      label: 'Billing & Invoices',
      href: '/hms/billing',
      icon: Receipt,
      moduleKey: 'billing',
    },

    {
      label: 'Settings',
      href: '/hms/settings',
      icon: Settings,
    },
  ],

  [AccountType.HMO]: [
    {
      label: 'HMO Hub',
      href: '/hmo',
      icon: BarChart3,
    },

    {
      label: 'Health Plans',
      href: '/hmo/health-plans',
      icon: ClipboardList,
      moduleKey: 'health_plans',
    },

    {
      label: 'Benefits',
      href: '/hmo/benefits',
      icon: BadgeDollarSign,
      moduleKey: 'benefits',
    },

    {
      label: 'Enrollee Registry',
      href: '/hmo/enrollees',
      icon: Users,
      moduleKey: 'enrollees',
    },

    {
      label: 'Members',
      href: '/hmo/members',
      icon: UserRoundPlus,
      moduleKey: 'members',
    },

    {
      label: 'Healthcare Providers',
      href: '/hmo/providers',
      icon: Building2,
      moduleKey: 'providers',
    },

    {
      label: 'Eligibility & Verification',
      href: '/hmo/eligibility',
      icon: ShieldCheck,
      moduleKey: 'eligibility',
    },

    {
      label: 'Pre-Authorizations',
      href: '/hmo/pre-auth',
      icon: BadgeCheck,
      moduleKey: 'pre_auth',
    },

    {
      label: 'Claims Adjudication',
      href: '/hmo/claims',
      icon: FileCheck,
      moduleKey: 'claims',
    },

    {
      label: 'Billings & Payments',
      href: '/hmo/billings',
      icon: CreditCard,
      moduleKey: 'billings',
    },

    {
      label: 'Utilization & Fraud',
      href: '/hmo/utilization',
      icon: BarChart3,
      moduleKey: 'utilization',
    },

    {
      label: 'Analytics & Reports',
      href: '/hmo/analytics',
      icon: ChartNoAxesCombined,
      moduleKey: 'analytics',
    },

    {
      label: 'Settings',
      href: '/hmo/settings',
      icon: Settings,
    },
  ],

  [AccountType.PATIENT_PORTAL]: [
    {
      label: 'Overview',
      href: '/portal',
      icon: Building2,
    },
    {
      label: 'Virtual Care',
      href: '/telemedicine',
      icon: Stethoscope,
    },
  ],
};