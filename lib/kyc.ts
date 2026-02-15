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

export function extractKycProfile(sessionData: any): ExtractedKycProfile {
  // Handle webhook format (decision wrapper) or direct session format
  const decision = sessionData?.decision || sessionData;
  
  if (!decision?.id_verifications || decision.id_verifications.length === 0) {
    console.error('KYC extraction error: Missing id_verifications array', { 
      hasDecision: !!decision,
      hasIdVerifications: !!decision?.id_verifications,
      idVerificationsLength: decision?.id_verifications?.length,
      availableKeys: decision ? Object.keys(decision) : []
    });
    throw new Error('Missing id_verifications in KYC response');
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
    console.error('KYC extraction error: Missing name fields', {
      hasFull_name: !!idVerification.full_name,
      hasFirst_name: !!idVerification.first_name,
      hasLast_name: !!idVerification.last_name,
      availableFields: Object.keys(idVerification)
    });
    throw new Error('Missing name in id_verification (full_name, first_name, or last_name)');
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
    console.error('KYC extraction error: Missing or invalid age field', {
      age: idVerification.age,
      ageType: typeof idVerification.age,
      availableFields: Object.keys(idVerification)
    });
    throw new Error('Missing or invalid age in id_verification');
  }

  // Extract gender
  if (!idVerification.gender) {
    console.error('KYC extraction error: Missing gender field', {
      gender: idVerification.gender,
      availableFields: Object.keys(idVerification)
    });
    throw new Error('Missing gender in id_verification');
  }
  const gender = idVerification.gender;

  // Extract portrait image
  if (!idVerification.portrait_image) {
    console.error('KYC extraction error: Missing portrait_image field', {
      portrait_image: idVerification.portrait_image,
      availableFields: Object.keys(idVerification)
    });
    throw new Error('Missing portrait_image in id_verification');
  }
  const portraitImage = idVerification.portrait_image;

  // Extract address
  let address = '';
  if (idVerification.formatted_address) {
    address = idVerification.formatted_address;
  } else if (idVerification.address) {
    address = idVerification.address;
  } else {
    console.error('KYC extraction error: Missing address fields', {
      hasFormatted_address: !!idVerification.formatted_address,
      hasAddress: !!idVerification.address,
      availableFields: Object.keys(idVerification)
    });
    throw new Error('Missing address in id_verification (formatted_address or address)');
  }

  return { name, age, gender, address, portraitImage };
}
