import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, Animated, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Keyboard,
  ImageBackground
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio'; 
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store'; // NEW: Fast Unlock Cache
import { 
  Lock, ArrowLeft, Plus, Search, Pin, Trash2, 
  Mic, MicOff, Save, KeyRound, Book, AlertTriangle, Info, Download
} from 'lucide-react-native';
import { Button } from 'heroui-native';
import { usePreferences } from '@/context/PreferencesContext';
import apiClient from '@/api/apiClient';

// PURE JS CRYPTO
import forge from 'node-forge';
import { Buffer } from 'buffer';

// ==========================================
// TYPES
// ==========================================
interface JournalEntry { id: number; content: string; created_at: string; is_pinned: boolean; title?: string; body?: string; }
type AlertType = 'info' | 'error' | 'confirm';

// ==========================================
// PURE JS AES-GCM ENGINE (100% Web Compatible)
// ==========================================
const b64ToBytes = (b64: string): Uint8Array => new Uint8Array(Buffer.from(b64, 'base64'));

async function getSalt(): Promise<Uint8Array> {
  const res = await apiClient.get('/user/journal-salt/');
  return b64ToBytes(res.data.salt);
}

function deriveKey(password: string, salt: Uint8Array): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const md = forge.md.sha256.create();
      const saltStr = Buffer.from(salt).toString('binary');
      // Yield to React Native UI thread so the spinner animates while calculating
      setTimeout(() => {
        forge.pkcs5.pbkdf2(password, saltStr, 150000, 32, md, (err, derived) => {
          if (err) reject(err);
          else resolve(derived);
        });
      }, 50); 
    } catch (e) { 
      reject(e); 
    }
  });
}

function generateRecoveryPhrase(): string {
  const bytes = forge.random.getBytesSync(8);
  const hex = forge.util.bytesToHex(bytes).toUpperCase();
  return hex.match(/.{4}/g)!.join('-');
}

async function encryptMasterKey(rawMasterKeyStr: string, passwordKeyStr: string) {
  const iv = forge.random.getBytesSync(12);
  const cipher = forge.cipher.createCipher('AES-GCM', passwordKeyStr);
  cipher.start({ iv: iv });
  cipher.update(forge.util.createBuffer(rawMasterKeyStr));
  cipher.finish();

  const combined = cipher.output.getBytes() + cipher.mode.tag.getBytes();
  return {
    encryptedKey: Buffer.from(combined, 'binary').toString('base64'),
    iv: Buffer.from(iv, 'binary').toString('base64')
  };
}

async function unwrapMasterKey(passwordKeyStr: string, encryptedKeyB64: string, ivB64: string): Promise<string> {
  const encBytes = b64ToBytes(encryptedKeyB64);
  const ivBytes = b64ToBytes(ivB64);

  const tagLength = 16;
  const ciphertext = encBytes.slice(0, -tagLength);
  const tag = encBytes.slice(-tagLength);

  const decipher = forge.cipher.createDecipher('AES-GCM', passwordKeyStr);
  decipher.start({
    iv: Buffer.from(ivBytes).toString('binary'),
    tag: Buffer.from(tag).toString('binary')
  });
  decipher.update(forge.util.createBuffer(Buffer.from(ciphertext).toString('binary')));
  
  if (!decipher.finish()) throw new Error("Decryption failed. Incorrect password.");
  return decipher.output.getBytes();
}

async function decryptContent(payload: string, masterKeyStr: string): Promise<string> {
  const parsed = JSON.parse(payload);
  const iv = new Uint8Array(parsed.iv);
  const data = new Uint8Array(parsed.data);

  const tagLength = 16;
  const ciphertext = data.slice(0, -tagLength);
  const tag = data.slice(-tagLength);

  const decipher = forge.cipher.createDecipher('AES-GCM', masterKeyStr);
  decipher.start({
    iv: Buffer.from(iv).toString('binary'),
    tag: Buffer.from(tag).toString('binary')
  });
  decipher.update(forge.util.createBuffer(Buffer.from(ciphertext).toString('binary')));
  
  if (!decipher.finish()) throw new Error("Corrupted journal entry.");
  return forge.util.decodeUtf8(decipher.output.getBytes());
}

