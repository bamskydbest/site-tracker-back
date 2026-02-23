import type { Types } from 'mongoose';

export interface IAdmin {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'superadmin';
  createdAt: Date;
  updatedAt: Date;
}

export interface IStepStatus {
  status: 'pending' | 'in-progress' | 'awaiting-approval' | 'approved' | 'declined' | 'completed';
  completedAt?: Date;
  declineReason?: string;
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
  gpsLocation: IGpsLocation;
  currentStep: 'checkIn' | 'arrivalPhotos' | 'departurePhotos' | 'complete';
  steps: {
    checkIn: IStepStatus;
    arrivalPhotos: IStepStatus;
    departurePhotos: IStepStatus;
    complete: IStepStatus;
  };
  arrivalPhotos: Types.ObjectId[];
  departurePhotos: Types.ObjectId[];
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
  type: 'arrival' | 'departure';
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
