import { getAuthToken, validateSession } from '../../middleware';
import { getAllDocuments, getDocument, getDocumentById } from '../../firestore';
import { User, MarkerData } from '../../../types';
import { getCommunityMemberSet } from '../../community';

const ROUTE_CORRIDOR_KM = 3.5;
const PICKUP_PROXIMITY_KM = 5;
const DESTINATION_PROXIMITY_KM = 5;

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

function isPointNearRoute(
  pointLat: number,
  pointLng: number,
  routeStartLat: number,
  routeStartLng: number,
  routeEndLat: number,
  routeEndLng: number,
  thresholdKm: number = 2
): boolean {
  // Calculate distance from point to line segment
  const A = pointLat - routeStartLat;
  const B = pointLng - routeStartLng;
  const C = routeEndLat - routeStartLat;
  const D = routeEndLng - routeStartLng;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = routeStartLat;
    yy = routeStartLng;
  } else if (param > 1) {
    xx = routeEndLat;
    yy = routeEndLng;
  } else {
    xx = routeStartLat + param * C;
    yy = routeStartLng + param * D;
  }

  const distance = calculateDistance(pointLat, pointLng, xx, yy);
  return distance <= thresholdKm;
}

async function getFilteredDrivers(
  passengerPickup: { lat: number; lng: number },
  passengerDestination: { lat: number; lng: number },
  currentUserId: string,
  memberSet?: Set<string> | null
): Promise<MarkerData[]> {
  const allUsers = await getAllDocuments('users');
  const drivers = allUsers.filter((u: User) => {
    // Exclude current user
    if (u.Id === currentUserId) {
      return false;
    }

    if (u.state !== 'driving' || !u.Destination) {
      return false;
    }

    if (memberSet && !memberSet.has(u.Id)) {
      return false;
    }

    return true;
  });

  const filteredDrivers: MarkerData[] = [];

  for (const driver of drivers) {
    if (!driver.LastLocation || !driver.Destination) continue;

    // Flexible matching:
    // 1) near the route corridor OR
    // 2) close to driver's current position / destination endpoints.
    const pickupNearRoute = isPointNearRoute(
      passengerPickup.lat,
      passengerPickup.lng,
      driver.LastLocation.lat,
      driver.LastLocation.lng,
      driver.Destination.lat,
      driver.Destination.lng,
      ROUTE_CORRIDOR_KM
    );

    const destinationNearRoute = isPointNearRoute(
      passengerDestination.lat,
      passengerDestination.lng,
      driver.LastLocation.lat,
      driver.LastLocation.lng,
      driver.Destination.lat,
      driver.Destination.lng,
      ROUTE_CORRIDOR_KM
    );

    const pickupNearDriver = calculateDistance(
      passengerPickup.lat,
      passengerPickup.lng,
      driver.LastLocation.lat,
      driver.LastLocation.lng
    ) <= PICKUP_PROXIMITY_KM;

    const destinationNearDriverDestination = calculateDistance(
      passengerDestination.lat,
      passengerDestination.lng,
      driver.Destination.lat,
      driver.Destination.lng
    ) <= DESTINATION_PROXIMITY_KM;

    const pickupCompatible = pickupNearRoute || pickupNearDriver;
    const destinationCompatible = destinationNearRoute || destinationNearDriverDestination;

    if (pickupCompatible && destinationCompatible) {
      filteredDrivers.push({
        userId: driver.Id,
        name: driver.Name || 'Driver',
        rating: driver.DriverRatingAverage || 0,
        vehicle: driver.VehicleType || 'Not specified',
        vehicleName: driver.VehicleName,
        vehicleModel: driver.VehicleModel,
        vehicleRegistration: driver.VehicleRegistration,
        profilePictureUrl: driver.ProfilePictureUrl,
        lastLocation: driver.LastLocation,
        destination: driver.Destination,
      });
    }
  }

  return filteredDrivers;
}

async function getFilteredPassengers(
  driverId: string,
  activeCommunityId: string | null,
  memberSet?: Set<string> | null
): Promise<MarkerData[]> {
  const connections = await getDocument('rideconnections', { DriverId: driverId });
  const activeConnections = connections.filter(
    (c: any) => {
      if (c.State === 'completed' || c.State === 'rejected') {
        return false;
      }

      if (activeCommunityId && c.CommunityId !== activeCommunityId) {
        return false;
      }

      return true;
    }
  );

  const passengers: MarkerData[] = [];

  for (const connection of activeConnections) {
    if (memberSet && !memberSet.has(connection.PassengerId)) {
      continue;
    }

    const passenger = await getDocumentById('users', connection.PassengerId);
    if (!passenger) continue;
    if (!passenger.LastLocation) continue;

    passengers.push({
      userId: passenger.Id,
      name: passenger.Name || 'Passenger',
      profilePictureUrl: passenger.ProfilePictureUrl,
      lastLocation: passenger.LastLocation,
      destination: connection.Destination,
    });
  }

  return passengers;
}

export async function handleMarkers(request: Request) {
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

    const url = new URL(request.url);
    const role = url.searchParams.get('role');
    const lat = parseFloat(url.searchParams.get('lat') || '');
    const lng = parseFloat(url.searchParams.get('lng') || '');

    if (!role || !['driver', 'passenger'].includes(role)) {
      return Response.json(
        { error: 'Invalid role. Must be driver or passenger' },
        { status: 400 }
      );
    }

    if (isNaN(lat) || isNaN(lng)) {
      return Response.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    let markers: MarkerData[] = [];
    const activeCommunityId = user.ActiveCommunityId || null;
    const memberSet = activeCommunityId ? await getCommunityMemberSet(activeCommunityId) : null;

    if (activeCommunityId && !memberSet) {
      return Response.json({ markers: [] });
    }

    if (role === 'passenger') {
      if (!user.Destination) {
        return Response.json({ markers: [] });
      }
      markers = await getFilteredDrivers({ lat, lng }, user.Destination, user.Id, memberSet);
    } else if (role === 'driver') {
      markers = await getFilteredPassengers(user.Id, activeCommunityId, memberSet);
    }

    return Response.json({ markers });
  } catch (error) {
    console.error('Get markers error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}