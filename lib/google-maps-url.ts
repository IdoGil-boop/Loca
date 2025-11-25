import { SavedPlace } from '@/types';
import { loadGoogleMaps } from './maps-loader';

/**
 * Generates a Google Maps directions URL with multiple waypoints
 * This creates a shareable link that shows all saved places as stops on a route
 */
export async function generateGoogleMapsDirectionsUrl(places: SavedPlace[]): Promise<string> {
  if (places.length === 0) {
    throw new Error('No places to add to Google Maps');
  }

  // Load Google Maps to use Places service
  await loadGoogleMaps();

  // Create a temporary map for Places service
  const placesService = new google.maps.places.PlacesService(
    document.createElement('div')
  );

  // Fetch coordinates for all places
  const placeDetailsPromises = places.map((place) => {
    return new Promise<{ name: string; lat: number; lng: number } | null>((resolve) => {
      placesService.getDetails(
        {
          placeId: place.placeId,
          fields: ['geometry', 'name'],
        },
        (result, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && result?.geometry?.location) {
            resolve({
              name: result.name || place.name,
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
            });
          } else {
            console.warn(`Failed to get location for ${place.name}:`, status);
            resolve(null);
          }
        }
      );
    });
  });

  const placeDetails = await Promise.all(placeDetailsPromises);
  const validPlaces = placeDetails.filter((p): p is { name: string; lat: number; lng: number } => p !== null);

  if (validPlaces.length === 0) {
    throw new Error('Could not fetch location data for any saved places');
  }

  // Create Google Maps URL with directions
  // Format: https://www.google.com/maps/dir/lat1,lng1/lat2,lng2/lat3,lng3
  const coordinates = validPlaces.map(p => `${p.lat},${p.lng}`).join('/');
  const url = `https://www.google.com/maps/dir/${coordinates}`;

  return url;
}

/**
 * Generates a Google Maps search URL that opens multiple places in separate tabs
 * This is an alternative when you want users to view each place individually
 */
export function generateMultiplePlaceUrls(places: SavedPlace[]): string[] {
  return places.map(place =>
    `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${place.placeId}`
  );
}

/**
 * Generates a single Google Maps URL with the first place as destination
 * and provides coordinates for copy-paste
 */
export async function generatePlacesListInfo(places: SavedPlace[]): Promise<{
  firstPlaceUrl: string;
  coordinatesList: string;
  placeNames: string[];
}> {
  if (places.length === 0) {
    throw new Error('No places provided');
  }

  // Load Google Maps
  await loadGoogleMaps();

  const placesService = new google.maps.places.PlacesService(
    document.createElement('div')
  );

  // Fetch coordinates for all places
  const placeDetailsPromises = places.map((place) => {
    return new Promise<{ name: string; lat: number; lng: number; address?: string } | null>((resolve) => {
      placesService.getDetails(
        {
          placeId: place.placeId,
          fields: ['geometry', 'name', 'formatted_address'],
        },
        (result, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && result?.geometry?.location) {
            resolve({
              name: result.name || place.name,
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
              address: result.formatted_address,
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  });

  const placeDetails = await Promise.all(placeDetailsPromises);
  const validPlaces = placeDetails.filter((p): p is { name: string; lat: number; lng: number; address?: string } => p !== null);

  if (validPlaces.length === 0) {
    throw new Error('Could not fetch location data');
  }

  // Create CSV format for easy copy-paste
  const coordinatesList = validPlaces
    .map(p => `${p.name}\t${p.lat}\t${p.lng}\t${p.address || ''}`)
    .join('\n');

  const firstPlaceUrl = places.length > 0
    ? `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${places[0].placeId}`
    : '';

  return {
    firstPlaceUrl,
    coordinatesList,
    placeNames: validPlaces.map(p => p.name),
  };
}

/**
 * Downloads saved places as a CSV file that can be imported into Google My Maps
 */
export async function exportToCSV(places: SavedPlace[]): Promise<void> {
  if (places.length === 0) {
    throw new Error('No places to export');
  }

  // Load Google Maps
  await loadGoogleMaps();

  const placesService = new google.maps.places.PlacesService(
    document.createElement('div')
  );

  // Fetch full details for all places
  const placeDetailsPromises = places.map((place) => {
    return new Promise<{
      name: string;
      address: string;
      lat: number;
      lng: number;
      placeId: string;
      rating?: number;
    } | null>((resolve) => {
      placesService.getDetails(
        {
          placeId: place.placeId,
          fields: ['geometry', 'name', 'formatted_address', 'rating'],
        },
        (result, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && result?.geometry?.location) {
            resolve({
              name: result.name || place.name,
              address: result.formatted_address || '',
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
              placeId: place.placeId,
              rating: result.rating,
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  });

  const placeDetails = await Promise.all(placeDetailsPromises);
  const validPlaces = placeDetails.filter((p): p is {
    name: string;
    address: string;
    lat: number;
    lng: number;
    placeId: string;
    rating?: number;
  } => p !== null);

  if (validPlaces.length === 0) {
    throw new Error('Could not fetch location data for any places');
  }

  // Create CSV content
  const headers = ['Name', 'Address', 'Latitude', 'Longitude', 'Rating', 'Place ID'];
  const rows = validPlaces.map(place => [
    `"${place.name.replace(/"/g, '""')}"`,
    `"${place.address.replace(/"/g, '""')}"`,
    place.lat.toString(),
    place.lng.toString(),
    place.rating?.toString() || '',
    place.placeId,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `loca-saved-places-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
