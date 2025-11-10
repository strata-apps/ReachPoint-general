// screens/tasks.js
// Task list & creation screen
// - Lists tasks for the signed-in user (public.tasks)
// - "Complete" deletes the task row
// - Mounts the enhanced task creator from functions/tasks_function.js

import renderTasks from '../functions/tasks_function.js';

export default async function TasksScreen(root) {
  root.innerHTML = '';
  root.classList.add('screen-tasks');

  // Basic layout
  const el = (tag, attrs = {}, ...kids) => {
    // Support: el('div', 'class-name', children...)
    if (typeof attrs === 'string') {
      attrs = { class: attrs };
    }
    if (attrs == null) attrs = {};

    const n = document.createElement(tag);

    // Apply attributes safely
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') {
        n.className = v;
      } else if (k === 'style' && typeof v === 'object' && v !== null) {
        Object.assign(n.style, v);
      } else if (k.startsWith('on') && typeof v === 'function') {
        n[k] = v;
      } else if (v !== undefined && v !== null) {
        n.setAttribute(k, v);
      }
    }

    // Append children
    for (const kid of kids.flat()) {
      if (kid == null) continue;
      n.appendChild(
        typeof kid === 'string'
          ? document.createTextNode(kid)
          : kid
      );
    }

    return n;
  };

  const div = (attrs, ...kids) => el('div', attrs, ...kids);
  const btn = (txt, cls = 'btn') => el('button', { class: cls }, txt);

  const head = div('page-head', 
    el('h1', { class: 'page-title' }, 'Tasks'),
    el('div', { class: 'label' }, 'Create and manage your tasks.')
  );

  const listCard = div('card', 
    el('div', { class: 'kicker' }, 'Your Tasks'),
    el('div', { class: 'big' }, 'Open Tasks'),
    el('div', { class: 'label', style: { marginTop: '6px' } }, 'Only tasks assigned to you are shown.')
  );
  const listWrap = el('div', { style: { marginTop: '10px' } });
  listCard.appendChild(listWrap);

  const createCard = div('card', 
    el('div', { class: 'kicker' }, 'Create'),
    el('div', { class: 'big' }, 'New Task'),
    el('div', { class: 'label', style: { marginTop: '6px' } }, 'Assign to one or many contacts via filters.')
  );
  const creatorMount = el('div');
  createCard.appendChild(creatorMount);

  const logCard = div('card',
    el('div', { class: 'kicker' }, 'Status'),
    el('pre', { id: 'log', class: 'label', style: { whiteSpace: 'pre-wrap', margin: 0 } }, 'Ready.')
  );

  root.append(head, listCard, createCard, logCard);

  // Mount the task creator (from functions/tasks_function.js)
  // No contact is passed here (screen-level composer). It will use filters to select contacts.
  creatorMount.appendChild(renderTasks({ contact: null }));

  // Load + render list
  await renderList();

  /* -------------------- Functions -------------------- */

  async function renderList() {
    listWrap.innerHTML = '';
    const s = window.supabase;
    if (!s?.auth?.getUser || !s?.from) {
      listWrap.appendChild(div('label', 'Supabase client not available.'));
      return;
    }

    const { data: { user } } = await s.auth.getUser();
    if (!user) {
      listWrap.appendChild(div('label', 'Please sign in to view your tasks.'));
      return;
    }

    const { data, error } = await s
      .from('tasks')
      .select('id, task_text, active, created_at, contact_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      listWrap.appendChild(div('label', 'Error loading tasks.'));
      log(`Load error: ${error.message}`);
      return;
    }

    if (!data || !data.length) {
      listWrap.appendChild(div('label', 'No tasks yet.'));
      return;
    }

    // Table
    const table = el('table', { class: 'table', style: { width: '100%', borderCollapse: 'collapse' } });
    table.innerHTML = `
      <thead>
        <tr>
          <th style="padding:10px;border-bottom:1px solid rgba(0,0,0,.08);text-align:left;">Task</th>
          <th style="padding:10px;border-bottom:1px solid rgba(0,0,0,.08);text-align:left;">Contact ID</th>
          <th style="padding:10px;border-bottom:1px solid rgba(0,0,0,.08);text-align:left;">Created</th>
          <th style="padding:10px;border-bottom:1px solid rgba(0,0,0,.08);text-align:left;">Complete</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    for (const r of data) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:10px;border-bottom:1px solid rgba(0,0,0,.06)">${escapeHtml(r.text || '')}</td>
        <td style="padding:10px;border-bottom:1px solid rgba(0,0,0,.06)">${r.contact_id ?? '—'}</td>
        <td style="padding:10px;border-bottom:1px solid rgba(0,0,0,.06)">${fmtDate(r.created_at)}</td>
        <td style="padding:10px;border-bottom:1px solid rgba(0,0,0,.06)">
          <button class="btn" data-complete="${r.id}">Complete</button>
        </td>
      `;
      tbody.appendChild(tr);
    }

    table.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-complete]');
      if (!btn) return;
      const id = btn.getAttribute('data-complete');
      const ok = confirm('Mark this task complete? It will be removed.');
      if (!ok) return;
      try {
        const { error: delErr } = await window.supabase.from('tasks').delete().eq('id', id);
        if (delErr) throw delErr;
        log(`Task ${id} deleted.`);
        await renderList();
      } catch (err) {
        log('Delete error: ' + (err?.message || err));
        alert('Could not delete task.');
      }
    });

    listWrap.appendChild(table);
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    return Number.isNaN(d) ? '—' :
      d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function escapeHtml(s = '') {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function log(msg) {
    const box = root.querySelector('#log');
    const now = new Date().toLocaleTimeString();
    box.textContent = (box.textContent ? box.textContent + '\n' : '') + `[${now}] ${msg}`;
  }
}
