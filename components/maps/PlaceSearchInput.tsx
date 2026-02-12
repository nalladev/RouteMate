import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface PlaceResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
  state?: string;
  country?: string;
}

interface PlaceSearchInputProps {
  placeholder?: string;
  onPlaceSelected: (place: { lat: number; lng: number; name: string }) => void;
  onClear?: () => void;
  containerStyle?: any;
  inputStyle?: any;
  autoFocus?: boolean;
  initialValue?: string;
}

export default function PlaceSearchInput({
  placeholder = 'Search destination...',
  onPlaceSelected,
  onClear,
  containerStyle,
  inputStyle,
  autoFocus = false,
  initialValue = '',
}: PlaceSearchInputProps) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExternalUpdate = useRef(false);
  const prevInitialValue = useRef(initialValue);

  // Sync query with initialValue when it changes externally
  useEffect(() => {
    if (initialValue !== prevInitialValue.current) {
      prevInitialValue.current = initialValue;
      isExternalUpdate.current = true;
      setQuery(initialValue);
      setShowResults(false);
      setResults([]);
    }
  }, [initialValue]);

  // Hide results when keyboard is dismissed
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setShowResults(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    // Don't search if this is an external update
    if (isExternalUpdate.current) {
      isExternalUpdate.current = false;
      return;
    }

    if (query.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    // Debounce search
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      searchPlaces(query);
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const searchPlaces = async (searchQuery: string) => {
    setLoading(true);
    try {
      // Using Photon API (OpenStreetMap geocoder, more mobile-friendly)
      // No User-Agent required, free to use
      // Vazhakulam coordinates: 10.1765° N, 76.6516° E
      const vazhakulamLat = 10.1765;
      const vazhakulamLon = 76.6516;
      
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        searchQuery
      )}&lat=${vazhakulamLat}&lon=${vazhakulamLon}&limit=10`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Search failed with status:', response.status, 'Error:', errorText);
        throw new Error(`Search failed with status ${response.status}`);
      }

      const photonData = await response.json();
      
      // Convert Photon format to our format
      const data: PlaceResult[] = photonData.features?.map((feature: any) => ({
        place_id: feature.properties.osm_id?.toString() || Math.random().toString(),
        display_name: feature.properties.name 
          ? `${feature.properties.name}${feature.properties.city ? ', ' + feature.properties.city : ''}${feature.properties.state ? ', ' + feature.properties.state : ''}${feature.properties.country ? ', ' + feature.properties.country : ''}`
          : feature.properties.street || 'Unknown location',
        lat: feature.geometry.coordinates[1].toString(),
        lon: feature.geometry.coordinates[0].toString(),
        type: feature.properties.type || feature.properties.osm_value || 'place',
        importance: 1,
        state: feature.properties.state || '',
        country: feature.properties.country || '',
      })) || [];
      
      // Prioritize results within Kerala
      const sortedData = data.sort((a, b) => {
        const aIsKerala = a.state?.toLowerCase().includes('kerala') || a.display_name.toLowerCase().includes('kerala');
        const bIsKerala = b.state?.toLowerCase().includes('kerala') || b.display_name.toLowerCase().includes('kerala');
        
        if (aIsKerala && !bIsKerala) return -1;
        if (!aIsKerala && bIsKerala) return 1;
        return 0;
      }).slice(0, 5); // Limit to 5 results after sorting
      
      setResults(sortedData);
      setShowResults(sortedData.length > 0);
    } catch (error) {
      console.error('Place search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceSelect = (place: PlaceResult) => {
    const selectedPlace = {
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      name: place.display_name,
    };

    setQuery(place.display_name);
    setShowResults(false);
    setResults([]);
    Keyboard.dismiss();
    onPlaceSelected(selectedPlace);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    if (onClear) {
      onClear();
    }
  };

  return (
    <>
      <View style={[styles.container, containerStyle]}>
        <View style={styles.inputContainer}>
          <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
          <TextInput
            style={[styles.input, inputStyle]}
            placeholder={placeholder}
            placeholderTextColor="#999"
            value={query}
            onChangeText={setQuery}
            autoFocus={autoFocus}
            onFocus={() => {
              if (results.length > 0 && query.length >= 3) {
                setShowResults(true);
              }
            }}
          />
          {loading && <ActivityIndicator size="small" color="#e86713" style={styles.loader} />}
          {!loading && query.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showResults && results.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handlePlaceSelect(item)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="place" size={20} color="#e86713" style={styles.resultIcon} />
                <View style={styles.resultTextContainer}>
                  <Text style={styles.resultText} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                  <Text style={styles.resultType}>{item.type}</Text>
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 50,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    height: 50,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    height: 50,
  },
  loader: {
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
  },
  resultsContainer: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  resultItem: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-start',
  },
  resultIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  resultType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 12,
  },
});