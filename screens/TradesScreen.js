import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Alert,
} from 'react-native';
import axios from 'axios';
import { API_URL } from '../App';

const GREEN = '#3fb950'; const RED = '#f85149'; const YELLOW = '#d29922';
const BLUE = '#58a6ff'; const MUTED = '#8b949e'; const CARD = '#161b22';
const BG = '#0d1117'; const BORDER = '#21262d';

function pnlColor(v) { return v > 0 ? GREEN : v < 0 ? RED : MUTED; }

export default function TradesScreen() {
  const [open, setOpen]       = useState([]);
  const [refreshing, setRef]  = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/trades/open`);
      setOpen(res.data);
    } catch (e) { console.error(e); }
    finally { setRef(false); }
  }, []);

  useState(() => { load(); }, []);
  const onRefresh = () => { setRef(true); load(); };

  const checkPositions = async () => {
    try {
      const res = await axios.post(`${API_URL}/monitor`);
      const results = res.data.results || [];
      const hits = results.filter(r => r.action !== 'HOLD');
      if (hits.length === 0) {
        Alert.alert('Monitor', 'All positions within range');
      } else {
        const msg = hits.map(r => `${r.contract_symbol}: ${r.action} (cur $${r.current_price})`).join('\n');
        Alert.alert('Monitor Alert', msg);
      }
      load();
    } catch (e) { Alert.alert('Error', e.message); }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Open Positions</Text>
        <TouchableOpacity style={styles.btn} onPress={checkPositions}>
          <Text style={styles.btnText}>🔍 Check</Text>
        </TouchableOpacity>
      </View>

      {open.length === 0 && (
        <Text style={[styles.muted, { textAlign: 'center', margin: 40 }]}>
          No open trades. Run NEXUS and execute approved trades.
        </Text>
      )}

      {open.map(t => (
        <View key={t.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.symbol}>{t.symbol}</Text>
            <View style={[styles.badge, { backgroundColor: t.status === 'open' ? '#033a16' : '#1c1f24' }]}>
              <Text style={[styles.badgeText, { color: t.status === 'open' ? GREEN : MUTED }]}>
                {t.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.muted}>  #{t.id} · Run #{t.run_id}</Text>
          </View>
          <Text style={[styles.contract, { marginTop: 4 }]}>{t.contract_symbol}</Text>

          <View style={[styles.row, { marginTop: 10, gap: 16 }]}>
            <View>
              <Text style={styles.lbl}>ENTRY</Text>
              <Text style={styles.val}>${parseFloat(t.entry_price || 0).toFixed(2)}</Text>
            </View>
            <View>
              <Text style={styles.lbl}>STOP</Text>
              <Text style={[styles.val, { color: RED }]}>${parseFloat(t.stop_price || 0).toFixed(2)}</Text>
            </View>
            <View>
              <Text style={styles.lbl}>TARGET</Text>
              <Text style={[styles.val, { color: GREEN }]}>${parseFloat(t.target_price || 0).toFixed(2)}</Text>
            </View>
            <View>
              <Text style={styles.lbl}>QTY</Text>
              <Text style={styles.val}>{t.contracts}</Text>
            </View>
            <View>
              <Text style={styles.lbl}>TYPE</Text>
              <Text style={styles.val}>{t.option_type}</Text>
            </View>
          </View>

          <View style={[styles.row, { marginTop: 8 }]}>
            <Text style={styles.muted}>Max risk: ${
              ((parseFloat(t.entry_price || 0) - parseFloat(t.stop_price || 0)) * (t.contracts || 1) * 100).toFixed(0)
            }</Text>
            <Text style={styles.muted}>  |  Max gain: ${
              ((parseFloat(t.target_price || 0) - parseFloat(t.entry_price || 0)) * (t.contracts || 1) * 100).toFixed(0)
            }</Text>
          </View>
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BG },
  header:      { padding: 20, paddingTop: 56, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#e6edf3' },
  card:        { backgroundColor: CARD, margin: 12, marginBottom: 0, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: BORDER },
  row:         { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  symbol:      { fontSize: 16, fontWeight: '800', color: '#e6edf3', marginRight: 8 },
  contract:    { fontSize: 11, color: MUTED, fontFamily: 'monospace' },
  badge:       { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText:   { fontSize: 9, fontWeight: '800' },
  lbl:         { fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  val:         { fontSize: 13, fontWeight: '700', color: '#e6edf3' },
  muted:       { color: MUTED, fontSize: 11 },
  btn:         { backgroundColor: '#21262d', borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  btnText:     { color: '#e6edf3', fontSize: 12, fontWeight: '600' },
});
