/**
 * Frontend Staff Types
 *
 * These types mirror:
 * modules/staff/staff.types.ts
 *
 * Backend uses:
 * - Date for dates
 * - Types.ObjectId for MongoDB IDs
 *
 * Frontend/API transport uses:
 * - string for serialized dates
 * - string for serialized MongoDB ObjectIds
 */

export type ObjectIdString = string;
export type ISODateString = string;

/* =========================================================
 * ENUMS
 * ========================================================= */

export enum StaffRole {
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  PHARMACIST = 'PHARMACIST',
  LAB_TECH = 'LAB_TECH',
  RADIOLOGY_TECH = 'RADIOLOGY_TECH',
  PHYSIOTHERAPIST = 'PHYSIOTHERAPIST',
  DENTIST = 'DENTIST',
  MIDWIFE = 'MIDWIFE',
  DIETITIAN = 'DIETITIAN',
  PSYCHOLOGIST = 'PSYCHOLOGIST',
  HEALTHCARE_ASSISTANT = 'HEALTHCARE_ASSISTANT',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  RECEPTIONIST = 'RECEPTIONIST',
  ACCOUNTANT = 'ACCOUNTANT',
  OTHER = 'OTHER',
}

export enum StaffCategory {
  CLINICAL = 'CLINICAL',
  ALLIED_HEALTH = 'ALLIED_HEALTH',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  SUPPORT = 'SUPPORT',
}

export enum StaffClassification {
  CONSULTANT = 'CONSULTANT',
  SPECIALIST = 'SPECIALIST',
  RESIDENT = 'RESIDENT',
  INTERN = 'INTERN',
  SENIOR = 'SENIOR',
  JUNIOR = 'JUNIOR',
  GENERAL = 'GENERAL',
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  LOCUM = 'LOCUM',
  TEMPORARY = 'TEMPORARY',
  INTERN = 'INTERN',
  VOLUNTEER = 'VOLUNTEER',
}

export enum StaffStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

export enum CredentialStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED',
}

export enum PrivilegeStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
  PENDING_RENEWAL = 'PENDING_RENEWAL',
}

export enum TrainingStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  HALF_DAY = 'HALF_DAY',
  ON_LEAVE = 'ON_LEAVE',
}

export enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  ON_CALL = 'ON_CALL',
  ON_LEAVE = 'ON_LEAVE',
}

/* =========================================================
 * CONTACT
 * ========================================================= */

export interface IStaffContact {
  phone?: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface IEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
}

/* =========================================================
 * PROFESSIONAL REGISTRATION
 * ========================================================= */

export interface IProfessionalRegistration {
  regulatoryBody: string;
  registrationNumber: string;
  registrationType?: string;
  issueDate?: ISODateString;
  expiryDate?: ISODateString;
  status: CredentialStatus;
  verificationDate?: ISODateString;
  verifiedBy?: ObjectIdString;
  documentUrl?: string;
  notes?: string;
}

/* =========================================================
 * QUALIFICATIONS
 * ========================================================= */

export interface IQualification {
  qualification: string;
  institution: string;
  fieldOfStudy?: string;
  startDate?: ISODateString;
  completionDate?: ISODateString;
  certificateNumber?: string;
  documentUrl?: string;
  verified: boolean;
  verifiedAt?: ISODateString;
  verifiedBy?: ObjectIdString;
}

/* =========================================================
 * CERTIFICATIONS
 * ========================================================= */

export interface ICertification {
  name: string;
  issuingOrganization: string;
  certificateNumber?: string;
  issueDate?: ISODateString;
  expiryDate?: ISODateString;
  status: CredentialStatus;
  documentUrl?: string;
}

/* =========================================================
 * SPECIALTIES
 * ========================================================= */

export interface ISpecialty {
  specialty: string;
  subSpecialty?: string;
  isPrimary: boolean;
  yearsOfExperience?: number;
}

/**
 * Backward-compatible alias if existing frontend components
 * currently use StaffSpecialty.
 */
export type StaffSpecialty = ISpecialty;

/* =========================================================
 * PROFESSIONAL EXPERIENCE
 * ========================================================= */

