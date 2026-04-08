// API endpoint
const API_URL = '/api/tickets';

let userTickets = [];
let activeTicketNumber = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('filterName').addEventListener('change', () => renderTickets(getFilteredTickets()));
    document.getElementById('filterStatus').addEventListener('change', () => renderTickets(getFilteredTickets()));
    document.getElementById('searchInput').addEventListener('input', () => renderTickets(getFilteredTickets()));
    document.getElementById('closeModal').addEventListener('click', closeDetailModal);
    document.getElementById('modalReplyBtn').addEventListener('click', sendMessage);

    // Load all tickets on page load
    loadAllTickets();
});

// Get selected name from URL parameter for direct links
const urlParams = new URLSearchParams(window.location.search);
const directTicketNumber = urlParams.get('ticket');

// ── Data Loading ────────────────────────────────────────────────────

async function loadAllTickets() {
    showState('loading');

    try {
        const response = await fetch(`${API_URL}`);
        const result = await response.json();

        if (!result.success) throw new Error(result.error || 'Failed to load tickets');

        userTickets = (result.tickets || []).reverse(); // newest first
        renderTickets(getFilteredTickets());

        if (userTickets.length === 0) {
            showState('empty');
        } else {
            showState('table');
            // If opened via direct link, open that ticket
            if (directTicketNumber) {
                openDetailModal(parseInt(directTicketNumber));
            }
        }

    } catch (err) {
        showState('error', 'Failed to load tickets: ' + err.message);
    }
}

function getFilteredTickets() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const filterName = document.getElementById('filterName').value;
    const filterStatus = document.getElementById('filterStatus').value;

    return userTickets.filter(t => {
        if (filterName && t.name !== filterName) return false;
        if (filterStatus && t.status !== filterStatus) return false;
        if (search) {
            const haystack = [t.name, t.title, t.description, t.category, String(t.ticket)]
                .join(' ').toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        return true;
    });
}

// ── Rendering ────────────────────────────────────────────────────────

function renderTickets(tickets) {
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

        tr.innerHTML = `
            <td class="ticket-num">#${ticket.ticket}</td>
            <td class="ticket-date">${formatDate(ticket.dateSubmitted)}</td>
            <td>${escapeHtml(ticket.name)}</td>
            <td>${escapeHtml(ticket.title || '')}</td>
            <td>${escapeHtml(ticket.category)}</td>
            <td><span class="badge ${severityClass(ticket.severity)}">${escapeHtml(ticket.severity)}</span></td>
            <td><span class="badge ${statusClass(ticket.status)}">${escapeHtml(ticket.status)}</span></td>
            <td><button class="view-btn" data-ticket="${ticket.ticket}">View & Reply</button></td>
        `;

        tr.querySelector('.view-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openDetailModal(ticket.ticket);
        });

        tr.addEventListener('click', () => openDetailModal(ticket.ticket));
        tbody.appendChild(tr);
    });
}

// ── Detail Modal ────────────────────────────────────────────────────

function openDetailModal(ticketNumber) {
    const ticket = userTickets.find(t => t.ticket === ticketNumber);
    if (!ticket) return;

    activeTicketNumber = ticketNumber;

    document.getElementById('modalTitle').textContent = `Ticket #${ticket.ticket}`;

    document.getElementById('ticketMeta').innerHTML = `
        <div class="meta-item"><strong>Title:</strong> ${escapeHtml(ticket.title || '—')}</div>
        <div class="meta-item"><strong>Category:</strong> ${escapeHtml(ticket.category)}</div>
        <div class="meta-item"><strong>Severity:</strong> <span class="badge ${severityClass(ticket.severity)}">${escapeHtml(ticket.severity)}</span></div>
        <div class="meta-item"><strong>Status:</strong> <span class="badge ${statusClass(ticket.status)}">${escapeHtml(ticket.status)}</span></div>
        <div class="meta-item"><strong>Submitted:</strong> ${formatDate(ticket.dateSubmitted)}</div>
    `;

    document.getElementById('ticketDescription').textContent = ticket.description;

    if (ticket.developerNotes) {
        document.getElementById('ticketDevNotes').textContent = ticket.developerNotes;
        document.getElementById('devNotesWrap').style.display = 'block';
    } else {
        document.getElementById('devNotesWrap').style.display = 'none';
    }

    if (ticket.screenshotLink) {
        document.getElementById('screenshotLink').href = ticket.screenshotLink;
        document.getElementById('screenshotWrap').style.display = 'block';
    } else {
        document.getElementById('screenshotWrap').style.display = 'none';
    }

    document.getElementById('modalReplyText').value = '';
    document.getElementById('modalReplyFeedback').textContent = '';
    document.getElementById('modalReplyFeedback').className = 'feedback';

    document.getElementById('detailModal').style.display = 'flex';

    loadThreadMessages(ticketNumber);
    markDeveloperMessagesAsRead(ticketNumber);
}

