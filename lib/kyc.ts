export type KycStatus =
  | 'not_started'
  | 'session_created'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'failed';

export interface ExtractedKycProfile {
  name: string;
  age: number | null;
  gender: string;
  address: string;
  portraitImage: string;
}

export function hasKycProfileData(sessionData: any): boolean {
  const decision = sessionData?.decision || sessionData;
  return !!(decision?.id_verifications && decision.id_verifications.length > 0);
}

export function normalizeDiditStatus(status: string | null | undefined): KycStatus {
  const normalized = (status || '').toString().trim().toLowerCase().replace(/\s+/g, '_');

  if (!normalized) return 'submitted';

  if (['approved', 'verified', 'completed'].includes(normalized)) return 'approved';
  if (['rejected', 'declined', 'failed', 'denied'].includes(normalized)) return 'rejected';
  if (['under_review', 'manual_review', 'in_review', 'review'].includes(normalized)) return 'under_review';
  if (['pending', 'processing', 'in_progress', 'created', 'session_created'].includes(normalized)) {
    return 'submitted';
  }

  return 'submitted';
}

export function isApprovedKycStatus(status: KycStatus): boolean {
  return status === 'approved';
}

export function extractKycProfile(sessionData: any): ExtractedKycProfile | null {
  // Handle webhook format (decision wrapper) or direct session format
  const decision = sessionData?.decision || sessionData;
  
  // Silently return null if id_verifications not available
  if (!decision?.id_verifications || decision.id_verifications.length === 0) {
    return null;
  }

  const idVerification = decision.id_verifications[0];

  // Extract name
  let name = '';
  if (idVerification.full_name) {
    name = idVerification.full_name;
  } else if (idVerification.first_name && idVerification.last_name) {
    name = `${idVerification.first_name} ${idVerification.last_name}`;
  } else if (idVerification.first_name) {
    name = idVerification.first_name;
  } else {
    return null;
  }

  // Normalize all-caps names
  if (name === name.toUpperCase()) {
    name = name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Extract age
  let age: number | null = null;
  if (typeof idVerification.age === 'number') {
    age = idVerification.age;
  } else {
    return null;
  }

  // Extract gender
  if (!idVerification.gender) {
    return null;
  }
  const gender = idVerification.gender;

  // Extract portrait image
  if (!idVerification.portrait_image) {
    return null;
  }
  const portraitImage = idVerification.portrait_image;

  // Extract address
  let address = '';
  if (idVerification.formatted_address) {
    address = idVerification.formatted_address;
  } else if (idVerification.address) {
    address = idVerification.address;
  } else {
    return null;
  }

  return { name, age, gender, address, portraitImage };
}