// API endpoint — calls Cloudflare Pages Function which proxies to Apps Script
const APPS_SCRIPT_URL = '/api/tickets';

let allTickets = [];
let activeTicketNumber = null;

document.addEventListener('DOMContentLoaded', () => {
    loadTickets();
    setupFilters();
    document.getElementById('refreshBtn').addEventListener('click', loadTickets);
    document.getElementById('closeDetail').addEventListener('click', closeDetailPanel);
    document.getElementById('saveBtn').addEventListener('click', saveTicketUpdate);
    document.getElementById('replyBtn').addEventListener('click', sendReply);
});

// ── Data Loading ────────────────────────────────────────────────────

async function loadTickets() {
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.disabled = true;
    refreshBtn.textContent = '⏳ Loading...';

    showState('loading');

    try {
        const response = await fetch(APPS_SCRIPT_URL);
        const result = await response.json();

        if (!result.success) throw new Error(result.error || 'Failed to load tickets');

        allTickets = result.tickets.reverse(); // newest first
        renderTable(getFilteredTickets());
        updateStats();
        updateLastUpdated();

    } catch (err) {
        showState('error', 'Failed to load tickets: ' + err.message);
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = '↻ Refresh';
    }
}

// ── Rendering ───────────────────────────────────────────────────────

function renderTable(tickets) {
    const tbody = document.getElementById('ticketTableBody');
    tbody.innerHTML = '';

    if (tickets.length === 0) {
        showState('empty');
        return;
    }

    showState('table');

    tickets.forEach(ticket => {
        const tr = document.createElement('tr');
        if (ticket.ticket === activeTicketNumber) tr.classList.add('active');

        const msgBadge = ticket.messageCount > 0 ? `<span class="message-count-badge" title="${ticket.messageCount} message(s)">${ticket.messageCount}</span>` : '';

        tr.innerHTML = `
            <td class="ticket-num">#${ticket.ticket}</td>
            <td class="ticket-date">${formatDate(ticket.dateSubmitted)}</td>
            <td>${escapeHtml(ticket.name)}</td>
            <td>${escapeHtml(ticket.title || '')}</td>
            <td>${escapeHtml(ticket.category)}</td>
            <td><span class="badge ${severityClass(ticket.severity)}">${escapeHtml(ticket.severity)}</span></td>
            <td><span class="badge ${statusClass(ticket.status)}">${escapeHtml(ticket.status)}</span></td>
            <td class="crm-url" title="${escapeHtml(ticket.crmUrl)}">${escapeHtml(ticket.crmUrl)}</td>
            <td><button class="view-btn" data-ticket="${ticket.ticket}">View ${msgBadge}</button></td>
        `;

        tr.querySelector('.view-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openDetailPanel(ticket.ticket);
        });

        tr.addEventListener('click', () => openDetailPanel(ticket.ticket));
        tbody.appendChild(tr);
    });
}

function updateStats() {
    const open       = allTickets.filter(t => t.status === 'Open').length;
    const inProgress = allTickets.filter(t => t.status === 'In Progress').length;
    const resolved   = allTickets.filter(t => t.status === 'Resolved').length;
    const critical   = allTickets.filter(t => t.severity === 'Critical' && t.status !== 'Resolved').length;

    document.getElementById('statOpen').textContent       = open;
    document.getElementById('statInProgress').textContent = inProgress;
    document.getElementById('statResolved').textContent   = resolved;
    document.getElementById('statCritical').textContent   = critical;
}

function updateLastUpdated() {
    document.getElementById('lastUpdated').textContent =
        'Last updated: ' + new Date().toLocaleTimeString();
}

// ── Detail Panel ────────────────────────────────────────────────────

