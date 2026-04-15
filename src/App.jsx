import { useState, useMemo } from "react";
import {
  FunnelChart, Funnel, Cell, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";

const COLORS = ["#4FC3F7", "#29B6F6", "#039BE5", "#0277BD", "#01579B", "#004D8C"];
const ACCENT  = "#F0B429";
const GREEN   = "#34D399";
const PURPLE  = "#A78BFA";
const BG      = "#0A0F1E";
const PANEL   = "#111827";
const BORDER  = "#1E2D45";
const TEXT    = "#E2EAF4";
const MUTED   = "#6B7E99";

/* ─── Policy constants ──────────────────────────────────────────
  新薬創出加算 (Shin-yaku Soushutsu Kasan):
    Qualifying drugs are exempt from NHI price cuts for a protection
    window (default 3 rounds = 6 years). Cuts resume after the window.

  孤児薬 (Orphan Drug) bonus:
    On top of Shin-yaku protection, the per-round cut is halved,
    and the protection window is extended by 2 rounds.
──────────────────────────────────────────────────────────────── */
const SHINYAKU_PROTECT_ROUNDS = 3;   // rounds shielded by Shin-yaku
const ORPHAN_EXTRA_ROUNDS     = 2;   // additional rounds for orphan
const ORPHAN_CUT_MULTIPLIER   = 0.5; // orphan cut = nhiCut × 0.5

function computePriceAdj(yr, nhiCut, shinYaku, isOrphan) {
  const totalRounds = Math.floor(yr / 2);   // how many 2-yr reviews have occurred
  const protectRounds = shinYaku
    ? SHINYAKU_PROTECT_ROUNDS + (isOrphan ? ORPHAN_EXTRA_ROUNDS : 0)
    : 0;
  const effectiveCut = isOrphan ? nhiCut * ORPHAN_CUT_MULTIPLIER : nhiCut;
  const billedRounds = Math.max(0, totalRounds - protectRounds);
  return Math.pow(1 - effectiveCut, billedRounds);
}

const ORANGE  = "#FB923C";   // LOE cliff color

/* ─── LOE (Loss of Exclusivity) logic ───────────────────────────
  Japan generics market dynamics post-patent-expiry:
    Year 0  (LOE year): Immediate brand share erosion begins.
    Year +1: Rapid erosion — generics typically capture 40-60% of
             volume within 12 months in Japan (faster than EU/US
             due to MHLW generics promotion policy since 2013).
    Year +2: Stabilisation at brand's "loyal residual" share.

  Two levers:
    loeDepth  — how far brand share falls at maximum erosion
                (default 75%: brand retains ~25% of pre-LOE revenue)
    loeSpeed  — how quickly the cliff hits
                1 = instant (Year 1 full erosion)
                2 = gradual (Year 1 half, Year 2 full)
──────────────────────────────────────────────────────────────── */
function computeLOEFactor(yr, loeYear, loeDepth, loeSpeed, loeEnabled) {
  if (!loeEnabled || yr < loeYear) return 1.0;
  const yrsPost = yr - loeYear + 1;          // 1-indexed years after LOE
  if (loeSpeed === 1) {
    // instant cliff
    return 1 - loeDepth;
  } else {
    // 2-year gradual erosion
    const erosion = Math.min(loeDepth, loeDepth * (yrsPost / 2));
    return Math.max(1 - loeDepth, 1 - erosion);
  }
}

/* ─── UI helpers ─────────────────────────────────────────────── */
function SliderInput({ label, value, min, max, step, onChange, format }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: MUTED, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ color: ACCENT, fontWeight: 700, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{format(value)}</span>
      </div>
      <div style={{ position: "relative", height: 6, background: "#1E2D45", borderRadius: 3 }}>
        <div style={{ position: "absolute", left: 0, width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, #0277BD, ${ACCENT})`, borderRadius: 3, transition: "width 0.1s" }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: "absolute", top: -5, left: 0, width: "100%", opacity: 0, cursor: "pointer", height: 16 }} />
      </div>
    </div>
  );
}

function ToggleSwitch({ label, checked, onChange, color, badge }) {
  return (
    <div onClick={() => onChange(!checked)}
      style={{ cursor: "pointer", marginBottom: 14, padding: "12px 14px",
        background: checked ? `${color}18` : "#0D1A2E",
        border: `1px solid ${checked ? color : BORDER}`,
        borderRadius: 10, transition: "all 0.2s", userSelect: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* pill toggle */}
        <div style={{ width: 36, height: 20, borderRadius: 10,
          background: checked ? color : "#1E2D45",
          transition: "background 0.2s", position: "relative", flexShrink: 0 }}>
          <div style={{ position: "absolute", top: 3, left: checked ? 18 : 3,
            width: 14, height: 14, borderRadius: "50%", background: "#fff",
            transition: "left 0.2s", boxShadow: "0 1px 4px #0006" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: checked ? color : TEXT, fontWeight: 700, fontSize: 12 }}>{label}</div>
          {badge && <div style={{ marginTop: 3, display: "inline-block", background: checked ? `${color}30` : "#1E2D45",
            color: checked ? color : MUTED, fontSize: 9, padding: "1px 7px", borderRadius: 4,
            letterSpacing: "0.07em", fontFamily: "'DM Mono', monospace" }}>{badge}</div>}
        </div>
        <div style={{ fontSize: 16 }}>{checked ? "✅" : "⬜"}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent, badge }) {
  return (
    <div style={{ background: PANEL, border: `1px solid ${accent ? accent + "55" : BORDER}`, borderRadius: 10, padding: "16px 20px", flex: 1, minWidth: 120 }}>
      <div style={{ color: MUTED, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ color: accent || TEXT, fontWeight: 800, fontSize: 20, fontFamily: "'DM Mono', monospace", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ color: MUTED, fontSize: 11, marginTop: 3 }}>{sub}</div>}
      {badge && <div style={{ marginTop: 5, display: "inline-block", background: `${accent || "#4FC3F7"}22`,
        color: accent || "#4FC3F7", fontSize: 9, padding: "2px 7px", borderRadius: 4,
        letterSpacing: "0.07em", fontFamily: "'DM Mono', monospace" }}>{badge}</div>}
    </div>
  );
}

const fmtBillion = v => v >= 1e11 ? `¥${(v/1e11).toFixed(1)}千億` : v >= 1e8 ? `¥${(v/1e8).toFixed(1)}億` : `¥${(v/1e6).toFixed(0)}M`;
const fmtPct    = v => `${(v * 100).toFixed(0)}%`;
const fmtNum    = v => v.toLocaleString("ja-JP");
const fmtYen    = v => `¥${(v/1e4).toFixed(0)}万`;

const CustomFunnelTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#1A2540", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ color: ACCENT, fontWeight: 700, fontSize: 13 }}>{d.name}</div>
      <div style={{ color: TEXT, fontSize: 12, marginTop: 2 }}>{fmtNum(d.value)} 人</div>
      {d.rate && <div style={{ color: MUTED, fontSize: 11 }}>→ {fmtPct(d.rate)}</div>}
    </div>
  );
};

const CustomLineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1A2540", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", minWidth: 200 }}>
      <div style={{ color: MUTED, fontSize: 11, marginBottom: 6 }}>{label}年</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontSize: 12, fontFamily: "'DM Mono', monospace", marginBottom: 2 }}>
          {p.name}: {fmtBillion(p.value)}
        </div>
      ))}
    </div>
  );
};

/* ─── Policy explainer panel ─────────────────────────────────── */
function PolicyBadge({ shinYaku, isOrphan, nhiCut, protectRounds }) {
  const lines = [];
  if (!shinYaku) {
    lines.push({ icon: "📉", text: `毎回2年毎に -${fmtPct(nhiCut)} 通常引き下げ` });
  } else {
    const window = protectRounds * 2;
    lines.push({ icon: "🛡", text: `新薬創出加算: 最初の${window}年間は薬価引き下げ免除` });
    if (isOrphan) {
      lines.push({ icon: "🌸", text: `孤児薬特例: 免除期間 +${ORPHAN_EXTRA_ROUNDS * 2}年延長` });
      lines.push({ icon: "✂️", text: `孤児薬特例: 引き下げ幅を半減 → -${fmtPct(nhiCut * ORPHAN_CUT_MULTIPLIER)}` });
    }
    lines.push({ icon: "⏳", text: `保護期間終了後は通常引き下げ適用再開` });
  }
  return (
    <div style={{ background: "#0D1A2E", border: `1px solid ${shinYaku ? (isOrphan ? PURPLE : GREEN) : BORDER}`,
      borderRadius: 8, padding: "12px 14px", marginTop: 14 }}>
      <div style={{ color: shinYaku ? (isOrphan ? PURPLE : GREEN) : MUTED,
        fontSize: 10, letterSpacing: "0.1em", marginBottom: 8, fontWeight: 700 }}>
        📋 適用薬価ルール
      </div>
      {lines.map((l, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5, fontSize: 10, color: MUTED, lineHeight: 1.4 }}>
          <span>{l.icon}</span><span>{l.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export default function App() {
  const [prevalence,  setPrevalence]  = useState(85000);
  const [diagRate,    setDiagRate]    = useState(0.62);
  const [treatRate,   setTreatRate]   = useState(0.55);
  const [classShare,  setClassShare]  = useState(0.30);
  const [brandShare,  setBrandShare]  = useState(0.22);
  const [annualCost,  setAnnualCost]  = useState(4800000);
  const [nhiCut,      setNhiCut]      = useState(0.05);
  const [rampYears,   setRampYears]   = useState(3);
  const [shinYaku,    setShinYaku]    = useState(false);
  const [isOrphan,    setIsOrphan]    = useState(false);
  const [loeEnabled,  setLoeEnabled]  = useState(false);
  const [loeYear,     setLoeYear]     = useState(8);   // patent expires at year 8 post-launch
  const [loeDepth,    setLoeDepth]    = useState(0.72); // brand loses 72% of revenue at full erosion
  const [loeSpeed,    setLoeSpeed]    = useState(2);   // 1=instant, 2=2yr gradual

  const protectRounds = SHINYAKU_PROTECT_ROUNDS + (isOrphan ? ORPHAN_EXTRA_ROUNDS : 0);

  const funnel = useMemo(() => {
    const diagnosed    = Math.round(prevalence * diagRate);
    const treated      = Math.round(diagnosed  * treatRate);
    const classPatients = Math.round(treated   * classShare);
    const brandPatients = Math.round(classPatients * brandShare);
    return [
      { name: "総患病人口",     value: prevalence,     rate: null       },
      { name: "診断済み患者",   value: diagnosed,      rate: diagRate   },
      { name: "治療中患者",     value: treated,        rate: treatRate  },
      { name: "分子クラス内",   value: classPatients,  rate: classShare },
      { name: "自社ブランド",   value: brandPatients,  rate: brandShare },
    ];
  }, [prevalence, diagRate, treatRate, classShare, brandShare]);

  const brandPatients = funnel[4].value;

  const forecast = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => {
      const yr         = i + 1;
      const rampFactor = yr <= rampYears ? yr / rampYears : 1.0;

      const adjBase     = computePriceAdj(yr, nhiCut, false,    false);
      const adjShinyaku = computePriceAdj(yr, nhiCut, true,     false);
      const adjOrphan   = computePriceAdj(yr, nhiCut, true,     true);
      const adjActive   = computePriceAdj(yr, nhiCut, shinYaku, isOrphan);

      const loeFactor   = computeLOEFactor(yr, loeYear, loeDepth, loeSpeed, loeEnabled);

      return {
        year:            `20${25 + yr}`,
        revenueNoNHI:    brandPatients * annualCost * rampFactor * loeFactor,
        revenueBase:     brandPatients * annualCost * rampFactor * adjBase    * loeFactor,
        revenueShinyaku: brandPatients * annualCost * rampFactor * adjShinyaku * loeFactor,
        revenueOrphan:   brandPatients * annualCost * rampFactor * adjOrphan  * loeFactor,
        revenue:         brandPatients * annualCost * rampFactor * adjActive  * loeFactor,
        protected:       shinYaku && Math.floor(yr / 2) <= protectRounds,
        isLoeYear:       loeEnabled && yr === loeYear,
        isPostLoe:       loeEnabled && yr >= loeYear,
      };
    });
  }, [brandPatients, annualCost, nhiCut, rampYears, shinYaku, isOrphan, protectRounds,
      loeEnabled, loeYear, loeDepth, loeSpeed]);

  const peakRevenue  = Math.max(...forecast.map(f => f.revenue));
  const peakYear     = forecast.find(f => f.revenue === peakRevenue)?.year;
  const tenYearTotal = forecast.slice(0, 10).reduce((s, f) => s + f.revenue, 0);
  const fifteenYearTotal = forecast.reduce((s, f) => s + f.revenue, 0);

  // LOE revenue impact: compare with/without LOE for same period
  const revenueWithoutLoe = useMemo(() => forecast.reduce((s, f) => {
    const yr = Number(f.year) - 2025;
    const ramp = yr <= rampYears ? yr / rampYears : 1.0;
    const adj  = computePriceAdj(yr, nhiCut, shinYaku, isOrphan);
    return s + brandPatients * annualCost * ramp * adj;
  }, 0), [forecast, brandPatients, annualCost, rampYears, nhiCut, shinYaku, isOrphan]);

  const loeRevenueLoss = loeEnabled ? revenueWithoutLoe - fifteenYearTotal : 0;

  // NHI saved value by Shin-yaku + Orphan
  const totalBase    = forecast.reduce((s, f) => s + f.revenueBase, 0);
  const nhiBenefit   = fifteenYearTotal - totalBase;
  const nhiBenefitPct= totalBase > 0 ? nhiBenefit / totalBase : 0;

  // Active price line color
  const activeLine = isOrphan ? PURPLE : shinYaku ? GREEN : ACCENT;
  const activeLineName = isOrphan ? "孤児薬+新薬創出加算" : shinYaku ? "新薬創出加算適用" : "NHI調整後（標準）";

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Noto Sans JP', 'DM Sans', sans-serif", color: TEXT, display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "14px 28px", display: "flex", alignItems: "center", gap: 16, background: PANEL }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, #0277BD, ${ACCENT})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⬡</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "0.02em" }}>Japan Oncology BD Assessment Tool</div>
          <div style={{ color: MUTED, fontSize: 11, letterSpacing: "0.06em" }}>ILLUSTRATIVE DATA · NHI + 新薬創出加算 + LOE Model · v4.0</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {shinYaku && (
            <div style={{ background: `${GREEN}22`, border: `1px solid ${GREEN}66`, borderRadius: 6, padding: "4px 10px", fontSize: 10, color: GREEN, fontWeight: 700 }}>
              🛡 新薬創出加算 ON
            </div>
          )}
          {isOrphan && (
            <div style={{ background: `${PURPLE}22`, border: `1px solid ${PURPLE}66`, borderRadius: 6, padding: "4px 10px", fontSize: 10, color: PURPLE, fontWeight: 700 }}>
              🌸 孤児薬指定 ON
            </div>
          )}
          {loeEnabled && (
            <div style={{ background: `${ORANGE}22`, border: `1px solid ${ORANGE}66`, borderRadius: 6, padding: "4px 10px", fontSize: 10, color: ORANGE, fontWeight: 700 }}>
              ⚠️ LOE 第{loeYear}年
            </div>
          )}
          <div style={{ background: "#0D2137", border: `1px solid #1A3A5C`, borderRadius: 6, padding: "4px 12px", fontSize: 11, color: "#4FC3F7", letterSpacing: "0.08em" }}>
            🔬 ONCOLOGY · JAPAN MARKET
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }}>

        {/* ── Sidebar ── */}
        <div style={{ width: 288, background: PANEL, borderRight: `1px solid ${BORDER}`, padding: 24, flexShrink: 0, overflowY: "auto" }}>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
            📊 モデル入力パラメータ
          </div>

          <div style={{ color: "#4FC3F7", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>患者漏斗モデル</div>
          <SliderInput label="目標患病人口（日本）" value={prevalence} min={10000} max={300000} step={5000} onChange={setPrevalence} format={v => `${(v/1e4).toFixed(1)}万人`} />
          <SliderInput label="就診率 Diagnosis Rate"   value={diagRate}   min={0.1} max={1.0} step={0.01} onChange={setDiagRate}   format={fmtPct} />
          <SliderInput label="治療率 Treatment Rate"   value={treatRate}  min={0.1} max={1.0} step={0.01} onChange={setTreatRate}  format={fmtPct} />
          <SliderInput label="分子クラスシェア"         value={classShare} min={0.05} max={0.8} step={0.01} onChange={setClassShare} format={fmtPct} />
          <SliderInput label="自社ブランドシェア"       value={brandShare} min={0.01} max={0.6} step={0.01} onChange={setBrandShare} format={fmtPct} />

          <div style={{ color: "#4FC3F7", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, marginTop: 20 }}>価格 & 市場環境</div>
          <SliderInput label="年間治療費用（患者1人）" value={annualCost} min={500000} max={15000000} step={100000} onChange={setAnnualCost} format={fmtYen} />
          <SliderInput label="NHI薬価引き下げ（2年毎）" value={nhiCut}   min={0.01} max={0.15} step={0.005} onChange={setNhiCut}    format={fmtPct} />
          <SliderInput label="ランプアップ期間（年）"  value={rampYears} min={1} max={5} step={1}          onChange={setRampYears} format={v => `${v}年`} />

          {/* ── NEW: Regulatory toggles ── */}
          <div style={{ color: GREEN, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, marginTop: 22 }}>
            🏥 薬価特例制度
          </div>

          <ToggleSwitch
            label="新薬創出加算 適用"
            checked={shinYaku}
            onChange={v => { setShinYaku(v); if (!v) setIsOrphan(false); }}
            color={GREEN}
            badge={`最初${SHINYAKU_PROTECT_ROUNDS * 2}年間 引き下げ免除`}
          />

          {shinYaku && (
            <ToggleSwitch
              label="孤児薬（希少疾病用医薬品）指定"
              checked={isOrphan}
              onChange={setIsOrphan}
              color={PURPLE}
              badge={`免除+${ORPHAN_EXTRA_ROUNDS * 2}年 / 引き下げ幅 ÷2`}
            />
          )}

          <PolicyBadge shinYaku={shinYaku} isOrphan={isOrphan} nhiCut={nhiCut} protectRounds={protectRounds} />

          {/* ── LOE Section ── */}
          <div style={{ color: ORANGE, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, marginTop: 22 }}>
            ⚠️ 特許切れ・後発品参入
          </div>

          <ToggleSwitch
            label="LOE（特許切れ）シナリオ ON"
            checked={loeEnabled}
            onChange={setLoeEnabled}
            color={ORANGE}
            badge="後発品参入による断崖シミュレーション"
          />

          {loeEnabled && (
            <div style={{ marginTop: 4 }}>
              <SliderInput
                label="特許切れ年（上市後）"
                value={loeYear} min={5} max={14} step={1}
                onChange={setLoeYear}
                format={v => `第${v}年`}
              />
              <SliderInput
                label="ブランド売上侵食率（最大）"
                value={loeDepth} min={0.3} max={0.95} step={0.01}
                onChange={setLoeDepth}
                format={fmtPct}
              />
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: MUTED, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>侵食スピード</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { v: 1, label: "即時断崖", sub: "1年で最大侵食" },
                    { v: 2, label: "緩やか",   sub: "2年かけて侵食" },
                  ].map(opt => (
                    <div key={opt.v} onClick={() => setLoeSpeed(opt.v)}
                      style={{ flex: 1, cursor: "pointer", padding: "8px 10px",
                        background: loeSpeed === opt.v ? `${ORANGE}22` : "#0D1A2E",
                        border: `1px solid ${loeSpeed === opt.v ? ORANGE : BORDER}`,
                        borderRadius: 8, transition: "all 0.15s" }}>
                      <div style={{ color: loeSpeed === opt.v ? ORANGE : TEXT, fontSize: 11, fontWeight: 700 }}>{opt.label}</div>
                      <div style={{ color: MUTED, fontSize: 9, marginTop: 2 }}>{opt.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* LOE Japan Context Box */}
              <div style={{ padding: "10px 12px", background: `${ORANGE}0F`, border: `1px solid ${ORANGE}33`, borderRadius: 8 }}>
                <div style={{ color: ORANGE, fontSize: 9, letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>🇯🇵 日本後発品市場の現状</div>
                <div style={{ color: MUTED, fontSize: 9, lineHeight: 1.6 }}>
                  • MHLW目標: 後発品数量シェア <strong style={{color: TEXT}}>80%以上</strong>（達成済）<br/>
                  • LOE後1年: ブランドシェア通常 <strong style={{color: TEXT}}>30-50%</strong> に急落<br/>
                  • 抗がん剤: 他領域より侵食が <strong style={{color: TEXT}}>やや緩慢</strong>（処方慣性）<br/>
                  • バイオシミラー: 小分子より侵食 <strong style={{color: TEXT}}>遅い</strong> 傾向
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, padding: "12px 14px", background: "#0D1A2E", borderRadius: 8, border: `1px solid #1A3A5C` }}>
            <div style={{ color: "#4FC3F7", fontSize: 10, letterSpacing: "0.08em", marginBottom: 6 }}>⚠ DISCLAIMER</div>
            <div style={{ color: MUTED, fontSize: 10, lineHeight: 1.5 }}>本ツールは例示的データを使用。実際の意思決定には実市場データの検証が必要です。</div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>

          {/* KPI Row */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <StatCard label="ピーク売上高" value={fmtBillion(peakRevenue)} sub={`${peakYear}年`} accent={activeLine} />
            <StatCard label="15年累計売上" value={fmtBillion(fifteenYearTotal)} sub={loeEnabled ? "LOE込み" : "薬価調整後"} accent={activeLine} />
            <StatCard label="ブランド患者数" value={`${fmtNum(brandPatients)}人`} sub="定常時" />
            {loeEnabled ? (
              <StatCard
                label="LOE 累計損失"
                value={`-${fmtBillion(loeRevenueLoss)}`}
                sub={`特許切れ 第${loeYear}年 / 侵食率 ${fmtPct(loeDepth)}`}
                accent={ORANGE}
                badge="後発品競争影響"
              />
            ) : shinYaku ? (
              <StatCard
                label="新薬創出加算 累計効果"
                value={nhiBenefit >= 0 ? `+${fmtBillion(nhiBenefit)}` : fmtBillion(nhiBenefit)}
                sub={`標準引き下げ比 ${nhiBenefit >= 0 ? "+" : ""}${fmtPct(nhiBenefitPct)}`}
                accent={isOrphan ? PURPLE : GREEN}
                badge={isOrphan ? "孤児薬+加算" : "新薬創出加算"}
              />
            ) : (
              <StatCard label="NHI累計影響" value={`-${fmtPct(1 - Math.pow(1 - nhiCut, 5))}`} sub="10年間（5回調整）" accent="#FF6B6B" />
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "370px 1fr", gap: 20, marginBottom: 20 }}>

            {/* Funnel Chart */}
            <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 16px" }}>
              <div style={{ color: TEXT, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>患者漏斗 Patient Funnel</div>
              <div style={{ color: MUTED, fontSize: 11, marginBottom: 16 }}>総患病人口 → 自社ブランド使用患者</div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <FunnelChart>
                    <Tooltip content={<CustomFunnelTooltip />} />
                    <Funnel dataKey="value" data={funnel} isAnimationActive>
                      {funnel.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginTop: 8 }}>
                {funnel.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i], flexShrink: 0 }} />
                    <span style={{ color: MUTED, fontSize: 11, flex: 1 }}>{item.name}</span>
                    <span style={{ color: TEXT, fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{fmtNum(item.value)}</span>
                    {item.rate && <span style={{ color: "#4FC3F7", fontSize: 10 }}>{fmtPct(item.rate)}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* 10-Year Forecast */}
            <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
                <div>
                  <div style={{ color: TEXT, fontWeight: 700, fontSize: 13 }}>15年売上予測 Revenue Forecast</div>
                  <div style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>
                    {shinYaku
                      ? `新薬創出加算保護期間: ${protectRounds * 2}年間 → 引き下げ免除`
                      : `NHI引き下げ: 2年毎 -${fmtPct(nhiCut)}`}
                    {isOrphan && ` ／ 孤児薬: 引き下げ幅 -${fmtPct(nhiCut * ORPHAN_CUT_MULTIPLIER)}`}
                    {loeEnabled && ` ／ LOE: 第${loeYear}年`}
                  </div>
                </div>
              </div>

              {/* LOE warning banner */}
              {loeEnabled && (
                <div style={{ display: "flex", gap: 10, marginBottom: 10, marginTop: 8, flexWrap: "wrap" }}>
                  <div style={{ background: `${ORANGE}18`, border: `1px solid ${ORANGE}44`,
                    borderRadius: 6, padding: "4px 10px", fontSize: 10, color: ORANGE, fontWeight: 700 }}>
                    ⚠️ 特許切れ: 第{loeYear}年（{2025 + loeYear}年）
                  </div>
                  <div style={{ background: "#FF6B6B18", border: "1px solid #FF6B6B44",
                    borderRadius: 6, padding: "4px 10px", fontSize: 10, color: "#FF6B6B" }}>
                    📉 後発品侵食: {loeSpeed === 1 ? "即時断崖" : "2年漸減"} / 最大 -{fmtPct(loeDepth)}
                  </div>
                </div>
              )}

              {/* Shin-yaku protection banner */}
              {shinYaku && (
                <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                  <div style={{ background: `${isOrphan ? PURPLE : GREEN}18`, border: `1px solid ${isOrphan ? PURPLE : GREEN}44`,
                    borderRadius: 6, padding: "4px 10px", fontSize: 10, color: isOrphan ? PURPLE : GREEN }}>
                    🛡 保護期間: 上市後 {protectRounds * 2} 年間
                  </div>
                  <div style={{ background: "#FF6B6B18", border: "1px solid #FF6B6B44",
                    borderRadius: 6, padding: "4px 10px", fontSize: 10, color: "#FF6B6B" }}>
                    📉 引き下げ開始: {protectRounds * 2 + 1} 年目〜
                  </div>
                </div>
              )}

              <div style={{ height: 290 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecast} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
                    <XAxis dataKey="year" tick={{ fill: MUTED, fontSize: 10 }} axisLine={{ stroke: BORDER }} interval={1} angle={-30} textAnchor="end" height={36} />
                    <YAxis tickFormatter={v => `${(v/1e8).toFixed(0)}億`} tick={{ fill: MUTED, fontSize: 10 }} axisLine={{ stroke: BORDER }} width={48} />
                    <Tooltip content={<CustomLineTooltip />} />
                    <Legend wrapperStyle={{ color: MUTED, fontSize: 10 }} />

                    {/* Always show baseline */}
                    <Line type="monotone" dataKey="revenueNoNHI" name="引き下げなし（上限）" stroke="#4FC3F7" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                    <Line type="monotone" dataKey="revenueBase"  name="標準NHI引き下げ"     stroke="#FF6B6B"  strokeWidth={1.5} strokeDasharray="4 4" dot={false} />

                    {/* Conditional overlay lines */}
                    {shinYaku && !isOrphan && (
                      <Line type="monotone" dataKey="revenueShinyaku" name="新薬創出加算適用" stroke={GREEN} strokeWidth={2.5} dot={{ fill: GREEN, r: 3 }} activeDot={{ r: 5 }} />
                    )}
                    {isOrphan && (
                      <Line type="monotone" dataKey="revenueOrphan" name="孤児薬+新薬創出加算" stroke={PURPLE} strokeWidth={2.5} dot={{ fill: PURPLE, r: 3 }} activeDot={{ r: 5 }} />
                    )}
                    {!shinYaku && (
                      <Line type="monotone" dataKey="revenue" name="NHI調整後（標準）" stroke={ACCENT} strokeWidth={2.5} dot={{ fill: ACCENT, r: 3 }} activeDot={{ r: 5 }} />
                    )}

                    {/* NHI price cut markers */}
                    {Array.from({ length: 7 }, (_, i) => {
                      const cutYr = 2 + i * 2;
                      if (cutYr > 15) return null;
                      const shielded = shinYaku && (i + 1) <= protectRounds;
                      return (
                        <ReferenceLine key={i}
                          x={`20${25 + cutYr}`}
                          stroke={shielded ? (isOrphan ? PURPLE : GREEN) : "#FF6B6B"}
                          strokeDasharray="3 3" strokeOpacity={0.5}
                          label={{ value: shielded ? "🛡" : "薬価↓", fill: shielded ? (isOrphan ? PURPLE : GREEN) : "#FF6B6B", fontSize: 9 }}
                        />
                      );
                    })}

                    {/* LOE cliff marker */}
                    {loeEnabled && (
                      <ReferenceLine
                        x={`20${25 + loeYear}`}
                        stroke={ORANGE} strokeWidth={2} strokeDasharray="1 0"
                        label={{ value: "⚠️ LOE", fill: ORANGE, fontSize: 10, fontWeight: 700 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Scenario Comparison Bar */}
          {shinYaku && (
            <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
              <div style={{ color: TEXT, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>シナリオ比較 Scenario Comparison</div>
              <div style={{ color: MUTED, fontSize: 11, marginBottom: 16 }}>15年累計売上 — 薬価制度シナリオ別{loeEnabled ? "（LOE込み）" : ""}</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[
                  { label: "① 引き下げなし（上限）", total: forecast.reduce((s,f)=>s+f.revenueNoNHI,0), color: "#4FC3F7" },
                  { label: "② 孤児薬+新薬創出加算", total: forecast.reduce((s,f)=>s+f.revenueOrphan,0),    color: PURPLE   },
                  { label: "③ 新薬創出加算のみ",     total: forecast.reduce((s,f)=>s+f.revenueShinyaku,0), color: GREEN    },
                  { label: "④ 標準NHI引き下げ",      total: forecast.reduce((s,f)=>s+f.revenueBase,0),     color: "#FF6B6B"},
                ].map((s, i) => {
                  const maxTotal = forecast.reduce((acc,f)=>acc+f.revenueNoNHI,0);
                  const barW = (s.total / maxTotal) * 100;
                  return (
                    <div key={i} style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ color: s.color, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
                      <div style={{ color: TEXT, fontSize: 17, fontFamily: "'DM Mono', monospace", fontWeight: 800 }}>{fmtBillion(s.total)}</div>
                      <div style={{ height: 6, background: "#1E2D45", borderRadius: 3, marginTop: 8 }}>
                        <div style={{ width: `${barW}%`, height: "100%", background: s.color, borderRadius: 3, opacity: 0.8 }} />
                      </div>
                      <div style={{ color: MUTED, fontSize: 10, marginTop: 3 }}>{fmtPct(s.total / maxTotal)} vs 上限</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sensitivity Table */}
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ color: TEXT, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>感応度分析 Sensitivity Analysis</div>
            <div style={{ color: MUTED, fontSize: 11, marginBottom: 16 }}>就診率 × ブランドシェア → ピーク売上（億円）｜現行薬価モデル適用</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ color: MUTED, padding: "6px 12px", textAlign: "left", borderBottom: `1px solid ${BORDER}`, fontSize: 10 }}>就診率 ↓ / ブランドシェア →</th>
                    {[0.10, 0.15, 0.20, 0.25, 0.30].map(bs => (
                      <th key={bs} style={{ color: brandShare === bs ? ACCENT : MUTED, padding: "6px 12px", textAlign: "right", borderBottom: `1px solid ${BORDER}`, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
                        {fmtPct(bs)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[0.40, 0.50, 0.60, 0.70, 0.80].map(dr => (
                    <tr key={dr} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ color: diagRate.toFixed(2) === dr.toFixed(2) ? ACCENT : MUTED, padding: "7px 12px", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{fmtPct(dr)}</td>
                      {[0.10, 0.15, 0.20, 0.25, 0.30].map(bs => {
                        const pts = Math.round(prevalence * dr * treatRate * classShare * bs);
                        // Use year-4 price adjustment for "peak proxy"
                        const adj = computePriceAdj(4, nhiCut, shinYaku, isOrphan);
                        const rev = pts * annualCost * adj;
                        const highlight = Math.abs(dr - diagRate) < 0.01 && Math.abs(bs - brandShare) < 0.005;
                        return (
                          <td key={bs} style={{
                            padding: "7px 12px", textAlign: "right", fontFamily: "'DM Mono', monospace", fontSize: 11,
                            color: highlight ? BG : rev > peakRevenue * 0.7 ? activeLine : TEXT,
                            background: highlight ? activeLine : "transparent",
                            borderRadius: highlight ? 4 : 0,
                            fontWeight: highlight ? 700 : 400
                          }}>
                            {(rev / 1e8).toFixed(1)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
