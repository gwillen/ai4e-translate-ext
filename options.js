/**
 * Options JavaScript for AI Translation Extension
 * Handles settings page functionality
 */

console.log('AI Translation Extension: Options script loaded');

// DOM elements
let elements = {};

// Default settings
const DEFAULT_SETTINGS = {
  apiProvider: 'openai',
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  modelName: 'gpt-3.5-turbo',
  defaultTargetLanguage: 'en',
  autoDetectLanguage: true,
  showTranslationOverlay: true,
  preserveFormatting: true,
  maxTokens: 2000,
  temperature: 0.1,
  requestTimeout: 30,
  saveTranslationHistory: false
};

// Provider endpoints
const PROVIDER_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  custom: ''
};

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeOptions);

/**
 * Initialize the options page
 */
function initializeOptions() {
  console.log('Initializing options page');

  // Get DOM elements
  elements = {
    // API Configuration
    apiProvider: document.getElementById('api-provider'),
    apiEndpoint: document.getElementById('api-endpoint'),
    apiKey: document.getElementById('api-key'),
    modelName: document.getElementById('model-name'),
    toggleApiKey: document.getElementById('toggle-api-key'),
    testConnection: document.getElementById('test-connection'),
    testBtnText: document.getElementById('test-btn-text'),
    testBtnSpinner: document.getElementById('test-btn-spinner'),
    connectionStatus: document.getElementById('connection-status'),

    // Translation Settings
    defaultTargetLanguage: document.getElementById('default-target-language'),
    autoDetectLanguage: document.getElementById('auto-detect-language'),
    showTranslationOverlay: document.getElementById('show-translation-overlay'),
    preserveFormatting: document.getElementById('preserve-formatting'),

    // Advanced Settings
    maxTokens: document.getElementById('max-tokens'),
    temperature: document.getElementById('temperature'),
    temperatureValue: document.getElementById('temperature-value'),
    requestTimeout: document.getElementById('request-timeout'),

    // Data & Privacy
    saveTranslationHistory: document.getElementById('save-translation-history'),
    clearHistory: document.getElementById('clear-history'),
    exportSettings: document.getElementById('export-settings'),
    importSettings: document.getElementById('import-settings'),

    // Footer
    saveStatus: document.getElementById('save-status'),
    resetSettings: document.getElementById('reset-settings'),
    saveSettings: document.getElementById('save-settings')
  };

  // Add event listeners
  addEventListeners();

  // Load current settings
  loadSettings();
}

/**
 * Add event listeners to form elements
 */
function addEventListeners() {
  // API Configuration
  elements.apiProvider.addEventListener('change', handleProviderChange);
  elements.apiEndpoint.addEventListener('input', handleSettingChange);
  elements.apiKey.addEventListener('input', handleSettingChange);
  elements.modelName.addEventListener('input', handleSettingChange);
  elements.toggleApiKey.addEventListener('click', toggleApiKeyVisibility);
  elements.testConnection.addEventListener('click', testApiConnection);

  // Translation Settings
  elements.defaultTargetLanguage.addEventListener('change', handleSettingChange);
  elements.autoDetectLanguage.addEventListener('change', handleSettingChange);
  elements.showTranslationOverlay.addEventListener('change', handleSettingChange);
  elements.preserveFormatting.addEventListener('change', handleSettingChange);

  // Advanced Settings
  elements.maxTokens.addEventListener('input', handleSettingChange);
  elements.temperature.addEventListener('input', handleTemperatureChange);
  elements.requestTimeout.addEventListener('input', handleSettingChange);

  // Data & Privacy
  elements.saveTranslationHistory.addEventListener('change', handleSettingChange);
  elements.clearHistory.addEventListener('click', clearTranslationHistory);
  elements.exportSettings.addEventListener('click', exportSettings);
  elements.importSettings.addEventListener('change', importSettings);

  // Footer actions
  elements.resetSettings.addEventListener('click', resetToDefaults);
  elements.saveSettings.addEventListener('click', saveSettings);
}

/**
 * Load current settings from storage
 */
