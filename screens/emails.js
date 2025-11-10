// screens/emails.js
// Email Campaigns dashboard: lists campaigns from Supabase and wires Gmail auth (send scope)
// Requirements:
//  - window.supabase must be initialized globally
//  - Add Google Identity Services: we auto-load it (ensureGIS), but set window.GOOGLE_CLIENT_ID
//  - Table: public.email_campaigns (see SQL below)

export default function Emails(root) {
  root.innerHTML = `
    <section class="page-head">
      <h1 class="page-title">Email Campaigns</h1>
      <div style="display:flex; gap:8px; justify-content:right; margin-top:10px;">
        <button id="btnGmail" class="btn">Sign in with Google</button>
        <button id="btnRevoke" class="btn btn-danger" disabled>Sign out</button>
        <button id="btnSendTest" class="btn" disabled>Send Test</button>
        <a class="btn-add" href="#/create-emails">New Campaign</a>
      </div>
    </section>

    <section id="emails-stats" class="cards" style="margin-bottom:14px">
      <div class="card" id="stat-total-sent">
        <div class="kicker">Engagement</div>
        <div class="big">—</div>
        <div class="label">Total campaigns</div>
      </div>
      <div class="card" id="stat-active-campaigns">
        <div class="kicker">Campaigns</div>
        <div class="big">—</div>
        <div class="label">Active email campaigns</div>
      </div>
    </section>

    <section id="emails-list" class="cards"></section>

    <div class="card" style="margin-top:12px">
      <div class="kicker">Status</div>
      <pre id="log" class="label" style="white-space:pre-wrap;margin:6px 0 0 0">Ready.</pre>
    </div>
  `;

  const btnGmail   = root.querySelector('#btnGmail');
  const btnRevoke  = root.querySelector('#btnRevoke');
  const btnSendTst = root.querySelector('#btnSendTest');
  const listMount  = root.querySelector('#emails-list');
  const logBox     = root.querySelector('#log');

  let accessToken = null;
  let tokenClient = null;

  init().catch(e => log('Init error: ' + (e?.message || e)));

  async function init() {
    await ensureGIS();
    initOAuth();

    const { campaigns, activeCampaigns } = await fetchCampaigns();
    // Show totals using your schema
    updateStat('#stat-total-sent .big', campaigns.length);
    updateStat('#stat-active-campaigns .big', activeCampaigns.length);
    renderCampaigns(activeCampaigns);
  }

  /* ---------------- Supabase data ---------------- */

  async function fetchCampaigns() {
    // Reads from public.email_campaigns using your column names
    if (globalThis.supabase?.from) {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('campaign_id, campaign_subject, filters, email_content, workflow, created_at, updated_at')
        .order('updated_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        const now = new Date();
        const act = data.filter((c) => isActive(c, now));
        return { campaigns: data, activeCampaigns: act };
      }
      if (error) log('Supabase fetch error: ' + error.message);
    }
    // Fallback demo if Supabase unavailable
    const demo = [
      {
        campaign_id: crypto.randomUUID(),
        campaign_subject: 'STEM Night — Reminder',
        filters: { field: 'school', value: 'Isaac' },
        email_content: '<h1>STEM Night</h1><p>See you there!</p>',
        workflow: { start: '2025-11-01T17:00:00Z', end: '2025-11-14T17:00:00Z' },
        created_at: '2025-11-02T18:03:00Z',
        updated_at: '2025-11-07T22:17:00Z',
      },
      {
        campaign_id: crypto.randomUUID(),
        campaign_subject: 'College Conference — Registration',
        filters: { field: 'grade', value: '12' },
        email_content: '<p>Registration Link</p>',
        workflow: { start: '2025-10-12T17:00:00Z', end: '2025-11-20T17:00:00Z' },
        created_at: '2025-10-10T21:12:00Z',
        updated_at: '2025-11-05T19:44:00Z',
      },
    ];
    const now = new Date();
    return { campaigns: demo, activeCampaigns: demo.filter((c) => isActive(c, now)) };
  }

  function isActive(c, now = new Date()) {
    const endISO = c?.workflow?.end || c?.workflow?.to || null;
    const end = endISO ? new Date(endISO) : null;
    return !end || end.getTime() >= now.getTime();
  }

  /* ---------------- Render list ---------------- */

  function renderCampaigns(list) {
    if (!list.length) {
      listMount.innerHTML = `
        <div class="card wide">
          <div>
            <div class="kicker">No active campaigns</div>
            <div class="big" style="margin-bottom:6px">You're all caught up</div>
            <p class="label">Create a new email campaign to get started.</p>
          </div>
        </div>`;
      return;
    }
    listMount.innerHTML = list.map(renderWideCard).join('');
    listMount.addEventListener('click', onListClick);
  }

  function renderWideCard(c) {
    const idShort   = (c.campaign_id || '').toString().slice(0, 8);
    const updatedStr = formatRelative(c.updated_at);
    const createdStr = formatShortDate(c.created_at);
    const filtersTxt = summarizeFilters(c.filters);
    return `
      <div class="card wide" data-id="${escapeHtml(c.campaign_id)}">
        <div style="flex:1; min-width:0">
          <div class="kicker">Campaign</div>
          <div class="big" style="margin-bottom:6px">${escapeHtml(c.campaign_subject || 'Untitled Email')}</div>
          <div class="latest-row">
            <span class="badge">ID: ${idShort}…</span>
            ${filtersTxt ? `<span class="badge">${escapeHtml(filtersTxt)}</span>` : ''}
          </div>
          <p class="label" style="margin-top:8px">
            Updated ${updatedStr} • Created ${createdStr}
          </p>
        </div>
        <div style="display:flex; align-items:flex-start; justify-content:flex-end; gap:8px;">
          <button class="btn" data-test="${escapeHtml(c.campaign_id)}">Send Test</button>
          <button class="btn-delete" data-del="${escapeHtml(c.campaign_id)}">Delete</button>
        </div>
      </div>
    `;
  }

  function onListClick(e) {
    const del = e.target.closest('button[data-del]');
    if (del) return onDelete(del.getAttribute('data-del'));
    const tst = e.target.closest('button[data-test]');
    if (tst) return onSendTest(tst.getAttribute('data-test'));
  }

  async function onDelete(id) {
    if (!id) return;
    if (!confirm('Delete this email campaign? This cannot be undone.')) return;
    if (globalThis.supabase?.from) {
      const { error } = await supabase.from('email_campaigns').delete().eq('campaign_id', id);
      if (!error) {
        listMount.querySelector(`[data-id="${CSS.escape(id)}"]`)?.remove();
        // Update totals quickly
        updateStat('#stat-active-campaigns .big', listMount.querySelectorAll('.card.wide').length);
      } else {
        alert('Failed to delete. Please try again.');
      }
    }
  }

  function summarizeFilters(f) {
    if (!f) return '';
    if (Array.isArray(f)) {
      return f.map(one => `${one.field ?? 'field'} = ${one.value ?? ''}`).join(' • ');
    }
    if (typeof f === 'object') {
      if (f.field && f.value) return `${f.field} = ${f.value}`;
      return Object.entries(f).map(([k,v]) => `${k}: ${String(v)}`).join(' • ');
    }
    return String(f);
  }

  /* ---------------- Gmail auth + test send ---------------- */

  function initOAuth() {
    const GOOGLE_CLIENT_ID = window.GOOGLE_CLIENT_ID || '765883496085-itufq4k043ip181854tmcih1ka3ascmn.apps.googleusercontent.com';
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/gmail.send',
      callback: (resp) => {
        if (resp.error) return log('OAuth error: ' + JSON.stringify(resp.error));
        accessToken = resp.access_token;
        btnRevoke.disabled = false;
        btnSendTst.disabled = false;
        log('✅ Gmail send scope granted.');
      },
    });

    btnGmail.onclick  = () => tokenClient.requestAccessToken({ prompt: 'consent' });
    btnRevoke.onclick = async () => {
      try {
        if (accessToken) await google.accounts.oauth2.revoke(accessToken);
        log('🔒 Access revoked.');
      } catch (e) {
        log('Revoke error: ' + (e?.message || e));
      } finally {
        accessToken = null;
        btnRevoke.disabled = true;
        btnSendTst.disabled = true;
      }
    };
    btnSendTst.onclick = () => onSendTest(null);
  }

  async function onSendTest(campaignIdOrNull) {
    if (!accessToken) return alert('Please Sign in with Google first.');
    let subject = 'Hello from ReachPoint (test)';
    let html    = '<p>This is a test from ReachPoint.</p>';
    let to      = null;

    // If user clicked the per-row "Send Test", load that campaign’s content
    if (campaignIdOrNull && globalThis.supabase?.from) {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('campaign_subject, email_content')
        .eq('campaign_id', campaignIdOrNull)
        .maybeSingle();
      if (!error && data) {
        subject = data.campaign_subject || subject;
        html    = data.email_content || html;
      }
    }

    // Ask who to send to
    to = prompt('Send a test to which address? (defaults to your Gmail address)', '') || '';
    // If blank, Gmail API allows "To: me"
    const ok = await sendGmail({
      to: to.trim() ? to.trim() : 'me',
      subject,
      text: stripHtml(html) || 'Test',
      html
    });
    if (ok) alert('Test sent!');
  }

  async function sendGmail({ to, bcc, subject, text, html }) {
    try {
      const raw = buildRawEmail({ to, bcc, subject, text, html });
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      });
      if (!res.ok) {
        const errTxt = await res.text();
        log('❌ Send failed: ' + errTxt);
        return false;
      }
      const data = await res.json();
      log('✅ Sent id: ' + data.id + (bcc ? ' (bcc batch)' : (to ? ` → ${to}` : '')));
      return true;
    } catch (e) {
      log('❌ Error: ' + (e?.message || e));
      return false;
    }
  }

  function buildRawEmail({ to, bcc, subject, text, html }) {
    const boundary = '=_rp_' + Math.random().toString(36).slice(2);
    const headers = [];
    if (to) headers.push(`To: ${to}`);
    if (bcc && bcc.length) headers.push(`Bcc: ${bcc.join(', ')}`);
    headers.push(
      `Subject: ${encodeRFC2047(subject || '')}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`
    );
    const parts = [
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      (text || (html ? stripHtml(html) : '') || '').replace(/\r?\n/g, '\r\n'),

      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      (html || '').replace(/\r?\n/g, '\r\n'),

      `--${boundary}--`,
      ''
    ];
    const msg = headers.join('\r\n') + '\r\n\r\n' + parts.join('\r\n');
    return base64UrlEncode(msg);
  }

  /* ---------------- Small utils ---------------- */

  function updateStat(sel, val) {
    const el = root.querySelector(sel);
    if (el) el.textContent = Number.isFinite(val) ? val.toLocaleString() : '—';
  }

  function formatShortDate(iso) {
    const d = new Date(iso);
    return Number.isNaN(d) ? '—' : d.toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' });
  }
  function formatRelative(iso) {
    const d = new Date(iso); if (Number.isNaN(d)) return '—';
    const mins = Math.round((Date.now() - d) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return `${days}d ago`;
  }
  function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,(m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function summarize(obj) { return JSON.stringify(obj ?? {}, null, 0); }
  function log(msg) {
    const now = new Date();
    logBox.textContent = `${logBox.textContent ? logBox.textContent + '\n' : ''}[${now.toLocaleTimeString()}] ${msg}`;
  }
  function base64UrlEncode(str) {
    const utf8 = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i]);
    const b64 = btoa(binary);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  function encodeRFC2047(str) {
    if (!str) return '';
    if (/^[\x00-\x7F]*$/.test(str)) return str;
    const utf8 = new TextEncoder().encode(str);
    let hex = '';
    for (let i = 0; i < utf8.length; i++) hex += '=' + utf8[i].toString(16).toUpperCase().padStart(2, '0');
    return `=?UTF-8?Q?${hex.replace(/ /g, '_')}?=`;
  }
  function stripHtml(h = '') {
    return h.replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<\/(p|div|h[1-6]|li|br|tr)>/gi, '$&\n')
            .replace(/<[^>]+>/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
  }
  async function ensureGIS() {
    if (window.google?.accounts?.id) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(s);
    });
  }
}