function openDetailPanel(ticketNumber) {
    const ticket = allTickets.find(t => t.ticket === ticketNumber);
    if (!ticket) return;

    activeTicketNumber = ticketNumber;

    // Update active row highlight
    document.querySelectorAll('.ticket-table tbody tr').forEach(tr => {
        tr.classList.toggle('active',
            parseInt(tr.querySelector('.ticket-num')?.textContent.replace('#', '')) === ticketNumber
        );
    });

    document.getElementById('detailTitle').textContent = `Ticket #${ticket.ticket}`;

    document.getElementById('detailMeta').innerHTML = `
        <div class="meta-item"><strong>Submitted by:</strong> ${escapeHtml(ticket.name)}</div>
        <div class="meta-item"><strong>Date:</strong> ${formatDate(ticket.dateSubmitted)}</div>
        <div class="meta-item"><strong>Title:</strong> ${escapeHtml(ticket.title || '—')}</div>
        <div class="meta-item"><strong>Category:</strong> ${escapeHtml(ticket.category)}</div>
        <div class="meta-item"><strong>Severity:</strong>
            <span class="badge ${severityClass(ticket.severity)}">${escapeHtml(ticket.severity)}</span>
        </div>
        <div class="meta-item" style="width:100%"><strong>CRM URL:</strong>
            <a href="${escapeHtml(ticket.crmUrl)}" target="_blank" style="color:#0066cc">
                ${escapeHtml(ticket.crmUrl)}
            </a>
        </div>
    `;

    document.getElementById('detailDescription').textContent = ticket.description;

    const screenshotWrap = document.getElementById('detailScreenshotWrap');
    if (ticket.screenshotLink) {
        document.getElementById('detailScreenshot').href = ticket.screenshotLink;
        screenshotWrap.style.display = 'block';
    } else {
        screenshotWrap.style.display = 'none';
    }

    document.getElementById('updateStatus').value  = ticket.status || 'Open';
    document.getElementById('updateNotes').value   = ticket.developerNotes || '';
    document.getElementById('saveFeedback').textContent = '';
    document.getElementById('saveFeedback').className  = 'save-feedback';

    // Enable/disable Resolution Notes based on status
    updateNotesField();

    // Wire status change to enable/disable notes field
    document.getElementById('updateStatus').removeEventListener('change', updateNotesField);
    document.getElementById('updateStatus').addEventListener('change', updateNotesField);

    document.getElementById('replyText').value = '';
    document.getElementById('replyFeedback').textContent = '';
    document.getElementById('replyFeedback').className = 'save-feedback';

    document.getElementById('detailPanel').style.display = 'flex';

    loadMessages(ticketNumber);
    markTeamMessagesAsRead(ticketNumber);
}

function updateNotesField() {
  const status = document.getElementById('updateStatus').value;
  const notesField = document.getElementById('updateNotes');
  notesField.disabled = status !== 'Resolved';
}

function closeDetailPanel() {
    activeTicketNumber = null;
    document.getElementById('detailPanel').style.display = 'none';
    document.querySelectorAll('.ticket-table tbody tr').forEach(tr => tr.classList.remove('active'));
}

// ── Save Update ─────────────────────────────────────────────────────

async function saveTicketUpdate() {
    const saveBtn      = document.getElementById('saveBtn');
    const saveFeedback = document.getElementById('saveFeedback');
    const status       = document.getElementById('updateStatus').value;
    const notes        = document.getElementById('updateNotes').value.trim();

    // Validate: Resolution Notes are mandatory when status is Resolved
    if (status === 'Resolved' && !notes) {
        saveFeedback.textContent = '✗ Resolution Notes are required when marking as Resolved';
        saveFeedback.className = 'save-feedback error';
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    saveFeedback.textContent = '';
    saveFeedback.className = 'save-feedback';

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'update',
                ticket: activeTicketNumber,
                status,
                developerNotes: notes
            })
        });

        const result = await response.json();

        if (!result.success) throw new Error(result.error || 'Save failed');

        // Update local data so UI reflects change without a full reload
        const ticket = allTickets.find(t => t.ticket === activeTicketNumber);
        if (ticket) {
            ticket.status = status;
            ticket.developerNotes = notes;
        }

        updateStats();
        renderTable(getFilteredTickets());
        openDetailPanel(activeTicketNumber); // re-render panel with updated values

        saveFeedback.textContent = '✓ Saved';
        saveFeedback.className = 'save-feedback success';

    } catch (err) {
        saveFeedback.textContent = '✗ Failed: ' + err.message;
        saveFeedback.className = 'save-feedback error';
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
}

// ── Message Thread ───────────────────────────────────────────────────

