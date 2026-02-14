import { getAuthToken, validateSession } from '../../../lib/middleware';
import { getAllDocuments, getDocument } from '../../../lib/firestore';
import { User, MarkerData } from '../../../types';

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
  passengerDestination: { lat: number; lng: number }
): Promise<MarkerData[]> {
  const allUsers = await getAllDocuments('users');
  const drivers = allUsers.filter((u: User) => u.state === 'driving' && u.Destination);

  const filteredDrivers: MarkerData[] = [];

  for (const driver of drivers) {
    if (!driver.LastLocation || !driver.Destination) continue;

    // Check if passenger pickup and destination are near driver's route
    const pickupNearRoute = isPointNearRoute(
      passengerPickup.lat,
      passengerPickup.lng,
      driver.LastLocation.lat,
      driver.LastLocation.lng,
      driver.Destination.lat,
      driver.Destination.lng
    );

    const destinationNearRoute = isPointNearRoute(
      passengerDestination.lat,
      passengerDestination.lng,
      driver.LastLocation.lat,
      driver.LastLocation.lng,
      driver.Destination.lat,
      driver.Destination.lng
    );

    if (pickupNearRoute && destinationNearRoute) {
      filteredDrivers.push({
        userId: driver.Id,
        name: driver.Name || 'Driver',
        rating: driver.DriverRatingAverage || 0,
        vehicle: 'Sedan',
        lastLocation: driver.LastLocation,
        destination: driver.Destination,
      });
    }
  }

  return filteredDrivers;
}

async function getFilteredPassengers(driverId: string): Promise<MarkerData[]> {
  const connections = await getDocument('rideconnections', { DriverId: driverId });
  const activeConnections = connections.filter(
    (c: any) => c.State !== 'completed' && c.State !== 'rejected'
  );

  const passengers: MarkerData[] = [];

  for (const connection of activeConnections) {
    const passengerDocs = await getDocument('users', { Id: connection.PassengerId });
    if (passengerDocs.length === 0) continue;

    const passenger = passengerDocs[0];
    if (!passenger.LastLocation) continue;

    passengers.push({
      userId: passenger.Id,
      name: passenger.Name || 'Passenger',
      lastLocation: passenger.LastLocation,
      destination: connection.Destination,
    });
  }

  return passengers;
}

export async function GET(request: Request) {
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

    if (role === 'passenger') {
      if (!user.Destination) {
        return Response.json({ markers: [] });
      }
      markers = await getFilteredDrivers({ lat, lng }, user.Destination);
    } else if (role === 'driver') {
      markers = await getFilteredPassengers(user.Id);
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
