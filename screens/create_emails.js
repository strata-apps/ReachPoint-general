// screens/create_emails.js
// Mirrors create_calls.js but for emails, including a Design Workflow entry.
// After you create/configure the campaign, use the centered button to open the Workflow Designer.

export default function CreateEmails(root) {
  // ephemeral id to use for routing to workflow (in real flow, you’d get this from DB upsert)
  const tmpCampaignId = crypto.randomUUID();

  root.innerHTML = `
    <style>
      /* Force all cards to white for the builder */
      .card, .card.wide {
        background: #ffffff !important;
      }
    </style>

    <section class="page-head">
      <h1 class="page-title">Create Email Campaign</h1>
    </section>

    <!-- Campaign basics -->
    <div class="cards" style="margin-bottom:14px">
      <div class="card" style="grid-column:span 12;background:#fff">
        <div class="kicker">Campaign</div>

        <label class="label" style="display:block;margin-top:8px;">Subject</label>
        <input id="ce-subject" type="text" placeholder="e.g., STEM Night — Reminder"
               style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(0,0,0,.12);">

        <label class="label" style="display:block;margin-top:12px;">Preheader (optional)</label>
        <input id="ce-preheader" type="text" placeholder="Quick summary line"
               style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(0,0,0,.12);">
      </div>
    </div>

    <!-- Step 1: Filter Contacts -->
    <div class="card wide" style="background:#fff">
      <div style="flex:1;min-width:0">
        <div class="kicker">Step 1</div>
        <div class="big" style="margin-bottom:6px">Filter Contacts</div>

        <div class="latest-row" style="margin-top:8px;gap:10px;flex-wrap:wrap">
          <input id="ce-first"  placeholder="First name contains"  style="padding:8px;border-radius:10px;border:1px solid rgba(0,0,0,.12);">
          <input id="ce-last"   placeholder="Last name contains"   style="padding:8px;border-radius:10px;border:1px solid rgba(0,0,0,.12);">
          <input id="ce-email"  placeholder="Email contains"       style="padding:8px;border-radius:10px;border:1px solid rgba(0,0,0,.12);">
          <input id="ce-phone"  placeholder="Phone contains"       style="padding:8px;border-radius:10px;border:1px solid rgba(0,0,0,.12);">
          <button id="ce-run-filter" class="btn-glass">Run Filter</button>
          <button id="ce-select-all" class="btn-glass">Select All</button>
          <span class="badge" id="ce-count">Selected: 0</span>
        </div>

        <div id="ce-results" class="cards" style="margin-top:12px;"></div>
      </div>
    </div>

    <!-- Step 2: Email Content -->
    <div class="card wide" style="margin-top:14px;background:#fff">
      <div style="flex:1;min-width:0">
        <div class="kicker">Step 2</div>
        <div class="big" style="margin-bottom:6px">Email Content</div>

        <div class="label" style="margin-top:8px">Body (quick draft)</div>
        <textarea id="ce-body" rows="6" placeholder="Write a quick draft. You can fully design the email next."
          style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(0,0,0,.12);"></textarea>

        <!-- Design Email button (optional quick access) -->
        <div style="margin-top:10px">
          <button id="ce-design-email" class="btn-glass">Open Visual Email Designer</button>
          <div class="label" style="margin-top:6px">You can refine the final template in the visual designer or in the workflow step.</div>
        </div>

        <!-- ✅ Centered Workflow Button -->
        <div style="width:100%;display:flex;justify-content:center;margin-top:28px;">
          <button id="ce-design-workflow" class="btn-add">
            Design Workflow
          </button>
        </div>
      </div>
    </div>
  `;

  // --- State (mirrors create_calls.js approach) ---
  const selected = new Set();
  const filters = { contact_first:'', contact_last:'', contact_email:'', contact_phone:'' };

  // Wire filtering controls
  root.querySelector('#ce-run-filter')?.addEventListener('click', runFilter);
  root.querySelector('#ce-select-all')?.addEventListener('click', () => {
    const boxes = root.querySelectorAll('input[data-contact-id]');
    boxes.forEach(b => { b.checked = true; selected.add(b.getAttribute('data-contact-id')); });
    updateSelectedBadge();
  });

  // Visual designer launcher (optional quick access)
  root.querySelector('#ce-design-email')?.addEventListener('click', async () => {
    try {
      const mod = await import('../functions/email_design.js');
      const openDesigner = mod.default;
      const subject = root.querySelector('#ce-subject')?.value || '';
      const preheader = root.querySelector('#ce-preheader')?.value || '';
      const htmlDraft = `<h1>${escapeHtml(subject || 'Untitled')}</h1><p>${escapeHtml(preheader || '')}</p><p>${escapeHtml((root.querySelector('#ce-body')?.value || ''))}</p>`;

      openDesigner({
        initial: { subject, preheader, html: htmlDraft },
        onSave: (data) => {
          // You can persist the saved template later in the workflow or here
          console.log('Email template saved (draft):', data);
          alert('Draft saved to designer (demo). You can finalize the workflow next.');
        },
        onClose: () => {}
      });
    } catch (e) {
      console.warn('Email designer not available:', e);
      alert('Email designer module not found.');
    }
  });

  // ✅ Workflow link (includes a campaign id param to designworkflow.js)
  root.querySelector('#ce-design-workflow')?.addEventListener('click', () => {
    // In production, you’d create the campaign first and pass its actual id
    location.hash = `#/workflow?campaign=${encodeURIComponent(tmpCampaignId)}`;
  });

  /* --- functions (largely parallel to create_calls.js) --- */

  async function runFilter() {
    filters.contact_first = val('#ce-first');
    filters.contact_last  = val('#ce-last');
    filters.contact_email = val('#ce-email');
    filters.contact_phone = val('#ce-phone');

    const results = await fetchContacts(filters);
    renderResults(results);
  }

  function renderResults(rows) {
    const mount = root.querySelector('#ce-results');
    if (!rows.length) {
      mount.innerHTML = `
        <div class="card" style="grid-column:span 12;background:#fff">
          <div class="kicker">Contacts</div>
          <div class="big" style="margin-bottom:6px">No matches</div>
          <p class="label">Try widening your filters.</p>
        </div>`;
      return;
    }

    mount.innerHTML = rows.map(row => `
      <div class="card" style="grid-column:span 6;background:#fff">
        <div class="card-header" style="justify-content:space-between">
          <div>
            <div class="big" style="font-size:18px">${escapeHtml(row.contact_first || '')} ${escapeHtml(row.contact_last || '')}</div>
            <div class="label">${escapeHtml(row.contact_email || '—')} • ${escapeHtml(row.contact_phone || '—')}</div>
          </div>
          <div>
            <label class="label" style="display:flex;align-items:center;gap:8px">
              <input type="checkbox" data-contact-id="${row.contact_id}">
              Select
            </label>
          </div>
        </div>
      </div>
    `).join('');

    mount.addEventListener('change', (e) => {
      const box = e.target.closest('input[data-contact-id]');
      if (!box) return;
      const id = box.getAttribute('data-contact-id');
      if (box.checked) selected.add(id); else selected.delete(id);
      updateSelectedBadge();
    });
  }

  function updateSelectedBadge() {
    const badge = root.querySelector('#ce-count');
    if (badge) badge.textContent = `Selected: ${selected.size}`;
  }

  function val(sel) {
    return root.querySelector(sel)?.value?.trim() ?? '';
  }
}

