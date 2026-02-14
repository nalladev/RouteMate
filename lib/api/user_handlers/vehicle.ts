import { getAuthToken, validateSession } from '../../middleware';
import { updateDocument } from '../../firestore';
import { isVehicleType } from '../../../constants/vehicles';

export async function handleVehicle(request: Request) {
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
  const { vehicleType } = body;

  if (!vehicleType || typeof vehicleType !== 'string') {
    return Response.json(
      { error: 'vehicleType is required' },
      { status: 400 }
    );
  }

  if (!isVehicleType(vehicleType)) {
    return Response.json(
      { error: 'Invalid vehicle type' },
      { status: 400 }
    );
  }

  await updateDocument('users', user.Id, {
    VehicleType: vehicleType,
  });

  return Response.json({
    success: true,
    vehicleType,
  });
}
export default function Handler() { return null; }
