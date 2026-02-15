import { getDocumentById, updateDocument } from '../../firestore';
import { getAuthToken, validateSession } from '../../middleware';
import * as admin from 'firebase-admin';

const TEST_USER_ID = 'TESTUSER';

interface ControlTestUserRequest {
  action: 'spawn' | 'update_location' | 'set_state' | 'despawn';
  name?: string;
  role?: 'driver' | 'passenger';
  location?: { lat: number; lng: number };
  destination?: { lat: number; lng: number } | null;
  state?: 'idle' | 'looking' | 'driving';
  vehicleType?: string;
  vehicleName?: string;
  vehicleModel?: string;
  vehicleRegistration?: string;
}

export async function handleTestControl(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(token);
    if (!user) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body: ControlTestUserRequest = await request.json();
    const { action } = body;

    switch (action) {
      case 'spawn':
        return await handleSpawn(body);
      case 'update_location':
        return await handleUpdateLocation(body);
      case 'set_state':
        return await handleSetState(body);
      case 'despawn':
        return await handleDespawn();
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[TestControlAPI] Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function handleTestStatus(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(token);
    if (!user) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    const testUser = await getDocumentById('users', TEST_USER_ID);
    
    if (!testUser) {
      return Response.json({
        exists: false,
        message: 'Test user not spawned',
      });
    }

    return Response.json({
      exists: true,
      user: {
        id: testUser.Id,
        name: testUser.Name,
        state: testUser.state,
        location: testUser.LastLocation,
        destination: testUser.Destination,
        vehicleType: testUser.VehicleType,
        vehicleName: testUser.VehicleName,
        vehicleModel: testUser.VehicleModel,
        vehicleRegistration: testUser.VehicleRegistration,
      },
    });
  } catch (error: any) {
    console.error('[TestControlAPI] Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleSpawn(body: ControlTestUserRequest) {
  const {
    name = 'Test User',
    role = 'driver',
    location = { lat: 9.910763046909526, lng: 76.69946897230729 },
    destination = null,
    vehicleType = 'Hatchback',
    vehicleName = 'Maruti Swift',
    vehicleModel = '2020',
    vehicleRegistration = 'KL01AB1234',
  } = body;

  const testUserData = {
    Id: TEST_USER_ID,
    Mobile: '9999999999',
    Name: name,
    Email: 'testuser@routemate.test',
    state: 'idle',
    LastLocation: location,
    Destination: destination,
    VehicleType: role === 'driver' ? vehicleType : null,
    VehicleName: role === 'driver' ? vehicleName : null,
    VehicleModel: role === 'driver' ? vehicleModel : null,
    VehicleRegistration: role === 'driver' ? vehicleRegistration : null,
    WalletBalance: 1000,
    UpiId: 'testuser@upi',
    ProfilePictureUrl: undefined,
    KycStatus: 'verified',
    IsKycVerified: true,
    DriverRatingAverage: role === 'driver' ? 4.5 : 0,
    DriverRatingCount: role === 'driver' ? 100 : 0,
    PassengerRewardPoints: 0,
    DriverRewardPoints: 0,
    ActiveCommunityId: null,
  };

  const existingUser = await getDocumentById('users', TEST_USER_ID);
  
  if (existingUser) {
    await updateDocument('users', TEST_USER_ID, testUserData);
  } else {
    const firestore = admin.firestore();
    await firestore.collection('users').doc(TEST_USER_ID).set(testUserData);
  }

  console.log(`[TestControlAPI] Test user spawned: ${name} (${role})`);

  return Response.json({
    success: true,
    message: 'Test user spawned',
    userId: TEST_USER_ID,
    name,
    role,
    location,
  });
}

async function handleUpdateLocation(body: ControlTestUserRequest) {
  const { location } = body;

  if (!location) {
    return Response.json({ error: 'Location is required' }, { status: 400 });
  }

  const testUser = await getDocumentById('users', TEST_USER_ID);
  if (!testUser) {
    return Response.json(
      { error: 'Test user not found. Spawn it first.' },
      { status: 404 }
    );
  }

  await updateDocument('users', TEST_USER_ID, {
    LastLocation: location,
  });

  console.log(`[TestControlAPI] Test user location updated:`, location);

  return Response.json({
    success: true,
    message: 'Test user location updated',
    location,
  });
}

async function handleSetState(body: ControlTestUserRequest) {
  const { state, destination } = body;

  if (!state) {
    return Response.json({ error: 'State is required' }, { status: 400 });
  }

  const testUser = await getDocumentById('users', TEST_USER_ID);
  if (!testUser) {
    return Response.json(
      { error: 'Test user not found. Spawn it first.' },
      { status: 404 }
    );
  }

  await updateDocument('users', TEST_USER_ID, {
    state,
    Destination: destination !== undefined ? destination : testUser.Destination,
  });

  console.log(`[TestControlAPI] Test user state updated: ${state}`);

  return Response.json({
    success: true,
    message: 'Test user state updated',
    state,
    destination,
  });
}

async function handleDespawn() {
  const testUser = await getDocumentById('users', TEST_USER_ID);
  if (!testUser) {
    return Response.json(
      { error: 'Test user not found' },
      { status: 404 }
    );
  }

  // Delete the test user document
  const firestore = admin.firestore();
  await firestore.collection('users').doc(TEST_USER_ID).delete();

  console.log(`[TestControlAPI] Test user deleted`);

  return Response.json({
    success: true,
    message: 'Test user deleted',
  });
}