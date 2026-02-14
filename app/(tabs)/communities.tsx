import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Share as NativeShare,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COMMUNITY_INVITE_PRESET_HOURS, type CommunityInvitePresetHours } from '@/constants/community';
import { Colors, Shadow } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { Community, CommunityMember } from '@/types';
import { api } from '@/utils/api';

export default function CommunitiesScreen() {
  const colors = Colors.light;
  const router = useRouter();
  const { isAuthenticated, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingInviteId, setCreatingInviteId] = useState<string | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [expiresInHours, setExpiresInHours] = useState<CommunityInvitePresetHours>(24);
  const [inviteByCommunityId, setInviteByCommunityId] = useState<
    Record<string, { inviteUrl: string; expiresAt: string }>
  >({});
  const [membersByCommunityId, setMembersByCommunityId] = useState<Record<string, CommunityMember[]>>({});
  const [loadingMembersCommunityId, setLoadingMembersCommunityId] = useState<string | null>(null);
  const [openMembersCommunityId, setOpenMembersCommunityId] = useState<string | null>(null);
  const [removingMemberKey, setRemovingMemberKey] = useState<string | null>(null);

  const activeLabel = useMemo(() => {
    if (!activeCommunityId) {
      return 'Community mode is OFF';
    }

    const community = communities.find((item) => item.Id === activeCommunityId);
    return community ? `Community mode: ${community.Name}` : 'Community mode is ON';
  }, [activeCommunityId, communities]);

  const canCreateInvites = useMemo(
    () => communities.some((community) => community.isAdmin),
    [communities]
  );

  const loadCommunities = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getCommunities();
      setCommunities(result.communities || []);
      setActiveCommunityId(result.activeCommunityId || null);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load communities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    loadCommunities();
  }, [isAuthenticated, router, loadCommunities]);

  async function handleCreateCommunity() {
    const name = newCommunityName.trim();
    if (name.length < 3) {
      Alert.alert('Invalid Name', 'Community name must be at least 3 characters.');
      return;
    }

    try {
      setCreating(true);
      await api.createCommunity(name);
      setNewCommunityName('');
      await Promise.all([loadCommunities(), refreshUser()]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create community');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleCommunityMode(communityId: string | null) {
    try {
      await api.selectCommunityMode(communityId);
      await Promise.all([loadCommunities(), refreshUser()]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update community mode');
    }
  }

  async function handleCreateInviteLink(community: Community) {
    try {
      setCreatingInviteId(community.Id);
      const result = await api.createCommunityInviteLink(community.Id, expiresInHours);
      setInviteByCommunityId((prev) => ({
        ...prev,
        [community.Id]: {
          inviteUrl: result.inviteUrl,
          expiresAt: result.expiresAt,
        },
      }));
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create invite link');
    } finally {
      setCreatingInviteId(null);
    }
  }

  async function handleShareInvite(community: Community, inviteUrl: string) {
    try {
      await NativeShare.share({
        message: `Join my RouteMate community "${community.Name}": ${inviteUrl}`,
        url: inviteUrl,
      });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to share invite link');
    }
  }

  async function handleCopyInvite(inviteUrl: string) {
    try {
      const clipboard = (globalThis as any)?.navigator?.clipboard;
      if (clipboard?.writeText) {
        await clipboard.writeText(inviteUrl);
        Alert.alert('Copied', 'Invite link copied to clipboard.');
        return;
      }

      Alert.alert('Copy Not Supported', `Clipboard copy is not available on this device.\n\n${inviteUrl}`);
    } catch {
      Alert.alert('Copy Failed', `Could not copy link automatically.\n\n${inviteUrl}`);
    }
  }

  async function handleToggleMembersOverview(community: Community) {
    if (openMembersCommunityId === community.Id) {
      setOpenMembersCommunityId(null);
      return;
    }

    setOpenMembersCommunityId(community.Id);
    if (membersByCommunityId[community.Id]) {
      return;
    }

    try {
      setLoadingMembersCommunityId(community.Id);
      const result = await api.getCommunityMembers(community.Id);
      setMembersByCommunityId((prev) => ({
        ...prev,
        [community.Id]: result.members || [],
      }));
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load members');
    } finally {
      setLoadingMembersCommunityId(null);
    }
  }

  function handleRemoveMember(community: Community, member: CommunityMember) {
    Alert.alert(
      'Remove Member',
      `Remove ${member.Name || member.Mobile || 'this member'} from "${community.Name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => performRemoveMember(community, member),
        },
      ]
    );
  }

  async function performRemoveMember(community: Community, member: CommunityMember) {
    const key = `${community.Id}:${member.Id}`;
    try {
      setRemovingMemberKey(key);
      await api.removeCommunityMember(community.Id, member.Id);

      setMembersByCommunityId((prev) => ({
        ...prev,
        [community.Id]: (prev[community.Id] || []).filter((item) => item.Id !== member.Id),
      }));

      await loadCommunities();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to remove member');
    } finally {
      setRemovingMemberKey(null);
    }
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading communities...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Community Mode</Text>
          <Text style={[styles.sectionSubTitle, { color: colors.textSecondary }]}>{activeLabel}</Text>
          {activeCommunityId ? (
            <TouchableOpacity
              style={[styles.offButton, { borderColor: colors.border }]}
              onPress={() => handleToggleCommunityMode(null)}
            >
              <Text style={[styles.offButtonText, { color: colors.text }]}>Turn Off Community Mode</Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: colors.textSecondary }}>
              Select a community below to turn community mode on.
            </Text>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Create Community</Text>
          <TextInput
            value={newCommunityName}
            onChangeText={setNewCommunityName}
            placeholder="e.g. Office Carpool"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.tint }]}
            onPress={handleCreateCommunity}
            disabled={creating}
          >
            <Text style={styles.primaryButtonText}>{creating ? 'Creating...' : 'Create Community'}</Text>
          </TouchableOpacity>
        </View>

        {canCreateInvites && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Invite Link Expiry</Text>
            <View style={styles.expiryOptions}>
              {COMMUNITY_INVITE_PRESET_HOURS.map((hours) => {
                const selected = hours === expiresInHours;
                return (
                  <TouchableOpacity
                    key={hours}
                    style={[
                      styles.expiryChip,
                      {
                        borderColor: selected ? colors.tint : colors.border,
                        backgroundColor: selected ? `${colors.tint}22` : 'transparent',
                      },
                    ]}
                    onPress={() => setExpiresInHours(hours)}
                  >
                    <Text style={{ color: selected ? colors.tint : colors.textSecondary }}>{hours}h</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Communities</Text>
          {communities.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>You are not in any community yet.</Text>
          ) : (
            communities.map((community) => (
              <View key={community.Id} style={[styles.communityCard, { borderColor: colors.border }]}>
                <View style={styles.communityHeader}>
                  <Text style={[styles.communityName, { color: colors.text }]}>{community.Name}</Text>
                  <Text style={{ color: colors.textSecondary }}>{community.participantCount} members</Text>
                </View>

                <View style={styles.communityActions}>
                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      {
                        backgroundColor: community.isActive ? `${colors.success}22` : `${colors.tint}22`,
                        borderColor: community.isActive ? colors.success : colors.tint,
                      },
                    ]}
                    onPress={() => handleToggleCommunityMode(community.Id)}
                  >
                    <Text style={{ color: community.isActive ? colors.success : colors.tint }}>
                      {community.isActive ? 'Active' : 'Use This'}
                    </Text>
                  </TouchableOpacity>

                  {community.isAdmin && (
                    <TouchableOpacity
                      style={[styles.modeButton, { borderColor: colors.border }]}
                      onPress={() => handleCreateInviteLink(community)}
                      disabled={creatingInviteId === community.Id}
                    >
                      <Text style={{ color: colors.text }}>
                        {creatingInviteId === community.Id ? 'Creating...' : 'Invite Link'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {community.isAdmin && (
                    <TouchableOpacity
                      style={[styles.modeButton, { borderColor: colors.border }]}
                      onPress={() => handleToggleMembersOverview(community)}
                    >
                      <Text style={{ color: colors.text }}>
                        {openMembersCommunityId === community.Id ? 'Hide Members' : 'Manage Members'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {inviteByCommunityId[community.Id] && (
                  <View style={[styles.inviteCard, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      Expires: {new Date(inviteByCommunityId[community.Id].expiresAt).toLocaleString()}
                    </Text>
                    <Text selectable style={[styles.inviteLinkText, { color: colors.text }]}>
                      {inviteByCommunityId[community.Id].inviteUrl}
                    </Text>
                    <View style={styles.inviteActions}>
                      <TouchableOpacity
                        style={[styles.modeButton, { borderColor: colors.border }]}
                        onPress={() => handleCopyInvite(inviteByCommunityId[community.Id].inviteUrl)}
                      >
                        <Text style={{ color: colors.text }}>Copy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modeButton, { borderColor: colors.border }]}
                        onPress={() => handleShareInvite(community, inviteByCommunityId[community.Id].inviteUrl)}
                      >
                        <Text style={{ color: colors.text }}>Share</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {community.isAdmin && openMembersCommunityId === community.Id && (
                  <View style={[styles.membersPanel, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.membersTitle, { color: colors.text }]}>Members</Text>

                    {loadingMembersCommunityId === community.Id ? (
                      <ActivityIndicator size="small" color={colors.tint} />
                    ) : (
                      (membersByCommunityId[community.Id] || []).map((member) => {
                        const removeKey = `${community.Id}:${member.Id}`;
                        return (
                          <View key={member.Id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                            <View style={styles.memberInfo}>
                              <Text style={{ color: colors.text, fontWeight: '600' }}>
                                {member.Name || 'Unnamed user'}
                              </Text>
                              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                {member.Mobile || 'No mobile'}{member.isAdmin ? ' • Admin' : ''}
                              </Text>
                            </View>
                            {!member.isAdmin && (
                              <TouchableOpacity
                                style={[styles.removeMemberButton, { borderColor: colors.error }]}
                                onPress={() => handleRemoveMember(community, member)}
                                disabled={removingMemberKey === removeKey}
                              >
                                <Text style={{ color: colors.error }}>
                                  {removingMemberKey === removeKey ? 'Removing...' : 'Remove'}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  section: {
    borderRadius: 14,
    padding: 16,
    ...Shadow.small,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubTitle: {
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  offButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  offButtonText: {
    fontWeight: '600',
  },
  expiryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  expiryChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  communityCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  communityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  communityName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  communityActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    textAlign: 'center',
    alignItems: 'center',
  },
  inviteCard: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  inviteLinkText: {
    fontSize: 13,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 10,
  },
  membersPanel: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  membersTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  memberInfo: {
    flex: 1,
    marginRight: 10,
  },
  removeMemberButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