async function encryptContent(text: string, masterKeyStr: string): Promise<string> {
  const iv = forge.random.getBytesSync(12);
  const cipher = forge.cipher.createCipher('AES-GCM', masterKeyStr);
  cipher.start({ iv: iv });
  cipher.update(forge.util.createBuffer(forge.util.encodeUtf8(text)));
  cipher.finish();

  const ciphertext = cipher.output.getBytes();
  const tag = cipher.mode.tag.getBytes();
  const combined = ciphertext + tag; 

  const ivArray = Array.from(new Uint8Array(Buffer.from(iv, 'binary')));
  const dataArray = Array.from(new Uint8Array(Buffer.from(combined, 'binary')));

  return JSON.stringify({ iv: ivArray, data: dataArray });
}

export default function JournalScreen() {
  const router = useRouter();
  const { isDarkMode } = usePreferences();
  const insets = useSafeAreaInsets();

  // Navigation State
  const [viewMode, setViewMode] = useState<'lock' | 'list' | 'editor'>('lock');
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; type: AlertType; onConfirm?: () => void }>({ visible: false, title: '', message: '', type: 'info' });
  const [recoveryModal, setRecoveryModal] = useState(false);

  // Recovery Vault States
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');

  // Data State
  const [password, setPassword] = useState('');
  const [journalKey, setJournalKey] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Processing States
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isFastBooting, setIsFastBooting] = useState(true);

  // Editor State
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // Audio State
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDots, setRecordingDots] = useState('');
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Initialize Keyboard Tracker & Fast Unlock
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    
    // FAST UNLOCK: Check if key is already in SecureStore
    const checkFastUnlock = async () => {
      try {
        const cachedKey = await SecureStore.getItemAsync('smera_journal_key');
        if (cachedKey) {
          setJournalKey(cachedKey);
          await fetchEntries(cachedKey);
          setViewMode('list');
        }
      } catch (e) {
        console.error("Fast unlock failed", e);
      } finally {
        setIsFastBooting(false);
      }
    };
    checkFastUnlock();

    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isListening) interval = setInterval(() => setRecordingDots(prev => (prev.length >= 3 ? '' : prev + '.')), 400);
    else setRecordingDots('');
    return () => clearInterval(interval);
  }, [isListening]);

  const showAlert = (title: string, message: string, type: AlertType = 'info', onConfirm?: () => void) => {
    setAlertConfig({ visible: true, title, message, type, onConfirm });
  };

  /* =========================================
     VAULT & AUTH LOGIC
  ========================================= */
  const unlockVault = async () => {
    if (!password) return showAlert("Required", "Please enter your vault password.", "error");
    setIsUnlocking(true);

    try {
      const verify = await apiClient.post("/core/journal/verify-password/", { password });
      if (!verify.data?.valid) throw new Error("Incorrect password.");

      const salt = await getSalt();
      const vaultRes = await apiClient.get('/core/journal/vault-key/');

      let masterKeyStr: string;

      if (vaultRes.data && vaultRes.data.password_encrypted_key) {
        const passwordKeyStr = await deriveKey(password, salt);
        masterKeyStr = await unwrapMasterKey(passwordKeyStr, vaultRes.data.password_encrypted_key, vaultRes.data.password_iv);
      } else {
        masterKeyStr = forge.random.getBytesSync(32);
        const passwordKeyStr = await deriveKey(password, salt);
        const passEnc = await encryptMasterKey(masterKeyStr, passwordKeyStr);

        const recoveryPhraseStr = generateRecoveryPhrase();
        const recoveryKeyStr = await deriveKey(recoveryPhraseStr, salt);
        const recEnc = await encryptMasterKey(masterKeyStr, recoveryKeyStr);

        await apiClient.post('/core/journal/vault-key/', {
          password_encrypted_key: passEnc.encryptedKey,
          password_iv: passEnc.iv,
          recovery_encrypted_key: recEnc.encryptedKey,
          recovery_iv: recEnc.iv
        });

        showAlert("URGENT: Recovery Phrase", `Your Recovery Phrase is:\n\n${recoveryPhraseStr}\n\nWrite this down immediately!`, "info");
      }

      // SAVE FAST UNLOCK CACHE
      await SecureStore.setItemAsync('smera_journal_key', masterKeyStr);
      
      setJournalKey(masterKeyStr);
      await fetchEntries(masterKeyStr);
      setViewMode('list');

    } catch (e: any) {
      showAlert("Access Denied", e.message || "Failed to unlock vault.", "error");
    } finally {
      setIsUnlocking(false);
    }
  };

  const lockVault = async () => {
    // DESTROY FAST UNLOCK CACHE FOR SAFETY
    await SecureStore.deleteItemAsync('smera_journal_key');
    setPassword('');
    setJournalKey(null);
    setEntries([]);
    setViewMode('lock');
  };

  const executeRecovery = async () => {
    const phrase = recoveryPhrase.trim().toUpperCase();
    const newPass = recoveryPassword;

    if (!phrase || !newPass) {
      return showAlert("Missing Info", "Please enter your 16-character recovery phrase and your current login password.", "error");
    }

    setIsRecovering(true);
    await new Promise(resolve => setTimeout(resolve, 50)); // Yield to UI thread for spinner

    try {
      const verify = await apiClient.post("/core/journal/verify-password/", { password: newPass });
      if (!verify?.data?.valid) throw new Error("You MUST enter your current active account password to resync the vault.");

      const salt = await getSalt();
      const vault = (await apiClient.get('/core/journal/vault-key/')).data;
      
      const recoveryKeyStr = await deriveKey(phrase, salt);
      const masterKeyStr = await unwrapMasterKey(recoveryKeyStr, vault.recovery_encrypted_key, vault.recovery_iv);

      const newPasswordKeyStr = await deriveKey(newPass, salt);
      const passEnc = await encryptMasterKey(masterKeyStr, newPasswordKeyStr);

      await apiClient.post('/core/journal/vault-key/', {
        password_encrypted_key: passEnc.encryptedKey,
        password_iv: passEnc.iv,
        recovery_encrypted_key: vault.recovery_encrypted_key,
        recovery_iv: vault.recovery_iv
      });

      // Automatically unlock the vault to save the user a click!
      await SecureStore.setItemAsync('smera_journal_key', masterKeyStr);
      setJournalKey(masterKeyStr);
      await fetchEntries(masterKeyStr);

      setRecoveryModal(false);
      setRecoveryPhrase('');
      setRecoveryPassword('');
      setViewMode('list');

      showAlert("Success", "Vault recovery keys synced successfully. Your journal is unlocked.", "info");
    } catch (e: any) {
      showAlert("Recovery Failed", e.message || "Invalid Recovery Phrase.", "error");
    } finally {
      setIsRecovering(false);
    }
  };

  /* =========================================
     JOURNAL CRUD LOGIC
  ========================================= */
  const fetchEntries = async (key?: string) => {
    const activeKey = key ?? journalKey;
    if (!activeKey) return;
    try {
      const res = await apiClient.get('/core/journal/');
      const rawEntries = res.data;

      const decrypted = await Promise.all(rawEntries.map(async (e: any) => {
        try {
          const dec = await decryptContent(e.content, activeKey);
          let parsed: any;
          try { parsed = JSON.parse(dec); } catch { parsed = { title: "Note", body: dec }; }

          let bodyText = parsed.body || "";
          if (parsed.blocks && Array.isArray(parsed.blocks)) {
            bodyText = parsed.blocks.map((b: any) => b.content).join('\n\n');
          }
          return { ...e, title: parsed.title || "Untitled Note", body: bodyText };
        } catch {
          return { ...e, title: "⚠️ Corrupted Entry", body: "Could not decrypt this entry." };
        }
      }));
      setEntries(decrypted);
    } catch (e) { console.error(e); }
  };

  const openEditor = (entry?: any) => {
    setCurrentId(entry ? entry.id : null);
    setTitle(entry ? entry.title : '');
    setBody(entry ? entry.body : '');
    setViewMode('editor');
  };

  const saveEntry = async () => {
    if (!title.trim() || !body.trim()) {
      return showAlert("Incomplete Entry", "Both a title and content are required to securely save your journal.", "error");
    }
    
    if (!journalKey) return showAlert("Error", "Vault is locked. Please unlock first.", "error");
    
    setIsSaving(true);

    try {
      const payload = JSON.stringify({ title: title.trim(), body: body.trim() });
      const encrypted = await encryptContent(payload, journalKey);
      const rawText = `${title}\n${body}`;

      if (currentId) {
        await apiClient.put('/core/journal/update/', { id: currentId, content: encrypted, raw_text: rawText });
      } else {
        const res = await apiClient.post('/core/journal/', { content: encrypted, raw_text: rawText });
        if (res.data?.id) setCurrentId(res.data.id);
      }

      await fetchEntries();
      setViewMode('list');
    } catch (e) {
      showAlert("Save Failed", "Could not securely save your entry.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (id: number) => {
    showAlert("Delete Entry?", "This will permanently delete this encrypted entry. This action cannot be undone.", "confirm", async () => {
      setIsDeleting(true);
      try {
        await apiClient.delete('/core/journal/delete/', { data: { id } });
        await fetchEntries();
        if (currentId === id) setViewMode('list');
        setAlertConfig(prev => ({ ...prev, visible: false }));
      } catch (e) { 
        showAlert("Error", "Failed to delete entry.", "error"); 
      } finally {
        setIsDeleting(false);
      }
    });
  };

  const togglePin = async (id: number) => {
    try {
      await apiClient.post(`/core/journal/${id}/pin/`);
      fetchEntries();
    } catch (e) { console.error(e); }
  };

  /* =========================================
     PDF EXPORT
  ========================================= */
  const exportJournalToPDF = async () => {
    if (entries.length === 0) return showAlert("Empty", "No entries to export.", "info");
    setIsExporting(true);
    try {
      const exportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      let contentHtml = `<div style="text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 40px;"><h1 style="font-size: 28px; color: #1e3a8a; margin: 0 0 10px 0; font-family: 'Georgia', serif;">My Private Journal</h1><p style="color: #6b7280; font-size: 14px; font-family: 'Helvetica', sans-serif; margin: 0;">Securely exported on ${exportDate}</p></div>`;

      entries.forEach(item => {
          const dateObj = new Date(item.created_at);
          const safeTitle = (item.title || "Untitled Note").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const safeContent = (item.body || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
          
          contentHtml += `
            <div style="margin-bottom: 50px; page-break-inside: avoid;">
              <h2 style="font-size: 22px; color: #111827; margin: 0 0 5px 0; font-family: 'Georgia', serif;">${safeTitle}</h2>
              <p style="font-size: 12px; color: #9ca3af; font-family: 'Helvetica', sans-serif; border-bottom: 1px solid #f3f4f6; padding-bottom: 12px; margin: 0 0 20px 0;">
                ${dateObj.toLocaleString()}
              </p>
              <div style="font-family: 'Helvetica', sans-serif; font-size: 14px; line-height: 1.7; color: #374151;">
                ${safeContent}
              </div>
            </div>`;
      });

      const html = `<html><head><meta charset="utf-8"><style>body { background: #ffffff; padding: 40px 80px; color: #000000; } @media print { body { padding: 0; } @page { margin: 1in; } }</style></head><body>${contentHtml}</body></html>`;

      const { base64 } = await Print.printToFileAsync({ html, base64: true });
      if (!base64) throw new Error("Failed to generate PDF.");

      const safePdfPath = `${FileSystem.documentDirectory}My_Secure_Journal_${Date.now()}.pdf`;
      await FileSystem.writeAsStringAsync(safePdfPath, base64, { encoding: FileSystem.EncodingType.Base64 });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(safePdfPath, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Export Journal' });
      }
    } catch (e: any) {
      showAlert("Export Failed", e.message || "Could not generate PDF.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  /* =========================================
     DICTATION LOGIC
  ========================================= */
  const handleDictation = async () => {
    try {
      if (isListening) {
        setIsListening(false);
        setIsTranscribing(true);
        await audioRecorder.stop();
        if (audioRecorder.uri) await uploadVoiceChunk(audioRecorder.uri);
        else { setIsTranscribing(false); showAlert("Error", "Could not capture the audio file.", "error"); }
      } else {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (permission.granted) {
          await audioRecorder.prepareToRecordAsync();
          audioRecorder.record();
          setIsListening(true);
        } else {
          showAlert("Permission Required", "Microphone access is required to use dictation.", "error");
        }
      }
    } catch (error: any) {
      setIsListening(false); setIsTranscribing(false);
      showAlert("Recording Error", error.message || "Unable to access the microphone.", "error");
    }
  };

  const uploadVoiceChunk = async (uri: string) => {
    try {
      const formData = new FormData();
      const match = /\.([a-zA-Z0-9]+)$/.exec(uri);
      const extension = match ? match[1] : 'm4a';
      formData.append('audio', { uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''), name: `audio.${extension}`, type: `audio/${extension}` } as any);

      const res = await apiClient.post('/core/chat/stt/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

      if (res.data?.text) setBody(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + res.data.text);
      else showAlert("Notice", "No speech detected. Please try again.", "info");
    } catch (e) {
      showAlert("Failed", "Could not transcribe audio.", "error");
    } finally {
      setIsTranscribing(false);
    }
  };

  /* =========================================
     UI RENDERERS
  ========================================= */
  const CustomAlert = () => (
    <Modal visible={alertConfig.visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
        <View className="w-full max-w-sm bg-white dark:bg-[#111827] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
          
          <View className="flex-row items-center gap-3 mb-4">
            {alertConfig.type === 'error' && <AlertTriangle size={24} color="#ef4444" />}
            {alertConfig.type === 'confirm' && <AlertTriangle size={24} color="#f59e0b" />}
            {alertConfig.type === 'info' && <Info size={24} color={isDarkMode ? "#60a5fa" : "#3b82f6"} />}
            <Text className="text-xl font-black text-slate-900 dark:text-white flex-1">{alertConfig.title}</Text>
          </View>
          
          <Text className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed mb-8">{alertConfig.message}</Text>
          
          {alertConfig.type === 'confirm' ? (
            <View className="flex-row gap-3">
              <Button onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))} className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl h-12" disabled={isDeleting}>
                <Text className="font-bold text-slate-700 dark:text-slate-300">Cancel</Text>
              </Button>
              <Button onPress={alertConfig.onConfirm} className="flex-1 bg-red-500 rounded-xl h-12" disabled={isDeleting}>
                {isDeleting ? <ActivityIndicator size="small" color="#ffffff" /> : <Text className="font-bold text-white">Delete</Text>}
              </Button>
            </View>
          ) : (
            <Button onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))} className="w-full bg-blue-600 rounded-xl h-12">
              <Text className="font-bold text-white text-base">Understood</Text>
            </Button>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderLockScreen = () => {
    // Hide lock screen UI if we are in the middle of fast-booting the cache
    if (isFastBooting) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color={isDarkMode ? "#60a5fa" : "#2563eb"} />
            </View>
        );
    }

    return (
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-sm bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl border border-slate-200/50 dark:border-neutral-800 rounded-[2.5rem] p-8 shadow-2xl shadow-blue-500/10 items-center">
          <View className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-full items-center justify-center mb-6 border border-blue-100 dark:border-blue-900/50">
            <Lock size={32} color={isDarkMode ? "#60a5fa" : "#2563eb"} />
          </View>
          <Text className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Private Journal</Text>
          <Text className="text-slate-500 dark:text-slate-400 text-center text-sm mb-8 leading-relaxed">
            Your thoughts are end-to-end encrypted. Enter your login password to unlock the vault.
          </Text>

          <View className="w-full mb-6">
            <TextInput 
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Enter password..."
              placeholderTextColor={isDarkMode ? "#6b7280" : "#9ca3af"}
              editable={!isUnlocking}
              className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-neutral-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-medium focus:border-blue-500 transition-colors"
            />
          </View>

          <Button onPress={unlockVault} disabled={isUnlocking || !password} className="w-full bg-blue-600 rounded-2xl h-14 shadow-lg shadow-blue-500/30">
            {isUnlocking ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#ffffff" size="small" />
                <Text className="font-bold text-white text-base">Decrypting Vault...</Text>
              </View>
            ) : (
              <Text className="font-bold text-white text-base">Unlock Vault</Text>
            )}
          </Button>

          <TouchableOpacity onPress={() => setRecoveryModal(true)} className="mt-6" disabled={isUnlocking}>
            <Text className="text-sm font-medium text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 underline">
              Forgot Password? Recover Vault
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderList = () => {
    const filtered = entries.filter(e => 
      (e.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
      (e.body || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
    const pinned = filtered.filter(e => e.is_pinned);
    const unpinned = filtered.filter(e => !e.is_pinned);

    const EntryCard = ({ item }: { item: JournalEntry }) => (
      <TouchableOpacity 
        onPress={() => openEditor(item)}
        className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-5 mb-3 shadow-sm flex-row items-start justify-between active:scale-[0.98] transition-transform"
      >
        <View className="flex-1 pr-4">
          <Text className="text-lg font-black text-slate-900 dark:text-white mb-1.5 tracking-tight" numberOfLines={1}>{item.title || "Untitled Note"}</Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 leading-snug" numberOfLines={2}>{item.body || "No content..."}</Text>
          <Text className="text-[10px] font-bold text-blue-500 dark:text-blue-400 mt-4 uppercase tracking-widest">
            {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity onPress={() => togglePin(item.id)} className="p-2.5 bg-slate-50 dark:bg-black rounded-xl">
            <Pin size={16} color={item.is_pinned ? "#f59e0b" : (isDarkMode ? "#6b7280" : "#94a3b8")} fill={item.is_pinned ? "#f59e0b" : "none"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(item.id)} className="p-2.5 bg-red-50 dark:bg-red-900/10 rounded-xl">
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );

    return (
      <View className="flex-1">
        <View className="pt-14 pb-4 px-6 flex-row items-center justify-between border-b border-slate-200/50 dark:border-neutral-800/50 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl items-center justify-center border border-indigo-200 dark:border-indigo-800/50">
              <Book size={20} color={isDarkMode ? "#818cf8" : "#4f46e5"} />
            </View>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Journal</Text>
          </View>
          
          <View className="flex-row items-center gap-2">
            <TouchableOpacity onPress={exportJournalToPDF} disabled={isExporting} className="p-2.5 bg-slate-100 dark:bg-neutral-800 rounded-xl">
              {isExporting ? <ActivityIndicator size="small" color={isDarkMode ? "#cbd5e1" : "#475569"} /> : <Download size={18} color={isDarkMode ? "#cbd5e1" : "#475569"} />}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={lockVault} className="p-2.5 bg-slate-100 dark:bg-neutral-800 rounded-xl">
              <Lock size={18} color={isDarkMode ? "#cbd5e1" : "#475569"} />
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-6 py-4 flex-row items-center gap-3">
          <View className="flex-1 flex-row items-center h-14 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl px-4 shadow-sm">
            <Search size={20} color={isDarkMode ? "#6b7280" : "#9ca3af"} />
            <TextInput 
              value={searchQuery} 
              onChangeText={setSearchQuery} 
              placeholder="Search secure vault..." 
              placeholderTextColor={isDarkMode ? "#6b7280" : "#9ca3af"}
              className="flex-1 ml-3 text-base text-slate-900 dark:text-white font-medium h-full"
              style={{ paddingVertical: 0 }}
            />
          </View>
          <TouchableOpacity onPress={() => openEditor()} className="w-14 h-14 bg-blue-600 rounded-2xl items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95">
            <Plus size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6 pt-2" showsVerticalScrollIndicator={false}>
          {entries.length === 0 ? (
            <View className="items-center justify-center py-20 opacity-70">
              <Book size={64} color={isDarkMode ? "#334155" : "#cbd5e1"} className="mb-4" />
              <Text className="text-lg font-bold text-slate-400">Your vault is empty.</Text>
            </View>
          ) : (
            <View className="pb-24">
              {pinned.length > 0 && (
                <View className="mb-6">
                  <View className="flex-row items-center gap-2 mb-3 px-2">
                    <Pin size={14} color="#f59e0b" fill="#f59e0b" />
                    <Text className="text-[10px] font-black uppercase tracking-widest text-amber-500">Pinned</Text>
                  </View>
                  {pinned.map(e => <EntryCard key={e.id} item={e} />)}
                </View>
              )}
              {unpinned.length > 0 && (
                <View>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 px-2">Recent Entries</Text>
                  {unpinned.map(e => <EntryCard key={e.id} item={e} />)}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderEditor = () => (
    <ImageBackground 
      source={{ uri: 'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png' }}
      style={{ flex: 1, backgroundColor: isDarkMode ? '#0b141a' : '#ffffff' }}
      imageStyle={{ opacity: isDarkMode ? 0.08 : 0.4, resizeMode: 'cover', tintColor: isDarkMode ? '#ffffff' : '#000000' }}
    >
      <View className="pt-14 pb-4 px-4 flex-row items-center justify-between border-b border-slate-100 dark:border-neutral-800/50 bg-white/90 dark:bg-black/90 backdrop-blur-md z-10">
        <TouchableOpacity onPress={() => setViewMode('list')} className="flex-row items-center gap-1.5 p-2 text-slate-600 dark:text-slate-300">
          <ArrowLeft size={20} color={isDarkMode ? "#cbd5e1" : "#475569"} />
          <Text className="font-bold text-base text-slate-600 dark:text-slate-300">Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={saveEntry} disabled={isSaving} className={`px-5 py-2.5 rounded-full flex-row items-center gap-2 shadow-sm ${isSaving ? 'bg-slate-200 dark:bg-neutral-800' : 'bg-emerald-600 dark:bg-emerald-500'}`}>
          {isSaving ? <ActivityIndicator size="small" color={isDarkMode ? "#94a3b8" : "#64748b"} /> : <Save size={16} color="#ffffff" />}
          <Text className={`font-bold ${isSaving ? 'text-slate-500' : 'text-white'}`}>{isSaving ? 'Encrypting...' : 'Save Securely'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1" 
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, paddingBottom: Platform.OS === 'android' ? keyboardHeight + 120 : 120 }}
      >
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Untitled Note..."
          placeholderTextColor={isDarkMode ? "#4b5563" : "#9ca3af"}
          className="text-3xl font-black text-slate-900 dark:text-white mb-6 border-b border-transparent focus:border-slate-200 dark:focus:border-neutral-800 pb-2 tracking-tight"
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Write your thoughts here... They are strictly encrypted and secure."
          placeholderTextColor={isDarkMode ? "#4b5563" : "#9ca3af"}
          multiline
          textAlignVertical="top"
          className="text-lg leading-relaxed text-slate-800 dark:text-slate-200 min-h-[300px]"
        />
      </ScrollView>

      {/* Floating Audio Feedback Pill */}
      {(isListening || isTranscribing) && (
        <Animated.View 
          className="absolute z-20 bg-slate-900 dark:bg-slate-100 px-4 py-2.5 rounded-full shadow-2xl flex-row items-center gap-2"
          style={{ 
            right: 24, 
            bottom: Platform.OS === 'android' ? keyboardHeight + Math.max(insets.bottom + 16, 24) + 70 : Math.max(insets.bottom + 16, 24) + 70 
          }}
        >
          {isTranscribing ? (
            <ActivityIndicator size="small" color={isDarkMode ? "#000000" : "#ffffff"} />
          ) : (
            <View className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          )}
          <Text className="text-white dark:text-black font-bold text-xs tracking-wider">
            {isListening ? `Listening${recordingDots}` : 'Transcribing...'}
          </Text>
        </Animated.View>
      )}

      {/* Floating Dictation Button */}
      <Animated.View 
        style={{ 
          position: 'absolute', right: 24, zIndex: 20,
          bottom: Platform.OS === 'android' ? keyboardHeight + Math.max(insets.bottom + 16, 24) : Math.max(insets.bottom + 16, 24) 
        }}
      >
        <TouchableOpacity 
          onPress={handleDictation}
          disabled={isTranscribing}
          className={`w-14 h-14 rounded-full items-center justify-center shadow-xl ${isListening ? 'bg-red-500 shadow-red-500/40 animate-pulse' : 'bg-blue-600 shadow-blue-500/40 active:scale-90 transition-transform'}`}
        >
          {isTranscribing ? <ActivityIndicator color="#ffffff" /> : isListening ? <MicOff size={24} color="#ffffff" /> : <Mic size={24} color="#ffffff" />}
        </TouchableOpacity>
      </Animated.View>
    </ImageBackground>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={Platform.OS === 'ios'}>
      <View className="flex-1 bg-neutral-50 dark:bg-black relative">
        <LinearGradient colors={isDarkMode ? ['rgba(63,94,251,0.08)', 'transparent'] : ['rgba(99,102,241,0.1)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 450 }} />

        <CustomAlert />

        {viewMode === 'lock' && renderLockScreen()}
        {viewMode === 'list' && renderList()}
        {viewMode === 'editor' && renderEditor()}

        <Modal visible={recoveryModal} transparent animationType="slide">
          <View className="flex-1 bg-black/80 backdrop-blur-md justify-end">
            <View className="bg-white dark:bg-neutral-900 rounded-t-[2.5rem] p-8 pb-12 shadow-2xl border-t border-slate-200 dark:border-neutral-800" style={{ paddingBottom: Math.max(insets.bottom + 20, 40) }}>
              <View className="w-12 h-1.5 bg-slate-200 dark:bg-neutral-800 rounded-full mx-auto mb-6" />
              
              <View className="flex-row items-center gap-3 mb-6">
                <View className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full items-center justify-center border border-amber-200 dark:border-amber-800/50">
                  <KeyRound size={24} color={isDarkMode ? "#fbbf24" : "#d97706"} />
                </View>
                <View>
                  <Text className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Vault Recovery</Text>
                  <Text className="text-slate-500 dark:text-slate-400 text-sm">Resync your encryption keys.</Text>
                </View>
              </View>
              
              <TextInput 
                value={recoveryPhrase}
                onChangeText={setRecoveryPhrase}
                placeholder="16-Character Recovery Phrase" 
                placeholderTextColor={isDarkMode ? "#6b7280" : "#9ca3af"} 
                className="bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-neutral-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white mb-4 uppercase font-mono tracking-widest" 
              />
              <TextInput 
                value={recoveryPassword}
                onChangeText={setRecoveryPassword}
                placeholder="Current Login Password" 
                secureTextEntry 
                placeholderTextColor={isDarkMode ? "#6b7280" : "#9ca3af"} 
                className="bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-neutral-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white mb-6" 
              />
              
              <View className="flex-row gap-3">
                <Button onPress={() => setRecoveryModal(false)} className="flex-1 bg-slate-100 dark:bg-neutral-800 rounded-2xl h-14" disabled={isRecovering}>
                  <Text className="font-bold text-slate-700 dark:text-slate-300 text-base">Cancel</Text>
                </Button>
                <Button onPress={executeRecovery} className="flex-[2] bg-blue-600 rounded-2xl h-14 shadow-lg shadow-blue-500/30" disabled={isRecovering}>
                  {isRecovering ? <ActivityIndicator color="#fff"/> : <Text className="font-bold text-white text-base">Recover</Text>}
                </Button>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </KeyboardAvoidingView>
  );
}