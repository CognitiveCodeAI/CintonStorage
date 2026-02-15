import { z } from 'zod';
import {
  VehicleCaseStatus,
  TowReason,
  VehicleType,
  VehicleClass,
  AgencyType,
} from './types';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Vehicle Case schemas
export const createVehicleCaseSchema = z.object({
  // Step 1: Tow Request
  towingAgencyId: z.string().uuid().optional(),
  towDate: z.coerce.date(),
  towReason: z.nativeEnum(TowReason),
  towLocation: z.string().min(1, 'Tow location is required'),
  policeHold: z.boolean().default(false),
  policeCaseNumber: z.string().optional(),
  holdExpiresAt: z.coerce.date().optional(),

  // Step 2: Vehicle Details
  vin: z.string().length(17).optional().or(z.literal('')),
  plateNumber: z.string().optional(),
  plateState: z.string().length(2).optional(),
  year: z.coerce.number().min(1900).max(2100).optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  vehicleType: z.nativeEnum(VehicleType).default(VehicleType.SEDAN),
  vehicleClass: z.nativeEnum(VehicleClass).default(VehicleClass.STANDARD),
  ownerFirstName: z.string().optional(),
  ownerLastName: z.string().optional(),
  ownerAddress: z.string().optional(),
  ownerCity: z.string().optional(),
  ownerState: z.string().max(2).optional(),
  ownerZip: z.string().optional(),
  ownerPhone: z.string().optional(),
});

export type CreateVehicleCaseInput = z.infer<typeof createVehicleCaseSchema>;

export const completeIntakeSchema = z.object({
  caseId: z.string().uuid(),
  yardLocation: z.string().min(1, 'Yard location is required'),
  notes: z.string().optional(),
});

export type CompleteIntakeInput = z.infer<typeof completeIntakeSchema>;

export const searchCasesSchema = z.object({
  query: z.string().optional(),
  status: z.nativeEnum(VehicleCaseStatus).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type SearchCasesInput = z.infer<typeof searchCasesSchema>;

// Agency schemas
export const agencySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  agencyType: z.nativeEnum(AgencyType),
  contactEmail: z.string().email(),
});
