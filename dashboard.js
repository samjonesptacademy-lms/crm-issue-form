// Same URL as in script.js — paste your Apps Script deployment URL here
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw1zWa5391iGJQVeqAn1huM8K9PWcs94YbDKbOte3z372N9k4h7Li4mJzTexVlZyi1f/exec';

let allTickets = [];
let activeTicketNumber = null;

document.addEventListener('DOMContentLoaded', () => {
    loadTickets();
    setupFilters();
    document.getElementById('refreshBtn').addEventListener('click', loadTickets);
    document.getElementById('closeDetail').addEventListener('click', closeDetailPanel);
    document.getElementById('saveBtn').addEventListener('click', saveTicketUpdate);
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

        tr.innerHTML = `
            <td class="ticket-num">#${ticket.ticket}</td>
            <td class="ticket-date">${formatDate(ticket.dateSubmitted)}</td>
            <td>${escapeHtml(ticket.name)}</td>
            <td>${escapeHtml(ticket.category)}</td>
            <td><span class="badge ${severityClass(ticket.severity)}">${escapeHtml(ticket.severity)}</span></td>
            <td><span class="badge ${statusClass(ticket.status)}">${escapeHtml(ticket.status)}</span></td>
            <td class="crm-url" title="${escapeHtml(ticket.crmUrl)}">${escapeHtml(ticket.crmUrl)}</td>
            <td><button class="view-btn" data-ticket="${ticket.ticket}">View</button></td>
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

    document.getElementById('detailPanel').style.display = 'flex';
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
    const notes        = document.getElementById('updateNotes').value;

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
            const haystack = [t.name, t.description, t.crmUrl, t.category, String(t.ticket)]
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
