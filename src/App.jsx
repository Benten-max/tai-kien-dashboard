import { useState, useEffect, useMemo } from "react";

const SUPABASE_URL = "https://mlvxmkmsuhyzhfaytuzw.supabase.co";
const SUPABASE_KEY = "sb_publishable_okrthEP9OyzVROj70D5y3Q_5BxD7LPM";

function authHeaders(token) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function sb(path, token, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { ...authHeaders(token), ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Platzhalter-Preislogik — bitte mit der echten Preisliste abgleichen.
// Basispreis je Tarifgruppe für 1 Disziplin, +Aufschlag je weitere Disziplin.
const BASE_PRICE = { Kind: 35, Schueler: 40, Erwachsene: 49 };
const EXTRA_DISCIPLINE = 10;

function calcPrice(member, disciplineCount) {
  if (disciplineCount === 0) return 0;
  let price = BASE_PRICE[member.tariff_group] + (disciplineCount - 1) * EXTRA_DISCIPLINE;
  if (member.vormittagstarif) price = 20;
  if (member.tuer_code) price += 10;
  if (member.family_tarif) price *= 0.8;
  return Math.round(price * 100) / 100;
}

const TARIFF_LABELS = { Kind: "Kind", Schueler: "Schüler/Azubi", Erwachsene: "Erwachsene" };

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Login fehlgeschlagen");
  return data.access_token;
}

export default function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loginError, setLoginError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [tab, setTab] = useState("members");
  const [members, setMembers] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    loadAll();
  }, [accessToken]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [m, d, e, p] = await Promise.all([
        sb("members?select=*&order=last_name", accessToken),
        sb("disciplines?select=*&order=name", accessToken),
        sb("enrollments?select=*", accessToken),
        sb("payments?select=*&order=payment_date.desc", accessToken),
      ]);
      setMembers(m);
      setDisciplines(d);
      setEnrollments(e);
      setPayments(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const memberDisciplines = useMemo(() => {
    const map = {};
    for (const en of enrollments) {
      if (!map[en.member_id]) map[en.member_id] = [];
      const disc = disciplines.find((d) => d.id === en.discipline_id);
      if (disc) map[en.member_id].push(disc.name);
    }
    return map;
  }, [enrollments, disciplines]);

  const stats = useMemo(() => {
    const totalMembers = members.filter((m) => m.active).length;
    const monthlyRevenue = members
      .filter((m) => m.active)
      .reduce((sum, m) => sum + calcPrice(m, (memberDisciplines[m.id] || []).length), 0);
    const openPayments = payments.filter((p) => p.status !== "bezahlt").length;
    const paidThisMonth = payments
      .filter((p) => p.status === "bezahlt")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return { totalMembers, monthlyRevenue, openPayments, paidThisMonth };
  }, [members, payments, memberDisciplines]);

  async function handleLogin() {
    setLoggingIn(true);
    setLoginError(null);
    try {
      const token = await signIn(email, pw);
      setAccessToken(token);
    } catch (e) {
      setLoginError(e.message);
    } finally {
      setLoggingIn(false);
    }
  }

  if (!accessToken) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a1628", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
        <div style={{ background: "white", padding: 40, borderRadius: 12, width: 320, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: 22, color: "#0a1628", marginBottom: 4 }}>Tai-Kien</h1>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>Admin Dashboard</p>
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e5ea", borderRadius: 8, fontSize: 14, marginBottom: 10, boxSizing: "border-box" }}
          />
          <input
            type="password"
            placeholder="Passwort"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e5ea", borderRadius: 8, fontSize: 14, marginBottom: 12, boxSizing: "border-box" }}
          />
          {loginError && <p style={{ color: "#a31621", fontSize: 12, marginBottom: 10 }}>{loginError}</p>}
          <button
            onClick={handleLogin}
            disabled={loggingIn}
            style={{ width: "100%", padding: "10px", background: "#a31621", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
          >
            {loggingIn ? "Anmelden..." : "Anmelden"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f7f9", fontFamily: "Inter, sans-serif" }}>
      <header style={{ background: "#0a1628", color: "white", padding: "18px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: 19, margin: 0 }}>Tai-Kien Dashboard</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {["members", "payments"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? "#a31621" : "transparent",
                color: "white",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {t === "members" ? "Mitglieder" : "Zahlungen"}
            </button>
          ))}
        </div>
      </header>

      <div style={{ padding: 28, maxWidth: 1100, margin: "0 auto" }}>
        {error && (
          <div style={{ background: "#fde8e8", color: "#a31621", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            Fehler: {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard label="Aktive Mitglieder" value={stats.totalMembers} />
          <StatCard label="Monatl. Soll-Einnahmen" value={`${stats.monthlyRevenue.toFixed(2)} €`} />
          <StatCard label="Offene Zahlungen" value={stats.openPayments} accent />
          <StatCard label="Bezahlt (gesamt)" value={`${stats.paidThisMonth.toFixed(2)} €`} />
        </div>

        {loading ? (
          <p style={{ color: "#64748b" }}>Lade Daten...</p>
        ) : tab === "members" ? (
          <MembersTab
            members={members}
            disciplines={disciplines}
            memberDisciplines={memberDisciplines}
            showAdd={showAddMember}
            setShowAdd={setShowAddMember}
            onReload={loadAll}
            token={accessToken}
          />
        ) : (
          <PaymentsTab payments={payments} members={members} onReload={loadAll} token={accessToken} />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: "white", borderRadius: 10, padding: 18, border: "1px solid #e8eaed" }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent ? "#a31621" : "#0a1628", fontFamily: "Sora, sans-serif" }}>{value}</div>
    </div>
  );
}

function MembersTab({ members, disciplines, memberDisciplines, showAdd, setShowAdd, onReload, token }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 17, color: "#0a1628", margin: 0 }}>Mitglieder</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{ background: "#0a1628", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}
        >
          {showAdd ? "Abbrechen" : "+ Mitglied hinzufügen"}
        </button>
      </div>

      {showAdd && <AddMemberForm disciplines={disciplines} token={token} onDone={() => { setShowAdd(false); onReload(); }} />}

      <div style={{ background: "white", borderRadius: 10, border: "1px solid #e8eaed", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f6f7f9", textAlign: "left" }}>
              {["Name", "Tarif", "Disziplinen", "Preis/Monat", "Status"].map((h) => (
                <th key={h} style={{ padding: "10px 14px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const discs = memberDisciplines[m.id] || [];
              return (
                <tr key={m.id} style={{ borderTop: "1px solid #f0f1f3" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "#0a1628" }}>{m.first_name} {m.last_name}</td>
                  <td style={{ padding: "10px 14px", color: "#64748b" }}>{TARIFF_LABELS[m.tariff_group]}</td>
                  <td style={{ padding: "10px 14px", color: "#64748b" }}>{discs.length ? discs.join(", ") : "—"}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>{calcPrice(m, discs.length).toFixed(2)} €</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ background: m.active ? "#e8f5e9" : "#fde8e8", color: m.active ? "#2e7d32" : "#a31621", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                      {m.active ? "aktiv" : "inaktiv"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>Noch keine Mitglieder erfasst.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddMemberForm({ disciplines, token, onDone }) {
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    tariff_group: "Erwachsene", contract_type: "Normal",
    vormittagstarif: false, tuer_code: false, family_tarif: false, aufnahmegebuehr_paid: false,
  });
  const [selectedDiscs, setSelectedDiscs] = useState([]);
  const [saving, setSaving] = useState(false);

  function toggleDisc(id) {
    setSelectedDiscs((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function save() {
    if (!form.first_name || !form.last_name) return;
    setSaving(true);
    try {
      const [created] = await sb("members", token, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(form) });
      if (selectedDiscs.length) {
        await sb("enrollments", token, {
          method: "POST",
          body: JSON.stringify(selectedDiscs.map((discipline_id) => ({ member_id: created.id, discipline_id }))),
        });
      }
      onDone();
    } catch (e) {
      alert("Fehler: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = { padding: "8px 10px", border: "1px solid #e2e5ea", borderRadius: 6, fontSize: 13, width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ background: "white", border: "1px solid #e8eaed", borderRadius: 10, padding: 20, marginBottom: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <input style={inputStyle} placeholder="Vorname" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <input style={inputStyle} placeholder="Nachname" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        <input style={inputStyle} placeholder="E-Mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input style={inputStyle} placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <select style={inputStyle} value={form.tariff_group} onChange={(e) => setForm({ ...form, tariff_group: e.target.value })}>
          {Object.entries(TARIFF_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select style={inputStyle} value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}>
          <option value="Normal">Normal</option>
          <option value="Jahresvertrag">Jahresvertrag</option>
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>DISZIPLINEN</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {disciplines.map((d) => (
            <label key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, background: selectedDiscs.includes(d.id) ? "#fde8e8" : "#f6f7f9", padding: "6px 10px", borderRadius: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={selectedDiscs.includes(d.id)} onChange={() => toggleDisc(d.id)} />
              {d.name}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        {[
          ["vormittagstarif", "Vormittagstarif"],
          ["tuer_code", "Tür-Code (+10€)"],
          ["family_tarif", "Family-Tarif (-20%)"],
          ["aufnahmegebuehr_paid", "Aufnahmegebühr bezahlt"],
        ].map(([key, label]) => (
          <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
            {label}
          </label>
        ))}
      </div>

      <button onClick={save} disabled={saving} style={{ background: "#a31621", color: "white", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
        {saving ? "Speichern..." : "Mitglied speichern"}
      </button>
    </div>
  );
}

function PaymentsTab({ payments, members, onReload, token }) {
  const memberName = (id) => {
    const m = members.find((x) => x.id === id);
    return m ? `${m.first_name} ${m.last_name}` : "Unbekannt";
  };

  async function markPaid(id) {
    await sb(`payments?id=eq.${id}`, token, { method: "PATCH", body: JSON.stringify({ status: "bezahlt" }) });
    onReload();
  }

  return (
    <div style={{ background: "white", borderRadius: 10, border: "1px solid #e8eaed", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f6f7f9", textAlign: "left" }}>
            {["Mitglied", "Betrag", "Datum", "Status", ""].map((h) => (
              <th key={h} style={{ padding: "10px 14px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} style={{ borderTop: "1px solid #f0f1f3" }}>
              <td style={{ padding: "10px 14px", fontWeight: 600 }}>{memberName(p.member_id)}</td>
              <td style={{ padding: "10px 14px" }}>{Number(p.amount).toFixed(2)} €</td>
              <td style={{ padding: "10px 14px", color: "#64748b" }}>{p.payment_date}</td>
              <td style={{ padding: "10px 14px" }}>
                <span style={{
                  background: p.status === "bezahlt" ? "#e8f5e9" : p.status === "ueberfaellig" ? "#fde8e8" : "#fff4e0",
                  color: p.status === "bezahlt" ? "#2e7d32" : p.status === "ueberfaellig" ? "#a31621" : "#b8860b",
                  padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                }}>{p.status}</span>
              </td>
              <td style={{ padding: "10px 14px" }}>
                {p.status !== "bezahlt" && (
                  <button onClick={() => markPaid(p.id)} style={{ background: "none", border: "1px solid #0a1628", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
                    Als bezahlt markieren
                  </button>
                )}
              </td>
            </tr>
          ))}
          {payments.length === 0 && (
            <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>Noch keine Zahlungen erfasst.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
