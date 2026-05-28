import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import apiClient from '../../api/apiClient';

// Hardcoded WHO-5 Questions based on your HTML template
const WHO5_QUESTIONS = [
  "I have felt cheerful and in good spirits",
  "I have felt calm and relaxed",
  "I have felt active and vigorous",
  "I woke up feeling fresh and rested",
  "My daily life has been filled with things that interest me"
];

const WHO5_OPTIONS = [
  { label: "All of the time", value: 5 },
  { label: "Most of the time", value: 4 },
  { label: "More than half of the time", value: 3 },
  { label: "Less than half of the time", value: 2 },
  { label: "Some of the time", value: 1 },
  { label: "At no time", value: 0 }
];

export default function AssessmentScreen() {
  const router = useRouter();
  
  // Tabs: 'take' or 'history'
  const [activeTab, setActiveTab] = useState<'take' | 'history'>('take');
  
  // Assessment State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(5).fill(null));
  const [submitting, setSubmitting] = useState(false);
  
  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load History when switching to the history tab
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await apiClient.get('/core/assessment-history/');
      setHistory(response.data || []);
    } catch (error) {
      console.log('Error fetching assessment history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  // Handle Answer Selection
  const handleSelect = (val: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQIndex] = val;
    setAnswers(newAnswers);
  };

  // Submit Assessment to Django Backend
  const handleSubmit = async () => {
    if (answers.includes(null)) {
      Alert.alert('Incomplete', 'Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      // Hits AssessmentView in your core/views.py
      const response = await apiClient.post('/core/assessment/', {
        test_type: 'who5',
        answers: answers
      });

      if (response.data.status === 'success') {
        const { score, risk_level, insight } = response.data.data;
        
        Alert.alert(
          'Assessment Complete', 
          `Score: ${score}\nLevel: ${risk_level.replace('_', ' ').toUpperCase()}\n\n${insight}`,
          [{ text: 'OK', onPress: () => {
              setAnswers(Array(5).fill(null));
              setCurrentQIndex(0);
              setActiveTab('history');
          }}]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Well-Being Check</Text>
        <View style={{ width: 60 }} /> 
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'take' && styles.activeTab]} 
          onPress={() => setActiveTab('take')}
        >
          <Text style={[styles.tabText, activeTab === 'take' && styles.activeTabText]}>Take WHO-5</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]} 
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>My History</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* --- TAKE ASSESSMENT TAB --- */}
        {activeTab === 'take' && (
          <View style={styles.card}>
            <Text style={styles.progressText}>Question {currentQIndex + 1} of 5</Text>
            <Text style={styles.questionText}>{WHO5_QUESTIONS[currentQIndex]}</Text>

            {WHO5_OPTIONS.map((opt) => {
              const isSelected = answers[currentQIndex] === opt.value;
              return (
                <TouchableOpacity 
                  key={opt.value}
                  style={[styles.optionBtn, isSelected && styles.optionSelected]}
                  onPress={() => handleSelect(opt.value)}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.navRow}>
              <TouchableOpacity 
                style={[styles.navBtn, currentQIndex === 0 && { opacity: 0 }]} 
                disabled={currentQIndex === 0}
                onPress={() => setCurrentQIndex(prev => prev - 1)}
              >
                <Text style={styles.navBtnText}>← Prev</Text>
              </TouchableOpacity>

              {currentQIndex < 4 ? (
                <TouchableOpacity 
                  style={[styles.navBtn, styles.navBtnPrimary, answers[currentQIndex] === null && { opacity: 0.5 }]} 
                  disabled={answers[currentQIndex] === null}
                  onPress={() => setCurrentQIndex(prev => prev + 1)}
                >
                  <Text style={[styles.navBtnText, { color: '#fff' }]}>Next →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.navBtn, styles.submitBtn, answers[currentQIndex] === null && { opacity: 0.5 }]} 
                  disabled={answers[currentQIndex] === null || submitting}
                  onPress={handleSubmit}
                >
                  {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Submit</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* --- HISTORY TAB --- */}
        {activeTab === 'history' && (
          <View>
            {loadingHistory ? (
              <ActivityIndicator size="large" color="#a855f7" style={{ marginTop: 40 }} />
            ) : history.length === 0 ? (
              <Text style={styles.emptyText}>No assessments taken yet.</Text>
            ) : (
              history.map((item, index) => (
                <View key={index} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyType}>{item.assessment_type.toUpperCase()}</Text>
                    <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.historyBody}>
                    <Text style={styles.historyScore}>{item.score}</Text>
                    <Text style={styles.historyLevel}>{item.risk_level.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#18181b', borderBottomWidth: 1, borderBottomColor: '#27272a' },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  backBtnText: { color: '#e4e4e7', fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#18181b', paddingHorizontal: 20, paddingTop: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#a855f7' },
  tabText: { color: '#71717a', fontWeight: 'bold', fontSize: 16 },
  activeTabText: { color: '#a855f7' },

  content: { padding: 24, paddingBottom: 60 },
  
  card: { backgroundColor: '#18181b', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#27272a' },
  progressText: { color: '#a855f7', fontSize: 12, fontWeight: '900', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' },
  questionText: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 24, lineHeight: 32 },
  
  optionBtn: { backgroundColor: '#27272a', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#3f3f46' },
  optionSelected: { backgroundColor: 'rgba(168, 85, 247, 0.15)', borderColor: '#a855f7' },
  optionText: { color: '#d4d4d8', fontSize: 16, fontWeight: '500' },
  optionTextSelected: { color: '#c084fc', fontWeight: 'bold' },
  
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#3f3f46' },
  navBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, backgroundColor: '#27272a' },
  navBtnPrimary: { backgroundColor: '#a855f7' },
  navBtnText: { color: '#e4e4e7', fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#fbbf24' },
  submitBtnText: { color: '#18181b', fontWeight: '900', letterSpacing: 1 },

  emptyText: { color: '#71717a', textAlign: 'center', marginTop: 40, fontStyle: 'italic' },
  
  historyCard: { backgroundColor: '#18181b', padding: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#27272a' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  historyType: { color: '#a855f7', fontWeight: '900', letterSpacing: 1 },
  historyDate: { color: '#71717a', fontSize: 12 },
  historyBody: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  historyScore: { color: '#fff', fontSize: 36, fontWeight: '900', lineHeight: 40 },
  historyLevel: { color: '#d4d4d8', fontSize: 14, fontWeight: 'bold', marginBottom: 6 }
});