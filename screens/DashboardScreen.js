import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import axios from 'axios';
import { API_URL } from '../App';

const GREEN  = '#3fb950';
const RED    = '#f85149';
const YELLOW = '#d29922';
const BLUE   = '#58a6ff';
const MUTED  = '#8b949e';
const CARD   = '#161b22';
const BG     = '#0d1117';
const BORDER = '#21262d';

function regimeColor(regime) {
  if (!regime) return MUTED;
  if (regime.includes('BULL')) return GREEN;
  if (regime.includes('BEAR') || regime.includes('RISK')) return RED;
  return YELLOW;
}

function Card({ children, style }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

function Label({ text, color }) {
  return (
    <Text style={[styles.label, color && { color }]}>{text}</Text>
  );
}

export default function DashboardScreen() {
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [run, setRun]             = useState(null);
  const [brief, setBrief]         = useState(null);
  const [agents, setAgents]       = useState({});
  const [running, setRunning]     = useState(false);
  const [runningLabel, setRunningLabel] = useState('');

  const load = useCallback(async () => {
    try {
      const runsRes = await axios.get(`${API_URL}/runs?limit=1`);
      if (!runsRes.data.length) { setLoading(false); return; }
      const runId = runsRes.data[0].id;
      const [runRes, briefRes, agentsRes] = await Promise.all([
        axios.get(`${API_URL}/runs/${runId}`),
        axios.get(`${API_URL}/runs/${runId}/brief`).catch(() => ({ data: null })),
        axios.get(`${API_URL}/runs/${runId}/agents`).catch(() => ({ data: {} })),
      ]);
      setRun(runRes.data.run);
      setBrief(briefRes.data);
      setAgents(agentsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const triggerRun = async () => {
    try {
      setRunning(true);
      setRunningLabel('Starting...');
      const res = await axios.post(`${API_URL}/run`, {});
      const runId = res.data.run_id;
      const started = Date.now();

      const steps = [
        'SCOUT researching news...',
        'ATLAS reading regime...',
        'COMPASS ranking sectors...',
        'Scanning options...',
        'HUNTER selecting contracts...',
        'SENTINEL + JUDGE sizing...',
        'GUARDIAN reviewing...',
        'ANALYST writing brief...',
      ];
      let stepIdx = 0;
      const stepTimer = setInterval(() => {
        stepIdx = Math.min(stepIdx + 1, steps.length - 1);
        const elapsed = Math.round((Date.now() - started) / 1000);
        setRunningLabel(`${steps[stepIdx]} (${elapsed}s)`);
      }, 25000);

      const poll = async () => {
        try {
          const r = await axios.get(`${API_URL}/runs/${runId}`);
          const status = r.data.run?.status;
          if (status === 'completed' || status === 'failed') {
            clearInterval(stepTimer);
            setRunning(false);
            setRunningLabel('');
            load();
          } else {
            setTimeout(poll, 5000);
          }
        } catch (_) {
          setTimeout(poll, 5000);
        }
      };
      setTimeout(poll, 10000);
    } catch (e) {
      setRunning(false);
      setRunningLabel('');
      Alert.alert('Error', e.message);
    }
  };

  const executeRun = async (runId, live) => {
    if (live) {
      Alert.alert('Confirm', 'Place LIVE orders via Tastytrade?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Execute', style: 'destructive',
          onPress: async () => {
            const res = await axios.post(`${API_URL}/execute/${runId}?live=true`);
            Alert.alert('Done', `${res.data.executed} trade(s) placed`);
          },
        },
      ]);
    } else {
      const res = await axios.post(`${API_URL}/execute/${runId}?live=false`);
      Alert.alert('Done', `${res.data.executed} trade(s) recorded (dry run)`);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={BLUE} size="large" />
      </View>
    );
  }

  const regime = run?.market_regime || '';
  const guardian = agents['guardian']?.data;
  const sentinel = agents['sentinel']?.data;
  const approved = guardian?.final_decisions?.filter(d => d.verdict === 'APPROVED') || [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NEXUS</Text>
        <Text style={styles.headerSub}>Multi-AI Trading Orchestrator</Text>
      </View>

      {/* Run button */}
      <View style={[styles.row, { flexDirection: 'column', alignItems: 'stretch' }]}>
        <TouchableOpacity
          style={[styles.btn, running && styles.btnDisabled]}
          onPress={triggerRun}
          disabled={running}
        >
          {running
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.btnText}>▶  Run NEXUS</Text>
          }
        </TouchableOpacity>
        {running && runningLabel ? (
          <Text style={[styles.muted, { textAlign: 'center', marginTop: -4, marginBottom: 8, fontSize: 11 }]}>
            {runningLabel}
          </Text>
        ) : null}
      </View>

      {!run && (
        <Text style={[styles.muted, { textAlign: 'center', marginTop: 40 }]}>
          No runs yet. Tap Run NEXUS to start.
        </Text>
      )}

      {run && (
        <>
          {/* Regime */}
          <Card>
            <View style={styles.row}>
              {regime ? (
                <View style={[styles.regimeBadge, { backgroundColor: regimeColor(regime) + '22', borderColor: regimeColor(regime) }]}>
                  <Text style={[styles.regimeText, { color: regimeColor(regime) }]}>{regime}</Text>
                </View>
              ) : null}
              <Text style={styles.muted}>Run #{run.id} · Phase {run.phase}</Text>
            </View>
            <Text style={styles.muted}>
              {new Date(run.started_at).toLocaleString()}
            </Text>
          </Card>

          {/* SENTINEL */}
          {sentinel && (
            <Card>
              <Label text="SENTINEL" color={MUTED} />
              <View style={styles.row}>
                <Text style={styles.muted}>Portfolio risk: </Text>
                <Text style={{
                  color: sentinel.portfolio_risk === 'LOW' ? GREEN :
                         sentinel.portfolio_risk === 'CRITICAL' ? RED : YELLOW,
                  fontWeight: '700',
                }}>{sentinel.portfolio_risk}</Text>
                <Text style={styles.muted}>  ·  net_liq: </Text>
                <Text style={styles.value}>${(sentinel.net_liq || 0).toLocaleString()}</Text>
              </View>
              {sentinel.risk_flags?.length > 0 && (
                <Text style={{ color: YELLOW, fontSize: 12, marginTop: 4 }}>
                  ⚠️ {sentinel.risk_flags.join(' · ')}
                </Text>
              )}
            </Card>
          )}

          {/* ANALYST Brief */}
          {brief?.headline && (
            <Card>
              <Label text="ANALYST BRIEF" color={MUTED} />
              <Text style={styles.headline}>{brief.headline}</Text>
              {brief.brief ? (
                <Text style={styles.briefText}>{brief.brief}</Text>
              ) : null}
              {brief.action_items?.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Action Items</Text>
                  {brief.action_items.map((a, i) => (
                    <Text key={i} style={styles.actionItem}>› {a}</Text>
                  ))}
                </>
              )}
              {brief.risk_factors?.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Risk Factors</Text>
                  {brief.risk_factors.map((r, i) => (
                    <Text key={i} style={styles.riskItem}>⚠ {r}</Text>
                  ))}
                </>
              )}
            </Card>
          )}

          {/* GUARDIAN Decisions */}
          {guardian?.final_decisions?.length > 0 && (
            <Card>
              <View style={styles.row}>
                <Label text="GUARDIAN DECISIONS" color={MUTED} />
                <Text style={{ color: GREEN, fontSize: 11, marginLeft: 8 }}>
                  {guardian.approved_count || 0} approved
                </Text>
              </View>
              {guardian.final_decisions.map((d, i) => (
                <View key={i} style={[styles.decisionRow, i > 0 && styles.divider]}>
                  <Text style={[
                    styles.verdict,
                    { color: d.verdict === 'APPROVED' ? GREEN : RED }
                  ]}>{d.verdict}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contractSym}>{d.contract_symbol}</Text>
                    {d.verdict === 'APPROVED' && (
                      <Text style={styles.muted}>
                        x{d.contracts}  entry ${d.entry_price?.toFixed(2)}  stop ${d.stop_loss?.toFixed(2)}  target ${d.profit_target_1?.toFixed(2)}  risk {d.risk_pct?.toFixed(1)}%
                      </Text>
                    )}
                    {d.rejection_reason && (
                      <Text style={{ color: RED, fontSize: 11 }}>{d.rejection_reason}</Text>
                    )}
                  </View>
                </View>
              ))}
              {approved.length > 0 && (
                <View style={[styles.row, { marginTop: 14 }]}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnSecondary, { flex: 1, marginRight: 8 }]}
                    onPress={() => executeRun(run.id, false)}
                  >
                    <Text style={[styles.btnText, { color: '#e6edf3' }]}>Record (dry run)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnDanger, { flex: 1 }]}
                    onPress={() => executeRun(run.id, true)}
                  >
                    <Text style={styles.btnText}>⚡ Execute Live</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          )}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: BG },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  header:     { padding: 20, paddingTop: 56, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle:{ fontSize: 22, fontWeight: '800', color: BLUE, letterSpacing: 3 },
  headerSub:  { fontSize: 11, color: MUTED, marginTop: 2 },
  card:       { backgroundColor: CARD, margin: 12, marginBottom: 0, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: BORDER },
  row:        { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  label:      { fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  muted:      { color: MUTED, fontSize: 12 },
  value:      { color: '#e6edf3', fontSize: 12 },
  sectionTitle: { fontSize: 11, color: MUTED, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  headline:   { fontSize: 15, fontWeight: '700', color: BLUE, marginBottom: 10, lineHeight: 21 },
  briefText:  { color: '#c9d1d9', fontSize: 12, lineHeight: 19, marginBottom: 8 },
  actionItem: { color: '#c9d1d9', fontSize: 12, lineHeight: 20, paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: BLUE, marginVertical: 2 },
  riskItem:   { color: YELLOW, fontSize: 12, lineHeight: 20, marginVertical: 2 },
  btn:        { backgroundColor: '#238636', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, margin: 12, alignItems: 'center' },
  btnSecondary: { backgroundColor: '#21262d', borderWidth: 1, borderColor: BORDER },
  btnDanger:  { backgroundColor: '#da3633' },
  btnDisabled:{ opacity: 0.5 },
  btnText:    { color: '#fff', fontWeight: '700', fontSize: 13 },
  regimeBadge:{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1, marginRight: 10 },
  regimeText: { fontSize: 11, fontWeight: '700' },
  decisionRow:{ paddingVertical: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  divider:    { borderTopWidth: 1, borderTopColor: BORDER },
  verdict:    { fontSize: 11, fontWeight: '800', width: 70, marginTop: 2 },
  contractSym:{ color: '#e6edf3', fontSize: 12, fontWeight: '600', marginBottom: 2 },
});
