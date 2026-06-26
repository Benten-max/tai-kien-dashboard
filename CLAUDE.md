# Tai-Kien Dashboard – Projekt-Kontext für Claude

## Übersicht
Mitglieder-Dashboard für **Tai-Kien-Boxen Dojo Aachen**.  
Stack: Vite + React 19, kein supabase-js (direkte REST-Fetch-Aufrufe), Supabase Auth.

## Infrastruktur

| Was | Wert |
|-----|------|
| Supabase Projekt-ID | `mlvxmkmsuhyzhfaytuzw` |
| Supabase URL | `https://mlvxmkmsuhyzhfaytuzw.supabase.co` |
| Publishable Key | `sb_publishable_okrthEP9OyzVROj70D5y3Q_5BxD7LPM` |
| GitHub Repo | `https://github.com/Benten-max/tai-kien-dashboard` |
| Netlify Site-ID | `333aa0ea-4f5f-4f54-a6e0-b728a0f8cd54` |
| Netlify URL | `https://tai-kien-dashboard.netlify.app` |

GitHub main → Netlify ist verbunden; jeder Push deployt automatisch.  
**Builds sind limitiert – nie manuell deployen oder Build-Hooks triggern.**

## Supabase-Schema

### `members`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | uuid PK | |
| first_name | text | |
| last_name | text | |
| email | text | |
| phone | text | |
| tariff_group | text | `Kind` / `Schueler` / `Erwachsene` |
| contract_type | text | `Normal` / `Jahresvertrag` |
| active | bool | |
| vormittagstarif | bool | Fixpreis 20 € (Platzhalter) |
| tuer_code | bool | +10 € Aufschlag (Platzhalter) |
| family_tarif | bool | -20 % Rabatt (Platzhalter) |
| aufnahmegebuehr_paid | bool | |

### `disciplines`
| Spalte | Typ |
|--------|-----|
| id | uuid PK |
| name | text |

### `enrollments` (n:m)
| Spalte | Typ |
|--------|-----|
| id | uuid PK |
| member_id | uuid FK → members |
| discipline_id | uuid FK → disciplines |

### `payments`
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | uuid PK | |
| member_id | uuid FK → members | |
| amount | numeric | |
| payment_date | date | |
| status | text | `bezahlt` / `offen` / `ueberfaellig` |

RLS ist aktiv – alle Policies verlangen `authenticated`.  
Auth läuft über `POST /auth/v1/token?grant_type=password`.

## Preislogik (PLATZHALTER – muss abgeglichen werden!)

Aktuell in `src/App.jsx` `calcPrice()`:

```
Kind       = 35 € Basis
Schueler   = 40 € Basis
Erwachsene = 49 € Basis
+ 10 € je weitere Disziplin
Vormittagstarif → Fixpreis 20 €
Tür-Code        → +10 €
Family-Tarif    → × 0,8
```

**Diese Werte sind Platzhalter.** Echte Preisliste des Dojos muss eingetragen werden.

## Offene Aufgaben

- [ ] **Preislogik** mit echter Tai-Kien-Preisliste abgleichen (`calcPrice` in `src/App.jsx:29`)
- [ ] `supabase-js` einführen statt roher `fetch()`-Aufrufe (Session-Handling, Refresh-Token)
- [ ] Session-Persistenz: Token geht bei Page-Reload verloren (kein `localStorage`)
- [ ] Mitglied bearbeiten / deaktivieren (aktuell nur Hinzufügen möglich)
- [ ] Zahlungen manuell anlegen (aktuell nur Status-Änderung möglich)
- [ ] Monatliche Zahlungen automatisch per Cron/Edge-Function generieren
- [ ] Suchfeld / Filter in der Mitgliederliste
- [ ] Responsive Design (aktuell nur Desktop)

## Lokale Entwicklung

```bash
cd tai-kien-source
npm install
npm run dev      # http://localhost:5173
npm run build    # produziert dist/
```

## Wichtige Hinweise

- **Netlify-Builds sind limitiert** – nie manuell über API oder CLI deployen
- Supabase Publishable Key kann im Client-Code stehen (ist für anon/auth-Zugriff gedacht)
- Das Projekt lag ursprünglich als ZIP (`tai-kien-dashboard-source.zip`) vor und wurde aus einem Chat-Prototyp übernommen
