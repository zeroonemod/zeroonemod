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

export type FormErrors = Partial<Record<keyof WizardForm | 'files', string>>;

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
