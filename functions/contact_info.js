// functions/contact_info.js
// Creates a clean "only non-null fields" card for a contact.

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
const div = (...args) => el('div', ...args);

function isEmpty(v) {
  if (v == null) return true;
  const s = String(v).trim();
  return s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined';
}

function pretty(k) {
  return String(k).replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, m => m.toUpperCase());
}

export function renderContactInfo(contact) {
  const showPairs = [];
  const KNOWN_HIDE = new Set(['contact_id','id','created_at','updated_at']); // hide ids/metadata

  for (const [k, v] of Object.entries(contact || {})) {
    if (KNOWN_HIDE.has(k)) continue;
    if (isEmpty(v)) continue;
    showPairs.push([pretty(k), String(v)]);
  }

  const card = div('detailsCard');
  card.style.width = '100%';
  if (!showPairs.length) {
    card.append(div('label', 'No additional details.'));
    return card;
  }

  showPairs.forEach(([k, v]) => {
    const row = div('kv');
    row.append(div('k', k), div('v', v));
    card.append(row);
  });

  return card;
}

export default renderContactInfo;
