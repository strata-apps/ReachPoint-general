// screens/emails.js
export default function Emails(root) {
  root.innerHTML = `
    <section class="page-head">
      <h1 class="page-title">Email Campaigns</h1>
      <div style="display:flex; justify-content:right; margin-top:10px;">
        <a class="btn-add" href="#/create-emails">New Campaign</a>
      </div>
    </section>

    <section id="emails-stats" class="cards" style="margin-bottom:14px">
      <div class="card" id="stat-total-sent">
        <div class="kicker">Engagement</div>
        <div class="big">—</div>
        <div class="label">Total emails sent</div>
      </div>
      <div class="card" id="stat-active-campaigns">
        <div class="kicker">Campaigns</div>
        <div class="big">—</div>
        <div class="label">Active email campaigns</div>
      </div>
    </section>

    <section id="emails-list" class="cards"></section>
  `;

  init();

  async function init() {
    const { campaigns, activeCampaigns } = await fetchCampaigns();
    const totalSent = await fetchTotalSent();
    updateStat('#stat-total-sent .big', totalSent);
    updateStat('#stat-active-campaigns .big', activeCampaigns.length);
    renderCampaigns(activeCampaigns);
  }

  function updateStat(sel, val) {
    const el = root.querySelector(sel);
    if (el) el.textContent = Number.isFinite(val) ? val.toLocaleString() : '—';
  }

  function renderCampaigns(list) {
    const mount = root.querySelector('#emails-list');
    if (!list.length) {
      mount.innerHTML = `
        <div class="card wide">
          <div>
            <div class="kicker">No active campaigns</div>
            <div class="big" style="margin-bottom:6px">You're all caught up</div>
            <p class="label">Create a new email campaign to get started.</p>
          </div>
        </div>`;
      return;
    }

    mount.innerHTML = list.map(renderWideCard).join('');

    mount.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-del]');
      if (!btn) return;
      const id = btn.getAttribute('data-del');
      if (!id) return;
      if (!confirm('Delete this email campaign? This cannot be undone.')) return;
      const ok = await deleteCampaign(id);
      if (ok) {
        btn.closest('.card.wide')?.remove();
        const n = mount.querySelectorAll('.card.wide').length;
        updateStat('#stat-active-campaigns .big', n);
      } else {
        alert('Failed to delete. Please try again.');
      }
    });
  }

  function renderWideCard(c) {
    const idShort = (c.campaign_id || '').toString().slice(0, 8);
    const recipients = Array.isArray(c.recipient_ids) ? c.recipient_ids.length : (c.recipient_count ?? 0);
    const updatedStr = formatRelative(c.updated_at);
    const createdStr = formatShortDate(c.created_at);
    const subject = c.subject || 'Untitled Email';

    return `
      <div class="card wide">
        <div style="flex:1; min-width:0">
          <div class="kicker">Campaign</div>
          <div class="big" style="margin-bottom:6px">${escapeHtml(subject)}</div>
          <div class="latest-row">
            <span class="badge">ID: ${idShort}…</span>
            <span class="badge">Recipients: ${recipients}</span>
            ${Number.isFinite(c.last_open_rate) ? `<span class="badge">Open: ${Math.round(c.last_open_rate*100)}%</span>` : ''}
            ${Number.isFinite(c.last_click_rate) ? `<span class="badge">Click: ${Math.round(c.last_click_rate*100)}%</span>` : ''}
          </div>
          <p class="label" style="margin-top:8px">
            Updated ${updatedStr} • Created ${createdStr}
          </p>
        </div>
        <div style="display:flex; align-items:flex-start; justify-content:flex-end;">
          <button class="btn-delete" data-del="${c.campaign_id}">Delete</button>
        </div>
      </div>
    `;
  }

  async function fetchCampaigns() {
    // Mirrors calls.js, but uses `email_campaigns`
    if (globalThis.supabase?.from) {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('updated_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        const now = new Date();
        const act = data.filter((c) => isActive(c, now));
        return { campaigns: data, activeCampaigns: act };
      }
    }
    // Demo data fallback
    const demo = [
      {
        campaign_id: crypto.randomUUID(),
        subject: 'STEM Night — Reminder',
        recipient_ids: Array.from({ length: 420 }, () => crypto.randomUUID()),
        dates: { start: '2025-11-01T17:00:00Z', end: '2025-11-14T17:00:00Z' },
        created_at: '2025-11-02T18:03:00Z',
        updated_at: '2025-11-07T22:17:00Z',
        last_open_rate: 0.42,
        last_click_rate: 0.09,
      },
      {
        campaign_id: crypto.randomUUID(),
        subject: 'College Conference — Registration',
        recipient_ids: Array.from({ length: 1800 }, () => crypto.randomUUID()),
        dates: { start: '2025-10-12T17:00:00Z', end: '2025-11-20T17:00:00Z' },
        created_at: '2025-10-10T21:12:00Z',
        updated_at: '2025-11-05T19:44:00Z',
        last_open_rate: 0.36,
        last_click_rate: 0.07,
      },
    ];
    const now = new Date();
    return { campaigns: demo, activeCampaigns: demo.filter((c) => isActive(c, now)) };
  }

  function isActive(c, now = new Date()) {
    const end = c?.dates?.end ? new Date(c.dates.end) : null;
    return !end || end.getTime() >= now.getTime();
  }

  async function fetchTotalSent() {
    // If you have an email events/log table, swap it here
    if (globalThis.supabase?.from) {
      const { count, error } = await supabase
        .from('email_events') // <- change to your actual table if different
        .select('*', { count: 'exact', head: true });
      if (!error && Number.isFinite(count)) return count;
    }
    return 420 + 1800; // demo total recipients sent
  }

  async function deleteCampaign(campaignId) {
    if (!campaignId) return false;
    if (globalThis.supabase?.from) {
      const { error } = await supabase.from('email_campaigns').delete().eq('campaign_id', campaignId);
      return !error;
    }
    return true;
  }
}

/* Utils borrowed from calls.js style */
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
function escapeHtml(s=''){return s.replace(/[&<>"']/g,(m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
