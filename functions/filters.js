// functions/filters.js
// Builds a dropdown-based filter UI for contacts table using distinct values from Supabase.

import supabase from '../supabaseClient.js';

// Columns user can filter by (display label -> column name)
const CONTACT_FIELDS = [
  { label: 'First Name', value: 'contact_first' },
  { label: 'Last Name',  value: 'contact_last'  },
  { label: 'Email',      value: 'contact_email' },
  { label: 'Phone',      value: 'contact_phone' },
];

/**
 * Mounts the dropdown filtering UI inside `container`.
 * Field select -> Value select (auto-populates from distinct DB values).
 */
export function mountContactFilters(container) {
  if (!container) return;

  container.innerHTML = `
    <select id="cc-field" class="select-pill" aria-label="Filter field">
      <option value="">Select field…</option>
      ${CONTACT_FIELDS.map(f => `<option value="${f.value}">${f.label}</option>`).join('')}
    </select>

    <select id="cc-value" class="select-pill" aria-label="Filter value" disabled>
      <option value="">Select value…</option>
    </select>
  `;

  const fieldSel = container.querySelector('#cc-field');
  const valueSel = container.querySelector('#cc-value');

  fieldSel.addEventListener('change', async () => {
    const col = fieldSel.value;
    valueSel.innerHTML = `<option value="">Select value…</option>`;
    valueSel.disabled = true;

    if (!col) return;

    const values = await fetchDistinctValues(col);
    if (values.length) {
      valueSel.innerHTML = [
        `<option value="">(Any)</option>`,
        ...values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`)
      ].join('');
      valueSel.disabled = false;
    }
  });
}

/**
 * Returns the active filter as { field, value } or null if none.
 */
export function getSelectedFilter(container) {
  const field = container?.querySelector('#cc-field')?.value || '';
  const value = container?.querySelector('#cc-value')?.value || '';
  if (!field || value === '') return null;
  return { field, value };
}

/**
 * Fetch distinct non-null values for a column from public.contacts.
 * Uses JS de-duplication to be compatible across PostgREST versions.
 */
async function fetchDistinctValues(column) {
  if (!supabase?.from) return [];

  let { data, error } = await supabase
    .from('contacts')
    .select(column)
    .not(column, 'is', null)
    .order(column, { ascending: true })
    .limit(1000);

  if (error) {
    console.warn('fetchDistinctValues error:', error);
    return [];
  }
  const set = new Set((data || []).map(r => (r[column] ?? '').toString()).filter(Boolean));
  return Array.from(set);
}

function escapeHtml(s=''){return s.replace(/[&<>"']/g,(m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
