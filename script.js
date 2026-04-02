// Replace this with your deployed Apps Script URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw1zWa5391iGJQVeqAn1huM8K9PWcs94YbDKbOte3z372N9k4h7Li4mJzTexVlZyi1f/exec';

// Initialize form on page load
document.addEventListener('DOMContentLoaded', () => {
    setCurrentDateTime();
    setupFormHandlers();
});

function setCurrentDateTime() {
    const datetimeInput = document.getElementById('datetime');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    datetimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
}

function setupFormHandlers() {
    const form = document.getElementById('issueForm');
    const submitBtn = document.getElementById('submitBtn');
    const resetBtn = document.getElementById('resetBtn');
    const retryBtn = document.getElementById('retryBtn');

    form.addEventListener('submit', handleFormSubmit);
    resetBtn.addEventListener('click', resetForm);
    retryBtn.addEventListener('click', showFormAndHideMessages);
}

function validateForm() {
    const errors = {};
    const name = document.getElementById('name').value.trim();
    const crmUrl = document.getElementById('crmUrl').value.trim();
    const description = document.getElementById('description').value.trim();
    const category = document.getElementById('category').value.trim();
    const severity = document.getElementById('severity').value.trim();
    const screenshotFile = document.getElementById('screenshot').files[0];

    // Clear previous errors
    document.querySelectorAll('.form-group').forEach(group => group.classList.remove('has-error'));
    document.querySelectorAll('.error-message').forEach(msg => msg.textContent = '');

    // Validate name
    if (!name) {
        errors.name = 'Please select your name';
    }

    // Validate CRM URL
    if (!crmUrl) {
        errors.crmUrl = 'Please enter the CRM URL';
    } else if (!isValidUrl(crmUrl)) {
        errors.crmUrl = 'Please enter a valid URL';
    }

    // Validate description
    if (!description) {
        errors.description = 'Please describe the issue';
    } else if (description.length < 20) {
        errors.description = 'Description must be at least 20 characters';
    }

    // Validate category
    if (!category) {
        errors.category = 'Please select a category';
    }

    // Validate severity
    if (!severity) {
        errors.severity = 'Please select a severity level';
    }

    // Validate screenshot size if present
    if (screenshotFile && screenshotFile.size > 5 * 1024 * 1024) {
        errors.screenshot = 'File size must be less than 5MB';
    }

    // Display errors
    Object.keys(errors).forEach(field => {
        const errorElement = document.getElementById(`${field}Error`);
        const formGroup = errorElement.closest('.form-group');
        if (errorElement && formGroup) {
            errorElement.textContent = errors[field];
            formGroup.classList.add('has-error');
        }
    });

    return Object.keys(errors).length === 0;
}

function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        // Allow URLs without protocol (e.g., internal CRM URLs)
        return /^[\w.-]+\.\w+|localhost/.test(url);
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    const form = document.getElementById('issueForm');

    // Disable submit button and show loading state
    submitBtn.disabled = true;
    submitBtn.classList.add('submitting');
    submitBtn.textContent = 'Submitting...';

    try {
        // Get form data
        const name = document.getElementById('name').value;
        const crmUrl = document.getElementById('crmUrl').value;
        const category = document.getElementById('category').value;
        const severity = document.getElementById('severity').value;
        const description = document.getElementById('description').value;

        // Convert screenshot to base64 if present
        let screenshotBase64 = '';
        let screenshotFileName = '';
        let screenshotMimeType = '';

        const screenshotFile = document.getElementById('screenshot').files[0];
        if (screenshotFile) {
            screenshotBase64 = await fileToBase64(screenshotFile);
            screenshotFileName = screenshotFile.name;
            screenshotMimeType = screenshotFile.type;
        }

        // Build payload
        const payload = {
            name,
            crmUrl,
            category,
            severity,
            description,
            screenshotBase64,
            screenshotFileName,
            screenshotMimeType
        };

        // Send to Apps Script
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            showSuccessMessage(result.ticket);
            hideFormAndErrors();
        } else {
            showErrorMessage(result.error || 'An error occurred while submitting your issue.');
            hideFormAndSuccess();
        }

    } catch (error) {
        showErrorMessage('Network error: ' + error.message + '. Please check your connection and try again.');
        hideFormAndSuccess();
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('submitting');
        submitBtn.textContent = 'Submit Issue';
    }
}

function showSuccessMessage(ticketNumber) {
    document.getElementById('ticketNumber').textContent = '#' + ticketNumber;
    document.getElementById('successMessage').style.display = 'block';
}

function showErrorMessage(errorText) {
    document.getElementById('errorText').textContent = errorText;
    document.getElementById('errorMessage').style.display = 'block';
}

function hideFormAndErrors() {
    document.getElementById('issueForm').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
}

function hideFormAndSuccess() {
    document.getElementById('issueForm').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

function showFormAndHideMessages() {
    document.getElementById('issueForm').style.display = 'block';
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
}

function resetForm() {
    document.getElementById('issueForm').reset();
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('issueForm').style.display = 'block';
    setCurrentDateTime();
}
