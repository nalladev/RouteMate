import { getAuthToken, validateSession } from '../../middleware';
import { getDocument } from '../../firestore';

export async function handleConnections(request: Request) {
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

  // Get connections where user is either driver or passenger
  const driverConnections = await getDocument('rideconnections', { DriverId: user.Id });
  const passengerConnections = await getDocument('rideconnections', { PassengerId: user.Id });

  // Combine and filter for active connections
  const allConnections = [...driverConnections, ...passengerConnections];
  const activeConnections = allConnections.filter((c: any) => 
    c.State !== 'completed' && c.State !== 'rejected'
  );

  return Response.json({
    connections: activeConnections,
  });
}
export default function Handler() { return null; }
