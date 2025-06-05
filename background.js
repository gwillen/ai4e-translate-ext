/**
 * Background script for AI Translation Extension
 * Handles extension initialization, context menus, and message passing
 */

console.log('AI Translation Extension: Background script loaded');

// Logging system that forwards to content script
const Logger = {
  debug: (message, ...args) => {
    console.debug(`[AI-Translate-BG] ${message}`, ...args);
    forwardLogToContent('debug', message, args);
  },
  info: (message, ...args) => {
    console.info(`[AI-Translate-BG] ${message}`, ...args);
    forwardLogToContent('info', message, args);
  },
  warn: (message, ...args) => {
    console.warn(`[AI-Translate-BG] ${message}`, ...args);
    forwardLogToContent('warn', message, args);
  },
  error: (message, ...args) => {
    console.error(`[AI-Translate-BG] ${message}`, ...args);
    forwardLogToContent('error', message, args);
  }
};

/**
 * Forward log messages to content script for debugging
 */
async function forwardLogToContent(level, message, args) {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      await browser.tabs.sendMessage(tabs[0].id, {
        action: 'logMessage',
        level: level,
        message: message,
        args: args
      });
    }
  } catch (error) {
    // Ignore if content script is not ready
  }
}

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
      handleTranslateRequest(message.text, message.targetLanguage, message.requestId, message.batchIndex, message.context)
        .then(sendResponse)
        .catch(error => {
          Logger.error(`Translation error [${message.requestId}]:`, error);
          sendResponse({ error: error.message });
        });
      return true; // Will respond asynchronously

    case 'updateTranslationProgress':
      // Forward progress updates to popup if it's open
      forwardProgressToPopup(message);
      sendResponse({ success: true });
      return false; // Respond synchronously
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
 * Forward progress updates to popup
 * @param {Object} message - Progress message from content script
 */
async function forwardProgressToPopup(message) {
  try {
    // Try to send message to popup
    await browser.runtime.sendMessage(message);
  } catch (error) {
    // Ignore if popup is closed - this is expected behavior
    console.log('Could not forward progress to popup (popup may be closed)');
  }
}

/**
 * Handle translation request using OpenAI API
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code
 * @param {string} requestId - Unique request identifier
 * @param {number} batchIndex - Batch index for grouping
 * @param {string} context - Surrounding context for better translation
 * @returns {Promise<Object>} Translation result
 */
async function handleTranslateRequest(text, targetLanguage = 'en', requestId = null, batchIndex = null, context = '') {
  try {
    const options = await getStoredOptions();

    if (!options.apiEndpoint || !options.apiKey) {
      throw new Error('OpenAI API endpoint and key must be configured in options');
    }

    Logger.debug(`Processing translation request [${requestId}]`, {
      text: text,
      targetLanguage: targetLanguage,
      batchIndex: batchIndex,
      context: context
    });

    // Build enhanced prompt with context
    let systemPrompt = `You are a professional translator. Translate the given text to ${targetLanguage}. Preserve formatting and return only the translated text without any additional commentary.`;

    let userPrompt = text;
    if (context && context.length > 0) {
      systemPrompt += ` Use the provided context to ensure accurate translation of terms and maintain consistency.`;
      userPrompt = `Context: "${context}"\n\nTranslate this text: "${text}"`;
    }

    const requestBody = {
      model: options.modelName || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.1
    };

    Logger.debug(`API Request [${requestId}]`, {
      endpoint: options.apiEndpoint,
      requestBody: requestBody
    });

    // Make API request to OpenAI
    const response = await fetch(options.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    Logger.debug(`API Response [${requestId}]`, {
      status: response.status,
      statusText: response.statusText,
      responseData: data
    });

    const translatedText = data.choices?.[0]?.message?.content?.trim();

    if (!translatedText) {
      throw new Error('No translation returned from OpenAI API');
    }

    Logger.debug(`Translation complete [${requestId}]`, {
      originalText: text,
      translatedText: translatedText,
      targetLanguage: targetLanguage,
      batchIndex: batchIndex
    });

    return {
      originalText: text,
      translatedText: translatedText,
      targetLanguage: targetLanguage,
      requestId: requestId,
      batchIndex: batchIndex
    };

  } catch (error) {
    console.error('Translation request failed:', error);
    throw error;
  }
}
