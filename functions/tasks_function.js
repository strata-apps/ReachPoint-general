// functions/tasks_function.js
// Minimal task creator for this specific contact.
// Table: tasks(id, contact_id, text, active, user_id)

function el(tag, cls, text){ const n=document.createElement(tag); if(cls) n.className=cls; if(text!=null) n.textContent=text; return n; }
const div = (...args) => el('div', ...args);

export function renderTasks({ contact }) {
  const card = div('detailsCard');
  const title = el('div','summaryTitle','Create a Task');
  title.style.fontWeight = '800';
  title.style.margin = '6px 0';
  card.append(title);

  const row = div('kv');
  row.append(div('k','Task'));

  const v = div('v');
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = `Task for ${String(contact?.contact_first || contact?.full_name || 'this contact')}`;
  Object.assign(input.style, {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontFamily: 'inherit',
    fontSize: '14px'
  });

  const add = el('button','btn','Add Task');
  add.style.marginTop = '8px';
  add.addEventListener('click', async () => {
    const text = String(input.value || '').trim();
    if (!text) { alert('Please enter a task description first.'); return; }
    try {
      const s = window.supabase;
      const { data: { user } } = await s.auth.getUser();
      const { error } = await s.from('tasks').insert({
        text,
        active: true,
        user_id: user?.id || null
      });
      if (error) throw error;
      input.value = '';
      alert('Task added.');
    } catch (e) {
      console.error('[tasks] insert failed', e);
      alert('Could not create task.');
    }
  });

  v.append(input, add);
  row.append(v);
  card.append(row);
  return card;
}

export default renderTasks;