async function loadMessages(ticketNumber) {
    const container = document.getElementById('threadMessages');
    container.innerHTML = '<p class="thread-loading">Loading messages...</p>';

    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?action=getMessages&ticketNumber=${ticketNumber}`);
        const result = await response.json();

        if (!result.success) throw new Error(result.error || 'Failed to load messages');

        if (result.messages.length === 0) {
            container.innerHTML = '<p class="thread-empty">No messages yet. Start the conversation below.</p>';
            return;
        }

        container.innerHTML = result.messages.map(msg => {
            let screenshotHtml = '';
            if (msg.screenshotLink) {
                screenshotHtml = `<div class="message-screenshot"><a href="${escapeHtml(msg.screenshotLink)}" target="_blank" class="screenshot-link">View Screenshot</a></div>`;
            }
            return `
                <div class="message-bubble bubble-${escapeHtml(msg.senderType)}">
                    <div class="bubble-header">
                        <strong>${escapeHtml(msg.senderName)}</strong>
                        <span class="bubble-time">${formatDate(msg.timestamp)}</span>
                    </div>
                    <div class="bubble-body">${escapeHtml(msg.messageContent)}</div>
                    ${screenshotHtml}
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;

    } catch (err) {
        container.innerHTML = `<p class="thread-error">Failed to load messages: ${escapeHtml(err.message)}</p>`;
    }
}

async function sendReply() {
    const replyBtn      = document.getElementById('replyBtn');
    const replyFeedback = document.getElementById('replyFeedback');
    const replyText     = document.getElementById('replyText');
    const message       = replyText.value.trim();

    if (!message) return;

    replyBtn.disabled = true;
    replyBtn.textContent = 'Sending...';
    replyFeedback.textContent = '';
    replyFeedback.className = 'save-feedback';

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'postMessage',
                ticketNumber: activeTicketNumber,
                senderName: 'Developer',
                senderType: 'developer',
                messageContent: message
            })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Send failed');

        replyText.value = '';
        replyFeedback.textContent = '✓ Sent';
        replyFeedback.className = 'save-feedback success';
        loadMessages(activeTicketNumber);

    } catch (err) {
        replyFeedback.textContent = '✗ Failed: ' + err.message;
        replyFeedback.className = 'save-feedback error';
    } finally {
        replyBtn.disabled = false;
        replyBtn.textContent = 'Send Reply';
    }
}

async function markTeamMessagesAsRead(ticketNumber) {
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'markRead',
        ticketNumber: ticketNumber,
        senderType: 'team'
      })
    });
  } catch (err) {
    // Silent fail - marking as read is non-critical
  }
}

// ── Filters ─────────────────────────────────────────────────────────

function setupFilters() {
    ['searchInput', 'filterStatus', 'filterSeverity', 'filterCategory'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            renderTable(getFilteredTickets());
        });
    });
}

function getFilteredTickets() {
    const search   = document.getElementById('searchInput').value.toLowerCase();
    const status   = document.getElementById('filterStatus').value;
    const severity = document.getElementById('filterSeverity').value;
    const category = document.getElementById('filterCategory').value;

    return allTickets.filter(t => {
        if (status   && t.status   !== status)   return false;
        if (severity && t.severity !== severity) return false;
        if (category && t.category !== category) return false;
        if (search) {
            const haystack = [t.name, t.title, t.description, t.crmUrl, t.category, String(t.ticket)]
                .join(' ').toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        return true;
    });
}

// ── Helpers ──────────────────────────────────────────────────────────

function showState(state, message = '') {
    document.getElementById('loadingState').style.display = state === 'loading' ? 'block' : 'none';
    document.getElementById('errorState').style.display   = state === 'error'   ? 'block' : 'none';
    document.getElementById('emptyState').style.display   = state === 'empty'   ? 'block' : 'none';
    document.getElementById('tableWrap').style.display    = state === 'table'   ? 'block' : 'none';

    if (state === 'error') {
        document.getElementById('errorState').textContent = message;
    }
}

function formatDate(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function severityClass(severity) {
    return { Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' }[severity] || '';
}

function statusClass(status) {
    return { Open: 'badge-open', 'In Progress': 'badge-in-progress', Resolved: 'badge-resolved', Closed: 'badge-closed' }[status] || '';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
