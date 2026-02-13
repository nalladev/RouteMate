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
  let name = '';
  let age: number | null = null;
  let gender = '';
  let portraitImage = '';
  let address = '';

  if (sessionData?.id_verifications && sessionData.id_verifications.length > 0) {
    const idVerification = sessionData.id_verifications[0];

    if (idVerification.full_name) {
      name = idVerification.full_name;
    } else if (idVerification.first_name && idVerification.last_name) {
      name = `${idVerification.first_name} ${idVerification.last_name}`;
    } else if (idVerification.first_name) {
      name = idVerification.first_name;
    }

    if (typeof idVerification.age === 'number') {
      age = idVerification.age;
    }

    if (idVerification.gender) {
      gender = idVerification.gender;
    }

    if (idVerification.portrait_image) {
      portraitImage = idVerification.portrait_image;
    }

    if (idVerification.formatted_address) {
      address = idVerification.formatted_address;
    } else if (idVerification.address) {
      address = idVerification.address;
    }
  }

  if (!name && sessionData?.expected_details) {
    if (sessionData.expected_details.first_name && sessionData.expected_details.last_name) {
      name = `${sessionData.expected_details.first_name} ${sessionData.expected_details.last_name}`;
    }
  }

  return { name, age, gender, address, portraitImage };
}
