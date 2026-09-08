import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Modal,
} from 'react-native';
import axios from 'axios';
import { API_URL } from '../App';

const GREEN = '#3fb950'; const RED = '#f85149'; const YELLOW = '#d29922';
const BLUE = '#58a6ff'; const MUTED = '#8b949e'; const CARD = '#161b22';
const BG = '#0d1117'; const BORDER = '#21262d';

function regimeColor(r) {
  if (!r) return MUTED;
  if (r.includes('BULL')) return GREEN;
  if (r.includes('BEAR') || r.includes('RISK')) return RED;
  return YELLOW;
}

function statusColor(s) {
  if (s === 'completed') return GREEN;
  if (s === 'running') return BLUE;
  return RED;
}

export default function RunsScreen() {
  const [runs, setRuns]           = useState([]);
  const [refreshing, setRef]      = useState(false);
  const [selected, setSelected]   = useState(null);
  const [detail, setDetail]       = useState(null);
  const [loadingDetail, setLD]    = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/runs?limit=30`);
      setRuns(res.data);
    } catch (e) { console.error(e); }
    finally { setRef(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRef(true); load(); };

  const openDetail = async (run) => {
    setSelected(run);
    setLD(true);
    try {
      const [runRes, briefRes] = await Promise.all([
        axios.get(`${API_URL}/runs/${run.id}`),
        axios.get(`${API_URL}/runs/${run.id}/brief`).catch(() => ({ data: null })),
      ]);
      setDetail({ run: runRes.data, brief: briefRes.data });
    } catch (e) { console.error(e); }
    finally { setLD(false); }
  };

  const dur = (r) => {
    if (!r.completed_at) return '—';
    return Math.round((new Date(r.completed_at) - new Date(r.started_at)) / 1000) + 's';
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Run History</Text>
        </View>

        {runs.map(r => (
          <TouchableOpacity key={r.id} style={styles.card} onPress={() => openDetail(r)}>
            <View style={styles.row}>
              <Text style={styles.runId}>#{r.id}</Text>
              <View style={[styles.badge, { backgroundColor: statusColor(r.status) + '22', borderColor: statusColor(r.status) }]}>
                <Text style={[styles.badgeText, { color: statusColor(r.status) }]}>{r.status}</Text>
              </View>
              <Text style={styles.muted}>  Phase {r.phase}  ·  {dur(r)}</Text>
            </View>
            {r.market_regime && (
              <Text style={[styles.regime, { color: regimeColor(r.market_regime) }]}>{r.market_regime}</Text>
            )}
            <Text style={styles.muted}>
              {new Date(r.started_at).toLocaleString()}  ·  {r.symbols_scanned || 0} symbols  ·  {r.contracts_found || 0} contracts
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Detail modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => { setSelected(null); setDetail(null); }}
      >
        <View style={[styles.modal, { backgroundColor: BG }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Run #{selected?.id}</Text>
            <TouchableOpacity onPress={() => { setSelected(null); setDetail(null); }}>
              <Text style={{ color: BLUE, fontSize: 15 }}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {loadingDetail && <Text style={[styles.muted, { textAlign: 'center', margin: 20 }]}>Loading...</Text>}

          {detail && (
            <ScrollView style={{ flex: 1 }}>
              {/* Brief */}
              {detail.brief?.headline && (
                <View style={styles.section}>
                  <Text style={styles.sectionLbl}>ANALYST BRIEF</Text>
                  <Text style={styles.headline}>{detail.brief.headline}</Text>
                  {detail.brief.brief && <Text style={styles.briefText}>{detail.brief.brief}</Text>}
                  {detail.brief.action_items?.map((a, i) => (
                    <Text key={i} style={styles.actionItem}>› {a}</Text>
                  ))}
                </View>
              )}

              {/* Symbol scans */}
              {detail.run?.symbol_scans?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLbl}>SYMBOLS</Text>
                  {detail.run.symbol_scans.map(s => (
                    <View key={s.id} style={[styles.row, styles.symbolRow]}>
                      <Text style={[styles.sym, { flex: 1 }]}>{s.symbol}</Text>
                      <Text style={[styles.score, {
                        color: s.technical_score >= 65 ? GREEN : s.technical_score >= 45 ? YELLOW : MUTED
                      }]}>{s.technical_score}</Text>
                      <Text style={[styles.direction, {
                        color: s.direction === 'BULLISH' ? GREEN : s.direction === 'BEARISH' ? RED : MUTED
                      }]}>{s.direction}</Text>
                      <Text style={styles.muted}>RSI {s.rsi?.toFixed(0)}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header:      { padding: 20, paddingTop: 56, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#e6edf3' },
  card:        { backgroundColor: CARD, margin: 12, marginBottom: 0, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: BORDER },
  row:         { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  runId:       { fontSize: 14, fontWeight: '800', color: '#e6edf3', marginRight: 6 },
  badge:       { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  badgeText:   { fontSize: 9, fontWeight: '800' },
  regime:      { fontSize: 12, fontWeight: '700', marginTop: 4, marginBottom: 2 },
  muted:       { color: MUTED, fontSize: 11 },
  modal:       { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: '#e6edf3' },
  section:     { margin: 14, backgroundColor: CARD, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: BORDER },
  sectionLbl:  { fontSize: 9, color: MUTED, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  headline:    { fontSize: 14, fontWeight: '700', color: BLUE, marginBottom: 8, lineHeight: 20 },
  briefText:   { color: '#c9d1d9', fontSize: 12, lineHeight: 18, marginBottom: 6 },
  actionItem:  { color: '#c9d1d9', fontSize: 12, lineHeight: 20, paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: BLUE, marginVertical: 2 },
  symbolRow:   { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BORDER },
  sym:         { fontSize: 13, fontWeight: '700', color: '#e6edf3', width: 60 },
  score:       { fontSize: 13, fontWeight: '700', width: 40 },
  direction:   { fontSize: 11, width: 70 },
});
