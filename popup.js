/**
 * Popup JavaScript for AI Translation Extension
 * Handles popup interface interactions and functionality
 */

console.log('AI Translation Extension: Popup script loaded');

// DOM elements
let elements = {};

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePopup);

/**
 * Initialize the popup interface
 */
function initializePopup() {
  console.log('Initializing popup interface');

  // Get DOM elements
  elements = {
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    sourceText: document.getElementById('source-text'),
    targetLanguage: document.getElementById('target-language'),
    translateBtn: document.getElementById('translate-btn'),
    translateBtnText: document.getElementById('translate-btn-text'),
    translateBtnSpinner: document.getElementById('translate-btn-spinner'),
    translatePageBtn: document.getElementById('translate-page-btn'),
    translatePageBtnText: document.getElementById('translate-page-btn-text'),
    translatePageBtnSpinner: document.getElementById('translate-page-btn-spinner'),
    translationResult: document.getElementById('translation-result'),
    translatedText: document.getElementById('translated-text'),
    copyResultBtn: document.getElementById('copy-result-btn'),
    clearResultBtn: document.getElementById('clear-result-btn'),
    settingsBtn: document.getElementById('settings-btn'),
    optionsBtn: document.getElementById('options-btn'),
    helpBtn: document.getElementById('help-btn')
  };

  // Add event listeners
  addEventListeners();

  // Listen for progress messages from content scripts
  browser.runtime.onMessage.addListener(handleRuntimeMessage);

  // Add stop translation button handler
  const stopBtn = document.getElementById('stop-translation-btn');
  if (stopBtn) {
    stopBtn.addEventListener('click', handleStopTranslation);
  }

  // Load initial state
  loadInitialState();
}

/**
 * Add event listeners to DOM elements
 */
function addEventListeners() {
  // Translation functionality
  elements.translateBtn.addEventListener('click', handleTranslate);
  elements.translatePageBtn.addEventListener('click', handleTranslatePage);
  elements.sourceText.addEventListener('input', handleSourceTextChange);
  elements.sourceText.addEventListener('keydown', handleSourceTextKeydown);

  // Result actions
  elements.copyResultBtn.addEventListener('click', handleCopyResult);
  elements.clearResultBtn.addEventListener('click', handleClearResult);

  // Navigation
  elements.settingsBtn.addEventListener('click', openOptions);
  elements.optionsBtn.addEventListener('click', openOptions);
  elements.helpBtn.addEventListener('click', openHelp);

  // Language selection
  elements.targetLanguage.addEventListener('change', handleLanguageChange);
}

/**
 * Load initial state of the popup
 */
async function loadInitialState() {
  try {
    // Check configuration status
    await updateConfigurationStatus();

    // Load saved target language
    const options = await getOptions();
    if (options.defaultTargetLanguage) {
      elements.targetLanguage.value = options.defaultTargetLanguage;
    }

    console.log('Popup initialized successfully');
  } catch (error) {
    console.error('Error loading initial state:', error);
    showError('Failed to load extension state');
  }
}

/**
 * Update configuration status indicator
 */
async function updateConfigurationStatus() {
  try {
    const options = await getOptions();
    const isConfigured = options.apiEndpoint && options.apiKey;

    if (isConfigured) {
      elements.statusIndicator.classList.add('configured');
      elements.statusText.textContent = 'Ready to translate';
      elements.translateBtn.disabled = false;
      elements.translatePageBtn.disabled = false;
    } else {
      elements.statusIndicator.classList.remove('configured');
      elements.statusText.textContent = 'Configuration required';
      elements.translateBtn.disabled = true;
      elements.translatePageBtn.disabled = true;
    }
  } catch (error) {
    console.error('Error checking configuration:', error);
    elements.statusText.textContent = 'Status unknown';
  }
}

/**
 * Handle source text input changes
 */
function handleSourceTextChange() {
  const hasText = elements.sourceText.value.trim().length > 0;
  const isConfigured = elements.statusIndicator.classList.contains('configured');

  elements.translateBtn.disabled = !hasText || !isConfigured;
  // Page translation doesn't depend on text input
  elements.translatePageBtn.disabled = !isConfigured;

  // Hide result if text is cleared
  if (!hasText) {
    hideTranslationResult();
  }
}

