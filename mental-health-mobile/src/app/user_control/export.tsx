import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator, Image, useColorScheme, Modal, Text } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Card, Button } from 'heroui-native';
import apiClient from '@/api/apiClient';

type AlertType = 'success' | 'error' | null;

interface AlertConfig {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
}

export default function ExportDataScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  const [moodChartImg, setMoodChartImg] = useState<string | null>(null);
  const [rawEventsChartImg, setRawEventsChartImg] = useState<string | null>(null);

  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    type: null,
    title: '',
    message: ''
  });

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertConfig({ visible: true, type, title, message });
  };

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  const getModalStyles = (type: AlertType) => {
    switch (type) {
      case 'success': return { icon: 'checkmark-circle', color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/30' };
      case 'error': return { icon: 'alert-circle', color: '#ef4444', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/30' };
      default: return { icon: 'information-circle', color: '#64748b', bg: 'bg-neutral-100 dark:bg-neutral-800', border: 'border-neutral-200 dark:border-neutral-700' };
    }
  };

  useFocusEffect(
    useCallback(() => {
      const fetchReport = async () => {
        try {
          const res = await apiClient.get('/user/report-data/');
          const data = res.data;
          setReport(data);

          const generateChartBase64 = async (chartConfig: any) => {
            const response = await fetch('https://quickchart.io/chart', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                version: '3', 
                chart: chartConfig,
                width: 800,
                height: 420, 
                format: 'base64',
                backgroundColor: 'transparent',
                devicePixelRatio: 2.0 
              })
            });
            const base64 = await response.text();
            return `data:image/png;base64,${base64}`;
          };

          const moodCategoryMap: any = { 
            "overwhelmed": "Overwhelmed", 
            "low": "Low", 
            "stressed": "Stressed", 
            "neutral": "Neutral", 
            "good": "Good", 
            "great": "Great" 
          };
          
          const yAxisCategories = ['Overwhelmed', 'Low', 'Stressed', 'Neutral', 'Good', 'Great'];
          
          const moodTrendsConfig = {
            type: 'line',
            data: {
              labels: data?.mood_trends?.map((d: any) => d.date) || [],
              datasets: [{
                label: 'Mood Level',
                data: data?.mood_trends?.map((d: any) => moodCategoryMap[d.mood.toLowerCase()] || "Neutral") || [],
                borderColor: '#6366f1', 
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                borderWidth: 4, tension: 0.4, fill: true,
                pointBackgroundColor: '#ffffff', pointBorderColor: '#6366f1',
                pointBorderWidth: 3, pointRadius: 5, pointHoverRadius: 7
              }]
            },
            options: { 
              layout: { padding: { top: 20, right: 30, bottom: 10, left: 10 } }, 
              plugins: { legend: { display: false } }, 
              scales: { 
                y: { 
                  type: 'category',
                  labels: yAxisCategories,
                  ticks: { color: '#64748b', font: { size: 14, weight: 'bold' } },
                  grid: { color: 'rgba(148, 163, 184, 0.2)', drawBorder: false }
                }, 
                x: { 
                  ticks: { color: '#64748b', font: { size: 14, weight: 'bold' } },
                  grid: { display: false } 
                } 
              } 
            }
          };

          const rawEventsConfig = {
            type: 'line',
            data: {
              labels: data?.raw_mood_events?.map((e: any) => e.date.split(',')[0]) || [],
              datasets: [{
                label: 'Mood Check-in',
                data: data?.raw_mood_events?.map((e: any) => moodCategoryMap[e.mood.toLowerCase()] || "Neutral") || [],
                borderColor: '#ec4899', 
                backgroundColor: 'rgba(236, 72, 153, 0.15)',
                borderWidth: 4, tension: 0.4, fill: true,
                pointBackgroundColor: '#ffffff', pointBorderColor: '#ec4899',
                pointBorderWidth: 3, pointRadius: 5, pointHoverRadius: 7
              }]
            },
            options: { 
              layout: { padding: { top: 20, right: 30, bottom: 10, left: 10 } },
              plugins: { legend: { display: false } }, 
              scales: { 
                y: { 
                  type: 'category',
                  labels: yAxisCategories,
                  ticks: { color: '#64748b', font: { size: 14, weight: 'bold' } },
                  grid: { color: 'rgba(148, 163, 184, 0.2)', drawBorder: false }
                }, 
                x: { 
                  ticks: { color: '#64748b', font: { size: 14, weight: 'bold' }, maxTicksLimit: 6, autoSkip: true }, 
                  grid: { display: false } 
                } 
              } 
            }
          };

          const [moodImg, rawImg] = await Promise.all([
            generateChartBase64(moodTrendsConfig),
            generateChartBase64(rawEventsConfig)
          ]);

          setMoodChartImg(moodImg);
          setRawEventsChartImg(rawImg);

        } catch (e) {
          console.log('Error fetching report data', e);
        } finally {
          setLoading(false);
        }
      };
      
      fetchReport();
    }, [])
  );

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      
      const getPdfRiskStyle = (risk: string) => {
        const r = risk.toLowerCase();
        if (r.includes('high') || r.includes('severe')) return 'background-color: #ffe4e6; color: #e11d48; border: 1px solid #fda4af;';
        if (r.includes('moderate')) return 'background-color: #fef3c7; color: #d97706; border: 1px solid #fcd34d;';
        return 'background-color: #d1fae5; color: #059669; border: 1px solid #6ee7b7;';
      };

      const getPdfStatusStyle = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'completed') return 'background-color: #d1fae5; color: #059669; border: 1px solid #6ee7b7;';
        if (s === 'cancelled') return 'background-color: #ffe4e6; color: #e11d48; border: 1px solid #fda4af;';
        return 'background-color: #cffafe; color: #0891b2; border: 1px solid #67e8f9;';
      };

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            @page { margin: 40px; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #ffffff; padding: 0; color: #0f172a; margin: 0; line-height: 1.5; }
            .avoid-break { page-break-inside: avoid; margin-bottom: 40px; }
            .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px; border-radius: 24px; color: #ffffff; margin-bottom: 40px; box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4); border: 1px solid #818cf8; text-align: center; }
            .header h1 { font-size: 42px; margin: 0 0 10px 0; font-weight: 900; letter-spacing: -1px; }
            .header .subtitle { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; color: #e0e7ff; margin: 0 0 5px 0; }
            .header .date { font-size: 14px; color: #c7d2fe; margin: 0; }
            .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; color: #4f46e5; margin-bottom: 15px; display: flex; align-items: center; }
            .section-title::before { content: ''; display: inline-block; width: 8px; height: 8px; background-color: #4f46e5; border-radius: 50%; margin-right: 10px; }
            .profile-table { width: 100%; border-collapse: separate; border-spacing: 15px; margin: -15px; }
            .profile-table td { width: 50%; padding: 20px; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            .label { font-size: 10px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; margin-bottom: 5px; opacity: 0.8; }
            .val { font-size: 22px; font-weight: 900; margin: 0; color: #1e293b; }
            .bg-indigo { background-color: #eef2ff; border: 1px solid #c7d2fe; color: #4338ca; }
            .bg-fuchsia { background-color: #fae8ff; border: 1px solid #f5d0fe; color: #a21caf; }
            .bg-emerald { background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; }
            .bg-amber { background-color: #fffbeb; border: 1px solid #fde68a; color: #b45309; }
            .bg-blue { background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }
            .bg-violet { background-color: #f5f3ff; border: 1px solid #ddd6fe; color: #6d28d9; }
            .card { background-color: #ffffff; border-radius: 24px; padding: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
            .chart-img { width: 100%; height: auto; border-radius: 12px; }
            .data-table { width: 100%; border-collapse: collapse; }
            .data-table th, .data-table td { padding: 16px 10px; text-align: left; border-bottom: 1px solid #f1f5f9; }
            .data-table tr:last-child td { border-bottom: none; }
            .data-table th { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; letter-spacing: 1px; }
            .data-table td { font-size: 15px; color: #334155; font-weight: bold; }
            .data-table .subtext { font-size: 12px; color: #94a3b8; font-weight: normal; margin-top: 4px; display: block; }
            .data-table .score { font-size: 20px; font-weight: 900; color: #0f172a; text-align: right; }
            .badge { padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block; white-space: nowrap; }
            .action-list { list-style: none; padding: 0; margin: 0; background-color: #ecfdf5; border-radius: 24px; padding: 30px; border: 1px solid #a7f3d0; }
            .action-list li { margin-bottom: 15px; color: #064e3b; font-size: 15px; font-weight: 500; display: flex; align-items: flex-start; line-height: 1.6; }
            .action-list li:last-child { margin-bottom: 0; }
            .action-list li span { background-color: #34d399; color: white; border-radius: 50%; min-width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 15px; margin-top: 0px; }
            .footer { margin-top: 50px; padding-top: 30px; border-top: 2px solid #e2e8f0; text-align: center; page-break-inside: avoid; }
            .footer h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin: 0 0 10px 0; }
            .footer p { font-size: 12px; color: #64748b; font-style: italic; max-width: 600px; margin: 0 auto; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="header">
            <p class="subtitle">Generated securely via Smera</p>
            <h1>Wellness Report</h1>
            <p class="date">${new Date().toLocaleString()}</p>
          </div>
          <div class="avoid-break">
            <h2 class="section-title">User Profile</h2>
            <table class="profile-table">
              <tr>
                <td class="bg-indigo">
                  <div class="label">Full Name</div>
                  <div class="val">${report?.profile?.name || '--'}</div>
                </td>
                <td class="bg-fuchsia">
                  <div class="label">Email</div>
                  <div class="val" style="font-size: 18px;">${report?.profile?.email || '--'}</div>
                </td>
              </tr>
              <tr>
                <td class="bg-emerald">
                  <div class="label">Current Age</div>
                  <div class="val">${report?.profile?.age || '--'}</div>
                </td>
                <td class="bg-amber">
                  <div class="label">Date of Birth</div>
                  <div class="val">${report?.profile?.dob || '--'}</div>
                </td>
              </tr>
              <tr>
                <td class="bg-blue">
                  <div class="label">Journal Entries</div>
                  <div class="val">${report?.profile?.journal_count || '0'}</div>
                </td>
                <td class="bg-violet">
                  <div class="label">Member Since</div>
                  <div class="val" style="font-size: 18px;">${report?.profile?.member_since || '--'}</div>
                </td>
              </tr>
            </table>
          </div>
          <div class="avoid-break">
            <h2 class="section-title" style="color: #3b82f6;">Emotional Timeline</h2>
            <div class="card">
                <img class="chart-img" src="${moodChartImg}" />
            </div>
          </div>
          <div class="avoid-break">
            <h2 class="section-title" style="color: #ec4899;">7-Day Mood Events</h2>
            <div class="card">
                <img class="chart-img" src="${rawEventsChartImg}" />
            </div>
          </div>
          <div class="avoid-break">
            <h2 class="section-title" style="color: #8b5cf6;">Assessment History (30-Days)</h2>
            <div class="card" style="padding: 10px 25px;">
              ${report?.assessments?.length ? `
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Assessment Type</th>
                      <th style="text-align: right;">Score & Risk Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${report.assessments.map((a: any) => `
                      <tr>
                        <td>
                          ${a.type}
                          <span class="subtext">${a.date}</span>
                        </td>
                        <td style="text-align: right;">
                          <div class="score">${a.score}</div>
                          <div class="badge" style="${getPdfRiskStyle(a.risk)} margin-top: 5px;">${a.risk}</div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : '<p style="color: #94a3b8; font-style: italic; text-align: center; padding: 20px 0;">No assessments completed yet.</p>'}
            </div>
          </div>
          <div class="avoid-break">
            <h2 class="section-title" style="color: #06b6d4;">Clinical Consultations (30-Days)</h2>
            <div class="card" style="padding: 10px 25px;">
              ${report?.consultations?.length ? `
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Counselor Details</th>
                      <th style="text-align: right;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${report.consultations.map((c: any) => `
                      <tr>
                        <td>
                          ${c.counselor}
                          <span class="subtext">${c.date} • <strong style="color: #0891b2;">${c.mode}</strong></span>
                        </td>
                        <td style="text-align: right;">
                          <div class="badge" style="${getPdfStatusStyle(c.status)}">${c.status}</div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : '<p style="color: #94a3b8; font-style: italic; text-align: center; padding: 20px 0;">No clinical consultation history.</p>'}
            </div>
          </div>
          <div class="avoid-break">
            <h2 class="section-title" style="color: #10b981;">Suggested Action Plan</h2>
            <ul class="action-list">
              ${report?.recommendations?.length ? report.recommendations.map((r: string) => `
                <li><span>✓</span><div>${r}</div></li>
              `).join('') : '<li style="color: #64748b; font-style: italic;">No recommendations available.</li>'}
            </ul>
          </div>
          <div class="footer">
            <h3>Clinical Disclaimer</h3>
            <p>${report?.disclaimer || ''}</p>
          </div>
        </body>
        </html>
      `;

      const { base64 } = await Print.printToFileAsync({ 
        html: htmlContent,
        base64: true 
      });

      if (!base64) throw new Error("Failed to generate base64 data for PDF.");

      const docDir = FileSystem.documentDirectory;
      if (!docDir) throw new Error("Document directory is not available on this device.");
      
      const safePdfPath = `${docDir}Smera_Wellness_Report.pdf`;

      const fileInfo = await FileSystem.getInfoAsync(safePdfPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(safePdfPath);
      }

      await FileSystem.writeAsStringAsync(safePdfPath, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(safePdfPath, { 
          UTI: 'com.adobe.pdf', 
          mimeType: 'application/pdf',
          dialogTitle: 'Export Wellness Report'
        });
      }

    } catch (error) {
      console.error("PDF Generation Error: ", error);
      showAlert('error', 'Export Failed', 'Could not generate or share the PDF file.');
    } finally {
      setExporting(false);
    }
  };

  const getRiskColor = (risk: string) => {
    const r = risk.toLowerCase();
    if (r.includes('high') || r.includes('severe')) return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/50';
    if (r.includes('moderate')) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50';
    return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50';
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed') return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50';
    if (s === 'cancelled') return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/50';
    return 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800/50';
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-neutral-50 dark:bg-black">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-transparent">

      {/* --- CUSTOM THEMED MODAL USING HERO-UI CARD & BUTTON --- */}
      <Modal transparent visible={alertConfig.visible} animationType="fade" onRequestClose={closeAlert}>
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <Card className="w-full bg-white/90 dark:bg-neutral-900/90 rounded-[2.5rem] p-8 items-center shadow-2xl border border-neutral-200 dark:border-neutral-800">
            
            {alertConfig.type && (
              <View className={`w-20 h-20 rounded-full items-center justify-center mb-6 border ${getModalStyles(alertConfig.type).bg} ${getModalStyles(alertConfig.type).border}`}>
                <Ionicons name={getModalStyles(alertConfig.type).icon as any} size={40} color={getModalStyles(alertConfig.type).color} />
              </View>
            )}

            <Text className="text-2xl font-black text-neutral-900 dark:text-white text-center mb-3 tracking-tight">
              {alertConfig.title}
            </Text>
            <Text className="text-neutral-500 dark:text-neutral-400 text-center font-medium leading-relaxed mb-8">
              {alertConfig.message}
            </Text>

            <View className="w-full flex-row gap-3">
              <Button color="default" className="w-full h-14 rounded-2xl bg-neutral-900 dark:bg-white" onPress={closeAlert}>
                <Text className="font-bold text-white dark:text-neutral-900">Close</Text>
              </Button>
            </View>

          </Card>
        </View>
      </Modal>

      <ScrollView 
        contentContainerClassName="p-6 pb-24 pt-16"
        showsVerticalScrollIndicator={false}>
        
        <View className="flex-row justify-between items-center mb-8">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-12 h-12 bg-amber-50/90 dark:bg-stone-950/90 rounded-full items-center justify-center border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <Ionicons name="arrow-back" size={24} color={isDark ? '#f8fafc' : '#0f172a'} />
          </TouchableOpacity>
          <Text className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
            Data Center
          </Text>
          <View className="w-12 h-12" />
        </View>

        {/* HERO REPORT CARD */}
        <Card className="bg-indigo-600/90 dark:bg-indigo-500/90 rounded-[3rem] p-8 mb-8 items-center shadow-sm dark:shadow-none border border-indigo-500 dark:border-indigo-400/50 overflow-hidden">
          <View className="absolute -top-10 -right-10 w-40 h-40 bg-fuchsia-400 dark:bg-fuchsia-500 rounded-full blur-3xl opacity-60" />
          <View className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500 dark:bg-blue-600 rounded-full blur-3xl opacity-60" />

          <View className="w-24 h-24 rounded-[2rem] bg-white items-center justify-center mb-5 shadow-sm border border-white/40">
            <Ionicons name="document-text" size={46} color="#4f46e5" />
          </View>
          
          <Text className="text-3xl font-black text-white mb-2 text-center tracking-tight">
            Wellness Report
          </Text>
          
          <Text className="text-center text-indigo-50 font-medium text-sm px-2 mb-8 leading-relaxed">
            Your encrypted psychological profile and emotional timeline, packaged securely for your personal records.
          </Text>

          <Button 
            color="default"
            className={`w-full h-16 rounded-[2rem] shadow-sm ${exporting || !moodChartImg ? 'bg-indigo-200/50 dark:bg-neutral-700/50' : 'bg-white dark:bg-neutral-900'}`}
            onPress={handleExportPDF}
            isLoading={exporting}
            isDisabled={!moodChartImg}
          >
            <Ionicons name="download-outline" size={20} color={isDark ? '#818cf8' : '#4f46e5'} style={{ marginRight: 8 }} />
            <Text className="text-indigo-600 dark:text-indigo-400 font-black text-lg uppercase tracking-widest">
              Generate PDF
            </Text>
          </Button>
        </Card>

        {/* USER PROFILE SECTION */}
        <View className="mb-2 ml-2 flex-row items-center gap-2 mt-4">
          <Ionicons name="person-circle" size={18} color={isDark ? '#818cf8' : '#4f46e5'} />
          <Text className="text-md font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            User Profile
          </Text>
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-4 mb-8">
          <Card className="w-full bg-indigo-50/90 dark:bg-indigo-900/60 p-5 rounded-[2rem] shadow-sm dark:shadow-none border border-indigo-100 dark:border-indigo-800/50">
            <Text className="text-md font-bold text-indigo-500 dark:text-indigo-400/70 uppercase tracking-widest mb-1">Full Name</Text>
            <Text className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{report?.profile?.name || '--'}</Text>
          </Card>

          <Card className="w-full bg-fuchsia-50/90 dark:bg-fuchsia-900/60 p-5 rounded-[2rem] shadow-sm dark:shadow-none border border-fuchsia-100 dark:border-fuchsia-800/50">
            <Text className="text-md font-bold text-fuchsia-500 dark:text-fuchsia-400/70 uppercase tracking-widest mb-1">Email Address</Text>
            <Text className="text-xl font-bold text-fuchsia-700 dark:text-fuchsia-300" adjustsFontSizeToFit numberOfLines={1}>{report?.profile?.email || '--'}</Text>
          </Card>

          <Card className="w-[48%] bg-emerald-50/90 dark:bg-emerald-900/60 p-5 rounded-[2rem] shadow-sm dark:shadow-none border border-emerald-100 dark:border-emerald-800/50">
            <Text className="text-md font-bold text-emerald-500 dark:text-emerald-400/70 uppercase tracking-widest mb-1">Age</Text>
            <Text className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{report?.profile?.age || '--'}</Text>
          </Card>

          <Card className="w-[48%] bg-amber-50/90 dark:bg-amber-900/60 p-5 rounded-[2rem] shadow-sm dark:shadow-none border border-amber-100 dark:border-amber-800/50">
            <Text className="text-md font-bold text-amber-500 dark:text-amber-400/70 uppercase tracking-widest mb-1">D.O.B</Text>
            <Text className="text-xl font-black text-amber-700 dark:text-amber-300">{report?.profile?.dob || '--'}</Text>
          </Card>

          <Card className="w-[48%] bg-blue-50/90 dark:bg-blue-900/60 p-5 rounded-[2rem] shadow-sm dark:shadow-none border border-blue-100 dark:border-blue-800/50">
            <Text className="text-md font-bold text-blue-500 dark:text-blue-400/70 uppercase tracking-widest mb-1">Journals</Text>
            <Text className="text-2xl font-black text-blue-700 dark:text-blue-300">{report?.profile?.journal_count || '0'}</Text>
          </Card>

          <Card className="w-[48%] bg-violet-50/90 dark:bg-violet-900/60 p-5 rounded-[2rem] shadow-sm dark:shadow-none border border-violet-100 dark:border-violet-800/50">
            <Text className="text-md font-bold text-violet-500 dark:text-violet-400/70 uppercase tracking-widest mb-1">Joined</Text>
            <Text className="text-xl font-black text-violet-700 dark:text-violet-300" adjustsFontSizeToFit numberOfLines={1}>{report?.profile?.member_since || '--'}</Text>
          </Card>
        </View>

        {/* EMOTIONAL TIMELINE CHART */}
        <View className="mb-2 ml-2 flex-row items-center gap-2 mt-2">
          <Ionicons name="bar-chart" size={18} color={isDark ? '#60a5fa' : '#3b82f6'} />
          <Text className="text-md font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Emotional Timeline
          </Text>
        </View>
        <Card className="bg-amber-50/90 dark:bg-stone-950/90 rounded-[2rem] p-5 shadow-sm dark:shadow-none border border-neutral-200 dark:border-neutral-800 mb-8 items-center justify-center">
          {moodChartImg ? (
            <Image source={{ uri: moodChartImg }} style={{ width: '100%', height: 220, resizeMode: 'contain' }} />
          ) : (
            <ActivityIndicator size="small" color={isDark ? '#818cf8' : '#4f46e5'} style={{ padding: 40 }} />
          )}
        </Card>

        {/* 7-DAY MOOD EVENTS CHART */}
        <View className="mb-2 ml-2 flex-row items-center gap-2">
          <Ionicons name="analytics" size={18} color={isDark ? '#f472b6' : '#ec4899'} />
          <Text className="text-md font-black uppercase tracking-widest text-pink-600 dark:text-pink-400">
            7-Day Mood Events
          </Text>
        </View>
        <Card className="bg-amber-50/90 dark:bg-stone-950/90 rounded-[2rem] p-5 shadow-sm dark:shadow-none border border-neutral-200 dark:border-neutral-800 mb-8 items-center justify-center">
          {rawEventsChartImg ? (
            <Image source={{ uri: rawEventsChartImg }} style={{ width: '100%', height: 220, resizeMode: 'contain' }} />
          ) : (
            <ActivityIndicator size="small" color={isDark ? '#f472b6' : '#ec4899'} style={{ padding: 40 }} />
          )}
        </Card>

        {/* ASSESSMENT HISTORY */}
        <View className="mb-2 ml-2 flex-row items-center gap-2">
          <Ionicons name="pulse" size={18} color={isDark ? '#a78bfa' : '#8b5cf6'} />
          <Text className="text-md font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">
            Assessment History (30-Days)
          </Text>
        </View>
        <Card className="bg-amber-50/90 dark:bg-stone-950/90 rounded-[2.5rem] p-4 shadow-sm dark:shadow-none border border-neutral-200 dark:border-neutral-800 mb-8">
          {report?.assessments?.length > 0 ? (
            report.assessments.map((a: any, i: number) => (
              <View key={i} className={`flex-row items-center justify-between p-4 ${i !== report.assessments.length -1 ? 'border-b border-neutral-100 dark:border-neutral-800/50' : ''}`}>
                <View>
                  <Text className="text-base font-black text-neutral-900 dark:text-white">{a.type}</Text>
                  <Text className="text-md font-bold text-neutral-500 dark:text-neutral-400 mt-1">{a.date}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-xl font-black text-neutral-900 dark:text-white mb-1">{a.score}</Text>
                  <View className={`px-2.5 py-1 rounded-xl border ${getRiskColor(a.risk)}`}>
                    <Text className={`text-[10px] font-black uppercase tracking-widest ${getRiskColor(a.risk).split(' ')[0]}`}>
                      {a.risk}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text className="text-center text-neutral-500 dark:text-neutral-400 font-medium py-6 italic">No assessments completed yet.</Text>
          )}
        </Card>

        {/* CLINICAL CONSULTATIONS */}
        <View className="mb-2 ml-2 flex-row items-center gap-2">
          <Ionicons name="medkit" size={18} color={isDark ? '#22d3ee' : '#06b6d4'} />
          <Text className="text-md font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
            Clinical Consultations (30-Days)
          </Text>
        </View>
        <Card className="bg-amber-50/90 dark:bg-stone-950/90 rounded-[2.5rem] p-4 shadow-sm dark:shadow-none border border-neutral-200 dark:border-neutral-800 mb-8">
          {report?.consultations?.length > 0 ? (
            report.consultations.map((c: any, i: number) => (
              <View key={i} className={`flex-col p-4 ${i !== report.consultations.length -1 ? 'border-b border-neutral-100 dark:border-neutral-800/50' : ''}`}>
                <View className="flex-row justify-between items-start mb-3">
                  <Text className="text-lg font-black text-neutral-900 dark:text-white flex-1">{c.counselor}</Text>
                  <View className={`px-2.5 py-1 rounded-xl border ${getStatusColor(c.status)}`}>
                    <Text className={`text-[10px] font-black uppercase tracking-widest ${getStatusColor(c.status).split(' ')[0]}`}>
                      {c.status}
                    </Text>
                  </View>
                </View>
                <Text className="text-sm font-bold text-neutral-500 dark:text-neutral-400">{c.date} • <Text className="text-cyan-600 dark:text-cyan-400 font-black">{c.mode}</Text></Text>
              </View>
            ))
          ) : (
            <Text className="text-center text-neutral-500 dark:text-neutral-400 font-medium py-6 italic">No clinical consultation history.</Text>
          )}
        </Card>

        {/* ACTION PLAN */}
        <View className="mb-2 ml-2 flex-row items-center gap-2">
          <Ionicons name="leaf" size={18} color={isDark ? '#34d399' : '#10b981'} />
          <Text className="text-md font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Suggested Action Plan
          </Text>
        </View>
        <Card className="bg-emerald-50/90 dark:bg-emerald-900/70 rounded-[2.5rem] p-6 shadow-sm dark:shadow-none border border-emerald-200 dark:border-emerald-800/50 mb-8">
          {report?.recommendations?.map((rec: string, index: number) => (
            <View key={index} className="flex-row items-start mb-4 last:mb-0">
              <View className="w-7 h-7 rounded-full bg-emerald-200 dark:bg-emerald-800/60 items-center justify-center mr-3 mt-0.5 border border-emerald-300 dark:border-emerald-700/50">
                <Ionicons name="checkmark" size={16} color={isDark ? '#34d399' : '#059669'} />
              </View>
              <Text className="flex-1 text-neutral-800 dark:text-neutral-300 font-medium leading-relaxed">
                {rec}
              </Text>
            </View>
          ))}
        </Card>

        {/* DISCLAIMER */}
        <View className="items-center px-4 mt-4">
          <Text className="text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-300 mb-2">Clinical Disclaimer</Text>
          <Text className="text-md text-neutral-700 dark:text-neutral-300 font-medium text-center leading-relaxed italic">
            {report?.disclaimer}
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}