export interface IProfessionalExperience {
  organization: string;
  position: string;
  department?: string;
  startDate: ISODateString;
  endDate?: ISODateString;
  responsibilities?: string;
  reasonForLeaving?: string;
}

export type ProfessionalExperience = IProfessionalExperience;

/* =========================================================
 * CLINICAL PRIVILEGES
 * ========================================================= */

export interface IClinicalPrivilege {
  privilege: string;
  department?: string;
  grantedDate?: ISODateString;
  expiryDate?: ISODateString;
  status: PrivilegeStatus;
  grantedBy?: ObjectIdString;
  notes?: string;
}

export type ClinicalPrivilege = IClinicalPrivilege;

/* =========================================================
 * EMPLOYMENT
 * ========================================================= */

export interface IEmployment {
  employeeNumber?: string;
  employmentType: EmploymentType;
  classification: StaffClassification;
  jobTitle?: string;
  departmentId?: ObjectIdString;
  unitId?: ObjectIdString;
  startDate?: ISODateString;
  endDate?: ISODateString;
  contractStartDate?: ISODateString;
  contractEndDate?: ISODateString;
  salary?: number;
  currency?: string;
  supervisorId?: ObjectIdString;
  contractDocumentUrl?: string;
}

/**
 * Backward-compatible alias.
 */
export type StaffEmployment = IEmployment;

/* =========================================================
 * TRAINING
 * ========================================================= */

export interface ITrainingRecord {
  name: string;
  provider?: string;
  category?: string;
  completionDate?: ISODateString;
  expiryDate?: ISODateString;
  status: TrainingStatus;
  certificateUrl?: string;
  mandatory: boolean;
  cpdPoints?: number;
}

export type TrainingRecord = ITrainingRecord;

/* =========================================================
 * PERFORMANCE
 * ========================================================= */

export interface IPerformanceRecord {
  reviewDate: ISODateString;
  reviewerId?: ObjectIdString;
  score?: number;
  rating?: string;
  comments?: string;
  goals?: string[];
}

export type PerformanceRecord = IPerformanceRecord;

/* =========================================================
 * AVAILABILITY
 * ========================================================= */

export interface IAvailability {
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
  status: AvailabilityStatus;
}

export type AvailabilityRecord = IAvailability;

/* =========================================================
 * ON CALL
 * ========================================================= */

export interface IOnCallAssignment {
  date: ISODateString;
  startTime?: string;
  endTime?: string;
  departmentId?: ObjectIdString;
  unitId?: ObjectIdString;
  notes?: string;
}

export type OnCallAssignment = IOnCallAssignment;

/* =========================================================
 * LEAVE
 * ========================================================= */

export interface ILeaveRecord {
  leaveType: string;
  startDate: ISODateString;
  endDate: ISODateString;
  reason?: string;
  status: LeaveStatus;
  approvedBy?: ObjectIdString;
  approvedAt?: ISODateString;
}

export type LeaveRecord = ILeaveRecord;

/* =========================================================
 * ATTENDANCE
 * ========================================================= */

export interface IAttendanceRecord {
  date: ISODateString;
  clockIn?: ISODateString;
  clockOut?: ISODateString;
  status: AttendanceStatus;
  overtimeHours?: number;
  notes?: string;
}

export type AttendanceRecord = IAttendanceRecord;

/* =========================================================
 * INCIDENTS
 * ========================================================= */

export interface IIncidentRecord {
  incidentType: string;
  date: ISODateString;
  description: string;
  severity?: string;
  status?: string;
  reportedBy?: ObjectIdString;
  resolution?: string;
}

export type IncidentRecord = IIncidentRecord;

/* =========================================================
 * COMMUNICATIONS
 * ========================================================= */

export interface IStaffCommunication {
  subject: string;
  message: string;
  sentAt: ISODateString;
  sentBy?: ObjectIdString;
  readAt?: ISODateString;
}

export type StaffCommunication = IStaffCommunication;

/* =========================================================
 * STAFF
 * ========================================================= */

export interface IStaff {
  /**
   * MongoDB document ID.
   *
   * This is present in API responses even though the backend
   * IStaff interface itself inherits it through IStaffDocument.
   */
  _id: ObjectIdString;

  hospitalId: ObjectIdString;

  /**
   * Internal hospital-wide staff identifier.
   *
   * Example:
   * ST-000001
   */
  staffId: string;

