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
}

interface PlaceSearchInputProps {
  placeholder?: string;
  onPlaceSelected: (place: { lat: number; lng: number; name: string }) => void;
  onClear?: () => void;
  containerStyle?: any;
  inputStyle?: any;
}

export default function PlaceSearchInput({
  placeholder = 'Search destination...',
  onPlaceSelected,
  onClear,
  containerStyle,
  inputStyle,
}: PlaceSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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
      // Using Nominatim API (OpenStreetMap)
      // Note: Please respect the usage policy - max 1 request per second
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        searchQuery
      )}&format=json&limit=5&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'RouteMate-RideSharing-App', // Required by Nominatim
        },
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: PlaceResult[] = await response.json();
      setResults(data);
      setShowResults(data.length > 0);
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
    <View style={[styles.container, containerStyle]}>
      <View style={styles.inputContainer}>
        <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={[styles.input, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
          onFocus={() => {
            if (results.length > 0) {
              setShowResults(true);
            }
          }}
        />
        {loading && <ActivityIndicator size="small" color="#e86713" style={styles.loader} />}
        {query.length > 0 && !loading && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {showResults && results.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handlePlaceSelect(item)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  loader: {
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  resultsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
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