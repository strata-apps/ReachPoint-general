// functions/summary_table.js
import { upsertCampaignDraft } from '../db.js';

export function renderCampaignSummaryTable(
  mount,
  {
    progressRows = [],            // [{contact_id, outcome, response, notes, last_called_at}]
    contactsById = new Map(),     // Map<contact_id, contactRow>
    campaignId = null,
    onRecall = null,              // optional: (contact_id) => void
  } = {}
) {
  // ---- Build distinct option sets from backend-provided rows ----
  const distinctContactIds = uniq(progressRows.map(r => String(r.contact_id)));
  const distinctOutcomes   = uniq(progressRows.map(r => norm(r.outcome))).filter(Boolean);
  const distinctResponses  = uniq(progressRows.map(r => norm(r.response))).filter(Boolean);
  const distinctNotes      = uniq(progressRows.map(r => safeTrim(r.notes))).filter(Boolean);

  // Precompute contact display names
  const contactOptionList = distinctContactIds.map(id => {
    const c = contactsById.get(id);
    const name = displayName(c, id);
    return { id, label: name };
  }).sort((a,b) => a.label.localeCompare(b.label));

  mount.innerHTML = `
    <div class="card" style="grid-column:span 12;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div>
          <div class="kicker">Review</div>
          <div class="big">Calls in this Campaign</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="new-camp-name" type="text" placeholder="New campaign name"
                 style="padding:8px;border:1px solid rgba(0,0,0,.12);border-radius:10px;">
          <button id="mk-campaign" class="btn-add">Create Campaign from Filtered</button>
        </div>
      </div>

      <div style="margin-top:10px" class="label">Filter</div>
      <div class="latest-row" style="gap:8px;margin:8px 0;flex-wrap:wrap">
        <select id="flt-contact" class="select-pill" style="min-width:200px">
          <option value="">All contacts</option>
          ${contactOptionList.map(o => `<option value="${esc(o.id)}">${esc(o.label)}</option>`).join('')}
        </select>

        <select id="flt-outcome" class="select-pill" style="min-width:160px">
          <option value="">All outcomes</option>
          ${distinctOutcomes.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}
        </select>

        <select id="flt-response" class="select-pill" style="min-width:160px">
          <option value="">All responses</option>
          ${distinctResponses.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}
        </select>

        <select id="flt-notes" class="select-pill" style="min-width:220px">
          <option value="">All notes</option>
          ${distinctNotes.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}
        </select>
      </div>

      <div style="overflow:auto; border:1px solid rgba(0,0,0,.08); border-radius:12px;">
        <table class="table" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="text-align:left">
              <th style="padding:10px;border-bottom:1px solid rgba(0,0,0,.08)">Contact</th>
              <th style="padding:10px;border-bottom:1px solid rgba(0,0,0,.08)">Response</th>
              <th style="padding:10px;border-bottom:1px solid rgba(0,0,0,.08)">Outcome</th>
              <th style="padding:10px;border-bottom:1px solid rgba(0,0,0,.08)">Notes</th>
              <th style="padding:10px;border-bottom:1px solid rgba(0,0,0,.08)">Call</th>
            </tr>
          </thead>
          <tbody id="tbl-body"></tbody>
        </table>
      </div>
    </div>
  `;

  const state = {
    rows: [...progressRows],
    filters: { contactId: '', outcome: '', response: '', notes: '' }, // exact-match dropdowns
  };

  const tbody = mount.querySelector('#tbl-body');

  function phoneFor(id) {
    const c = contactsById.get(String(id));
    if (!c) return null;
    const d = String((c.contact_phone || c.phone || c.mobile || '')).replace(/[^\d+]/g,'');
    if (!d) return null;
    const n = d.startsWith('+') ? d : (d.length===10 ? `+1${d}` : `+${d}`);
    return `tel:${n}`;
  }

  function applyFilters() {
    const { contactId, outcome, response, notes } = state.filters;
    return state.rows.filter(r =>
      (contactId === '' || String(r.contact_id) === contactId) &&
      (outcome    === '' || norm(r.outcome) === outcome) &&
      (response   === '' || norm(r.response) === response) &&
      (notes      === '' || safeTrim(r.notes) === notes)
    );
  }

  function renderBody() {
    const rows = applyFilters();
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding:12px" class="label">No rows match your filters.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => {
      const id  = String(r.contact_id);
      const c   = contactsById.get(id);
      const tel = phoneFor(id);
      const name = displayName(c, id);
      const meta = c ? [c.contact_email, c.contact_phone].filter(Boolean).join(' • ') : '';
      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid rgba(0,0,0,.06)">
            <div style="font-weight:700">${esc(name)}</div>
            ${meta ? `<div class="label" style="font-size:12px">${esc(meta)}</div>` : ''}
          </td>
          <td style="padding:10px;border-bottom:1px solid rgba(0,0,0,.06)">${esc(r.response ?? '—')}</td>
          <td style="padding:10px;border-bottom:1px solid rgba(0,0,0,.06)">${esc(r.outcome ?? '—')}</td>
          <td style="padding:10px;border-bottom:1px solid rgba(0,0,0,.06)">${esc(r.notes ?? '')}</td>
          <td style="padding:10px;border-bottom:1px solid rgba(0,0,0,.06)">
            ${tel
              ? `<a href="${tel}" class="btn-glass">Call</a>`
              : `<button class="btn" disabled style="opacity:.6">No Phone</button>`
            }
          </td>
        </tr>
      `;
    }).join('');
  }

  // Wire dropdown filters (exact match)
  mount.querySelector('#flt-contact').onchange  = (e)=>{ state.filters.contactId = e.target.value; renderBody(); };
  mount.querySelector('#flt-outcome').onchange  = (e)=>{ state.filters.outcome   = e.target.value; renderBody(); };
  mount.querySelector('#flt-response').onchange = (e)=>{ state.filters.response  = e.target.value; renderBody(); };
  mount.querySelector('#flt-notes').onchange    = (e)=>{ state.filters.notes     = e.target.value; renderBody(); };

  // Create campaign from filtered subset (uses filtered rows’ contact_ids)
  mount.querySelector('#mk-campaign').onclick = async () => {
    const name = mount.querySelector('#new-camp-name').value.trim() || 'Follow-up Campaign';
    const subset = applyFilters().map(r => r.contact_id);
    if (!subset.length) { alert('No filtered rows to seed a new campaign.'); return; }

    try {
      const campaign_id = crypto.randomUUID();
      await upsertCampaignDraft({
        campaign_id,
        campaign_name: name,
        contact_ids: subset,
        dates: null,
        survey_questions: [],
        survey_options: [],
        workflow: null,
      });
      alert('New campaign created!');
      // optional: route somewhere afterwards
      // location.hash = `#/workflow?campaign=${encodeURIComponent(campaign_id)}`;
    } catch (e) {
      console.error('[summary_table] failed to create campaign', e);
      alert('Could not create campaign from selection.');
    }
  };

  renderBody();
}

/* -------------------------- helpers -------------------------- */
function uniq(arr) {
  const s = new Set();
  for (const v of arr) s.add(v);
  return [...s];
}
function norm(s) {
  if (s == null) return '';
  return String(s).trim().toLowerCase();
}
function safeTrim(s) {
  if (s == null) return '';
  return String(s).trim();
}
function displayName(contact, fallbackId) {
  if (!contact) return `ID ${fallbackId}`;
  const f = (contact.contact_first || '').trim();
  const l = (contact.contact_last || '').trim();
  const name = `${f} ${l}`.trim();
  return name || `ID ${fallbackId}`;
}
function esc(s=''){return s.toString().replace(/[&<>"']/g,(m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
