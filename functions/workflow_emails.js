// functions/workflow_emails.js
// Opens a modal to confirm + send a workflow email via Gmail API.
// Expects a Supabase Edge Function "workflow_email_send" to do the actual send.

export default function openWorkflowEmailModal({
  contact,
  action,        // the email-type workflow event (with action.email)
  campaign,      // parent campaign row (optional)
  campaignId,
  outcome,       // e.g. 'answered'
  response,      // survey response (string or null)
  onDone,        // callback when the flow is finished (send or cancel)
}) {
  const supabase = globalThis.supabase;

  const to =
    contact?.contact_email ||
    contact?.email ||
    contact?.Email ||
    null;

  const template = action?.email || {};
  const subject =
    template.subject ||
    `Follow-up from ${campaign?.campaign_name || 'our call'}`;
  const preheader = template.preheader || '';
  const html = template.html || '<p>No email template has been configured for this action.</p>';

  // --- DOM helpers ----------------------------------------------------------
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // --- Backdrop + modal -----------------------------------------------------
  const backdrop = el('div');
  backdrop.style.position = 'fixed';
  backdrop.style.inset = '0';
  backdrop.style.background = 'rgba(15, 23, 42, 0.45)';
  backdrop.style.display = 'flex';
  backdrop.style.alignItems = 'center';
  backdrop.style.justifyContent = 'center';
  backdrop.style.zIndex = '9999';

  const modal = el('div');
  modal.style.width = 'min(720px, 95vw)';
  modal.style.maxHeight = '90vh';
  modal.style.background = '#ffffff';
  modal.style.borderRadius = '16px';
  modal.style.border = '1px solid rgba(15,23,42,0.12)';
  modal.style.boxShadow = '0 18px 45px rgba(15,23,42,0.35)';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.overflow = 'hidden';

  // Header
  const header = el('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.padding = '12px 16px';
  header.style.borderBottom = '1px solid rgba(148,163,184,0.45)';
  const title = el('div', null, 'Confirm Email Send');
  title.style.fontSize = '16px';
  title.style.fontWeight = '800';
  const closeBtn = el('button', null, '✕');
  closeBtn.style.border = 'none';
  closeBtn.style.background = 'transparent';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '16px';
  closeBtn.style.padding = '4px';
  header.append(title, closeBtn);

  // Body
  const body = el('div');
  body.style.display = 'grid';
  body.style.gridTemplateColumns = 'minmax(0, 1.4fr) minmax(0, 1fr)';
  body.style.gap = '16px';
  body.style.padding = '12px 16px';
  body.style.alignItems = 'flex-start';

  // Left: preview
  const left = el('div');
  const info = el('div');
  info.innerHTML = `
    <div style="font-size:13px; color:#6b7280; margin-bottom:8px;">
      This email is defined by the workflow for this campaign.
    </div>
    <div style="font-size:13px; margin-bottom:4px;"><strong>To:</strong> ${to || '<em>No email found for this contact</em>'}</div>
    <div style="font-size:13px; margin-bottom:4px;"><strong>Subject:</strong> ${escapeHtml(subject)}</div>
    ${preheader ? `<div style="font-size:13px; margin-bottom:4px;"><strong>Preheader:</strong> ${escapeHtml(preheader)}</div>` : ''}
    <div style="font-size:12px; color:#9ca3af; margin-top:8px;">
      Outcome: <code>${escapeHtml(outcome || '')}</code>
      ${response ? ` • Response: <code>${escapeHtml(response || '')}</code>` : ''}
    </div>
  `;
  const previewBox = el('div');
  previewBox.style.marginTop = '10px';
  previewBox.style.border = '1px solid #e5e7eb';
  previewBox.style.borderRadius = '12px';
  previewBox.style.overflow = 'auto';
  previewBox.style.maxHeight = '55vh';
  previewBox.style.background = '#f9fafb';
  previewBox.style.padding = '12px';

  const previewInner = el('div');
  previewInner.style.background = '#ffffff';
  previewInner.style.borderRadius = '10px';
  previewInner.style.margin = '0 auto';
  previewInner.style.maxWidth = '600px';
  previewInner.style.boxShadow = '0 6px 18px rgba(15,23,42,0.08)';
  previewInner.style.padding = '16px 18px';
  previewInner.innerHTML = html; // template HTML as-is (trusted author content)

  previewBox.appendChild(previewInner);
  left.append(info, previewBox);

  // Right: status / auth
  const right = el('div');
  const rightBox = el('div');
  rightBox.style.border = '1px dashed #e5e7eb';
  rightBox.style.borderRadius = '12px';
  rightBox.style.padding = '12px 12px 10px 12px';
  rightBox.style.fontSize = '13px';
  rightBox.style.color = '#4b5563';
  rightBox.innerHTML = `
    <div style="font-weight:700; margin-bottom:6px;">Automation status</div>
    <div id="wf-email-status" style="margin-bottom:8px;">
      When you click <strong>Send Email</strong>, this message will be sent via the Gmail API.
    </div>
  `;
  const signInBtn = el('button', null, 'Sign in with Google');
  signInBtn.style.display = 'none';
  signInBtn.style.marginTop = '8px';
  signInBtn.style.padding = '8px 12px';
  signInBtn.style.borderRadius = '999px';
  signInBtn.style.border = '1px solid #c4b5fd';
  signInBtn.style.background = '#ede9fe';
  signInBtn.style.color = '#4c1d95';
  signInBtn.style.fontWeight = '700';
  signInBtn.style.cursor = 'pointer';
  signInBtn.onclick = () => {
    // Redirect to your Google OAuth flow.
    // You can adjust this URL to match your actual auth endpoint.
    window.location.href = '/auth/google';
  };

  rightBox.appendChild(signInBtn);
  right.appendChild(rightBox);

  body.append(left, right);

  // Footer
  const footer = el('div');
  footer.style.display = 'flex';
  footer.style.justifyContent = 'space-between';
  footer.style.alignItems = 'center';
  footer.style.padding = '10px 16px 12px 16px';
  footer.style.borderTop = '1px solid rgba(148,163,184,0.4)';

  const leftFoot = el('div');
  leftFoot.style.fontSize = '12px';
  leftFoot.style.color = '#6b7280';
  leftFoot.textContent = 'This is a one-time follow-up email for this contact.';

  const rightFoot = el('div');
  rightFoot.style.display = 'flex';
  rightFoot.style.gap = '8px';

  const cancelBtn = el('button', null, 'Cancel');
  cancelBtn.style.borderRadius = '999px';
  cancelBtn.style.border = '1px solid #e5e7eb';
  cancelBtn.style.background = '#f9fafb';
  cancelBtn.style.padding = '8px 14px';
  cancelBtn.style.cursor = 'pointer';
  cancelBtn.onclick = () => {
    close();
  };

  const sendBtn = el('button', null, 'Send Email');
  sendBtn.style.borderRadius = '999px';
  sendBtn.style.border = '1px solid rgba(37,99,235,0.8)';
  sendBtn.style.background = 'linear-gradient(180deg, #3b82f6, #2563eb)';
  sendBtn.style.color = '#ffffff';
  sendBtn.style.fontWeight = '800';
  sendBtn.style.padding = '8px 16px';
  sendBtn.style.cursor = 'pointer';

  rightFoot.append(cancelBtn, sendBtn);
  footer.append(leftFoot, rightFoot);

  modal.append(header, body, footer);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  function setStatus(msg, tone = 'default') {
    const statusEl = modal.querySelector('#wf-email-status');
    if (!statusEl) return;
    statusEl.textContent = msg;
    if (tone === 'error') {
      statusEl.style.color = '#b91c1c';
    } else if (tone === 'success') {
      statusEl.style.color = '#166534';
    } else {
      statusEl.style.color = '#4b5563';
    }
  }

  function setLoading(isOn) {
    sendBtn.disabled = isOn;
    cancelBtn.disabled = isOn;
    sendBtn.textContent = isOn ? 'Sending…' : 'Send Email';
  }

  async function sendEmail() {
    if (!to) {
      alert('No email address found for this contact.');
      return;
    }
    if (!supabase?.functions) {
      console.warn('Supabase functions client not available.');
      alert('Email sending is not configured. Please check your Supabase setup.');
      return;
    }

    setLoading(true);
    setStatus('Sending email via Gmail API…', 'default');

    try {
      const payload = {
        to,
        subject,
        html,
        preheader,
        campaignId,
        contactId: contact?.contact_id,
        outcome,
        response,
      };

      const { data, error } = await supabase.functions.invoke(
        'workflow_email_send',
        { body: payload }
      );

      if (error) {
        const msg = error.message || String(error);
        console.warn('workflow_email_send error', error);

        // If backend signals auth needed (401 or message), reveal Sign-In button
        if (error.status === 401 || /auth|unauth/i.test(msg)) {
          setStatus(
            'Google authorization required. Please sign in, then click "Send Email" again.',
            'error'
          );
          signInBtn.style.display = 'inline-flex';
        } else {
          setStatus('Could not send email. Please see console for details.', 'error');
        }
        return;
      }

      setStatus('Email sent successfully.', 'success');
      // Slight delay so user can see success
      setTimeout(() => close(true), 500);
    } catch (err) {
      console.error('workflow_email_send exception', err);
      setStatus('Unexpected error sending email.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function close(sent = false) {
    document.body.removeChild(backdrop);
    if (typeof onDone === 'function') {
      onDone({ sent });
    }
  }

  function escapeHtml(s = '') {
    return String(s).replace(/[&<>"']/g, (m) => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }

  // Wire events
  closeBtn.onclick = () => close(false);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close(false);
  });
  sendBtn.onclick = () => sendEmail();
}