  firstName: string;
  middleName?: string;
  lastName: string;

  title?: string;
  profilePhotoUrl?: string;
  dateOfBirth?: ISODateString;
  gender?: string;

  role: StaffRole;
  category: StaffCategory;
  classification: StaffClassification;

  professionalTitle?: string;
  jobTitle?: string;

  specialties: ISpecialty[];

  contact: IStaffContact;
  emergencyContact?: IEmergencyContact;

  professionalRegistrations: IProfessionalRegistration[];
  qualifications: IQualification[];
  certifications: ICertification[];
  professionalExperience: IProfessionalExperience[];

  clinicalPrivileges: IClinicalPrivilege[];

  employment: IEmployment;

  trainingRecords: ITrainingRecord[];
  performanceRecords: IPerformanceRecord[];

  availability: IAvailability[];
  onCallAssignments: IOnCallAssignment[];

  leaveRecords: ILeaveRecord[];
  attendanceRecords: IAttendanceRecord[];

  incidents: IIncidentRecord[];
  communications: IStaffCommunication[];

  clinicalActivityCount: number;
  activePatientCaseload: number;

  status: StaffStatus;
  isActive: boolean;

  createdAt: ISODateString;
  updatedAt: ISODateString;
  consultationFee?: number;
}

/* =========================================================
 * CREATE STAFF DTO
 * ========================================================= */

export interface CreateStaffDTO {
  firstName: string;
  middleName?: string;
  lastName: string;

  title?: string;
  profilePhotoUrl?: string;
  dateOfBirth?: ISODateString;
  gender?: string;

  role: StaffRole;
  category?: StaffCategory;
  classification?: StaffClassification;

  professionalTitle?: string;
  jobTitle?: string;

  specialties?: ISpecialty[];

  contact?: IStaffContact;
  emergencyContact?: IEmergencyContact;

  professionalRegistrations?: IProfessionalRegistration[];
  qualifications?: IQualification[];
  certifications?: ICertification[];
  professionalExperience?: IProfessionalExperience[];

  clinicalPrivileges?: IClinicalPrivilege[];

  employment: IEmployment;

  trainingRecords?: ITrainingRecord[];
  performanceRecords?: IPerformanceRecord[];

  availability?: IAvailability[];
  onCallAssignments?: IOnCallAssignment[];

  leaveRecords?: ILeaveRecord[];
  attendanceRecords?: IAttendanceRecord[];

  incidents?: IIncidentRecord[];
  communications?: IStaffCommunication[];
  consultationFee?: number;
}

/* =========================================================
 * UPDATE STAFF DTO
 * ========================================================= */

/**
 * This mirrors the backend:
 *
 * type UpdateStaffDTO = Partial<
 *   Omit<
 *     IStaff,
 *     | 'hospitalId'
 *     | 'staffId'
 *     | 'createdAt'
 *     | 'updatedAt'
 *     | 'clinicalActivityCount'
 *     | 'activePatientCaseload'
 *   >
 * >;
 *
 * Therefore these fields cannot be updated:
 *
 * - hospitalId
 * - staffId
 * - createdAt
 * - updatedAt
 * - clinicalActivityCount
 * - activePatientCaseload
 */
export type UpdateStaffDTO = Partial<
  Omit<
    IStaff,
    | '_id'
    | 'hospitalId'
    | 'staffId'
    | 'createdAt'
    | 'updatedAt'
    | 'clinicalActivityCount'
    | 'activePatientCaseload'
  >
>;

/* =========================================================
 * STAFF LIST FILTERS
 * ========================================================= */

export interface StaffListFilters {
  role?: StaffRole;
  category?: StaffCategory;
  classification?: StaffClassification;
  departmentId?: string;
  unitId?: string;
  status?: StaffStatus;
  isActive?: boolean;
  search?: string;
}

/* =========================================================
 * DASHBOARD
 * ========================================================= */

export interface StaffDashboard {
  total: number;
  active: number;
  inactive: number;
  doctors: number;
  nurses: number;
  alliedHealth: number;
  consultants: number;
  residents: number;
  interns: number;
}

/* =========================================================
 * API RESPONSE
 * ========================================================= */

export interface StaffApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}