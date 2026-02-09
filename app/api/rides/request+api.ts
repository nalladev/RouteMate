import { getAuthToken, validateSession } from '../../../lib/middleware';
import { addDocument, getDocument, getDocumentById } from '../../../lib/firestore';
import { generateOTP } from '../../../lib/auth';
import { User } from '../../../types';

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateFare(distance: number): number {
  const baseRate = 2; // $2 base
  const perKm = 1.5; // $1.5 per km
  return baseRate + (distance * perKm);
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
    const { driverId, pickupLocation, destination } = body;

    if (!driverId || !pickupLocation || !destination) {
      return Response.json(
        { error: 'driverId, pickupLocation, and destination are required' },
        { status: 400 }
      );
    }

    // Calculate estimated fare first
    const distance = calculateDistance(
      pickupLocation.lat,
      pickupLocation.lng,
      destination.lat,
      destination.lng
    );

    const fare = calculateFare(distance);

    // Get current user with balance
    const currentUser = await getDocumentById('users', user.Id) as User;
    const balance = currentUser.WalletBalance || 0;
    
    // Check if balance is sufficient for the fare
    if (balance < fare) {
      return Response.json(
        { error: `Insufficient balance. Required: ₹${fare.toFixed(2)}, Available: ₹${balance.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Check for existing active requests
    const existingRequests = await getDocument('rideconnections', { PassengerId: user.Id });
    const activeRequest = existingRequests.find((r: any) => 
      r.State !== 'completed' && r.State !== 'rejected'
    );

    if (activeRequest) {
      return Response.json(
        { error: 'You already have an active ride request' },
        { status: 400 }
      );
    }

    // Verify driver exists
    const driver = await getDocumentById('users', driverId);
    if (!driver) {
      return Response.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }


    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const requestId = await addDocument('rideconnections', {
      PassengerId: user.Id,
      DriverId: driverId,
      PickupLocation: pickupLocation,
      Destination: destination,
      Distance: distance,
      Fare: fare,
      OtpCode: otpCode,
      State: 'requested',
      PaymentStatus: 'pending',
      CreatedAt: new Date(),
      ExpiresAt: expiresAt,
    });

    return Response.json({
      requestId,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Request ride error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}