async function loadSettings() {
  try {
    const settings = await browser.storage.sync.get();
    console.log('Loaded settings:', settings);

    // Populate form fields with current settings or defaults
    elements.apiProvider.value = settings.apiProvider || DEFAULT_SETTINGS.apiProvider;
    elements.apiEndpoint.value = settings.apiEndpoint || DEFAULT_SETTINGS.apiEndpoint;
    elements.apiKey.value = settings.apiKey || DEFAULT_SETTINGS.apiKey;
    elements.modelName.value = settings.modelName || DEFAULT_SETTINGS.modelName;
    elements.defaultTargetLanguage.value = settings.defaultTargetLanguage || DEFAULT_SETTINGS.defaultTargetLanguage;
    elements.autoDetectLanguage.checked = settings.autoDetectLanguage !== undefined ? settings.autoDetectLanguage : DEFAULT_SETTINGS.autoDetectLanguage;
    elements.showTranslationOverlay.checked = settings.showTranslationOverlay !== undefined ? settings.showTranslationOverlay : DEFAULT_SETTINGS.showTranslationOverlay;
    elements.preserveFormatting.checked = settings.preserveFormatting !== undefined ? settings.preserveFormatting : DEFAULT_SETTINGS.preserveFormatting;
    elements.maxTokens.value = settings.maxTokens || DEFAULT_SETTINGS.maxTokens;
    elements.temperature.value = settings.temperature !== undefined ? settings.temperature : DEFAULT_SETTINGS.temperature;
    elements.requestTimeout.value = settings.requestTimeout || DEFAULT_SETTINGS.requestTimeout;
    elements.saveTranslationHistory.checked = settings.saveTranslationHistory !== undefined ? settings.saveTranslationHistory : DEFAULT_SETTINGS.saveTranslationHistory;

    // Update temperature display
    elements.temperatureValue.textContent = elements.temperature.value;

    // Update API endpoint based on provider
    handleProviderChange();

    showSaveStatus('Settings loaded successfully', 'success');
  } catch (error) {
    console.error('Error loading settings:', error);
    showSaveStatus('Error loading settings', 'error');
  }
}

/**
 * Handle provider selection change
 */
function handleProviderChange() {
  const provider = elements.apiProvider.value;
  const endpoint = PROVIDER_ENDPOINTS[provider];

  if (provider !== 'custom' && endpoint) {
    elements.apiEndpoint.value = endpoint;
    elements.apiEndpoint.disabled = true;
  } else {
    elements.apiEndpoint.disabled = false;
  }

  // Update model placeholder based on provider
  const modelPlaceholders = {
    openai: 'gpt-3.5-turbo, gpt-4, gpt-4o',
    custom: 'model-name'
  };

  elements.modelName.placeholder = modelPlaceholders[provider] || 'model-name';

  handleSettingChange();
}

/**
 * Handle setting changes and auto-save
 */
async function handleSettingChange() {
  try {
    await saveSettings();
  } catch (error) {
    console.error('Error auto-saving settings:', error);
  }
}

/**
 * Handle temperature slider change
 */
function handleTemperatureChange() {
  elements.temperatureValue.textContent = elements.temperature.value;
  handleSettingChange();
}

/**
 * Toggle API key visibility
 */
function toggleApiKeyVisibility() {
  const isPassword = elements.apiKey.type === 'password';
  elements.apiKey.type = isPassword ? 'text' : 'password';
  elements.toggleApiKey.textContent = isPassword ? '🙈' : '👁️';
}

/**
 * Test API connection
 */
async function testApiConnection() {
  const apiEndpoint = elements.apiEndpoint.value.trim();
  const apiKey = elements.apiKey.value.trim();

  if (!apiEndpoint || !apiKey) {
    showConnectionStatus('Please enter both API endpoint and key', 'error');
    return;
  }

  // Show loading state
  elements.testConnection.disabled = true;
  elements.testBtnText.classList.add('hidden');
  elements.testBtnSpinner.classList.remove('hidden');

  try {
    console.log('Testing API connection...');

    // Send test request to background script
    const response = await browser.runtime.sendMessage({
      action: 'translateText',
      text: 'Hello, world!',
      targetLanguage: 'es'
    });

    if (response.error) {
      showConnectionStatus(`Connection failed: ${response.error}`, 'error');
    } else {
      showConnectionStatus('Connection successful! Translation test completed.', 'success');
    }

  } catch (error) {
    console.error('Connection test failed:', error);
    showConnectionStatus(`Connection failed: ${error.message}`, 'error');
  } finally {
    // Reset button state
    elements.testConnection.disabled = false;
    elements.testBtnText.classList.remove('hidden');
    elements.testBtnSpinner.classList.add('hidden');
  }
}

