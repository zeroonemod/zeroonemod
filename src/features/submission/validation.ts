import type { FormErrors, WizardForm } from '@/features/submission/types';

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[+0-9 ()-]{6,30}$/;

function requireText(errors: FormErrors, key: keyof WizardForm, value: string, message: string, max = 80) {
  if (!value.trim()) errors[key] = message;
  else if (value.trim().length > max) errors[key] = `Please keep this under ${max} characters.`;
}

function validateFileType(form: WizardForm, hasFiles: boolean, errors: FormErrors) {
  if (!form.fileType) errors.fileType = 'Choose ECU or TCU.';
  if (!hasFiles) errors.files = 'Upload at least one original file.';
}

function validateService(form: WizardForm, errors: FormErrors) {
  if (!form.requestedService) errors.requestedService = 'Choose the service you need.';
  if (form.serviceComments.length > 1000) errors.serviceComments = 'Please keep comments under 1000 characters.';
}

function validateVehicle(form: WizardForm, errors: FormErrors) {
  requireText(errors, 'make', form.make, 'Enter the vehicle make.', 60);
  requireText(errors, 'model', form.model, 'Enter the vehicle model.', 60);
  requireText(errors, 'engine', form.engine, 'Enter the engine code or description.', 80);
  if (!form.fuelType) errors.fuelType = 'Choose the fuel type.';

  const year = Number(form.year);
  const currentYear = new Date().getFullYear();
  if (!form.year.trim()) errors.year = 'Enter the model year.';
  else if (!Number.isInteger(year) || year < 1950 || year > currentYear + 1) {
    errors.year = `Enter a year between 1950 and ${currentYear + 1}.`;
  }

  if (!form.vin.trim()) errors.vin = 'Enter the 17-character VIN.';
  else if (!VIN_PATTERN.test(form.vin.trim())) {
    errors.vin = 'A VIN has 17 letters or numbers (no I, O or Q).';
  }
}

function validateVehicleExtras(form: WizardForm, errors: FormErrors) {
  const power = form.power.trim().replace(',', '.');
  if (!power) errors.power = 'Enter the engine power.';
  else if (!(Number(power) > 0 && Number(power) <= 3000)) errors.power = 'Enter the power as a number, for example 150.';
  const torque = form.torque.trim();
  if (!torque) errors.torque = 'Enter the torque in Nm.';
  else if (!(/^\d+$/.test(torque) && Number(torque) > 0 && Number(torque) <= 5000)) errors.torque = 'Enter the torque in Nm, for example 340.';
  if (!form.gearboxType) errors.gearboxType = 'Choose the gearbox type.';
  if (!form.previouslyModified) errors.previouslyModified = 'Tell us whether the file was modified before.';
}

function validateEcu(form: WizardForm, errors: FormErrors) {
  if (form.manufacturer.trim().length > 80) errors.manufacturer = 'Please keep this under 80 characters.';
  if (form.hardwareNumber.trim().length > 80) errors.hardwareNumber = 'Please keep this under 80 characters.';
  if (form.softwareNumber.trim().length > 80) errors.softwareNumber = 'Please keep this under 80 characters.';
  if (form.identificationNumbers.length > 300) {
    errors.identificationNumbers = 'Please keep this under 300 characters.';
  }
}

function validateAbout(form: WizardForm, errors: FormErrors) {
  requireText(errors, 'firstName', form.firstName, 'Enter your first name.');
  requireText(errors, 'lastName', form.lastName, 'Enter your last name.');
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  requireText(errors, 'country', form.country, 'Enter your country.');
  if (!form.customerType) errors.customerType = 'Choose individual or workshop.';
  if (form.customerType === 'workshop') {
    requireText(errors, 'companyName', form.companyName, 'Enter your company name.', 120);
  }
  if (form.phone.trim() && !PHONE_PATTERN.test(form.phone.trim())) {
    errors.phone = 'Enter a valid phone number.';
  }
}

/** International numbers with an optional leading +, 6 to 15 digits. */
export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  return /^\+?[0-9][0-9 ().-]*[0-9]$/.test(trimmed) && digits.length >= 6 && digits.length <= 15;
}

/** Guests: at least one of email or phone, each checked only when filled in. */
function validateGuestContact(form: WizardForm, errors: FormErrors) {
  const email = form.email.trim();
  const phone = form.phone.trim();
  if (!email && !phone) errors.contact = 'Please enter an email or a phone number so we can contact you.';
  if (email && !EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.';
  if (phone && !isValidPhone(phone)) errors.phone = 'Enter a valid phone number, for example +34 600 000 000.';
}

/** New accounts (not signed in, not a guest) must choose a password. */
function validatePassword(form: WizardForm, errors: FormErrors) {
  if (!form.password) errors.password = 'Create a password for your account.';
  else if (form.password.length < 8 || form.password.length > 72) errors.password = 'Use between 8 and 72 characters.';
  if (form.password && form.passwordConfirm !== form.password) errors.passwordConfirm = 'The passwords do not match.';
}

function validateReview(form: WizardForm, errors: FormErrors) {
  if (!form.privacyConsent) errors.privacyConsent = 'You must accept the privacy terms to submit.';
}

/** guest: contact only. new_account: details and a password. signed_in: details from the profile. */
export type SubmitMode = 'guest' | 'new_account' | 'signed_in';

export function validateStep(step: number, form: WizardForm, hasFiles: boolean, mode: SubmitMode): FormErrors {
  const errors: FormErrors = {};
  switch (step) {
    case 0:
      validateFileType(form, hasFiles, errors);
      validateService(form, errors);
      break;
    case 1:
      validateVehicle(form, errors);
      validateVehicleExtras(form, errors);
      validateEcu(form, errors);
      break;
    case 2:
      if (mode === 'guest') validateGuestContact(form, errors);
      else validateAbout(form, errors);
      if (mode === 'new_account') validatePassword(form, errors);
      validateReview(form, errors);
      break;
  }
  return errors;
}

export function validateAllSteps(form: WizardForm, hasFiles: boolean, mode: SubmitMode): FormErrors {
  return Object.assign({}, ...[0, 1, 2].map((step) => validateStep(step, form, hasFiles, mode)));
}