async function markDeveloperMessagesAsRead(ticketNumber) {
  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'markRead',
        ticketNumber: ticketNumber,
        senderType: 'developer'
      })
    });
  } catch (err) {
    // Silent fail - marking as read is non-critical
  }
}

function closeDetailModal() {
    activeTicketNumber = null;
    document.getElementById('detailModal').style.display = 'none';
}

async function loadThreadMessages(ticketNumber) {
    const container = document.getElementById('modalThreadMessages');
    container.innerHTML = '<p class="thread-loading">Loading messages...</p>';

    try {
        const response = await fetch(`${API_URL}?action=getMessages&ticketNumber=${ticketNumber}`);
        const result = await response.json();

        if (!result.success) throw new Error(result.error || 'Failed to load messages');

        if (result.messages.length === 0) {
            container.innerHTML = '<p class="thread-empty">No messages yet. Start the conversation below.</p>';
            return;
        }

        container.innerHTML = result.messages.map(msg => `
            <div class="message-bubble bubble-${escapeHtml(msg.senderType)}">
                <div class="bubble-header">
                    <strong>${escapeHtml(msg.senderName)}</strong>
                    <span class="bubble-time">${formatDate(msg.timestamp)}</span>
                </div>
                <div class="bubble-body">${escapeHtml(msg.messageContent)}</div>
            </div>
        `).join('');

        container.scrollTop = container.scrollHeight;

    } catch (err) {
        container.innerHTML = `<p class="thread-error">Failed to load messages: ${escapeHtml(err.message)}</p>`;
    }
}

async function sendMessage() {
    const replyBtn       = document.getElementById('modalReplyBtn');
    const replyFeedback  = document.getElementById('modalReplyFeedback');
    const replyText      = document.getElementById('modalReplyText');
    const senderName     = document.getElementById('senderNameSelect').value.trim();
    const message        = replyText.value.trim();

    if (!senderName) {
        replyFeedback.textContent = '✗ Please select your name';
        replyFeedback.className = 'feedback error';
        return;
    }

    if (!message) return;

    replyBtn.disabled = true;
    replyBtn.textContent = 'Sending...';
    replyFeedback.textContent = '';
    replyFeedback.className = 'feedback';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'postMessage',
                ticketNumber: activeTicketNumber,
                senderName: senderName,
                senderType: 'team',
                messageContent: message
            })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Send failed');

        replyText.value = '';
        document.getElementById('senderNameSelect').value = '';
        replyFeedback.textContent = '✓ Message sent to the development team';
        replyFeedback.className = 'feedback success';
        loadThreadMessages(activeTicketNumber);

    } catch (err) {
        replyFeedback.textContent = '✗ Failed: ' + err.message;
        replyFeedback.className = 'feedback error';
    } finally {
        replyBtn.disabled = false;
        replyBtn.textContent = 'Send Message';
    }
}

// ── State Management ────────────────────────────────────────────────

function showState(state, message = '') {
    document.getElementById('loadingState').style.display = state === 'loading' ? 'block' : 'none';
    document.getElementById('errorState').style.display   = state === 'error'   ? 'block' : 'none';
    document.getElementById('emptyState').style.display   = state === 'empty'   ? 'block' : 'none';
    document.getElementById('tableWrap').style.display    = state === 'table'   ? 'block' : 'none';

    if (state === 'error') {
        document.getElementById('errorState').textContent = message;
    }
}

// ── Helpers ──────────────────────────────────────────────────────────

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
    return { Open: 'badge-open', 'In Progress': 'badge-in-progress', Resolved: 'badge-resolved' }[status] || '';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
