import { getAuthToken, validateSession } from '../../middleware';
import { addDocument, getDocument, getDocumentById } from '../../firestore';
import { generateOTP } from '../../auth';
import { User } from '../../../types';
import { areUsersInCommunity } from '../../community';
import { calculateFare, formatCurrency } from '../../../config/fare';

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



export async function handleRequest(request: Request) {
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

    // Prevent self-referential connections
    if (driverId === user.Id) {
      return Response.json(
        { error: 'You cannot request a ride from yourself' },
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
        { error: `Insufficient balance. Required: ${formatCurrency(fare)}, Available: ${formatCurrency(balance)}` },
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

    if (!driver.VehicleType) {
      return Response.json(
        { error: 'Driver has not configured a vehicle type yet' },
        { status: 400 }
      );
    }

    let communityId: string | null = null;
    const passengerCommunityId = currentUser.ActiveCommunityId || null;
    const driverCommunityId = driver.ActiveCommunityId || null;

    if (passengerCommunityId && driverCommunityId && passengerCommunityId !== driverCommunityId) {
      return Response.json(
        { error: 'Driver is not available in your active community mode' },
        { status: 403 }
      );
    }

    if (passengerCommunityId || driverCommunityId) {
      communityId = passengerCommunityId || driverCommunityId;
      const bothMembers = await areUsersInCommunity(communityId!, [currentUser.Id, driver.Id]);
      if (!bothMembers) {
        return Response.json(
          { error: 'Both passenger and driver must be members of the selected community' },
          { status: 403 }
        );
      }
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
      RequestedVehicleType: driver.VehicleType,
      RequestedVehicleName: driver.VehicleName,
      RequestedVehicleModel: driver.VehicleModel,
      RequestedVehicleRegistration: driver.VehicleRegistration,
      CommunityId: communityId,
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

export default function Handler() { return null; }
