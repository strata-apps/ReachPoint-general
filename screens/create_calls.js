// screens/create_calls.js
export default function CreateCalls(root) {
  root.innerHTML = `
    <style>
      /* Force all cards to white */
      .card, .card.wide {
        background: #ffffff !important;
      }
    </style>

    <section class="page-head">
      <h1 class="page-title">Create Call Campaign</h1>
    </section>

    <div class="cards" style="margin-bottom:14px">
      <div class="card" style="grid-column:span 12;background:#fff">
        <div class="kicker">Campaign</div>
        <label class="label" style="display:block;margin-top:8px;">Campaign name</label>
        <input id="cc-name" type="text" placeholder="e.g., STEM Night RSVPs"
               style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(0,0,0,.12);">
      </div>
    </div>

    <!-- Step 1: Filter Contacts -->
    <div class="card wide" style="background:#fff">
      <div style="flex:1;min-width:0">
        <div class="kicker">Step 1</div>
        <div class="big" style="margin-bottom:6px">Filter Contacts</div>

        <div class="latest-row" style="margin-top:8px;gap:10px;flex-wrap:wrap">
          <input id="cc-first"  placeholder="First name contains"  style="padding:8px;border-radius:10px;border:1px solid rgba(0,0,0,.12);">
          <input id="cc-last"   placeholder="Last name contains"   style="padding:8px;border-radius:10px;border:1px solid rgba(0,0,0,.12);">
          <input id="cc-email"  placeholder="Email contains"       style="padding:8px;border-radius:10px;border:1px solid rgba(0,0,0,.12);">
          <input id="cc-phone"  placeholder="Phone contains"       style="padding:8px;border-radius:10px;border:1px solid rgba(0,0,0,.12);">
          <button id="cc-run-filter" class="btn-glass">Run Filter</button>
          <button id="cc-select-all" class="btn-glass">Select All</button>
          <span class="badge" id="cc-count">Selected: 0</span>
        </div>

        <div id="cc-results" class="cards" style="margin-top:12px;"></div>
      </div>
    </div>

    <!-- Step 2: Survey -->
    <div class="card wide" style="margin-top:14px;background:#fff">
      <div style="flex:1;min-width:0">
        <div class="kicker">Step 2</div>
        <div class="big" style="margin-bottom:6px">Survey Questions & Options</div>

        <div class="label" style="margin-top:8px">Questions</div>
        <div id="cc-questions"></div>
        <button id="cc-add-q" class="btn-add" style="margin-top:8px">+ Add Question</button>

        <div class="label" style="margin-top:18px">Answer Options (global)</div>
        <div id="cc-options"></div>
        <button id="cc-add-opt" class="btn-add" style="margin-top:8px">+ Add Option</button>

        <!-- ✅ New Centered Workflow Button -->
        <div style="width:100%;display:flex;justify-content:center;margin-top:28px;">
          <button id="cc-design-workflow" class="btn-add">
            Design Workflow
          </button>
        </div>
      </div>
    </div>
  `;

  // State
  const selected = new Set();  
  const filters = { contact_first:'', contact_last:'', contact_email:'', contact_phone:'' };
  let questions = ['Can you attend this event?'];
  let options   = ['Yes','No','Maybe'];

  // Build default UI
  renderQuestions();
  renderOptions();

  // Wire filtering controls
  root.querySelector('#cc-run-filter')?.addEventListener('click', runFilter);
  root.querySelector('#cc-select-all')?.addEventListener('click', () => {
    const boxes = root.querySelectorAll('input[data-contact-id]');
    boxes.forEach(b => { b.checked = true; selected.add(b.getAttribute('data-contact-id')); });
    updateSelectedBadge();
  });

  // ✅ New workflow button handler
  // ✅ Replace your existing cc-design-workflow click handler in create_calls.js
  root.querySelector('#cc-design-workflow')?.addEventListener('click', async () => {
    try {
      const campaign_id = crypto.randomUUID();
      const name = root.querySelector('#cc-name')?.value?.trim() || 'Untitled Campaign';

      // Build the selected contacts array
      const student_ids = Array.from(root.querySelectorAll('input[data-contact-id]:checked'))
        .map(b => b.getAttribute('data-contact-id'));

      // Clean questions/options
      const qs = (Array.isArray(questions) ? questions : []).map(q => String(q || '').trim()).filter(Boolean);
      const os = (Array.isArray(options)   ? options   : []).map(o => String(o || '').trim()).filter(Boolean);

      // Build filters snapshot
      const filtersPayload = readFilters(root);

      // Upsert draft campaign to Supabase
      await upsertCampaignDraft({
        campaign_id,
        campaign_name: name,
        filters: filtersPayload,
        student_ids,
        dates: null,
        survey_questions: qs,
        survey_options: os,
        workflow: null
      });

      // Route to workflow with id
      location.hash = `#/workflow?campaign=${encodeURIComponent(campaign_id)}`;
    } catch (e) {
      console.error('Failed to create draft campaign:', e);
      alert('Could not create campaign draft. Please try again.');
    }
  });


  // Add question/option
  root.querySelector('#cc-add-q')?.addEventListener('click', () => { questions.push(''); renderQuestions(); });
  root.querySelector('#cc-add-opt')?.addEventListener('click', () => { options.push(''); renderOptions(); });

  function renderQuestions() {
    const mount = root.querySelector('#cc-questions');
    mount.innerHTML = questions.map((q, i) => `
      <div class="latest-row" style="gap:8px;margin-top:8px">
        <input data-q="${i}" value="${escapeHtml(q)}" placeholder="Question text"
               style="flex:1;padding:8px;border-radius:10px;border:1px solid rgba(0,0,0,.12);">
        <button class="btn-delete" data-q-del="${i}">Remove</button>
      </div>
    `).join('') || `<p class="label">No questions yet — add one.</p>`;

    mount.addEventListener('input', (e) => {
      const inp = e.target.closest('input[data-q]');
      if (!inp) return;
      const idx = Number(inp.getAttribute('data-q'));
      questions[idx] = inp.value;
    });
    mount.addEventListener('click', (e) => {
      const del = e.target.closest('button[data-q-del]');
      if (!del) return;
      const idx = Number(del.getAttribute('data-q-del'));
      questions.splice(idx, 1);
      renderQuestions();
    });
  }

  function renderOptions() {
    const mount = root.querySelector('#cc-options');
    mount.innerHTML = options.map((opt, i) => `
      <div class="latest-row" style="gap:8px;margin-top:8px">
        <input data-opt="${i}" value="${escapeHtml(opt)}" placeholder="Option text"
               style="flex:1;padding:8px;border-radius:10px;border:1px solid rgba(0,0,0,.12);">
        <button class="btn-delete" data-opt-del="${i}">Remove</button>
      </div>
    `).join('') || `<p class="label">No options yet — add one.</p>`;

    mount.addEventListener('input', (e) => {
      const inp = e.target.closest('input[data-opt]');
      if (!inp) return;
      const idx = Number(inp.getAttribute('data-opt'));
      options[idx] = inp.value;
    });
    mount.addEventListener('click', (e) => {
      const del = e.target.closest('button[data-opt-del]');
      if (!del) return;
      const idx = Number(del.getAttribute('data-opt-del'));
      options.splice(idx, 1);
      renderOptions();
    });
  }

  async function runFilter() {
    filters.contact_first = root.querySelector('#cc-first')?.value?.trim() ?? '';
    filters.contact_last  = root.querySelector('#cc-last')?.value?.trim() ?? '';
    filters.contact_email = root.querySelector('#cc-email')?.value?.trim() ?? '';
    filters.contact_phone = root.querySelector('#cc-phone')?.value?.trim() ?? '';

    const results = await fetchContacts(filters);
    renderResults(results);
  }

  function renderResults(rows) {
    const mount = root.querySelector('#cc-results');
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
    const badge = root.querySelector('#cc-count');
    if (badge) badge.textContent = `Selected: ${selected.size}`;
  }
}

