import React, { useState, useRef, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, 
  Keyboard, Alert, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import apiClient from '../../api/apiClient';

interface ActionCard {
  type: string;
  title: string;
  description?: string;
  url?: string;
  consultation_url?: string;
  helplines?: { name: string; phone: string }[];
}

interface Message {
  id?: number | string;
  role: 'user' | 'bot' | 'system';
  content: string;
  action_card?: ActionCard | null;
}

interface Session {
  id: number;
  title?: string;
  preview?: string;
  created_at: string;
  is_pinned: boolean;
}

export default function ChatbotScreen() {
  const router = useRouter();
  
  // State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  // --- API Calls ---

  const loadSessions = async () => {
    try {
      const res = await apiClient.get('/core/chat/sessions/');
      setSessions(res.data);
    } catch (e) {
      console.log('Error loading sessions:', e);
    }
  };

  const createNewSession = async () => {
    setCurrentSessionId(null);
    setMessages([]);
    setShowHistory(false);
    
    // Check if there is an initial context/message waiting from an assessment
    setIsTyping(true);
    try {
      const sessionRes = await apiClient.post('/core/chat/session/');
      const newId = sessionRes.data.session_id;
      setCurrentSessionId(newId);

      const res = await apiClient.get(`/core/chat/initial/?session_id=${newId}`);
      if (res.data.reply) {
        setMessages([{ role: 'bot', content: res.data.reply, id: 'initial' }]);
      }
      loadSessions();
    } catch (e) {
      console.log("No initial message", e);
    } finally {
      setIsTyping(false);
    }
  };

  const loadSessionDetails = async (id: number) => {
    try {
      const res = await apiClient.get(`/core/chat/session/${id}/`);
      setMessages(res.data);
      setCurrentSessionId(id);
      setShowHistory(false);
    } catch (e) {
      console.log('Error loading session details:', e);
    }
  };

  const sendMessage = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim()) return;
    
    const userMsg: Message = { role: 'user', content: textToSend.trim(), id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    Keyboard.dismiss();

    try {
      let activeSessionId = currentSessionId;
      if (!activeSessionId) {
        const sessionRes = await apiClient.post('/core/chat/session/');
        activeSessionId = sessionRes.data.session_id;
        setCurrentSessionId(activeSessionId);
      }

      // Backend returns reply AND potentially an action_card
      const res = await apiClient.post('/core/chat/message/', {
        session_id: activeSessionId,
        message: userMsg.content
      });

      setMessages(prev => [
        ...prev, 
        { 
          role: 'bot', 
          content: res.data.reply, 
          action_card: res.data.action_card,
          id: Date.now() + 1 
        }
      ]);
      loadSessions(); 
      
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'bot', content: "I'm having trouble connecting right now. Please try again.", id: Date.now() + 1 }]);
    } finally {
      setIsTyping(false);
    }
  };

  // --- Session Management (Pin & Delete) ---
  const handleSessionLongPress = (session: Session) => {
    Alert.alert(
      "Manage Chat",
      session.title || "Conversation",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: session.is_pinned ? "Unpin" : "Pin", 
          onPress: async () => {
            await apiClient.post(`/core/chat/session/${session.id}/pin/`);
            loadSessions();
          } 
        },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            await apiClient.delete(`/core/chat/session/${session.id}/delete/`);
            if (currentSessionId === session.id) {
              setCurrentSessionId(null);
              setMessages([]);
            }
            loadSessions();
          } 
        }
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

  // --- Renderers ---

  const renderActionCard = (card?: ActionCard | null) => {
    if (!card) return null;

    if (card.type === 'consultation') {
      return (
        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert("Booking", "Navigates to consultation view")}>
          <Text style={styles.actionBtnText}>{card.title}</Text>
        </TouchableOpacity>
      );
    }

    if (card.type === 'critical_support') {
      return (
        <View style={styles.criticalCard}>
          <Text style={styles.criticalTitle}>{card.title}</Text>
          <View style={styles.helplineBox}>
            {card.helplines?.map((line, idx) => (
              <View key={idx} style={styles.helplineRow}>
                <Text style={styles.helplineName}>{line.name}</Text>
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${line.phone}`)}>
                  <Text style={styles.helplinePhone}>{line.phone}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <Text style={styles.criticalDesc}>{card.description}</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert("Booking", "Navigates to clinical care")}>
            <Text style={styles.actionBtnText}>Explore Clinical Care</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperBot]}>
        {!isUser && <View style={styles.botAvatar}><Text style={{ fontSize: 14 }}>✨</Text></View>}
        <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleBot]}>
          <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextBot]}>
            {item.content}
          </Text>
          {renderActionCard(item.action_card)}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyStateContainer}>
        <View style={styles.largeAvatar}><Text style={{ fontSize: 40 }}>✨</Text></View>
        <Text style={styles.emptyTitle}>How can I help you today?</Text>
        <Text style={styles.emptySub}>I'm Smera. Feel free to share what's on your mind or explore a topic below.</Text>
        
        <View style={styles.suggestionGrid}>
          <TouchableOpacity style={styles.suggestionBtn} onPress={() => sendMessage("I am feeling a bit stressed about my workload today.")}>
            <Text style={styles.suggestionText}>Dealing with stress</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.suggestionBtn} onPress={() => sendMessage("How can I improve my daily sleep schedule?")}>
            <Text style={styles.suggestionText}>Better sleep habits</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.suggestionBtn} onPress={() => sendMessage("I just need someone to talk to for a few minutes.")}>
            <Text style={styles.suggestionText}>Just need to chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.suggestionBtn, { borderColor: 'rgba(168, 85, 247, 0.4)' }]} onPress={() => sendMessage("I would like to explore options for professional consultation.")}>
            <Text style={[styles.suggestionText, { color: '#c084fc' }]}>Professional consultation</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => setShowHistory(!showHistory)} style={styles.headerIcon}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>☰</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>←</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerCenter}>
            <View style={styles.smallAvatar}><Text style={{ fontSize: 10 }}>✨</Text></View>
            <Text style={styles.headerTitle}>Smera</Text>
            <View style={styles.onlineDot} />
          </View>
          
          <View style={{ width: 80 }} /> 
        </View>

        {/* CHAT HISTORY DRAWER */}
        {showHistory && (
          <TouchableOpacity style={styles.historyBackdrop} activeOpacity={1} onPress={() => setShowHistory(false)}>
            <View style={styles.historyOverlay}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Conversations</Text>
                <TouchableOpacity onPress={createNewSession} style={styles.newChatBtn}>
                  <Text style={styles.newChatBtnText}>+ New</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={sessions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.historyItem, currentSessionId === item.id && styles.historyItemActive]}
                    onPress={() => loadSessionDetails(item.id)}
                    onLongPress={() => handleSessionLongPress(item)}
                    delayLongPress={300}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.historyItemText, item.is_pinned && { color: '#eab308', fontWeight: 'bold' }]} numberOfLines={1}>
                        {item.is_pinned && "📌 "}{item.title || item.preview || "New Chat"}
                      </Text>
                    </View>
                    <Text style={styles.historyItemDate}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        )}

        {/* MAIN CHAT AREA */}
        {messages.length === 0 && !isTyping ? (
          renderEmptyState()
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item.id?.toString() || index.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* TYPING INDICATOR */}
        {isTyping && (
          <View style={styles.typingContainer}>
            <View style={styles.botAvatar}><Text style={{ fontSize: 14 }}>✨</Text></View>
            <View style={[styles.messageBubble, styles.messageBubbleBot, { paddingVertical: 12 }]}>
              <ActivityIndicator size="small" color="#3b82f6" />
            </View>
          </View>
        )}

        {/* INPUT AREA */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Message Smera..."
              placeholderTextColor="#71717a"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.sendButton, !inputText.trim() && { backgroundColor: '#27272a' }]} 
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || isTyping}
            >
              <Text style={[styles.sendButtonText, !inputText.trim() && { color: '#71717a' }]}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 15, paddingTop: 10, backgroundColor: '#18181b', borderBottomWidth: 1, borderBottomColor: '#27272a', zIndex: 10 },
  headerLeft: { flexDirection: 'row', gap: 10, width: 80 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  smallAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#3b82f6' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', shadowColor: '#22c55e', shadowOpacity: 0.8, shadowRadius: 5 },

  // Drawer
  historyBackdrop: { position: 'absolute', top: 70, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 20 },
  historyOverlay: { position: 'absolute', top: 0, left: 0, bottom: 0, width: '75%', backgroundColor: '#18181b', borderRightWidth: 1, borderRightColor: '#27272a', padding: 16 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  historyTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  newChatBtn: { backgroundColor: 'rgba(59, 130, 246, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  newChatBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 12 },
  historyItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  historyItemActive: { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  historyItemText: { color: '#d4d4d8', fontSize: 14, marginBottom: 4 },
  historyItemDate: { color: '#71717a', fontSize: 10 },

  // Empty State
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  largeAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#3b82f6' },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 10, textAlign: 'center' },
  emptySub: { fontSize: 15, color: '#a1a1aa', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  suggestionGrid: { width: '100%', gap: 10 },
  suggestionBtn: { width: '100%', backgroundColor: '#18181b', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#27272a', alignItems: 'center' },
  suggestionText: { color: '#e4e4e7', fontSize: 14, fontWeight: '500' },

  // Chat
  chatList: { padding: 16, paddingBottom: 20 },
  messageWrapper: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-end' },
  messageWrapperUser: { justifyContent: 'flex-end' },
  messageWrapperBot: { justifyContent: 'flex-start' },
  botAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(59, 130, 246, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: '#3b82f6', marginBottom: 4 },
  messageBubble: { maxWidth: '82%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  messageBubbleUser: { backgroundColor: '#3b82f6', borderBottomRightRadius: 4 },
  messageBubbleBot: { backgroundColor: '#27272a', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#3f3f46' },
  messageText: { fontSize: 16, lineHeight: 24 },
  messageTextUser: { color: '#fff' },
  messageTextBot: { color: '#e4e4e7' },
  typingContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, alignItems: 'flex-end' },

  // Action Cards (JSON UI)
  actionBtn: { marginTop: 12, backgroundColor: '#3b82f6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  criticalCard: { marginTop: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  criticalTitle: { color: '#f87171', fontWeight: 'bold', fontSize: 16, marginBottom: 12 },
  helplineBox: { marginBottom: 12, gap: 8 },
  helplineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(239, 68, 68, 0.2)' },
  helplineName: { color: '#e4e4e7', fontSize: 14 },
  helplinePhone: { color: '#60a5fa', fontWeight: 'bold', fontSize: 14 },
  criticalDesc: { color: '#a1a1aa', fontSize: 13, lineHeight: 20, marginBottom: 8 },

  // Input
  inputWrapper: { padding: 12, backgroundColor: '#09090b', borderTopWidth: 1, borderTopColor: '#27272a' },
  inputContainer: { flexDirection: 'row', backgroundColor: '#18181b', borderRadius: 24, borderWidth: 1, borderColor: '#27272a', alignItems: 'flex-end', padding: 4 },
  input: { flex: 1, color: '#fff', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, fontSize: 16, maxHeight: 120 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', margin: 4 },
  sendButtonText: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: -2 }
});