/* Data access (same structure used in create_calls.js) */
async function fetchContacts(filters) {
  if (globalThis.supabase?.from) {
    let q = supabase.from('contacts')
      .select('contact_id, contact_first, contact_last, contact_email, contact_phone')
      .limit(200);
    if (filters.contact_first) q = q.ilike('contact_first', `%${filters.contact_first}%`);
    if (filters.contact_last)  q = q.ilike('contact_last',  `%${filters.contact_last}%`);
    if (filters.contact_email) q = q.ilike('contact_email', `%${filters.contact_email}%`);
    if (filters.contact_phone) q = q.ilike('contact_phone', `%${filters.contact_phone}%`);
    const { data, error } = await q;
    if (!error && Array.isArray(data)) return data;
    console.warn('Supabase contacts error:', error);
  }

  // Demo
  return [
    { contact_id: crypto.randomUUID(), contact_first:'Ana',  contact_last:'Lopez',  contact_email:'ana@example.com',  contact_phone:'555-1001' },
    { contact_id: crypto.randomUUID(), contact_first:'Jamal',contact_last:'Reed',   contact_email:'jamal@example.com',contact_phone:'555-1002' },
    { contact_id: crypto.randomUUID(), contact_first:'Mina', contact_last:'Chen',   contact_email:'mina@example.com', contact_phone:'555-1003' },
  ];
}

function escapeHtml(s=''){return s.replace(/[&<>"']/g,(m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
