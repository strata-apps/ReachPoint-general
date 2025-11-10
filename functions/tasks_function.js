// functions/tasks_function.js
// Enhanced task creator
// Table: tasks(id, contact_id, task_text, active, user_id, created_at)
//
// Modes:
//  - With { contact }: creates a task for that single contact
//  - Without contact: shows Filters UI (mountContactFilters, getSelectedFilter) and inserts one task per matching contact
//
// Depends on: functions/filters.js (mountContactFilters, getSelectedFilter)

import { mountContactFilters, getSelectedFilter } from './filters.js';

function el(tag, cls, text){ const n=document.createElement(tag); if(cls) n.className=cls; if(text!=null) n.textContent=text; return n; }
const div = (...args) => el('div', ...args);

export function renderTasks({ contact }) {
  const card = div('detailsCard');
  const title = el('div','summaryTitle','Create a Task');
  title.style.fontWeight = '800';
  title.style.margin = '6px 0';
  card.append(title);

  // Task input
  const row = div('kv');
  row.append(div('k','Task'));
  const v = div('v');

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = contact
    ? `Task for ${String(contact?.contact_first || contact?.full_name || 'this contact')}`
    : 'Describe the task...';
  Object.assign(input.style, {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontFamily: 'inherit',
    fontSize: '14px'
  });

  v.append(input);
  row.append(v);
  card.append(row);

  // Contacts selector (only shown if no explicit contact is provided)
  let filterBox = null;
  if (!contact) {
    const fRow = div('kv');
    fRow.append(div('k','Contacts'));
    const fV = div('v');

    filterBox = document.createElement('div');
    filterBox.className = 'latest-row';
    Object.assign(filterBox.style, { gap: '8px', flexWrap: 'wrap' });

    // Mount your backend-driven dropdowns
    mountContactFilters(filterBox);

    const hint = el('div', 'label', 'Choose who this task applies to.');
    hint.style.marginTop = '6px';

    fV.append(filterBox, hint);
    fRow.append(fV);
    card.append(fRow);
  }

  // Submit
  const add = el('button','btn','Add Task');
  add.style.marginTop = '10px';
  add.addEventListener('click', async () => {
    const task_text = String(input.value || '').trim();
    if (!task_text) { alert('Please enter a task description first.'); return; }

    try {
      const s = window.supabase;
      if (!s?.auth?.getUser || !s?.from) throw new Error('Supabase client missing');
      const { data: { user } } = await s.auth.getUser();
      if (!user) throw new Error('Not signed in');

      // Resolve contact targets
      let targets = [];
      if (contact) {
        const cid = contact?.contact_id ?? contact?.id ?? null;
        if (!cid) throw new Error('No contact_id available for this contact');
        targets = [cid];
      } else {
        const sel = getSelectedFilter(filterBox);
        if (!sel) { alert('Please choose a contacts filter first.'); return; }
        targets = await resolveContactIds(sel);
        if (!targets.length) { alert('No contacts match the selected filter.'); return; }
      }

      // Prepare rows (one per contact)
      const rows = targets.map(cid => ({
        task_text,
        active: true,
        user_id: user.id,
        contact_id: cid
      }));

      const { error } = await s.from('tasks').insert(rows);
      if (error) throw error;

      input.value = '';
      alert(`Task added${rows.length > 1 ? ` to ${rows.length} contacts` : ''}.`);
    } catch (e) {
      console.error('[tasks] insert failed', e);
      alert('Could not create task.');
    }
  });

  card.append(add);
  return card;
}

async function resolveContactIds(filterObj) {
  // filterObj typically: { field, value } from filters.js
  const s = window.supabase;
  if (!s?.from) return [];

  let ids = [];
  const add = (rows) => rows.forEach(r => {
    const cid = r?.contact_id ?? r?.id;
    if (cid != null) ids.push(cid);
  });

  if (Array.isArray(filterObj)) {
    let q = s.from('contacts').select('contact_id');
    for (const f of filterObj) q = q.eq(f.field, f.value);
    const { data, error } = await q.limit(5000);
    if (!error && data) add(data);
  } else if (filterObj && filterObj.field && filterObj.value != null) {
    const { data, error } = await s
      .from('contacts')
      .select('contact_id')
      .eq(filterObj.field, filterObj.value)
      .limit(5000);
    if (!error && data) add(data);
  }
  // Dedup
  const seen = new Set();
  ids = ids.filter(x => {
    const k = String(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return ids;
}

export default renderTasks;
