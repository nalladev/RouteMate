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
  const { vehicleType, vehicleName, vehicleModel, vehicleRegistration } = body;

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

  // Validate registration format if provided (e.g., KL34C3423)
  if (vehicleRegistration && typeof vehicleRegistration === 'string') {
    const regPattern = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/;
    if (!regPattern.test(vehicleRegistration)) {
      return Response.json(
        { error: 'Invalid registration format. Expected format: KL34C3423' },
        { status: 400 }
      );
    }
  }

  // Build update object - backward compatible
  const updateData: any = {
    VehicleType: vehicleType,
  };

  // Only add optional fields if provided
  if (vehicleName && typeof vehicleName === 'string' && vehicleName.trim()) {
    updateData.VehicleName = vehicleName.trim();
  }

  if (vehicleModel && typeof vehicleModel === 'string' && vehicleModel.trim()) {
    updateData.VehicleModel = vehicleModel.trim();
  }

  if (vehicleRegistration && typeof vehicleRegistration === 'string' && vehicleRegistration.trim()) {
    updateData.VehicleRegistration = vehicleRegistration.trim().toUpperCase();
  }

  await updateDocument('users', user.Id, updateData);

  return Response.json({
    success: true,
    vehicleType,
    vehicleName: updateData.VehicleName,
    vehicleModel: updateData.VehicleModel,
    vehicleRegistration: updateData.VehicleRegistration,
  });
}
export default function Handler() { return null; }
