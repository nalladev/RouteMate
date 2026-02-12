import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';

interface PlaceResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

interface PlacesAutocompleteProps {
  placeholder?: string;
  onPlaceSelected: (place: PlaceResult) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export default function PlacesAutocomplete({
  placeholder = 'Search destination...',
  onPlaceSelected,
  onCancel,
  autoFocus = false,
}: PlacesAutocompleteProps) {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const searchPlaces = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // Using Nominatim OpenStreetMap API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(query)}&` +
          `format=json&` +
          `addressdetails=1&` +
          `limit=5`,
        {
          headers: {
            'User-Agent': 'RouteMate/1.0',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (text: string) => {
    setSearchText(text);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      searchPlaces(text);
    }, 500);
  };

  const handlePlacePress = (place: PlaceResult) => {
    setSearchText('');
    setResults([]);
    Keyboard.dismiss();
    onPlaceSelected(place);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={searchText}
        onChangeText={handleTextChange}
        autoFocus={autoFocus}
        onBlur={onCancel}
      />
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#e86713" />
        </View>
      )}
      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.place_id}
          style={styles.resultsList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => handlePlacePress(item)}
            >
              <Text style={styles.resultText} numberOfLines={2}>
                {item.display_name}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  input: {
    height: 50,
    color: '#000',
    fontSize: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 0,
  },
  loadingContainer: {
    padding: 10,
    alignItems: 'center',
  },
  resultsList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 250,
  },
  resultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultText: {
    fontSize: 14,
    color: '#333',
  },
});