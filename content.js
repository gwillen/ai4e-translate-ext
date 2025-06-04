/**
 * Content script for AI Translation Extension
 * Handles page interaction, text selection, and translation display
 */

console.log('AI Translation Extension: Content script loaded');

// Global state
let isTranslationMode = false;
let translationOverlay = null;
let selectedText = '';

// Initialize content script
initializeContentScript();

/**
 * Initialize the content script
 */
function initializeContentScript() {
  console.log('Initializing AI Translation content script');

  // Add selection event listeners
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleKeyboardSelection);

  // Listen for messages from background script
  browser.runtime.onMessage.addListener(handleMessage);
}

/**
 * Handle text selection with mouse
 * @param {Event} event - Mouse event
 */
function handleTextSelection(event) {
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 0) {
      selectedText = text;
      console.log('Text selected:', text.substring(0, 50) + '...');
      showTranslationButton(event.pageX, event.pageY);
    } else {
      hideTranslationButton();
    }
  }, 10);
}

/**
 * Handle text selection with keyboard
 * @param {Event} event - Keyboard event
 */
function handleKeyboardSelection(event) {
  // Only handle arrow keys and selection shortcuts
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' ||
      event.key === 'ArrowUp' || event.key === 'ArrowDown' ||
      (event.ctrlKey && event.key === 'a')) {
    handleTextSelection(event);
  }
}

/**
 * Show translation button near selected text
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
function showTranslationButton(x, y) {
  hideTranslationButton(); // Remove existing button

  const button = document.createElement('div');
  button.id = 'ai-translate-button';
  button.textContent = '🌐 Translate';
  button.style.cssText = `
    position: absolute;
    left: ${x + 10}px;
    top: ${y - 40}px;
    background: #4A90E2;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-family: Arial, sans-serif;
    cursor: pointer;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    transition: all 0.2s ease;
    user-select: none;
  `;

  button.addEventListener('click', () => {
    translateSelectedText();
  });

  button.addEventListener('mouseenter', () => {
    button.style.background = '#357ABD';
    button.style.transform = 'scale(1.05)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.background = '#4A90E2';
    button.style.transform = 'scale(1)';
  });

  document.body.appendChild(button);

  // Auto-hide after 5 seconds
  setTimeout(() => {
    hideTranslationButton();
  }, 5000);
}

/**
 * Hide translation button
 */
function hideTranslationButton() {
  const existingButton = document.getElementById('ai-translate-button');
  if (existingButton) {
    existingButton.remove();
  }
}

/**
 * Translate the currently selected text
 */
async function translateSelectedText() {
  if (!selectedText) {
    console.log('No text selected for translation');
    return;
  }

  hideTranslationButton();
  showLoadingIndicator();

  try {
    // Get target language from options
    const options = await browser.runtime.sendMessage({ action: 'getOptions' });
    const targetLanguage = options.defaultTargetLanguage || 'en';

    // Send translation request to background script
    const response = await browser.runtime.sendMessage({
      action: 'translateText',
      text: selectedText,
      targetLanguage: targetLanguage
    });

    hideLoadingIndicator();

    if (response.error) {
      showError(response.error);
    } else {
      showTranslationResult(response);
    }

  } catch (error) {
    console.error('Translation failed:', error);
    hideLoadingIndicator();
    showError('Translation failed. Please check your API configuration.');
  }
}

/**
 * Show loading indicator
 */
function showLoadingIndicator() {
  const loading = document.createElement('div');
  loading.id = 'ai-translate-loading';
  loading.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div class="spinner"></div>
      Translating...
    </div>
  `;
  loading.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10001;
    font-family: Arial, sans-serif;
    font-size: 14px;
  `;

  // Add spinner CSS
  const style = document.createElement('style');
  style.textContent = `
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #4A90E2;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(loading);
}

/**
 * Hide loading indicator
 */
function hideLoadingIndicator() {
  const loading = document.getElementById('ai-translate-loading');
  if (loading) {
    loading.remove();
  }
}

/**
 * Show translation result
 * @param {Object} result - Translation result
 */
function showTranslationResult(result) {
  const overlay = document.createElement('div');
  overlay.id = 'ai-translate-overlay';
  overlay.innerHTML = `
    <div class="translation-header">
      <h3>Translation Result</h3>
      <button class="close-btn">&times;</button>
    </div>
    <div class="translation-content">
      <div class="original-text">
        <h4>Original:</h4>
        <p>${escapeHtml(result.originalText)}</p>
      </div>
      <div class="translated-text">
        <h4>Translation (${result.targetLanguage}):</h4>
        <p>${escapeHtml(result.translatedText)}</p>
      </div>
    </div>
    <div class="translation-actions">
      <button class="copy-btn">Copy Translation</button>
      <button class="replace-btn">Replace Original</button>
    </div>
  `;

  overlay.style.cssText = `
    position: fixed;
    top: 50px;
    right: 20px;
    width: 400px;
    max-height: 500px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    z-index: 10002;
    font-family: Arial, sans-serif;
    overflow: hidden;
  `;

  // Add event listeners
  overlay.querySelector('.close-btn').addEventListener('click', () => {
    overlay.remove();
  });

  overlay.querySelector('.copy-btn').addEventListener('click', () => {
    copyToClipboard(result.translatedText);
  });

  overlay.querySelector('.replace-btn').addEventListener('click', () => {
    replaceSelectedText(result.translatedText);
    overlay.remove();
  });

  document.body.appendChild(overlay);

  // Auto-hide after 30 seconds
  setTimeout(() => {
    if (document.getElementById('ai-translate-overlay')) {
      overlay.remove();
    }
  }, 30000);
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
  const error = document.createElement('div');
  error.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4444;
    color: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10001;
    font-family: Arial, sans-serif;
    font-size: 14px;
    max-width: 300px;
  `;
  error.textContent = message;

  document.body.appendChild(error);

  setTimeout(() => {
    error.remove();
  }, 5000);
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showNotification('Translation copied to clipboard!');
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    showError('Failed to copy to clipboard');
  }
}

/**
 * Replace selected text with translation
 * @param {string} translatedText - Translated text
 */
function replaceSelectedText(translatedText) {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(translatedText));
    selection.removeAllRanges();
    showNotification('Text replaced with translation!');
  }
}

/**
 * Show notification message
 * @param {string} message - Notification message
 */
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10001;
    font-family: Arial, sans-serif;
    font-size: 14px;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

/**
 * Handle messages from background script
 * @param {Object} message - Message object
 */
function handleMessage(message) {
  console.log('Content script received message:', message);

  switch (message.action) {
    case 'translateSelection':
      selectedText = message.text;
      translateSelectedText();
      break;

    case 'translatePage':
      translateEntirePage();
      break;
  }
}

/**
 * Translate entire page (placeholder for future implementation)
 */
function translateEntirePage() {
  showNotification('Page translation feature coming soon!');
  console.log('Page translation requested - feature not yet implemented');
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
