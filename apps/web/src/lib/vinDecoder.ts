// NHTSA VIN Decoder API
// Free API - no key required
// https://vpic.nhtsa.dot.gov/api/

const NHTSA_API = 'https://vpic.nhtsa.dot.gov/api/vehicles/decodevin';

export interface VINDecodeResult {
  year: string | null;
  make: string | null;
  model: string | null;
  vehicleType: string | null;
  bodyClass: string | null;
  driveType: string | null;
  fuelType: string | null;
  engineCylinders: string | null;
  engineDisplacement: string | null;
  transmissionStyle: string | null;
  plantCountry: string | null;
  errorCode: string | null;
  errorText: string | null;
}

interface NHTSAResult {
  Variable: string;
  Value: string | null;
  ValueId: string | null;
  VariableId: number;
}

interface NHTSAResponse {
  Count: number;
  Message: string;
  SearchCriteria: string;
  Results: NHTSAResult[];
}

const variableMap: Record<string, keyof VINDecodeResult> = {
  'Model Year': 'year',
  'Make': 'make',
  'Model': 'model',
  'Vehicle Type': 'vehicleType',
  'Body Class': 'bodyClass',
  'Drive Type': 'driveType',
  'Fuel Type - Primary': 'fuelType',
  'Engine Number of Cylinders': 'engineCylinders',
  'Displacement (L)': 'engineDisplacement',
  'Transmission Style': 'transmissionStyle',
  'Plant Country': 'plantCountry',
  'Error Code': 'errorCode',
  'Error Text': 'errorText',
};

export async function decodeVIN(vin: string): Promise<VINDecodeResult> {
  // Basic VIN validation
  if (!vin || vin.length !== 17) {
    return {
      year: null,
      make: null,
      model: null,
      vehicleType: null,
      bodyClass: null,
      driveType: null,
      fuelType: null,
      engineCylinders: null,
      engineDisplacement: null,
      transmissionStyle: null,
      plantCountry: null,
      errorCode: '1',
      errorText: 'VIN must be exactly 17 characters',
    };
  }

  try {
    const response = await fetch(`${NHTSA_API}/${vin}?format=json`);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data: NHTSAResponse = await response.json();

    const result: VINDecodeResult = {
      year: null,
      make: null,
      model: null,
      vehicleType: null,
      bodyClass: null,
      driveType: null,
      fuelType: null,
      engineCylinders: null,
      engineDisplacement: null,
      transmissionStyle: null,
      plantCountry: null,
      errorCode: null,
      errorText: null,
    };

    // Map results to our structure
    for (const item of data.Results) {
      const key = variableMap[item.Variable];
      if (key && item.Value) {
        result[key] = item.Value;
      }
    }

    return result;
  } catch (error) {
    console.error('VIN decode error:', error);
    return {
      year: null,
      make: null,
      model: null,
      vehicleType: null,
      bodyClass: null,
      driveType: null,
      fuelType: null,
      engineCylinders: null,
      engineDisplacement: null,
      transmissionStyle: null,
      plantCountry: null,
      errorCode: '99',
      errorText: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Validate VIN format (basic check)
export function isValidVINFormat(vin: string): boolean {
  if (!vin || vin.length !== 17) return false;

  // VINs cannot contain I, O, or Q
  if (/[IOQ]/i.test(vin)) return false;

  // Must be alphanumeric
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) return false;

  return true;
}

// Map NHTSA vehicle type to our VehicleType enum
export function mapVehicleType(nhtsaType: string | null): string {
  if (!nhtsaType) return 'SEDAN';

  const typeMap: Record<string, string> = {
    'PASSENGER CAR': 'SEDAN',
    'MULTIPURPOSE PASSENGER VEHICLE (MPV)': 'SUV',
    'TRUCK': 'TRUCK',
    'VAN': 'VAN',
    'MOTORCYCLE': 'MOTORCYCLE',
    'TRAILER': 'TRAILER',
    'BUS': 'COMMERCIAL',
    'LOW SPEED VEHICLE (LSV)': 'OTHER',
  };

  const upperType = nhtsaType.toUpperCase();
  return typeMap[upperType] || 'OTHER';
}