/* Data access */
async function fetchContacts(filters) {
  if (globalThis.supabase?.from) {
    let q = supabase.from('contacts').select('contact_id, contact_first, contact_last, contact_email, contact_phone').limit(200);
    if (filters.contact_first) q = q.ilike('contact_first', `%${filters.contact_first}%`);
    if (filters.contact_last)  q = q.ilike('contact_last',  `%${filters.contact_last}%`);
    if (filters.contact_email) q = q.ilike('contact_email', `%${filters.contact_email}%`);
    if (filters.contact_phone) q = q.ilike('contact_phone', `%${filters.contact_phone}%`);
    const { data, error } = await q;
    if (!error && Array.isArray(data)) return data;
    console.warn('Supabase contacts error:', error);
  }

  return [
    { contact_id: crypto.randomUUID(), contact_first:'Ana',  contact_last:'Lopez',  contact_email:'ana@example.com',  contact_phone:'555-1001' },
    { contact_id: crypto.randomUUID(), contact_first:'Jamal',contact_last:'Reed',   contact_email:'jamal@example.com',contact_phone:'555-1002' },
    { contact_id: crypto.randomUUID(), contact_first:'Mina', contact_last:'Chen',   contact_email:'mina@example.com', contact_phone:'555-1003' },
  ];
}

function escapeHtml(s=''){return s.replace(/[&<>"']/g,(m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
