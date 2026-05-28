import * as SecureStore from 'expo-secure-store';
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Animated, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import apiClient from '../../api/apiClient';
import forge from 'node-forge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;

interface JournalEntry {
  id: number;
  content: string;
  is_pinned: boolean;
  created_at: string;
  decryptedObj?: any; 
}

export default function JournalScreen() {
  const router = useRouter();
  
  // Security State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [journalKey, setJournalKey] = useState<string | null>(null);

  // Journal State
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Editor State
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryBody, setEntryBody] = useState('');

  // Drawer Animation State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  // =========================
  // 🔐 PURE JS CRYPTO (node-forge)
  // =========================
  
  const deriveKey = (password: string, saltBase64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const salt = forge.util.decode64(saltBase64);
        const md = forge.md.sha256.create();
        forge.pkcs5.pbkdf2(password, salt, 150000, 32, md, (err, derivedBytes) => {
          if (err) reject(err);
          else resolve(derivedBytes);
        });
      } catch (error) {
        reject(error);
      }
    });
  };

  const encryptData = (text: string, key: string) => {
    const iv = forge.random.getBytesSync(12);
    const cipher = forge.cipher.createCipher('AES-GCM', key);
    cipher.start({ iv: iv });
    cipher.update(forge.util.createBuffer(text, 'utf8'));
    cipher.finish();

    const encrypted = cipher.output.getBytes();
    const tag = cipher.mode.tag.getBytes();
    const finalData = encrypted + tag;

    return JSON.stringify({
      iv: Array.from(iv, c => c.charCodeAt(0)),
      data: Array.from(finalData, c => c.charCodeAt(0))
    });
  };

  const decryptData = (payload: string, key: string) => {
    try {
      if (!payload || typeof payload !== 'string' || !payload.startsWith('{')) {
        return '{"title": "⚠️ Corrupted Test Entry", "blocks": []}';
      }

      const parsed = JSON.parse(payload);
      const ivBytes = String.fromCharCode.apply(null, parsed.iv);
      const dataBytes = String.fromCharCode.apply(null, parsed.data);

      const encryptedLength = dataBytes.length - 16;
      const encrypted = dataBytes.slice(0, encryptedLength);
      const tag = dataBytes.slice(encryptedLength);

      const decipher = forge.cipher.createDecipher('AES-GCM', key);
      decipher.start({ iv: ivBytes, tag: forge.util.createBuffer(tag) });
      decipher.update(forge.util.createBuffer(encrypted));
      const success = decipher.finish();

      if (success) {
        const binaryString = decipher.output.getBytes();
        return forge.util.decodeUtf8(binaryString);
      } else {
        throw new Error("Auth tag mismatch");
      }
    } catch (e) {
      return '{"title": "⚠️ Decryption Failed", "blocks": []}';
    }
  };

  // =========================
  // 🔓 VAULT MANAGEMENT
  // =========================

  const handleUnlock = async () => {
    if (!unlockPassword) return;
    setUnlocking(true);
    await new Promise(resolve => setTimeout(resolve, 100)); // UI unfreeze

    try {
      const verifyRes = await apiClient.post('/core/journal/verify-password/', { password: unlockPassword });
      
      if (verifyRes.data?.valid) {
        const saltRes = await apiClient.get('/user/journal-salt/');
        let finalKey = null;

        const cachedKeyHex = await SecureStore.getItemAsync('smera_journal_key');
        if (cachedKeyHex) {
          finalKey = forge.util.hexToBytes(cachedKeyHex);
        } else {
          finalKey = await deriveKey(unlockPassword, saltRes.data.salt);
          await SecureStore.setItemAsync('smera_journal_key', forge.util.bytesToHex(finalKey));
        }
        
        setJournalKey(finalKey);
        setIsUnlocked(true);
        setUnlockPassword('');
        fetchEntries(finalKey);
      } else {
        Alert.alert('Access Denied', 'Incorrect password.');
      }
    } catch (error: any) {
      Alert.alert('Access Denied', 'Authentication failed.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleLock = () => {
    setJournalKey(null);
    setEntries([]);
    setCurrentId(null);
    setEntryTitle('');
    setEntryBody('');
    setIsUnlocked(false);
  };

  // =========================
  // 📝 DATA FETCHING & SAVING
  // =========================

  const fetchEntries = async (key: string | null = journalKey) => {
    if (!key) return;
    setLoading(true);
    try {
      const response = await apiClient.get('/core/journal/');
      
      const decryptedEntries = response.data.map((entry: any) => {
        // Change 'entry.encrypted_content' to 'entry.content' here:
        const decryptedText = decryptData(entry.content, key); 
        
        let parsed = { title: "Untitled", blocks: [] };
        try { parsed = JSON.parse(decryptedText); } catch (e) {}
        return { ...entry, decryptedObj: parsed };
      });

      decryptedEntries.sort((a: any, b: any) => Number(b.is_pinned) - Number(a.is_pinned));
      setEntries(decryptedEntries);
    } catch (error) {
      console.log('Error fetching journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!entryTitle.trim() && !entryBody.trim()) return;
    if (!journalKey) return;
    
    setSaving(true);
    try {
      // Package as a single text block for Web HTML compatibility
      const payload = {
        title: entryTitle,
        blocks: [{ type: 'text', content: entryBody }]
      };

      const rawText = `${entryTitle} ${entryBody}`;
      const encryptedString = encryptData(JSON.stringify(payload), journalKey);
      
      if (currentId) {
        // UPDATE Existing
        await apiClient.put('/core/journal/update/', {
          id: currentId,
          content: encryptedString,
          raw_text: rawText
        });
      } else {
        // CREATE New
        const res = await apiClient.post('/core/journal/', {
          content: encryptedString,
          raw_text: rawText
        });
        if (res.data?.id) setCurrentId(res.data.id);
      }
      
      fetchEntries(); 
      Alert.alert("Success", "Entry saved securely.");
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save entry securely.');
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (id: number) => {
    try {
      await apiClient.post(`/core/journal/${id}/pin/`);
      fetchEntries(); 
    } catch (error) {
      Alert.alert('Error', 'Failed to update pin status.');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Burn Entry", "Permanently delete this encrypted entry?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await apiClient.delete('/core/journal/delete/', { data: { id } });
            if (currentId === id) resetEditor();
            fetchEntries();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete entry.');
          }
        }
      }
    ]);
  };

  // =========================
  // 🧱 EDITOR & DRAWER LOGIC
  // =========================

  const toggleDrawer = () => {
    const toValue = isDrawerOpen ? -DRAWER_WIDTH : 0;
    Animated.timing(drawerAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setIsDrawerOpen(!isDrawerOpen);
  };

  const resetEditor = () => {
    setCurrentId(null);
    setEntryTitle('');
    setEntryBody('');
    if (isDrawerOpen) toggleDrawer();
  };

  const openEntry = (entry: JournalEntry) => {
    setCurrentId(entry.id);
    setEntryTitle(entry.decryptedObj?.title || "");
    
    // Flatten web blocks back into a single text body for mobile editing
    let bodyText = "";
    if (entry.decryptedObj?.blocks) {
      bodyText = entry.decryptedObj.blocks.map((b: any) => b.content).join("\n\n");
    } else if (entry.decryptedObj?.body) {
      bodyText = entry.decryptedObj.body; // Fallback for really old entries
    }
    
    setEntryBody(bodyText);
    toggleDrawer();
  };

  // =========================
  // 🎨 UI RENDERING
  // =========================

  if (!isUnlocked) {
    return (
      <SafeAreaView style={[styles.container, styles.centerAll]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnAbsolute}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        
        <View style={styles.vaultCard}>
          <Text style={styles.vaultIcon}>🔐</Text>
          <Text style={styles.vaultTitle}>Local Decryption</Text>
          <Text style={styles.vaultSub}>Your journal is end-to-end encrypted. Your passphrase never leaves your device.</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Account Password"
            placeholderTextColor="#71717a"
            secureTextEntry
            value={unlockPassword}
            onChangeText={setUnlockPassword}
          />
          <TouchableOpacity style={styles.unlockBtn} onPress={handleUnlock} disabled={unlocking || !unlockPassword}>
            {unlocking ? <ActivityIndicator color="#fff" /> : <Text style={styles.unlockBtnText}>Unlock Vault</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={toggleDrawer} style={styles.hamburgerBtn}>
            <Text style={styles.hamburgerIcon}>☰</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Private Journal</Text>
          <Text style={styles.headerSubtitle}>Vault Unlocked 🔓</Text>
        </View>

        <TouchableOpacity onPress={handleLock} style={styles.lockBtn}>
          <Text style={styles.lockBtnText}>🔒 Lock</Text>
        </TouchableOpacity>
      </View>

      {/* EDITOR */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.editorContent}>
          <TextInput
            style={styles.titleInput}
            placeholder="Untitled Note"
            placeholderTextColor="#52525b"
            value={entryTitle}
            onChangeText={setEntryTitle}
          />
          
          <TextInput
            style={styles.bodyInput}
            placeholder="Write your thoughts..."
            placeholderTextColor="#71717a"
            multiline
            textAlignVertical="top"
            value={entryBody}
            onChangeText={setEntryBody}
          />

          <View style={styles.composeFooter}>
            <Text style={styles.securityBadge}>🔒 {currentId ? "Editing Encrypted Entry" : "New Encrypted Entry"}</Text>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Secure Save</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* HISTORY DRAWER OVERLAY */}
      {isDrawerOpen && (
        <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={toggleDrawer} />
      )}

      {/* SLIDING HISTORY DRAWER */}
      <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: drawerAnim }] }]}>
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Your Entries</Text>
          <TouchableOpacity onPress={resetEditor} style={styles.newBtn}>
            <Text style={styles.newBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.drawerScroll}>
          {loading ? (
            <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
          ) : entries.length === 0 ? (
            <Text style={styles.emptyText}>No entries found.</Text>
          ) : (
            entries.map((entry) => (
              <TouchableOpacity key={entry.id} style={[styles.entryCard, entry.is_pinned && styles.pinnedCard, currentId === entry.id && styles.activeCard]} onPress={() => openEntry(entry)}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitleText} numberOfLines={1}>
                    {entry.decryptedObj?.title || "Untitled"}
                  </Text>
                </View>
                
                <View style={styles.entryFooter}>
                  <Text style={styles.entryDate}>
                    {new Date(entry.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </Text>
                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => togglePin(entry.id)} style={styles.actionBtn}>
                      <Text style={{ opacity: entry.is_pinned ? 1 : 0.4, fontSize: 14 }}>📌</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(entry.id)} style={styles.actionBtn}>
                      <Text style={{ fontSize: 14 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </Animated.View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  centerAll: { justifyContent: 'center', alignItems: 'center' },
  
  // Header
  backBtnAbsolute: { position: 'absolute', top: 60, left: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15, paddingTop: 10, backgroundColor: '#18181b', borderBottomWidth: 1, borderBottomColor: '#27272a', zIndex: 5 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hamburgerBtn: { padding: 8, backgroundColor: '#27272a', borderRadius: 12 },
  hamburgerIcon: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  backBtnText: { color: '#e4e4e7', fontWeight: 'bold', fontSize: 12 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 10, color: '#3b82f6', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  lockBtn: { padding: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12 },
  lockBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },

  // Vault
  vaultCard: { width: '85%', backgroundColor: '#18181b', padding: 32, borderRadius: 24, borderWidth: 1, borderColor: '#27272a', alignItems: 'center' },
  vaultIcon: { fontSize: 48, marginBottom: 16 },
  vaultTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8 },
  vaultSub: { fontSize: 14, color: '#a1a1aa', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  input: { width: '100%', backgroundColor: '#27272a', color: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16, textAlign: 'center' },
  unlockBtn: { width: '100%', backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center' },
  unlockBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Editor
  editorContent: { padding: 20, flexGrow: 1 },
  titleInput: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  bodyInput: { flex: 1, color: '#e4e4e7', fontSize: 18, lineHeight: 28, minHeight: 250 },
  composeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, marginTop: 20, borderTopWidth: 1, borderTopColor: '#27272a' },
  securityBadge: { color: '#3b82f6', fontSize: 12, fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Drawer
  drawerBackdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10 },
  drawerContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, width: DRAWER_WIDTH, backgroundColor: '#18181b', borderRightWidth: 1, borderRightColor: '#27272a', zIndex: 20, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  drawerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  newBtn: { backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  newBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 12 },
  drawerScroll: { padding: 15 },
  emptyText: { color: '#71717a', textAlign: 'center', fontStyle: 'italic', marginTop: 20 },
  
  entryCard: { backgroundColor: '#27272a', borderRadius: 12, padding: 14, marginBottom: 10 },
  pinnedCard: { borderColor: '#d97706', borderWidth: 1, backgroundColor: 'rgba(217, 119, 6, 0.05)' },
  activeCard: { borderColor: '#3b82f6', borderWidth: 1 },
  entryHeader: { marginBottom: 8 },
  entryTitleText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  entryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryDate: { color: '#a1a1aa', fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { padding: 4 }
});