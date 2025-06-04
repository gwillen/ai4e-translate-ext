/**
 * Background script for AI Translation Extension
 * Handles extension initialization, context menus, and message passing
 */

console.log('AI Translation Extension: Background script loaded');

// Initialize extension when installed
browser.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);

  // Create context menu items
  createContextMenus();

  // Set default options if this is a fresh install
  if (details.reason === 'install') {
    setDefaultOptions();
  }
});

/**
 * Create context menu items for translation
 */
function createContextMenus() {
  // Remove existing menus first
  browser.contextMenus.removeAll(() => {
    // Add "Translate Selected Text" menu item
    browser.contextMenus.create({
      id: 'translate-selection',
      title: 'Translate Selected Text',
      contexts: ['selection']
    });

    // Add "Translate Page" menu item
    browser.contextMenus.create({
      id: 'translate-page',
      title: 'Translate Entire Page',
      contexts: ['page']
    });
  });
}

/**
 * Handle context menu clicks
 */
browser.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);

  switch (info.menuItemId) {
    case 'translate-selection':
      handleTranslateSelection(info, tab);
      break;
    case 'translate-page':
      handleTranslatePage(tab);
      break;
  }
});

/**
 * Handle translation of selected text
 * @param {Object} info - Context menu info
 * @param {Object} tab - Current tab
 */
function handleTranslateSelection(info, tab) {
  const selectedText = info.selectionText;
  console.log('Translating selected text:', selectedText);

  // Send message to content script
  browser.tabs.sendMessage(tab.id, {
    action: 'translateSelection',
    text: selectedText
  });
}

/**
 * Handle translation of entire page
 * @param {Object} tab - Current tab
 */
function handleTranslatePage(tab) {
  console.log('Translating entire page');

  // Send message to content script
  browser.tabs.sendMessage(tab.id, {
    action: 'translatePage'
  });
}

/**
 * Handle messages from content scripts and popup
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  switch (message.action) {
    case 'getOptions':
      getStoredOptions().then(sendResponse);
      return true; // Will respond asynchronously

    case 'translateText':
      handleTranslateRequest(message.text, message.targetLanguage)
        .then(sendResponse)
        .catch(error => {
          console.error('Translation error:', error);
          sendResponse({ error: error.message });
        });
      return true; // Will respond asynchronously
  }
});

/**
 * Set default options for the extension
 */
async function setDefaultOptions() {
  const defaultOptions = {
    apiEndpoint: '',
    apiKey: '',
    defaultTargetLanguage: 'en',
    autoDetectLanguage: true,
    showTranslationOverlay: true,
    translationProvider: 'custom' // custom, openai, anthropic, etc.
  };

  await browser.storage.sync.set(defaultOptions);
  console.log('Default options set');
}

/**
 * Get stored options from browser storage
 * @returns {Promise<Object>} Stored options
 */
async function getStoredOptions() {
  try {
    const options = await browser.storage.sync.get();
    console.log('Retrieved options:', options);
    return options;
  } catch (error) {
    console.error('Error retrieving options:', error);
    return {};
  }
}

/**
 * Handle translation request using OpenAI API
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<Object>} Translation result
 */
async function handleTranslateRequest(text, targetLanguage = 'en') {
  try {
    const options = await getStoredOptions();

    if (!options.apiEndpoint || !options.apiKey) {
      throw new Error('OpenAI API endpoint and key must be configured in options');
    }

    console.log(`Translating text to ${targetLanguage}:`, text.substring(0, 100) + '...');

    // Make API request to OpenAI
    const response = await fetch(options.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.apiKey}`
      },
      body: JSON.stringify({
        model: options.modelName || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the given text to ${targetLanguage}. Preserve formatting and return only the translated text without any additional commentary.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content?.trim();

    if (!translatedText) {
      throw new Error('No translation returned from OpenAI API');
    }

    console.log('Translation successful');
    return {
      originalText: text,
      translatedText: translatedText,
      targetLanguage: targetLanguage
    };

  } catch (error) {
    console.error('Translation request failed:', error);
    throw error;
  }
}
