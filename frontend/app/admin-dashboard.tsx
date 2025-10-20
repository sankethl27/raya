import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { theme } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

type TabType = 'artists' | 'partners' | 'chats';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('artists');
  const [artists, setArtists] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');

  useEffect(() => {
    if (user?.user_type !== 'admin') {
      Alert.alert('Access Denied', 'Admin access required');
      router.back();
      return;
    }
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'artists') {
        const response = await axios.get(`${BACKEND_URL}/api/artists`);
        setArtists(response.data);
      } else if (activeTab === 'partners') {
        const response = await axios.get(`${BACKEND_URL}/api/partners`);
        setPartners(response.data);
      } else if (activeTab === 'chats') {
        const response = await axios.get(`${BACKEND_URL}/api/admin/chats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setChats(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleAdd = async () => {
    if (!email || !password || !name || !type) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const endpoint = activeTab === 'artists' ? '/api/admin/artists' : '/api/admin/partners';
      const data = activeTab === 'artists'
        ? { email, password, stage_name: name, art_type: type }
        : { email, password, brand_name: name, service_type: type };

      await axios.post(`${BACKEND_URL}${endpoint}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert('Success', `${activeTab === 'artists' ? 'Artist' : 'Partner'} added successfully!`);
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const endpoint = activeTab === 'artists' 
                ? `/api/admin/artist/${id}`
                : `/api/admin/partner/${id}`;
              
              await axios.delete(`${BACKEND_URL}${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              Alert.alert('Success', 'Deleted successfully!');
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setType('');
  };

  const renderArtistsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, { flex: 2 }]}>Name</Text>
        <Text style={[styles.headerCell, { flex: 1 }]}>Type</Text>
        <Text style={[styles.headerCell, { flex: 1 }]}>Status</Text>
        <Text style={[styles.headerCell, { flex: 1 }]}>Action</Text>
      </View>
      
      {artists.map((artist) => (
        <View key={artist.id} style={styles.tableRow}>
          <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>
            {artist.stage_name}
          </Text>
          <Text style={[styles.cell, { flex: 1 }]} numberOfLines={1}>
            {artist.art_type}
          </Text>
          <View style={[styles.cell, { flex: 1 }]}>
            <View style={[styles.statusBadge, artist.is_paused && styles.statusPaused]}>
              <Text style={styles.statusText}>
                {artist.is_paused ? 'Paused' : 'Active'}
              </Text>
            </View>
          </View>
          <View style={[styles.cell, { flex: 1 }]}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(artist.id, artist.stage_name)}
            >
              <Ionicons name="trash" size={18} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderPartnersTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, { flex: 2 }]}>Brand</Text>
        <Text style={[styles.headerCell, { flex: 1 }]}>Service</Text>
        <Text style={[styles.headerCell, { flex: 1 }]}>Status</Text>
        <Text style={[styles.headerCell, { flex: 1 }]}>Action</Text>
      </View>
      
      {partners.map((partner) => (
        <View key={partner.id} style={styles.tableRow}>
          <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>
            {partner.brand_name}
          </Text>
          <Text style={[styles.cell, { flex: 1 }]} numberOfLines={1}>
            {partner.service_type}
          </Text>
          <View style={[styles.cell, { flex: 1 }]}>
            <View style={[styles.statusBadge, partner.is_paused && styles.statusPaused]}>
              <Text style={styles.statusText}>
                {partner.is_paused ? 'Paused' : 'Active'}
              </Text>
            </View>
          </View>
          <View style={[styles.cell, { flex: 1 }]}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(partner.id, partner.brand_name)}
            >
              <Ionicons name="trash" size={18} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderChatsTab = () => (
    <View style={styles.tabContent}>
      {chats.length === 0 ? (
        <Text style={styles.emptyText}>No chats available</Text>
      ) : (
        chats.map((chat) => (
          <View key={chat.id} style={styles.chatCard}>
            <View style={styles.chatHeader}>
              <View style={styles.chatInfo}>
                <Ionicons name="chatbubbles" size={20} color={theme.colors.secondary} />
                <Text style={styles.chatTitle}>
                  {chat.venue_name || 'Venue'} ↔ {chat.provider_name || 'Provider'}
                </Text>
              </View>
              <Text style={styles.chatDate}>
                {new Date(chat.created_at).toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewChatButton}
              onPress={() => router.push(`/chat/${chat.id}`)}
            >
              <Text style={styles.viewChatText}>View Conversation</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.colors.secondary} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primaryDark, theme.colors.background]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Admin Dashboard</Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'artists' && styles.activeTab]}
          onPress={() => setActiveTab('artists')}
        >
          <Ionicons
            name="brush"
            size={20}
            color={activeTab === 'artists' ? theme.colors.secondary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'artists' && styles.activeTabText]}>
            Artists
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'partners' && styles.activeTab]}
          onPress={() => setActiveTab('partners')}
        >
          <Ionicons
            name="briefcase"
            size={20}
            color={activeTab === 'partners' ? theme.colors.secondary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'partners' && styles.activeTabText]}>
            Partners
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'chats' && styles.activeTab]}
          onPress={() => setActiveTab('chats')}
        >
          <Ionicons
            name="chatbubbles"
            size={20}
            color={activeTab === 'chats' ? theme.colors.secondary : theme.colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>
            Chats
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Button */}
      {activeTab !== 'chats' && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add-circle" size={24} color={theme.colors.secondary} />
          <Text style={styles.addButtonText}>
            Add {activeTab === 'artists' ? 'Artist' : 'Partner'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.secondary} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={theme.colors.secondary} style={styles.loader} />
        ) : (
          <>
            {activeTab === 'artists' && renderArtistsTab()}
            {activeTab === 'partners' && renderPartnersTab()}
            {activeTab === 'chats' && renderChatsTab()}
          </>
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Add {activeTab === 'artists' ? 'Artist' : 'Partner'}
              </Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <Ionicons name="close" size={28} color={theme.colors.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Password (min 6 characters)"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry
              />

              <Text style={styles.label}>
                {activeTab === 'artists' ? 'Stage Name *' : 'Brand Name *'}
              </Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={activeTab === 'artists' ? 'Artist Name' : 'Brand Name'}
                placeholderTextColor={theme.colors.textSecondary}
              />

              <Text style={styles.label}>
                {activeTab === 'artists' ? 'Art Type *' : 'Service Type *'}
              </Text>
              <TextInput
                style={styles.input}
                value={type}
                onChangeText={setType}
                placeholder={activeTab === 'artists' ? 'e.g., Singer, Dancer' : 'e.g., Event Management'}
                placeholderTextColor={theme.colors.textSecondary}
              />

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleAdd}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.primaryDark} />
                ) : (
                  <Text style={styles.submitButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.secondary,
  },
  tabText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: theme.colors.secondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  addButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loader: {
    marginTop: theme.spacing.xxl,
  },
  tabContent: {
    padding: theme.spacing.lg,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  headerCell: {
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
    color: theme.colors.secondary,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceLight,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xs,
    alignItems: 'center',
  },
  cell: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
  },
  statusBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  statusPaused: {
    backgroundColor: theme.colors.textSecondary,
  },
  statusText: {
    fontSize: 10,
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: theme.spacing.xs,
  },
  chatCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  chatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  chatTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
    flex: 1,
  },
  chatDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  viewChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  viewChatText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xxl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.borderRadius.xxl,
    borderTopRightRadius: theme.borderRadius.xxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  form: {
    padding: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.white,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  submitButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.primaryDark,
  },
});