/**
 * Show connection status message
 * @param {string} message - Status message
 * @param {string} type - Status type (success, error, warning)
 */
function showConnectionStatus(message, type) {
  elements.connectionStatus.textContent = message;
  elements.connectionStatus.className = `connection-status ${type}`;
  elements.connectionStatus.classList.remove('hidden');

  // Auto-hide after 10 seconds
  setTimeout(() => {
    elements.connectionStatus.classList.add('hidden');
  }, 10000);
}

/**
 * Save current settings
 */
async function saveSettings() {
  try {
    const settings = {
      apiProvider: elements.apiProvider.value,
      apiEndpoint: elements.apiEndpoint.value.trim(),
      apiKey: elements.apiKey.value.trim(),
      modelName: elements.modelName.value.trim(),
      defaultTargetLanguage: elements.defaultTargetLanguage.value,
      autoDetectLanguage: elements.autoDetectLanguage.checked,
      showTranslationOverlay: elements.showTranslationOverlay.checked,
      preserveFormatting: elements.preserveFormatting.checked,
      maxTokens: parseInt(elements.maxTokens.value),
      temperature: parseFloat(elements.temperature.value),
      requestTimeout: parseInt(elements.requestTimeout.value),
      saveTranslationHistory: elements.saveTranslationHistory.checked
    };

    await browser.storage.sync.set(settings);
    console.log('Settings saved:', settings);
    showSaveStatus('Settings saved successfully', 'success');

  } catch (error) {
    console.error('Error saving settings:', error);
    showSaveStatus('Error saving settings', 'error');
  }
}

/**
 * Reset settings to defaults
 */
async function resetToDefaults() {
  if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
    return;
  }

  try {
    await browser.storage.sync.clear();
    await browser.storage.sync.set(DEFAULT_SETTINGS);

    // Reload the page to reflect changes
    location.reload();

  } catch (error) {
    console.error('Error resetting settings:', error);
    showSaveStatus('Error resetting settings', 'error');
  }
}

/**
 * Clear translation history
 */
async function clearTranslationHistory() {
  if (!confirm('Are you sure you want to clear all translation history? This cannot be undone.')) {
    return;
  }

  try {
    await browser.storage.local.remove('translationHistory');
    showSaveStatus('Translation history cleared', 'success');
    console.log('Translation history cleared');
  } catch (error) {
    console.error('Error clearing history:', error);
    showSaveStatus('Error clearing history', 'error');
  }
}

/**
 * Export settings to JSON file
 */
async function exportSettings() {
  try {
    const settings = await browser.storage.sync.get();
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-translate-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    showSaveStatus('Settings exported successfully', 'success');

  } catch (error) {
    console.error('Error exporting settings:', error);
    showSaveStatus('Error exporting settings', 'error');
  }
}

/**
 * Import settings from JSON file
 */
async function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const settings = JSON.parse(text);

    // Validate settings object
    if (typeof settings !== 'object' || settings === null) {
      throw new Error('Invalid settings file format');
    }

    // Merge with current settings
    const currentSettings = await browser.storage.sync.get();
    const mergedSettings = { ...currentSettings, ...settings };

    await browser.storage.sync.set(mergedSettings);

    // Reload the page to reflect changes
    location.reload();

  } catch (error) {
    console.error('Error importing settings:', error);
    showSaveStatus('Error importing settings: ' + error.message, 'error');
  } finally {
    // Clear the file input
    event.target.value = '';
  }
}

/**
 * Show save status message
 * @param {string} message - Status message
 * @param {string} type - Status type (success, error)
 */
function showSaveStatus(message, type) {
  elements.saveStatus.textContent = message;
  elements.saveStatus.className = `save-status-text ${type}`;

  // Auto-reset after 3 seconds
  setTimeout(() => {
    elements.saveStatus.textContent = 'Changes saved automatically';
    elements.saveStatus.className = 'save-status-text';
  }, 3000);
}
