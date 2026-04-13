import type { Types } from 'mongoose';

export interface IAdmin {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'superadmin';
  department?: string;
  status: 'pending' | 'active';
  createdAt: Date;
  updatedAt: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lastLoginAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IStepStatus {
  status: 'pending' | 'in-progress' | 'awaiting-approval' | 'approved' | 'declined' | 'completed';
  completedAt?: Date;
  declineReason?: string;
  approvedBy?: string;
}

export interface IGpsLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface IVisit {
  _id: Types.ObjectId;
  technicianName: string;
  siteName: string;
  reason: string;
  department?: string;
  visitorType?: 'internal' | 'external';
  companyName?: string;
  contactEmail?: string;
  gpsLocation: IGpsLocation;
  currentStep: 'checkIn' | 'arrivalPhotos' | 'departurePhotos' | 'complete';
  steps: {
    checkIn: IStepStatus;
    arrivalPhotos: IStepStatus;
    departurePhotos: IStepStatus;
    complete: IStepStatus;
  };
  // Legacy fields — kept for backward compatibility
  installationTypes: string[];
  arrivalPhotos: Types.ObjectId[];
  departurePhotos: Types.ObjectId[];
  installationPhotos: Types.ObjectId[];
  comments: Types.ObjectId[];
  checkInTime: Date;
  checkOutTime?: Date;
  status: 'active' | 'awaiting-approval' | 'completed' | 'declined';
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPhoto {
  _id: Types.ObjectId;
  visit: Types.ObjectId;
  url: string;
  publicId: string;
  type:
    // New types
    | 'outdoor-arrival'
    | 'power-arrival'
    | 'rack-arrival'
    | 'outdoor-departure'
    | 'power-departure'
    | 'rack-departure'
    // Legacy types
    | 'arrival'
    | 'departure'
    | 'radio-installation'
    | 'poe-installation'
    | 'poe-uplink'
    | 'radio-installation-dep'
    | 'poe-installation-dep'
    | 'poe-uplink-dep';
  caption?: string;
  uploadedAt: Date;
}

export interface IComment {
  _id: Types.ObjectId;
  visit: Types.ObjectId;
  admin: Types.ObjectId;
  text: string;
  step: string;
  createdAt: Date;
}

export interface JwtPayload {
  id: string;
  role: string;
}
