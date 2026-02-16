// Google Maps Dark Mode Style
// Conservative styling that preserves all POI and building visibility

export const darkMapStyle = [
  // Base map background - dark blue-gray
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#242f3e" }]
  },
  
  // General text labels - white
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#242f3e" }]
  },

  // Water - deep blue
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#17263c" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#515c6d" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#17263c" }]
  },

  // Parks - dark teal-green
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#263c3f" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#6b9a76" }]
  },

  // Explicitly keep POI visible
  {
    "featureType": "poi",
    "stylers": [{ "visibility": "on" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels",
    "stylers": [{ "visibility": "on" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#ffffff" }]
  },

  // Explicitly keep all POI types visible
  {
    "featureType": "poi.business",
    "stylers": [{ "visibility": "on" }]
  },
  {
    "featureType": "poi.medical",
    "stylers": [{ "visibility": "on" }]
  },
  {
    "featureType": "poi.school",
    "stylers": [{ "visibility": "on" }]
  },
  {
    "featureType": "poi.sports_complex",
    "stylers": [{ "visibility": "on" }]
  },
  {
    "featureType": "poi.government",
    "stylers": [{ "visibility": "on" }]
  },
  {
    "featureType": "poi.place_of_worship",
    "stylers": [{ "visibility": "on" }]
  },

  // Roads - slate blue-gray
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#38414e" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#212a37" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9ca5b3" }]
  },

  // Highways - warm tan/brown
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#746855" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#1f2835" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#f3d19c" }]
  },

  // Arterial roads
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [{ "color": "#3d4f5f" }]
  },

  // Transit
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [{ "color": "#2f3948" }]
  },
  {
    "featureType": "transit.station",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#ffffff" }]
  }
];

export const lightMapStyle = [
  // Empty array means default light theme
];