import { getDocument, getDocumentById } from '../../firestore';
import { RideConnection, User } from '../../../types';

function serializeDate(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  return null;
}

export async function handleShareDetails(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return Response.json(
      { error: 'token is required' },
      { status: 400 }
    );
  }

  const matches = await getDocument('rideconnections', { ShareToken: token });
  const connection = (matches[0] || null) as RideConnection | null;

  if (!connection) {
    return Response.json(
      { error: 'Shared ride link not found' },
      { status: 404 }
    );
  }

  if (connection.State === 'rejected') {
    return Response.json(
      { error: 'Shared ride is no longer available' },
      { status: 410 }
    );
  }

  const [driver, passenger] = await Promise.all([
    getDocumentById('users', connection.DriverId) as Promise<User | null>,
    getDocumentById('users', connection.PassengerId) as Promise<User | null>,
  ]);

  return Response.json({
    connection: {
      Id: connection.Id,
      State: connection.State,
      PickupLocation: connection.PickupLocation,
      Destination: connection.Destination,
      Distance: connection.Distance,
      Fare: connection.Fare,
      CreatedAt: serializeDate(connection.CreatedAt),
      RideTotalTime: connection.RideTotalTime || null,
    },
    driver: {
      name: driver?.Name || 'Driver',
      vehicleType: driver?.VehicleType || null,
      ratingAverage: driver?.DriverRatingAverage || null,
      ratingCount: driver?.DriverRatingCount || 0,
      lastLocation: driver?.LastLocation || null,
    },
    passenger: {
      name: passenger?.Name || 'Passenger',
      lastLocation: passenger?.LastLocation || null,
    },
    sharedAt: serializeDate((connection as any).ShareCreatedAt),
    updatedAt: new Date().toISOString(),
  });
}
export default function Handler() { return null; }
