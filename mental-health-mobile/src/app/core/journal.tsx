import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Keyboard,
  ImageBackground, useWindowDimensions, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio'; 
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { 
  Lock, ArrowLeft, Plus, Search, Pin, Trash2, 
  Mic, MicOff, KeyRound, AlertTriangle, Info, Download, ShieldCheck
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
interface JournalBlock { id: string; type: string; content: string; checked?: boolean; }
interface JournalEntry { id: number; content: string; created_at: string; is_pinned: boolean; title?: string; body?: string; blocks?: JournalBlock[]; }
type AlertType = 'info' | 'error' | 'confirm';

// ==========================================
// PURE JS AES-GCM ENGINE (100% Web Compatible)
// ==========================================
const b64ToBytes = (b64: string): Uint8Array => new Uint8Array(Buffer.from(b64, 'base64'));

async function getSalt(): Promise<Uint8Array> {
  const saltRes = await apiClient.get('/user/journal-salt/');
  return b64ToBytes(saltRes.data.salt);
}

function deriveKey(password: string, salt: Uint8Array): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const md = forge.md.sha256.create();
      const saltStr = Buffer.from(salt).toString('binary');
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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768; // Web-like Split View breakpoint

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
  const [activeDays, setActiveDays] = useState(0);
  
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
  const [blocks, setBlocks] = useState<JournalBlock[]>([{ id: Date.now().toString(), type: 'text', content: '' }]);

  // Audio State
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    
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

      // If the vault already exists, unwrap it.
      if (vaultRes.data && vaultRes.data.password_encrypted_key) {
        const passwordKeyStr = await deriveKey(password, salt);
        masterKeyStr = await unwrapMasterKey(passwordKeyStr, vaultRes.data.password_encrypted_key, vaultRes.data.password_iv);
      } 
      // If no vault exists, generate new Master Key and Recovery Phrase!
      else {
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

        // FIXED: Wait until the user clicks 'OK' to proceed, mimicking the web browser alert exactly
        await new Promise<void>((resolve) => {
            Alert.alert(
                "URGENT: Your Recovery Phrase is:",
                `${recoveryPhraseStr}\n\nWrite this down immediately! If you lose your recovery phrase, you will not be able to recover your journal if you ever change or forget your password.`,
                [{ text: "OK", style: "default", onPress: () => resolve() }]
            );
        });
      }

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
    await new Promise(resolve => setTimeout(resolve, 50));

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
      const uniqueDays = new Set<string>();

      const decrypted = await Promise.all(rawEntries.map(async (e: any) => {
        try {
          const dec = await decryptContent(e.content, activeKey);
          let parsed: any;
          try { parsed = JSON.parse(dec); } catch { parsed = { title: "Note", body: dec }; }

          uniqueDays.add(new Date(e.created_at).toDateString());
          return { ...e, title: parsed.title || "Untitled Note", body: parsed.body, blocks: parsed.blocks };
        } catch {
          return { ...e, title: "⚠️ Corrupted Entry", body: "Could not decrypt this entry." };
        }
      }));
      
      setActiveDays(uniqueDays.size);
      setEntries(decrypted);
    } catch (e) { console.error(e); }
  };

  const newEntry = () => {
    setCurrentId(null);
    setTitle('');
    setBlocks([{ id: Date.now().toString(), type: 'text', content: '' }]);
    setViewMode('editor');
  };

  const openEditor = (entry: any) => {
    setCurrentId(entry.id);
    setTitle(entry.title || '');
    
    // Load blocks or format legacy body text into blocks
    if (entry.blocks && Array.isArray(entry.blocks) && entry.blocks.length > 0) {
      setBlocks(entry.blocks.map((b: any, i: number) => ({ id: `${Date.now()}-${i}`, type: b.type || 'text', content: b.content })));
    } else {
      setBlocks([{ id: Date.now().toString(), type: 'text', content: entry.body || '' }]);
    }
    
    setViewMode('editor');
  };

  const addBlock = (content: string = '') => {
    setBlocks([...blocks, { id: Date.now().toString(), type: 'text', content }]);
  };

  const updateBlock = (id: string, content: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const saveEntry = async () => {
    const hasContent = blocks.some(b => b.content.trim() !== "");
    if (!title.trim() && !hasContent) {
      return showAlert("Incomplete", "Provide a title or content to save.", "error");
    }
    if (!journalKey) return;
    
    setIsSaving(true);
    try {
      const payload = JSON.stringify({ 
        title: title.trim(), 
        blocks: blocks.map(b => ({ type: b.type, content: b.content, checked: b.checked }))
      });
      const encrypted = await encryptContent(payload, journalKey);
      const rawText = `${title}\n${blocks.map(b => b.content).join('\n')}`;

      if (currentId) {
        await apiClient.put('/core/journal/update/', { id: currentId, content: encrypted, raw_text: rawText });
      } else {
        const res = await apiClient.post('/core/journal/', { content: encrypted, raw_text: rawText });
        if (res.data?.id) setCurrentId(res.data.id);
      }

      await fetchEntries();
      if (!isDesktop) setViewMode('list');
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
        if (currentId === id) newEntry();
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
          let safeContent = "";
          
          if (item.blocks && item.blocks.length) {
              safeContent = item.blocks.map(b => `<p style="margin: 0 0 10px 0; color: #374151;">${(b.content || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`).join("");
          } else {
              safeContent = (item.body || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
          }
          
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

      if (res.data?.text) {
          addBlock(res.data.text);
      } else {
          showAlert("Notice", "No speech detected. Please try again.", "info");
      }
    } catch (e) {
      showAlert("Failed", "Could not transcribe audio.", "error");
    } finally {
      setIsTranscribing(false);
    }
  };

  /* =========================================
     RENDER FUNCTIONS (FIXES FOCUS BUG)
  ========================================= */

  const renderCustomAlert = () => (
    <Modal visible={alertConfig.visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
        <View className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
          
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

  const renderHeader = () => (
    <View className="flex-row justify-between items-center mb-6">
      <View className="flex-row items-center gap-3">
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">
          🔐 Private Journal
        </Text>
        <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 hidden sm:flex">
          <ShieldCheck size={12} color={isDarkMode ? "#4ade80" : "#15803d"} />
          <Text className="text-xs font-medium text-green-700 dark:text-green-400">Encrypted</Text>
        </View>
      </View>

      <TouchableOpacity onPress={lockVault} className="bg-slate-200 dark:bg-slate-700 px-4 py-2 rounded-xl active:scale-95 transition-transform">
        <Text className="text-sm font-medium text-red-500">🔒 Lock</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLockScreen = () => (
    <View className="flex-1 items-center justify-center p-6">
      <View className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-10 items-center shadow-2xl">
        
        <View className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-100 dark:border-blue-900/50">
           <Lock size={32} color={isDarkMode ? "#60a5fa" : "#2563eb"} />
        </View>
        
        <Text className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
            Local Decryption
        </Text>
        <Text className="text-slate-500 dark:text-slate-400 mb-8 text-sm text-center leading-relaxed">
            Your journal is securely encrypted. Your passphrase never leaves your device.
        </Text>

        <TextInput 
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Enter password"
          placeholderTextColor={isDarkMode ? "#4b5563" : "#9ca3af"}
          editable={!isUnlocking}
          onSubmitEditing={unlockVault}
          className="w-full block px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl mb-4 focus:border-blue-500 shadow-sm"
        />

        <Button onPress={unlockVault} disabled={isUnlocking || !password} className="w-full bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 rounded-xl py-3.5 mb-4 shadow-lg shadow-blue-500/30">
          {isUnlocking ? <ActivityIndicator color="#ffffff" /> : <Text className="font-bold text-white">Unlock Vault</Text>}
        </Button>

        <TouchableOpacity onPress={() => setRecoveryModal(true)} disabled={isUnlocking} className="mb-6 w-full items-center">
          <Text className="text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 underline">
            Changed Your Password? Recover Vault
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/dashboard')} className="flex-row items-center gap-2 mt-2">
            <ArrowLeft size={16} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
            <Text className="text-sm text-slate-500 dark:text-slate-400 font-medium">Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderListPane = () => {
    const filtered = entries.filter(e => 
      (e.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
      (e.blocks?.some(b => b.content.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (e.body || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
    const pinned = filtered.filter(e => e.is_pinned);
    const unpinned = filtered.filter(e => !e.is_pinned);

    return (
      <ImageBackground 
        source={{ uri: 'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png' }}
        style={{ flex: 1, backgroundColor: isDarkMode ? '#0b141a' : '#ffffff' }}
        imageStyle={{ opacity: isDarkMode ? 0.8 : 0.8, filter: isDarkMode ? 'invert(1)' : 'none', resizeMode: 'repeat' }}
        className="flex-1 flex-col border border-indigo-100 dark:border-indigo-900/50 rounded-[2rem] shadow-xl overflow-hidden"
      >
        <View className="flex-col gap-2 p-4 pb-2 border-b border-amber-100 dark:border-slate-800 bg-amber-50 dark:bg-[#202020] z-10 relative">
          <View className="flex-row justify-between items-center">
            <Text className="font-bold text-slate-800 dark:text-slate-200 text-lg">Entries</Text>
            <TouchableOpacity onPress={newEntry} className="bg-indigo-600 px-3 py-1.5 rounded-lg shadow-sm">
                <Text className="text-white text-sm font-bold">+ New</Text>
            </TouchableOpacity>
          </View>
          <TextInput 
            value={searchQuery} onChangeText={setSearchQuery}
            placeholder="Search encrypted entries..."
            placeholderTextColor={isDarkMode ? "#6b7280" : "#9ca3af"}
            className="w-full mt-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm dark:text-white"
          />
          <View className="flex-row justify-between items-center mt-2 px-1">
             <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium">{activeDays} days active</Text>
             <TouchableOpacity onPress={exportJournalToPDF} className="flex-row items-center gap-1">
                {isExporting ? <ActivityIndicator size="small" /> : <Download size={12} color={isDarkMode ? "#9ca3af" : "#64748b"}/>}
                <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium">Export</Text>
             </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 pt-2">
          {pinned.length > 0 && (
            <View className="mb-4">
              <View className="flex-row items-center gap-1.5 mt-2 mb-3 px-1">
                <Pin size={12} color="#f59e0b" fill="#f59e0b" />
                <Text className="text-xs font-bold text-amber-500 uppercase tracking-widest">Pinned</Text>
              </View>
              {pinned.map(e => (
                <TouchableOpacity key={e.id} onPress={() => openEditor(e)} className={`p-4 border rounded-xl mb-3 ${currentId === e.id ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-transparent dark:bg-slate-900/80 border-slate-200 dark:border-slate-700'}`}>
                   <View className="flex-row justify-between items-start mb-2">
                      <Text className={`flex-1 text-sm font-bold truncate pr-2 ${currentId === e.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`} numberOfLines={1}>{e.title || "Untitled Note"}</Text>
                      <TouchableOpacity onPress={() => togglePin(e.id)} className="p-1"><Pin size={14} color="#f59e0b" fill="#f59e0b"/></TouchableOpacity>
                   </View>
                   <Text className={`text-xs font-medium ${currentId === e.id ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'}`}>{new Date(e.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {unpinned.map(e => (
            <TouchableOpacity key={e.id} onPress={() => openEditor(e)} className={`p-4 border rounded-xl mb-3 ${currentId === e.id ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-transparent dark:bg-slate-900/80 border-slate-200 dark:border-slate-700'}`}>
               <View className="flex-row justify-between items-start mb-2">
                  <Text className={`flex-1 text-sm font-bold truncate pr-2 ${currentId === e.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`} numberOfLines={1}>{e.title || "Untitled Note"}</Text>
                  <TouchableOpacity onPress={() => togglePin(e.id)} className="p-1"><Pin size={14} color={isDarkMode ? "#64748b" : "#cbd5e1"} /></TouchableOpacity>
               </View>
               <Text className={`text-xs font-medium ${currentId === e.id ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'}`}>{new Date(e.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            </TouchableOpacity>
          ))}
          <View className="h-10"/>
        </ScrollView>
      </ImageBackground>
    );
  };

  const renderEditorPane = () => {
    return (
      <ImageBackground 
        source={{ uri: 'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png' }}
        style={{ flex: 1, backgroundColor: isDarkMode ? '#0b141a' : '#ffffff' }}
        imageStyle={{ opacity: isDarkMode ? 0.8 : 0.8, filter: isDarkMode ? 'invert(1)' : 'none', resizeMode: 'repeat' }}
        className="flex-1 flex-col border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden"
      >
        <ScrollView className="flex-1" contentContainerStyle={{ padding: isDesktop ? 32 : 24, paddingBottom: keyboardHeight + 100 }}>
          {!isDesktop && (
             <TouchableOpacity onPress={() => setViewMode('list')} className="flex-row items-center gap-2 mb-6">
                <ArrowLeft size={16} color={isDarkMode ? "#60a5fa" : "#2563eb"} />
                <Text className="text-sm font-bold text-blue-600 dark:text-blue-400">Back to Entries</Text>
             </TouchableOpacity>
          )}

          <TextInput 
            value={title} onChangeText={setTitle}
            placeholder="Untitled Note"
            placeholderTextColor={isDarkMode ? "#6b7280" : "#9ca3af"}
            className="text-3xl md:text-4xl font-black mb-4 bg-transparent outline-none text-slate-900 dark:text-white tracking-tight"
          />

          <View className="flex-1 space-y-3 mb-6">
            {blocks.map(block => (
               <View key={block.id} className="flex-row mb-3 group">
                  <TextInput
                     value={block.content} onChangeText={(t) => updateBlock(block.id, t)}
                     multiline textAlignVertical="top"
                     placeholder="Write your thoughts here..."
                     placeholderTextColor={isDarkMode ? "#4b5563" : "#9ca3af"}
                     className="flex-1 text-slate-800 dark:text-slate-200 text-base leading-relaxed bg-transparent"
                  />
               </View>
            ))}
          </View>

          <View className="flex-row flex-wrap items-center gap-4 mt-6 pt-2">
             <TouchableOpacity onPress={() => addBlock()} className="flex-row items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-200/50 dark:bg-slate-800/50">
                <Text className="text-slate-600 dark:text-slate-400 text-sm font-bold">+ Add block</Text>
             </TouchableOpacity>

             <TouchableOpacity onPress={handleDictation} disabled={isTranscribing} className={`flex-row items-center gap-2 px-3 py-1.5 rounded-lg focus:outline-none ${isListening ? 'bg-red-50 dark:bg-red-900/30' : 'bg-blue-50 dark:bg-blue-900/30'}`}>
                {isListening ? <MicOff size={16} color="#ef4444" /> : <Mic size={16} color="#2563eb" />}
                <Text className={`text-sm font-bold ${isListening ? 'text-red-500 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  {isTranscribing ? 'Transcribing...' : isListening ? 'Listening...' : 'Start Dictation'}
                </Text>
             </TouchableOpacity>
          </View>

          <View className="flex-row justify-between items-center mt-6 pt-4 border-t border-slate-300 dark:border-slate-700 gap-4">
             <TouchableOpacity onPress={() => currentId && confirmDelete(currentId)}>
                 <Text className="text-red-500 font-bold text-sm">Delete</Text>
             </TouchableOpacity>
             <TouchableOpacity onPress={saveEntry} disabled={isSaving} className="bg-[#497b30] px-8 py-3 rounded-xl shadow-lg active:scale-95">
                 {isSaving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">Securely Save</Text>}
             </TouchableOpacity>
          </View>
        </ScrollView>
      </ImageBackground>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={Platform.OS === 'ios'}>
      <View className="flex-1 bg-slate-100 dark:bg-slate-950 relative">

        {renderCustomAlert()}

        {/* Display loading or Lock Screen without absolute overlay issues */}
        {viewMode === 'lock' && (isFastBooting ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={isDarkMode ? "#60a5fa" : "#2563eb"} />
          </View>
        ) : renderLockScreen())}

        {/* Core Layout Structure */}
        {viewMode !== 'lock' && (
          <View className="max-w-7xl mx-auto w-full flex-1 px-4 md:px-6 py-6">
            {renderHeader()}
            {isDesktop ? (
              <View className="flex-row flex-1 gap-6">
                 <View className="flex-1">{renderListPane()}</View>
                 <View className="flex-[2]">{renderEditorPane()}</View>
              </View>
            ) : (
              viewMode === 'list' ? renderListPane() : renderEditorPane()
            )}
          </View>
        )}

        {/* Modal: Vault Recovery mapped directly from web */}
        <Modal visible={recoveryModal} transparent animationType="slide">
          <View className="flex-1 bg-slate-900/80 backdrop-blur-md justify-center px-4">
            <View className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-700 mx-auto">
              
              <View className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 rounded-full items-center justify-center border border-amber-100 dark:border-amber-900/50 mx-auto mb-6">
                <KeyRound size={32} color={isDarkMode ? "#f59e0b" : "#f59e0b"} />
              </View>
              
              <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight text-center mb-2">Vault Recovery</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm text-center mb-8 leading-relaxed">Enter your 16-character recovery phrase to regain access and securely re-encrypt your journal.</Text>
              
              <View className="mb-5">
                 <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-widest">Recovery Phrase</Text>
                 <TextInput 
                   value={recoveryPhrase} onChangeText={setRecoveryPhrase}
                   placeholder="XXXX-XXXX-XXXX-XXXX" placeholderTextColor={isDarkMode ? "#4b5563" : "#9ca3af"} 
                   className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white uppercase font-mono tracking-wider shadow-inner" 
                 />
              </View>
              
              <View className="mb-8">
                 <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-widest">Current Login Password</Text>
                 <TextInput 
                   value={recoveryPassword} onChangeText={setRecoveryPassword} secureTextEntry 
                   placeholder="Enter your valid account password" placeholderTextColor={isDarkMode ? "#4b5563" : "#9ca3af"} 
                   className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white shadow-inner" 
                 />
              </View>
              
              <View className="flex-row gap-3">
                <Button onPress={() => setRecoveryModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl py-3.5" disabled={isRecovering}>
                  <Text className="font-bold text-slate-800 dark:text-white">Cancel</Text>
                </Button>
                <Button onPress={executeRecovery} className="flex-[2] bg-blue-600 hover:bg-blue-700 rounded-xl py-3.5 shadow-lg shadow-blue-500/30" disabled={isRecovering}>
                  {isRecovering ? <ActivityIndicator color="#fff"/> : <Text className="font-bold text-white">Recover Access</Text>}
                </Button>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </KeyboardAvoidingView>
  );
}