/**
 * Handle keydown events in source text area
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleSourceTextKeydown(event) {
  // Translate on Ctrl+Enter or Cmd+Enter
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    if (!elements.translateBtn.disabled) {
      handleTranslate();
    }
  }
}

/**
 * Handle translate button click
 */
async function handleTranslate() {
  const sourceText = elements.sourceText.value.trim();
  const targetLanguage = elements.targetLanguage.value;

  if (!sourceText) {
    showError('Please enter text to translate');
    return;
  }

  console.log(`Translating text to ${targetLanguage}:`, sourceText.substring(0, 50) + '...');

  // Show loading state
  setTranslateButtonLoading(true);
  hideTranslationResult();

  try {
    // Send translation request to background script
    const response = await browser.runtime.sendMessage({
      action: 'translateText',
      text: sourceText,
      targetLanguage: targetLanguage
    });

    setTranslateButtonLoading(false);

    if (response.error) {
      showError(response.error);
    } else {
      showTranslationResult(response);
    }

  } catch (error) {
    console.error('Translation failed:', error);
    setTranslateButtonLoading(false);
    showError('Translation failed. Please check your configuration and try again.');
  }
}

/**
 * Handle translate page button click
 */
async function handleTranslatePage() {
  console.log('Starting page translation...');

  // Show loading state
  setTranslatePageButtonLoading(true);
  hideTranslationResult();

  try {
    // Get the active tab and send translation request
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (!activeTab) {
      throw new Error('No active tab found');
    }

    // Send message to content script to translate the page
    await browser.tabs.sendMessage(activeTab.id, {
      action: 'translatePage'
    });

    setTranslatePageButtonLoading(false);

    // Close popup after initiating page translation
    setTimeout(() => {
      window.close();
    }, 1000);

    showNotification('Page translation started! Check the page for progress.');

  } catch (error) {
    console.error('Page translation failed:', error);
    setTranslatePageButtonLoading(false);
    showError('Page translation failed. Please check your configuration and try again.');
  }
}

/**
 * Set translate button loading state
 * @param {boolean} loading - Whether to show loading state
 */
function setTranslateButtonLoading(loading) {
  if (loading) {
    elements.translateBtn.disabled = true;
    elements.translateBtnText.classList.add('hidden');
    elements.translateBtnSpinner.classList.remove('hidden');
  } else {
    elements.translateBtn.disabled = false;
    elements.translateBtnText.classList.remove('hidden');
    elements.translateBtnSpinner.classList.add('hidden');
  }
}

/**
 * Set translate page button loading state
 * @param {boolean} loading - Whether to show loading state
 */
function setTranslatePageButtonLoading(loading) {
  if (loading) {
    elements.translatePageBtn.disabled = true;
    elements.translatePageBtnText.classList.add('hidden');
    elements.translatePageBtnSpinner.classList.remove('hidden');
  } else {
    elements.translatePageBtn.disabled = false;
    elements.translatePageBtnText.classList.remove('hidden');
    elements.translatePageBtnSpinner.classList.add('hidden');
  }
}

/**
 * Show translation result
 * @param {Object} result - Translation result
 */
function showTranslationResult(result) {
  elements.translatedText.textContent = result.translatedText;
  elements.translationResult.classList.remove('hidden');

  // Scroll to result
  elements.translationResult.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest'
  });

  console.log('Translation result displayed');
}

/**
 * Hide translation result
 */
function hideTranslationResult() {
  elements.translationResult.classList.add('hidden');
}

/**
 * Update translation progress display
 */
