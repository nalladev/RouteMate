import { v2 as cloudinary } from 'cloudinary';
import { getAuthToken, validateSession } from '../../middleware';
import { updateDocument } from '../../firestore';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function handleUploadProfilePicture(request: Request) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(token);

    if (!user) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return Response.json({ error: 'Image data is required' }, { status: 400 });
    }

    // Validate environment variables
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Cloudinary credentials are not configured');
      return Response.json({ error: 'Image upload service not configured' }, { status: 500 });
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(imageBase64, {
      folder: 'routemate/profile-pictures',
      public_id: `user_${user.Id}`,
      overwrite: true,
      resource_type: 'image',
      transformation: [
        { width: 500, height: 500, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    const profilePictureUrl = uploadResult.secure_url;

    // Update user profile in Firestore
    await updateDocument('users', user.Id, {
      ProfilePictureUrl: profilePictureUrl,
    });

    return Response.json({
      success: true,
      profilePictureUrl,
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to upload profile picture' },
      { status: 500 }
    );
  }
}