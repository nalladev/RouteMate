import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors, Shadow, BorderRadius, Spacing } from '@/constants/theme';
import { api } from '@/utils/api';

interface ProfileImageUploadProps {
  profilePictureUrl?: string;
  userName?: string;
  onUploadSuccess?: (url: string) => void;
  size?: number;
}

export function ProfileImageUpload({
  profilePictureUrl,
  userName = 'User',
  onUploadSuccess,
  size = 120,
}: ProfileImageUploadProps) {
  const { isDarkMode } = useTheme();
  const colors = Colors[isDarkMode ? 'dark' : 'light'];
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload profile pictures.'
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          setSelectedImage(`data:image/jpeg;base64,${asset.base64}`);
        } else if (asset.uri) {
          // Fallback: if base64 is not available, we'll need to fetch it
          setSelectedImage(asset.uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setIsUploading(true);
    try {
      let imageData = selectedImage;
      
      // If the image is a URI and not base64, we need to convert it
      if (!imageData.startsWith('data:image')) {
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        const reader = new FileReader();
        imageData = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      const result = await api.uploadProfilePicture(imageData);
      
      if (result.success) {
        Alert.alert('Success', 'Profile picture updated successfully!');
        setShowModal(false);
        setSelectedImage(null);
        if (onUploadSuccess) {
          onUploadSuccess(result.profilePictureUrl);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenModal = () => {
    setSelectedImage(null);
    setShowModal(true);
  };

  return (
    <>
      <View style={styles.container}>
        {/* Avatar or Profile Picture */}
        <View style={[styles.avatarContainer, { width: size, height: size }]}>
          {profilePictureUrl ? (
            <Image
              source={{ uri: profilePictureUrl }}
              style={[styles.profileImage, { width: size, height: size, borderRadius: size / 2 }]}
              contentFit="cover"
            />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: colors.tint,
                },
              ]}
            >
              <Text style={[styles.avatarText, { fontSize: size / 3 }]}>
                {getInitials(userName)}
              </Text>
            </View>
          )}

          {/* Edit Button */}
          <TouchableOpacity
            style={[
              styles.editButton,
              {
                backgroundColor: colors.tint,
                right: size * 0.05,
                top: size * 0.7,
              },
            ]}
            onPress={handleOpenModal}
          >
            <MaterialIcons name="edit" size={size * 0.2} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Upload Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isUploading && setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Upload Profile Picture
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                disabled={isUploading}
              >
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Image Preview */}
            <View style={styles.previewContainer}>
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
              ) : profilePictureUrl ? (
                <Image
                  source={{ uri: profilePictureUrl }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[
                    styles.previewPlaceholder,
                    { backgroundColor: colors.tint },
                  ]}
                >
                  <Text style={styles.previewPlaceholderText}>
                    {getInitials(userName)}
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.border, flex: 1 },
                ]}
                onPress={pickImage}
                disabled={isUploading}
              >
                <MaterialIcons
                  name="photo-library"
                  size={20}
                  color={colors.text}
                  style={styles.buttonIcon}
                />
                <Text style={[styles.actionButtonText, { color: colors.text }]}>
                  {selectedImage ? 'Change Photo' : 'Select Photo'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Upload Button */}
            {selectedImage && (
              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  { backgroundColor: colors.tint },
                  isUploading && styles.uploadButtonDisabled,
                ]}
                onPress={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons
                      name="cloud-upload"
                      size={20}
                      color="#FFFFFF"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.uploadButtonText}>Upload</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => setShowModal(false)}
              disabled={isUploading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  profileImage: {
    backgroundColor: '#E0E0E0',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  editButton: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Shadow.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
    ...Shadow.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#E0E0E0',
  },
  previewPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPlaceholderText: {
    fontSize: 60,
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  uploadButton: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  cancelButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});