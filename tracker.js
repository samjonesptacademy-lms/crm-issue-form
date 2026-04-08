// API endpoint
const API_URL = '/api/tickets';

let userTickets = [];
let activeTicketNumber = null;
let selectedName = '';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('findBtn').addEventListener('click', findTickets);
    document.getElementById('nameSelect').addEventListener('change', e => {
        selectedName = e.target.value;
    });
    document.getElementById('closeModal').addEventListener('click', closeDetailModal);
    document.getElementById('modalReplyBtn').addEventListener('click', sendMessage);
});

// ── Data Loading ────────────────────────────────────────────────────

async function findTickets() {
    if (!selectedName) {
        showState('empty', 'Please select your name first');
        return;
    }

    showState('loading');

    try {
        const response = await fetch(`${API_URL}?action=getTicketsByName&name=${encodeURIComponent(selectedName)}`);
        const result = await response.json();

        if (!result.success) throw new Error(result.error || 'Failed to load tickets');

        userTickets = result.tickets || [];
        renderTickets(userTickets);

        if (userTickets.length === 0) {
            showState('empty', `No tickets found for ${selectedName}`);
        } else {
            showState('tickets');
        }

    } catch (err) {
        showState('error', 'Failed to load tickets: ' + err.message);
    }
}

// ── Rendering ────────────────────────────────────────────────────────

function renderTickets(tickets) {
    const list = document.getElementById('ticketsList');
    list.innerHTML = '';

    tickets.forEach(ticket => {
        const card = document.createElement('div');
        card.className = 'ticket-card';
        card.innerHTML = `
            <div class="card-header">
                <h3>#${escapeHtml(String(ticket.ticket))}</h3>
                <span class="badge ${statusClass(ticket.status)}">${escapeHtml(ticket.status)}</span>
            </div>
            <div class="card-meta">
                <div class="meta-line">
                    <span class="meta-label">Date:</span>
                    <span>${formatDate(ticket.dateSubmitted)}</span>
                </div>
                <div class="meta-line">
                    <span class="meta-label">Category:</span>
                    <span>${escapeHtml(ticket.category)}</span>
                </div>
                <div class="meta-line">
                    <span class="meta-label">Severity:</span>
                    <span class="badge ${severityClass(ticket.severity)}">${escapeHtml(ticket.severity)}</span>
                </div>
            </div>
            <button class="view-card-btn" data-ticket="${ticket.ticket}">View & Reply</button>
        `;

        card.querySelector('.view-card-btn').addEventListener('click', () => {
            openDetailModal(ticket.ticket);
        });

        list.appendChild(card);
    });
}

// ── Detail Modal ────────────────────────────────────────────────────

function openDetailModal(ticketNumber) {
    const ticket = userTickets.find(t => t.ticket === ticketNumber);
    if (!ticket) return;

    activeTicketNumber = ticketNumber;

    document.getElementById('modalTitle').textContent = `Ticket #${ticket.ticket}`;

    document.getElementById('ticketMeta').innerHTML = `
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
    const replyBtn      = document.getElementById('modalReplyBtn');
    const replyFeedback = document.getElementById('modalReplyFeedback');
    const replyText     = document.getElementById('modalReplyText');
    const message       = replyText.value.trim();

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
                senderName: selectedName,
                senderType: 'team',
                messageContent: message
            })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Send failed');

        replyText.value = '';
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
    document.getElementById('ticketsContainer').style.display = state === 'tickets' ? 'block' : 'none';

    if (state === 'error' || state === 'empty') {
        const elem = state === 'error' ? document.getElementById('errorState') : document.getElementById('emptyState');
        elem.textContent = message;
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
