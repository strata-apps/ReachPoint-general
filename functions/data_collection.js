// functions/data_collection.js
// Shows survey (as clickable pills) and a Notes box.
// Saves nothing automatically; caller pulls selected answer + notes
// and persists them when an outcome button is clicked.
//
// Survey source:
//  - Tries call_campaigns(survey_questions, survey_options) by campaign_id
//  - Fallback: campaigns(survey json: {question, options[]})

function el(tag, cls, text){ const n=document.createElement(tag); if(cls) n.className=cls; if(text!=null) n.textContent=text; return n; }
const div = (...args) => el('div', ...args);

export function createDataCollection({ campaign_id, contact_id }) {
  let selected = null;
  let notes = '';

  const node = div('');
  const surveyCard = div('surveyCard');
  const notesCard  = div('notesCard');

  node.append(surveyCard, notesCard);

  // Build survey UI
  buildSurvey().catch(()=> {
    surveyCard.innerHTML = '';
    surveyCard.append(el('div','label','No survey configured for this campaign.'));
  });

  // Build notes UI
  {
    const title = el('div','notesTitle','Notes from this call');
    title.style.fontWeight = '700';
    const ta = document.createElement('textarea');
    ta.rows = 4;
    ta.placeholder = 'Type any important notes here…';
    Object.assign(ta.style, { width:'100%', padding:'10px', border:'1px solid #d1d5db', borderRadius:'8px', fontFamily:'inherit', fontSize:'14px' });
    ta.addEventListener('input', () => { notes = ta.value; });
    notesCard.append(title, ta);
  }

  async function buildSurvey() {
    const s = window.supabase;
    if (!s) throw new Error('Supabase not found');

    // Try call_campaigns
    let question = null;
    let options = null;

    {
      const { data, error } = await s
        .from('call_campaigns')
        .select('survey_questions, survey_options')
        .eq('campaign_id', campaign_id)
        .single();

      if (!error && data) {
        // Support string or JSON
        const q = data.survey_questions;
        const o = data.survey_options;
        question = (typeof q === 'string' && q.trim()) ? q.trim() : (q?.[0] || null);
        if (Array.isArray(o)) options = o.filter(Boolean);
        else if (typeof o === 'string') {
          try { options = JSON.parse(o); } catch { /* ignore */ }
        }
      }
    }

    // Fallback: campaigns.survey (object)
    if (!question || !options || !options.length) {
      const { data, error } = await s
        .from('campaigns')
        .select('survey')
        .eq('id', campaign_id)
        .single();
      if (!error && data?.survey) {
        const sv = data.survey;
        question = sv?.question || question;
        options  = Array.isArray(sv?.options) ? sv.options : options;
      }
    }

    if (!question || !options || !options.length) {
      surveyCard.append(el('div','label','No survey configured.'));
      return;
    }

    const title = el('div','surveyTitle', question);
    const row = div('surveyChips');
    options.forEach(opt => {
      const b = el('button', 'surveyChip', opt);
      b.addEventListener('click', () => {
        selected = opt;
        // aria pressed
        [...row.children].forEach(n => n.classList.remove('sel'));
        b.classList.add('sel');
        saved.textContent = `Selected: ${opt}`;
        saved.className = 'surveySaved';
      });
      row.appendChild(b);
    });

    const saved = el('div','surveyHint','Tap an option to record a response');
    surveyCard.append(title, row, saved);
  }

  return {
    node,
    getSelectedAnswer: () => selected,
    getNotes: () => notes
  };
}

export default createDataCollection;
