const converter = new showdown.Converter({
    tables: true,
    simplifiedAutoLink: true,
    strikethrough: true,
    tasklists: true
});

const promptInput = document.getElementById('promptInput');
const askBtn = document.getElementById('askBtn');
const responseElement = document.getElementById('response');

const settingsBtn = document.getElementById('settingsBtn');
const backBtn = document.getElementById('backBtn');
const mainContent = document.getElementById('main-content');
const settingsSection = document.getElementById('settings-section');

const apiKeyInputSettings = document.getElementById('apiKeyInputSettings');
const saveKeyBtnSettings = document.getElementById('saveKeyBtnSettings');
const keyStatusSettings = document.getElementById('keyStatusSettings'); 

let GEMINI_API_KEY = '';
const CHROME_STORAGE_KEY = 'geminiApiKey';

function autoResizeTextarea() {
    if (!promptInput) return;
    promptInput.style.height = 'auto';
    const scrollHeight = promptInput.scrollHeight;
    const computedStyle = window.getComputedStyle(promptInput);
    const maxHeight = parseFloat(computedStyle.maxHeight) || 200;
    const minHeight = parseFloat(computedStyle.minHeight) || 40;

    if (scrollHeight > maxHeight) {
        promptInput.style.height = `${maxHeight}px`;
        promptInput.style.overflowY = 'auto';
    } else {
        promptInput.style.height = `${Math.max(scrollHeight, minHeight)}px`;
        promptInput.style.overflowY = 'hidden';
    }
}

function toggleViews(showSettings) {
    if (showSettings) {
        if (mainContent) mainContent.style.display = 'none';
        if (settingsSection) settingsSection.style.display = 'block';
        if (settingsBtn) settingsBtn.style.display = 'none'; 
    } else {
        if (mainContent) mainContent.style.display = 'block';
        if (settingsSection) settingsSection.style.display = 'none';
        if (settingsBtn) settingsBtn.style.display = 'block'; 
    }
}

function loadApiKey() {
    chrome.storage.local.get([CHROME_STORAGE_KEY], (result) => {
        GEMINI_API_KEY = result[CHROME_STORAGE_KEY] || '';

        if (apiKeyInputSettings) apiKeyInputSettings.value = GEMINI_API_KEY;

        if (GEMINI_API_KEY) {
            if (keyStatusSettings) {
                keyStatusSettings.textContent = 'API Key saved.';
                keyStatusSettings.style.color = 'var(--secondary-color, green)';
            }
            if (saveKeyBtnSettings) saveKeyBtnSettings.textContent = '✏️';
            if (apiKeyInputSettings) apiKeyInputSettings.setAttribute('disabled', 'true');
            toggleViews(false);
        } else {
            if (keyStatusSettings) {
                keyStatusSettings.textContent = 'API Key not configured.';
                keyStatusSettings.style.color = 'var(--error-color, red)';
            }
            if (saveKeyBtnSettings) saveKeyBtnSettings.textContent = 'Save';
            if (apiKeyInputSettings) apiKeyInputSettings.removeAttribute('disabled');
            toggleViews(true); 
        }
    });
    autoResizeTextarea();
}

function saveApiKey() {
    if (saveKeyBtnSettings && saveKeyBtnSettings.textContent === '✏️') { 
        if (apiKeyInputSettings) apiKeyInputSettings.removeAttribute('disabled');
        if (apiKeyInputSettings) apiKeyInputSettings.focus();
        if (saveKeyBtnSettings) saveKeyBtnSettings.textContent = 'Save';
        if (keyStatusSettings) keyStatusSettings.textContent = 'Edit';
        return;
    }

    const key = apiKeyInputSettings ? apiKeyInputSettings.value.trim() : '';
    if (key) {
        chrome.storage.local.set({ [CHROME_STORAGE_KEY]: key }, () => {
            alert('API Key successfully saved! Returning to chat.'); 
            loadApiKey();
        });
    } else {
        alert('Please insert a valid API Key.');
    }
}

async function askGemini() {
    if (!GEMINI_API_KEY) {
        alert('Please configure your API Key first.');
        toggleViews(true);
        return;
    }

    const prompt = promptInput ? promptInput.value.trim() : '';
    if (!prompt) {
        alert('Please type your question.');
        return;
    }

    if (askBtn) {
        askBtn.textContent = 'Wait...';
        askBtn.setAttribute('disabled', 'true');
    }
    
    if (responseElement) responseElement.innerHTML = 'Generating response...';

    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

    try {
        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        if (data.error) {
            if (responseElement) responseElement.innerHTML = `<p style="color: red;">API Error: ${data.error.message}</p>`;
        } else if (data.candidates && data.candidates.length > 0) {
            const responseText = data.candidates[0].content.parts[0].text;
            const htmlResponse = converter.makeHtml(responseText);
            if (responseElement) responseElement.innerHTML = htmlResponse;
        } else {
            if (responseElement) responseElement.innerHTML = 'Could not get a response. Try again.';
        }
    } catch (error) {
        console.error('Error in API call:', error);
        if (responseElement) responseElement.innerHTML = `Connection error. Check your API key and internet connection.`;
    } finally {
        if (askBtn) {
            askBtn.textContent = 'Ask';
            askBtn.removeAttribute('disabled');
        }
    }
}

document.addEventListener('DOMContentLoaded', loadApiKey);

if (saveKeyBtnSettings) saveKeyBtnSettings.addEventListener('click', saveApiKey);
if (askBtn) askBtn.addEventListener('click', askGemini);

if (promptInput) {
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { 
            e.preventDefault(); 
            askGemini();
        }
    });
}

if (apiKeyInputSettings) {
    apiKeyInputSettings.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && saveKeyBtnSettings && saveKeyBtnSettings.textContent === 'Save') {
            saveApiKey();
        }
    });
}

if (promptInput) promptInput.addEventListener('input', autoResizeTextarea);

if (settingsBtn) settingsBtn.addEventListener('click', () => toggleViews(true));
if (backBtn) backBtn.addEventListener('click', () => toggleViews(false));
