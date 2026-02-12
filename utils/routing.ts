/**
 * Routing utilities using OSRM (Open Source Routing Machine)
 * Free alternative to Google Directions API
 */

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  coordinates: RouteCoordinate[];
  distance: number; // in meters
  duration: number; // in seconds
}

export interface OSRMRoute {
  geometry: {
    coordinates: number[][];
  };
  distance: number;
  duration: number;
}

export interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
}

/**
 * Get route between two points using OSRM API
 * @param origin - Starting point { lat, lng }
 * @param destination - Ending point { lat, lng }
 * @returns Route with coordinates, distance, and duration
 */
export async function getRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteResult | null> {
  try {
    // OSRM API endpoint (using public demo server)
    // Format: {lon},{lat};{lon},{lat}
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data: OSRMResponse = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('No route found');
      return null;
    }

    const route = data.routes[0];
    
    // Convert GeoJSON coordinates [lng, lat] to { latitude, longitude }
    const coordinates: RouteCoordinate[] = route.geometry.coordinates.map(
      ([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      })
    );

    return {
      coordinates,
      distance: route.distance, // in meters
      duration: route.duration, // in seconds
    };
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
}

/**
 * Calculate if a point is near a route (within tolerance)
 * @param point - Point to check { lat, lng }
 * @param route - Array of route coordinates
 * @param toleranceMeters - Distance tolerance in meters (default: 500m)
 * @returns true if point is near the route
 */
export function isPointNearRoute(
  point: { lat: number; lng: number },
  route: RouteCoordinate[],
  toleranceMeters: number = 500
): boolean {
  if (!route || route.length === 0) return false;

  for (const routePoint of route) {
    const distance = calculateDistance(
      point.lat,
      point.lng,
      routePoint.latitude,
      routePoint.longitude
    );
    
    if (distance <= toleranceMeters) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - First point latitude
 * @param lng1 - First point longitude
 * @param lat2 - Second point latitude
 * @param lng2 - Second point longitude
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Format distance for display
 * @param meters - Distance in meters
 * @returns Formatted string (e.g., "1.5 km" or "500 m")
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format duration for display
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "1h 30m" or "45m")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Check if two routes overlap
 * Used for matching drivers with passengers
 * @param route1 - First route coordinates
 * @param route2 - Second route coordinates
 * @param toleranceMeters - Distance tolerance in meters
 * @returns true if routes have significant overlap
 */
export function doRoutesOverlap(
  route1: RouteCoordinate[],
  route2: RouteCoordinate[],
  toleranceMeters: number = 500
): boolean {
  if (!route1 || !route2 || route1.length === 0 || route2.length === 0) {
    return false;
  }

  let overlapCount = 0;
  const threshold = Math.min(route1.length, route2.length) * 0.3; // 30% overlap required

  for (const point1 of route1) {
    for (const point2 of route2) {
      const distance = calculateDistance(
        point1.latitude,
        point1.longitude,
        point2.latitude,
        point2.longitude
      );

      if (distance <= toleranceMeters) {
        overlapCount++;
        break; // Found overlap for this point, move to next
      }
    }
  }

  return overlapCount >= threshold;
}