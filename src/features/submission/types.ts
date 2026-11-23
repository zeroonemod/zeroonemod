export type FileType = 'ECU' | 'TCU';
export type RequestedService =
  | 'stage1_calibration'
  | 'original_restoration'
  | 'decoding'
  | 'other_modification'
  | 'not_sure';
export type CustomerType = 'individual' | 'workshop';

export const SERVICE_OPTIONS: { value: RequestedService; label: string; description: string }[] = [
  { value: 'stage1_calibration', label: 'Stage 1 calibration', description: 'Performance calibration for supported files.' },
  { value: 'original_restoration', label: 'Original file restoration', description: 'Restore a clean original from your backup.' },
  { value: 'decoding', label: 'Decoding (DPF, AdBlue, etc.)', description: 'Supported decodings for compatible files.' },
  { value: 'other_modification', label: 'Other supported modification', description: 'Any other modification we currently offer.' },
  { value: 'not_sure', label: 'Not sure', description: 'We will recommend the right service after review.' },
];

export const FUEL_OPTIONS = ['Petrol', 'Diesel', 'Hybrid', 'Other'] as const;

export type GearboxType = 'manual' | 'automatic' | 'dual_clutch' | 'cvt' | 'other';

export const GEARBOX_OPTIONS: { value: GearboxType; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'dual_clutch', label: 'Dual-clutch (DSG/DCT)' },
  { value: 'cvt', label: 'CVT' },
  { value: 'other', label: 'Other' },
];

export const POWER_UNITS = ['HP', 'kW'] as const;
export type PowerUnit = (typeof POWER_UNITS)[number];

export const CUSTOMER_TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'workshop', label: 'Workshop / Service' },
];

export interface WizardForm {
  fileType: FileType | '';
  requestedService: RequestedService | '';
  serviceComments: string;
  make: string;
  model: string;
  year: string;
  engine: string;
  fuelType: string;
  vin: string;
  power: string;
  powerUnit: PowerUnit;
  torque: string;
  gearboxType: GearboxType | '';
  previouslyModified: 'yes' | 'no' | '';
  manufacturer: string;
  hardwareNumber: string;
  softwareNumber: string;
  identificationNumbers: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  customerType: CustomerType | '';
  companyName: string;
  phone: string;
  privacyConsent: boolean;
  password: string;
  website: string;
}

export type FormErrors = Partial<Record<keyof WizardForm | 'files' | 'photos' | 'contact', string>>;

export const INITIAL_FORM: WizardForm = {
  fileType: '',
  requestedService: '',
  serviceComments: '',
  make: '',
  model: '',
  year: '',
  engine: '',
  fuelType: '',
  vin: '',
  power: '',
  powerUnit: 'HP',
  torque: '',
  gearboxType: '',
  previouslyModified: '',
  manufacturer: '',
  hardwareNumber: '',
  softwareNumber: '',
  identificationNumbers: '',
  firstName: '',
  lastName: '',
  email: '',
  country: '',
  customerType: '',
  companyName: '',
  phone: '',
  privacyConsent: false,
  password: '',
  website: '',
};

export interface StepProps {
  form: WizardForm;
  errors: FormErrors;
  update: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
}

export const WIZARD_STEPS = ['Your file', 'Vehicle and ECU', 'About you and confirm'] as const;
/** Guests leave contact details instead of creating an account in step 3. */
export const GUEST_WIZARD_STEPS = ['Your file', 'Vehicle and ECU', 'Contact and confirm'] as const;
