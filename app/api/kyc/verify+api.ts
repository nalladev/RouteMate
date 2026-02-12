import { getAuthToken, validateSession } from '../../../lib/middleware';
import { updateDocument } from '../../../lib/firestore';

async function verifySessionWithDidit(sessionId: string): Promise<{ verified: boolean; data?: any }> {
  const diditApiKey = process.env.DIDIT_API_KEY;
  if (!diditApiKey) {
    throw new Error('DIDIT_API_KEY is not set');
  }

  try {
    // Get session details from Didit API
    const response = await fetch(`https://verification.didit.me/v3/session/${sessionId}`, {
      method: 'GET',
      headers: {
        'x-api-key': diditApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Didit API error:', response.status, errorData);
      return { verified: false };
    }

    const result = await response.json();
    
    // Check if session is approved
    const isApproved = result.status === 'Approved' || result.status === 'approved';
    
    return {
      verified: isApproved,
      data: result,
    };
  } catch (error) {
    console.error('Didit verification error:', error);
    return { verified: false };
  }
}

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await validateSession(token);

    if (!user) {
      return Response.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId, status } = body;

    if (!sessionId) {
      return Response.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify the session with Didit
    const verificationResult = await verifySessionWithDidit(sessionId);

    if (!verificationResult.verified) {
      return Response.json(
        { error: 'KYC verification failed or session not approved' },
        { status: 400 }
      );
    }

    // Extract user data from verification result
    const kycData = verificationResult.data;
    
    // Log the KYC data structure to understand what Didit returns
    console.log('Didit KYC data structure:', JSON.stringify(kycData, null, 2));
    
    // Extract important data from Didit response - based on actual API structure
    // Only storing: name, age, gender, address, portrait image, session ID
    let name = '';
    let age: number | null = null;
    let gender = '';
    let portraitImage = '';
    let address = '';
    
    // Extract from ID verification (most reliable source)
    if (kycData?.id_verifications && kycData.id_verifications.length > 0) {
      const idVerification = kycData.id_verifications[0];
      
      // Name
      if (idVerification.full_name) {
        name = idVerification.full_name;
      } else if (idVerification.first_name && idVerification.last_name) {
        name = `${idVerification.first_name} ${idVerification.last_name}`;
      } else if (idVerification.first_name) {
        name = idVerification.first_name;
      }
      
      // Age (important for driver eligibility - must be 18+)
      if (idVerification.age) {
        age = idVerification.age;
      }
      
      // Gender
      if (idVerification.gender) {
        gender = idVerification.gender;
      }
      
      // Portrait image (can be used as profile photo)
      if (idVerification.portrait_image) {
        portraitImage = idVerification.portrait_image;
      }
      
      // Address
      if (idVerification.formatted_address) {
        address = idVerification.formatted_address;
      } else if (idVerification.address) {
        address = idVerification.address;
      }
    }
    
    // Fallback to expected details if ID verification is not present
    if (!name && kycData?.expected_details) {
      if (kycData.expected_details.first_name && kycData.expected_details.last_name) {
        name = `${kycData.expected_details.first_name} ${kycData.expected_details.last_name}`;
      }
    }

    console.log('Extracted KYC data:', { name, age, gender, address, portraitImage: !!portraitImage });

    // Update user document with KYC data and extracted information
    const updateData: any = {
      KycData: {
        sessionId,
        status,
        verifiedAt: new Date().toISOString(),
        age,
        gender,
        portraitImage,
        address,
      },
      IsKycVerified: true,
    };

    // Update name if we extracted one
    if (name) {
      updateData.Name = name;
    }

    await updateDocument('users', user.Id, updateData);

    return Response.json({
      success: true,
      verified: true,
    });
  } catch (error) {
    console.error('KYC verification error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}