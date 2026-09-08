import { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import axios from 'axios';
import { API_URL } from '../App';

const GREEN = '#3fb950'; const RED = '#f85149'; const YELLOW = '#d29922';
const BLUE = '#58a6ff'; const MUTED = '#8b949e'; const CARD = '#161b22';
const BG = '#0d1117'; const BORDER = '#21262d';

export default function HistoryScreen() {
  const [history, setHistory]   = useState([]);
  const [summary, setSummary]   = useState(null);
  const [refreshing, setRef]    = useState(false);

  const load = useCallback(async () => {
    try {
      const [h, s] = await Promise.all([
        axios.get(`${API_URL}/trades/history?limit=50`),
        axios.get(`${API_URL}/trades/summary`),
      ]);
      setHistory(h.data);
      setSummary(s.data);
    } catch (e) { console.error(e); }
    finally { setRef(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRef(true); load(); };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trade History</Text>
      </View>

      {/* Summary stats */}
      {summary && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{summary.trades}</Text>
            <Text style={styles.statLbl}>Trades</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: GREEN }]}>{summary.win_rate}%</Text>
            <Text style={styles.statLbl}>Win Rate</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: GREEN }]}>{summary.winners}</Text>
            <Text style={styles.statLbl}>Winners</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: RED }]}>{summary.losers}</Text>
            <Text style={styles.statLbl}>Losers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: (summary.total_pnl || 0) >= 0 ? GREEN : RED }]}>
              ${(summary.total_pnl || 0).toFixed(0)}
            </Text>
            <Text style={styles.statLbl}>Total P&L</Text>
          </View>
        </View>
      )}

      {history.length === 0 && (
        <Text style={[styles.muted, { textAlign: 'center', margin: 40 }]}>
          No closed trades yet.
        </Text>
      )}

      {history.map(t => {
        const pnl = parseFloat(t.pnl || 0);
        const pnlPct = parseFloat(t.pnl_pct || 0);
        const isWin = pnl > 0;
        return (
          <View key={t.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.symbol}>{t.symbol}</Text>
              <View style={[styles.badge, { backgroundColor: isWin ? '#033a16' : '#3d1111' }]}>
                <Text style={[styles.badgeText, { color: isWin ? GREEN : RED }]}>
                  {isWin ? 'WIN' : 'LOSS'}
                </Text>
              </View>
              <Text style={styles.muted}>  {t.exit_reason || '—'}</Text>
            </View>
            <Text style={[styles.contract, { marginTop: 3 }]}>{t.contract_symbol}</Text>

            <View style={[styles.row, { marginTop: 10, gap: 16 }]}>
              <View>
                <Text style={styles.lbl}>ENTRY</Text>
                <Text style={styles.val}>${parseFloat(t.entry_price || 0).toFixed(2)}</Text>
              </View>
              <View>
                <Text style={styles.lbl}>EXIT</Text>
                <Text style={styles.val}>${parseFloat(t.exit_price || 0).toFixed(2)}</Text>
              </View>
              <View>
                <Text style={styles.lbl}>QTY</Text>
                <Text style={styles.val}>{t.contracts}</Text>
              </View>
              <View>
                <Text style={styles.lbl}>P&L</Text>
                <Text style={[styles.val, { color: isWin ? GREEN : RED }]}>
                  ${pnl.toFixed(0)}
                </Text>
              </View>
              <View>
                <Text style={styles.lbl}>P&L%</Text>
                <Text style={[styles.val, { color: isWin ? GREEN : RED }]}>
                  {pnlPct > 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                </Text>
              </View>
            </View>

            {t.closed_at && (
              <Text style={[styles.muted, { marginTop: 8 }]}>
                Closed {new Date(t.closed_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BG },
  header:      { padding: 20, paddingTop: 56, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#e6edf3' },
  statsRow:    { flexDirection: 'row', backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 14, paddingHorizontal: 8 },
  stat:        { flex: 1, alignItems: 'center' },
  statVal:     { fontSize: 16, fontWeight: '800', color: '#e6edf3' },
  statLbl:     { fontSize: 9, color: MUTED, textTransform: 'uppercase', marginTop: 2 },
  card:        { backgroundColor: CARD, margin: 12, marginBottom: 0, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: BORDER },
  row:         { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  symbol:      { fontSize: 15, fontWeight: '800', color: '#e6edf3', marginRight: 8 },
  contract:    { fontSize: 11, color: MUTED, fontFamily: 'monospace' },
  badge:       { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText:   { fontSize: 9, fontWeight: '800' },
  lbl:         { fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  val:         { fontSize: 13, fontWeight: '700', color: '#e6edf3' },
  muted:       { color: MUTED, fontSize: 11 },
});
