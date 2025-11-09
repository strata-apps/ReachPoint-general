// functions/interactions.js
// Renders a compact timeline of interactions for a contact in a campaign.
// Table: interactions(id, contact_id, campaign_id, user_id, call_time)

function el(tag, cls, text){ const n=document.createElement(tag); if(cls) n.className=cls; if(text!=null) n.textContent=text; return n; }
const div = (...args) => el('div', ...args);

export async function renderInteractions(root, { contact_id, campaign_id }) {
  root.innerHTML = '';

  const wrap = div('detailsCard');
  const title = el('div', 'summaryTitle', 'Interaction History');
  title.style.fontWeight = '800';
  title.style.marginBottom = '6px';
  wrap.append(title);

  const loading = el('div', 'label', 'Loading…');
  wrap.append(loading);
  root.append(wrap);

  try {
    const s = window.supabase;
    const { data, error } = await s
      .from('interactions')
      .select('id, contact_id, campaign_id, user_id, call_time')
      .eq('contact_id', contact_id)
      .eq('campaign_id', campaign_id)
      .order('call_time', { ascending: false })
      .limit(100);

    if (error) throw error;

    wrap.removeChild(loading);

    if (!data || !data.length) {
      wrap.append(el('div','label','No prior interactions for this contact.'));
      return;
    }

    // timeline table
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.background = '#fff';
    table.style.border = '1px solid #e5e7eb';
    table.style.borderRadius = '10px';
    table.style.overflow = 'hidden';
    table.createTHead().innerHTML = `
      <tr style="background:#f3f4f6;text-align:left">
        <th style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">When</th>
        <th style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">User</th>
      </tr>
    `;
    const tbody = table.createTBody();

    data.forEach(row => {
      const tr = tbody.insertRow();
      const td = (t) => { const c = tr.insertCell(); c.style.padding = '8px 10px'; c.textContent = t; return c; };
      td(row.call_time ? new Date(row.call_time).toLocaleString() : '—');
      td(row.user_id || '—');
    });

    wrap.append(table);
  } catch (e) {
    wrap.innerHTML = '';
    const err = div('', 'Could not load interaction history.');
    err.style.color = '#b91c1c';
    root.append(err);
    console.warn('[interactions] error', e);
  }
}

export default renderInteractions;
