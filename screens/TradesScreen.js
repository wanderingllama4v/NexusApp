import { useState, useCallback, useEffect, useRef } from 'react';
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
  const [prices, setPrices]   = useState({});  // trade_id → {current_price, pnl, pnl_pct, action}
  const [refreshing, setRef]  = useState(false);
  const intervalRef           = useRef(null);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await axios.post(`${API_URL}/monitor`);
      const map = {};
      for (const r of res.data.results || []) {
        map[r.trade_id] = r;
      }
      setPrices(map);
    } catch (e) { /* silent — prices are best-effort */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/trades/open`);
      setOpen(res.data);
    } catch (e) { console.error(e); }
    finally { setRef(false); }
    fetchPrices();
  }, [fetchPrices]);

  useEffect(() => {
    load();
    // refresh prices every 60s while screen is visible
    intervalRef.current = setInterval(fetchPrices, 60_000);
    return () => clearInterval(intervalRef.current);
  }, [load, fetchPrices]);

  const onRefresh = () => { setRef(true); load(); };

  const checkPositions = async () => {
    try {
      const res = await axios.post(`${API_URL}/monitor`);
      const results = res.data.results || [];
      const map = {};
      for (const r of results) map[r.trade_id] = r;
      setPrices(map);
      const hits = results.filter(r => r.action !== 'HOLD');
      if (hits.length === 0) {
        Alert.alert('Monitor', 'All positions within range');
      } else {
        const msg = hits.map(r => `${r.contract_symbol}: ${r.action} @ $${r.current_price}`).join('\n');
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

      {open.map(t => {
        const p = prices[t.id] || {};
        const cur    = p.current_price ?? null;
        const pnl    = p.pnl    ?? null;
        const pnlPct = p.pnl_pct ?? null;
        const action = p.action ?? 'HOLD';
        const entry  = parseFloat(t.entry_price  || 0);
        const stop   = parseFloat(t.stop_price   || 0);
        const target = parseFloat(t.target_price || 0);

        // progress bar: 0% = stop, 100% = target
        const range = target > stop ? target - stop : 1;
        const progress = cur !== null
          ? Math.max(0, Math.min(1, (cur - stop) / range))
          : (entry - stop) / range;

        const actionColor = action === 'STOP_HIT' ? RED : action === 'TARGET_HIT' ? GREEN : null;

        return (
          <View key={t.id} style={[styles.card, actionColor ? { borderColor: actionColor } : null]}>
            {/* Header row */}
            <View style={styles.row}>
              <Text style={styles.symbol}>{t.symbol}</Text>
              <View style={[styles.badge, { backgroundColor: t.status === 'open' ? '#033a16' : '#1c1f24' }]}>
                <Text style={[styles.badgeText, { color: t.status === 'open' ? GREEN : MUTED }]}>
                  {t.status.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.muted, { marginLeft: 6 }]}>#{t.id} · Run #{t.run_id}</Text>
              <Text style={[styles.muted, { marginLeft: 6 }]}>{t.option_type} · x{t.contracts}</Text>
            </View>
            <Text style={[styles.contract, { marginTop: 4 }]}>{t.contract_symbol}</Text>

            {/* Current price + P&L row */}
            <View style={[styles.row, { marginTop: 10, justifyContent: 'space-between' }]}>
              <View>
                <Text style={styles.lbl}>CURRENT</Text>
                <Text style={[styles.val, { fontSize: 20, color: cur !== null ? pnlColor(pnl) : MUTED }]}>
                  {cur !== null ? `$${cur.toFixed(2)}` : '—'}
                </Text>
              </View>
              {pnl !== null && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.lbl}>UNREALIZED P&L</Text>
                  <Text style={[styles.val, { fontSize: 18, color: pnlColor(pnl) }]}>
                    {pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}
                  </Text>
                  <Text style={[styles.muted, { color: pnlColor(pnl) }]}>
                    {pnlPct >= 0 ? '+' : ''}{pnlPct?.toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>

            {/* Progress bar: stop ──── current ──── target */}
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>

            {/* Levels row */}
            <View style={[styles.row, { marginTop: 4, justifyContent: 'space-between' }]}>
              <View>
                <Text style={styles.lbl}>STOP</Text>
                <Text style={[styles.val, { color: RED, fontSize: 12 }]}>${stop.toFixed(2)}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.lbl}>ENTRY</Text>
                <Text style={[styles.val, { fontSize: 12 }]}>${entry.toFixed(2)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.lbl}>TARGET</Text>
                <Text style={[styles.val, { color: GREEN, fontSize: 12 }]}>
                  {target > 0 ? `$${target.toFixed(2)}` : '—'}
                </Text>
              </View>
            </View>

            {/* Max risk / gain */}
            <View style={[styles.row, { marginTop: 8 }]}>
              <Text style={styles.muted}>
                Risk: ${((entry - stop) * (t.contracts || 1) * 100).toFixed(0)}
              </Text>
              {target > 0 && (
                <Text style={styles.muted}>
                  {'  |  '}Gain: ${((target - entry) * (t.contracts || 1) * 100).toFixed(0)}
                </Text>
              )}
            </View>
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: BG },
  header:       { padding: 20, paddingTop: 56, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle:  { fontSize: 18, fontWeight: '800', color: '#e6edf3' },
  card:         { backgroundColor: CARD, margin: 12, marginBottom: 0, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: BORDER },
  row:          { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  symbol:       { fontSize: 16, fontWeight: '800', color: '#e6edf3', marginRight: 8 },
  contract:     { fontSize: 11, color: MUTED, fontFamily: 'monospace' },
  badge:        { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText:    { fontSize: 9, fontWeight: '800' },
  lbl:          { fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  val:          { fontSize: 13, fontWeight: '700', color: '#e6edf3' },
  muted:        { color: MUTED, fontSize: 11 },
  btn:          { backgroundColor: '#21262d', borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  btnText:      { color: '#e6edf3', fontSize: 12, fontWeight: '600' },
  progressBg:   { height: 3, backgroundColor: '#21262d', borderRadius: 2, marginTop: 10, marginBottom: 2 },
  progressFill: { height: 3, backgroundColor: BLUE, borderRadius: 2 },
});