function updateTranslationProgress(progress) {
  const progressContainer = document.getElementById('translation-progress');

  if (!progressContainer) {
    console.warn('Progress container not found');
    return;
  }

  if (!progress.isTranslating) {
    // Hide progress when translation is complete
    progressContainer.classList.add('hidden');
    return;
  }

  // Show progress container
  progressContainer.classList.remove('hidden');

  // Update progress elements
  const progressFill = progressContainer.querySelector('.progress-fill');
  const progressPercentage = progressContainer.querySelector('.progress-percentage');
  const progressText = progressContainer.querySelector('.progress-text');
  const batchInfo = progressContainer.querySelector('.batch-info');

  if (progressFill) progressFill.style.width = progress.percentage + '%';
  if (progressPercentage) progressPercentage.textContent = progress.percentage + '%';
  if (progressText) progressText.textContent = `${progress.completed} of ${progress.total} elements`;
  if (batchInfo) batchInfo.textContent = `Batch ${progress.currentBatch} of ${progress.totalBatches}`;
}

/**
 * Handle stop translation button click
 */
async function handleStopTranslation() {
  console.log('Stopping translation...');

  try {
    // Send stop message to active tab
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      await browser.tabs.sendMessage(tabs[0].id, { action: 'stopTranslation' });
    }

    // Hide progress immediately
    const progressContainer = document.getElementById('translation-progress');
    if (progressContainer) {
      progressContainer.classList.add('hidden');
    }

    showNotification('Translation stopped');
  } catch (error) {
    console.error('Error stopping translation:', error);
  }
}

/**
 * Handle messages from content scripts or background script
 */
function handleRuntimeMessage(message, sender, sendResponse) {
  console.log('Popup received message:', message);

  switch (message.action) {
    case 'updateTranslationProgress':
      updateTranslationProgress(message.progress);
      break;
  }
}

/**
 * Handle copy result button click
 */
async function handleCopyResult() {
  const translatedText = elements.translatedText.textContent;

  try {
    await navigator.clipboard.writeText(translatedText);
    showNotification('Translation copied to clipboard!');
    console.log('Translation copied to clipboard');
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    showError('Failed to copy to clipboard');
  }
}

/**
 * Handle clear result button click
 */
function handleClearResult() {
  elements.sourceText.value = '';
  hideTranslationResult();
  elements.sourceText.focus();
  console.log('Translation cleared');
}

/**
 * Handle target language change
 */
async function handleLanguageChange() {
  const selectedLanguage = elements.targetLanguage.value;
  console.log('Target language changed to:', selectedLanguage);

  try {
    // Save the selected language as default
    await browser.storage.sync.set({
      defaultTargetLanguage: selectedLanguage
    });
  } catch (error) {
    console.error('Failed to save language preference:', error);
  }
}

/**
 * Open options page
 */
function openOptions() {
  browser.runtime.openOptionsPage();
  window.close();
}

/**
 * Open help page
 */
function openHelp() {
  browser.tabs.create({
    url: 'https://github.com/your-repo/ai-translate-extension#help'
  });
  window.close();
}

/**
 * Get extension options from storage
 * @returns {Promise<Object>} Extension options
 */
async function getOptions() {
  try {
    return await browser.runtime.sendMessage({ action: 'getOptions' });
  } catch (error) {
    console.error('Failed to get options:', error);
    return {};
  }
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
  // Create error element
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    right: 20px;
    background: #dc3545;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 13px;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
    animation: slideDown 0.3s ease-out;
  `;
  errorDiv.textContent = message;

  document.body.appendChild(errorDiv);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);

  // Add click to dismiss
  errorDiv.addEventListener('click', () => {
    errorDiv.remove();
  });
}

/**
 * Show notification message
 * @param {string} message - Notification message
 */
function showNotification(message) {
  // Create notification element
  const notificationDiv = document.createElement('div');
  notificationDiv.className = 'notification-message';
  notificationDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    right: 20px;
    background: #28a745;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 13px;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    animation: slideDown 0.3s ease-out;
  `;
  notificationDiv.textContent = message;

  document.body.appendChild(notificationDiv);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notificationDiv.parentNode) {
      notificationDiv.remove();
    }
  }, 3000);

  // Add click to dismiss
  notificationDiv.addEventListener('click', () => {
    notificationDiv.remove();
  });
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .error-message,
  .notification-message {
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .error-message:hover,
  .notification-message:hover {
    opacity: 0.9;
  }
`;
document.head.appendChild(style);
