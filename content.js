/**
 * Content script for AI Translation Extension
 * Handles page interaction, text selection, and translation display
 */

console.log('AI Translation Extension: Content script loaded');

// Global state
let isTranslationMode = false;
let translationOverlay = null;
let selectedText = '';

// Translation state management
let isTranslationActive = false;
let shouldStopTranslation = false;
let continuousTranslationEnabled = false;
let mutationObserver = null;

// Pause/Resume and debugging state
let isTranslationPaused = false;
let translationRequestCount = 0;
let autoPauseAfterRequests = 0; // 0 means never pause
let pauseResumeButton = null;

// Logging system for debugging
const Logger = {
  debug: (message, ...args) => {
    console.debug(`[AI-Translate] ${message}`, ...args);
  },
  info: (message, ...args) => {
    console.info(`[AI-Translate] ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`[AI-Translate] ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`[AI-Translate] ${message}`, ...args);
  }
};

// Initialize content script
initializeContentScript();

/**
 * Initialize the content script
 */
function initializeContentScript() {
  Logger.info('Initializing AI Translation content script');

  // Listen for messages from background script
  browser.runtime.onMessage.addListener(handleMessage);

  // Add click event listener for translated elements
  document.addEventListener('click', handleTranslatedElementClick);

  // Initialize continuous translation if enabled
  initializeContinuousTranslation();
}

/**
 * Initialize continuous translation monitoring
 */
async function initializeContinuousTranslation() {
  try {
    const options = await browser.runtime.sendMessage({ action: 'getOptions' });
    if (options.continuousTranslation) {
      enableContinuousTranslation();
    }

    // Initialize auto-pause setting
    autoPauseAfterRequests = options.autoPauseAfterRequests || 0;
  } catch (error) {
    Logger.error('Failed to check continuous translation setting:', error);
  }
}

/**
 * Create and show pause/resume button for translation control
 */
function createPauseResumeButton() {
  if (pauseResumeButton) {
    return; // Button already exists
  }

  pauseResumeButton = document.createElement('div');
  pauseResumeButton.id = 'ai-translate-pause-resume';
  pauseResumeButton.innerHTML = `
    <button id="pause-resume-btn" class="pause-resume-btn">
      <span id="pause-resume-text">⏸️ Pause</span>
    </button>
  `;

  pauseResumeButton.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10002;
    font-family: Arial, sans-serif;
    font-size: 14px;
  `;

  const style = document.createElement('style');
  style.textContent = `
    .pause-resume-btn {
      background: #4A90E2;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s;
    }
    .pause-resume-btn:hover {
      background: #357ABD;
    }
    .pause-resume-btn.paused {
      background: #E74C3C;
    }
    .pause-resume-btn.paused:hover {
      background: #C0392B;
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(pauseResumeButton);

  // Add click handler
  pauseResumeButton.querySelector('#pause-resume-btn').addEventListener('click', toggleTranslationPause);
}

/**
 * Hide pause/resume button
 */
function hidePauseResumeButton() {
  if (pauseResumeButton) {
    pauseResumeButton.remove();
    pauseResumeButton = null;
  }
}

/**
 * Toggle translation pause/resume state
 */
function toggleTranslationPause() {
  isTranslationPaused = !isTranslationPaused;

  const button = pauseResumeButton.querySelector('#pause-resume-btn');
  const text = pauseResumeButton.querySelector('#pause-resume-text');

  if (isTranslationPaused) {
    button.classList.add('paused');
    text.textContent = '▶️ Resume';
    Logger.info('Translation paused by user');
  } else {
    button.classList.remove('paused');
    text.textContent = '⏸️ Pause';
    Logger.info('Translation resumed by user');
  }
}

/**
 * Check if translation should be paused due to request count
 */
function checkAutoPause() {
  if (autoPauseAfterRequests > 0 && translationRequestCount >= autoPauseAfterRequests) {
    if (!isTranslationPaused) {
      isTranslationPaused = true;
      const button = pauseResumeButton?.querySelector('#pause-resume-btn');
      const text = pauseResumeButton?.querySelector('#pause-resume-text');

      if (button && text) {
        button.classList.add('paused');
        text.textContent = '▶️ Resume';
      }

      Logger.info(`Translation auto-paused after ${translationRequestCount} requests`);
      showNotification(`Translation paused after ${translationRequestCount} requests. Click Resume to continue.`);
    }
  }
}

/**
 * Get currently selected text
 * @returns {string} Selected text
 */
function getSelectedText() {
  const selection = window.getSelection();
  return selection.toString().trim();
}

/**
 * Translate the currently selected text using structure-preserving logic
 */
async function translateSelectedText() {
  const selection = window.getSelection();

  if (!selection.rangeCount || selection.isCollapsed) {
    showError('Please select some text to translate');
    return;
  }

  console.log('Translating selected text with structure preservation');

  try {
    // Get all text nodes within the selection
    const range = selection.getRangeAt(0);
    const textNodes = getTextNodesInRange(range);

    if (textNodes.length === 0) {
      showError('No translatable text in selection');
      return;
    }

    // Get target language from options
    const options = await browser.runtime.sendMessage({ action: 'getOptions' });
    const targetLanguage = options.defaultTargetLanguage || 'en';

    // Get default translation mode from options
    const translationMode = options.defaultTranslationMode || 'natural';

    // Use the same translation logic as page translation
    await translateTextNodes(textNodes, targetLanguage, 'selection', translationMode);

  } catch (error) {
    console.error('Translation failed:', error);
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
 * Show progress indicator for page translation
 */
function showProgressIndicator(totalElements, targetLanguage) {
  hideProgressIndicator(); // Remove any existing indicator

  const progressDiv = document.createElement('div');
  progressDiv.id = 'ai-translate-progress';
  progressDiv.innerHTML = `
    <div class="progress-header">
      <span>🌐</span>
      <span>Translating to ${targetLanguage.toUpperCase()}</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill"></div>
    </div>
    <div class="progress-text">
      <span><span id="progress-completed">0</span> of <span id="progress-total">${totalElements}</span> elements</span>
      <span id="progress-percentage">0%</span>
    </div>
        <div class="current-batch" id="current-batch-info">Preparing translation...</div>
    <button class="progress-stop-btn" id="progress-stop-btn">Stop Translation</button>
  `;

  document.body.appendChild(progressDiv);

  // Add stop button event listener
  progressDiv.querySelector('#progress-stop-btn').addEventListener('click', stopTranslation);

  // Send initial progress to popup
  browser.runtime.sendMessage({
    action: 'updateTranslationProgress',
    progress: {
      completed: 0,
      total: totalElements,
      percentage: 0,
      currentBatch: 1,
      totalBatches: Math.ceil(totalElements / 5),
      isTranslating: true
    }
  }).catch(() => {}); // Ignore if popup is closed
}

/**
 * Update progress indicator
 */
function updateProgress(completed, total, currentBatch, totalBatches, currentBatchNodes) {
  const progressDiv = document.getElementById('ai-translate-progress');
  if (!progressDiv) return;

  const percentage = Math.round((completed / total) * 100);

  // Update progress bar
  const progressFill = progressDiv.querySelector('.progress-fill');
  progressFill.style.width = percentage + '%';

  // Update text
  const completedSpan = progressDiv.querySelector('#progress-completed');
  const percentageSpan = progressDiv.querySelector('#progress-percentage');
  const batchInfo = progressDiv.querySelector('#current-batch-info');

  completedSpan.textContent = completed;
  percentageSpan.textContent = percentage + '%';

  if (currentBatch <= totalBatches) {
    const batchElementCount = currentBatchNodes ? currentBatchNodes.length : 0;
    batchInfo.textContent = `Processing batch ${currentBatch} of ${totalBatches} (${batchElementCount} elements)`;
  } else {
    batchInfo.textContent = 'Translation complete!';
  }

  // Send progress to popup
  browser.runtime.sendMessage({
    action: 'updateTranslationProgress',
    progress: {
      completed,
      total,
      percentage,
      currentBatch,
      totalBatches,
      isTranslating: currentBatch <= totalBatches
    }
  }).catch(() => {}); // Ignore if popup is closed
}

/**
 * Hide progress indicator
 */
function hideProgressIndicator() {
  const progressDiv = document.getElementById('ai-translate-progress');
  if (progressDiv) {
    progressDiv.remove();
  }

  // Send completion message to popup
  browser.runtime.sendMessage({
    action: 'updateTranslationProgress',
    progress: {
      completed: 0,
      total: 0,
      percentage: 0,
      currentBatch: 0,
      totalBatches: 0,
      isTranslating: false
    }
  }).catch(() => {}); // Ignore if popup is closed
}

/**
 * Stop ongoing translation
 */
function stopTranslation() {
  console.log('Translation stop requested');
  shouldStopTranslation = true;
  isTranslationActive = false;

  // Remove all translation styling
  const translatingElements = document.querySelectorAll('.ai-translating');
  translatingElements.forEach(element => {
    element.classList.remove('ai-translating');
  });

  // Hide progress indicators and pause button
  hideProgressIndicator();
  hidePauseResumeButton();

  showNotification('Translation stopped by user');
}

// Skip tags which have text content, but where that text is
//   normally not shown on the page at all. This is probably
//   actually covered by other checks now, but check anyway.
const skipTags = ['script', 'style', 'noscript', 'video'];

/**
 * Extract text chunks from a root element using a tree walker.
 * @param {Element} rootElement - The root element to extract text chunks from.
 * @returns {Array} An array of text nodes.
 */
function extractTextChunksTreeWalker(rootElement) {
  const walker = document.createTreeWalker(
    rootElement,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip if text is effectively invisible
        const parent = node.parentElement;
        if (!parent ||
            !parent.checkVisibility() ||
            skipTags.includes(parent.tagName.toLowerCase())) {
          return NodeFilter.FILTER_REJECT;
        }

        // Only accept text nodes with meaningful content
        return node.textContent.trim().length > 0 ?
          NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );

  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  return textNodes;
}

/**
 * Get all text nodes from an element
 * @param {Element} element - Root element to search
 * @returns {Array} Array of text nodes
 */
function getTextNodes(element) {
  return extractTextChunksTreeWalker(element);
}

/**
 * Get text nodes within a selection range
 * @param {Range} range - The range to get text nodes from.
 */
function getTextNodesInRange(range) {
  const textNodes = extractTextChunksTreeWalker(range.commonAncestorContainer);
  return textNodes.filter(node => range.intersectsNode(node));
}

/**
 * Merge text nodes into groups of text nodes that are in the same block-level ancestor.
 * @param {Array} textNodes - Array of text nodes to merge.
 * @returns {Array} An array of arrays of text nodes.
 */
function mergeTextNodes(textNodes) {
  // Group text nodes by their nearest block ancestor
  const groups = new Map();

  textNodes.forEach(textNode => {
    let ancestor = textNode.parentElement;

    // Walk up to find the nearest block-level ancestor
    while (ancestor && ancestor !== document.body) {
      const style = window.getComputedStyle(ancestor);
      const blockLike = ['block', 'flex', 'grid', 'table']; //, 'list-item'];
      if (blockLike.includes(style.display)) {
        break;
      }
      ancestor = ancestor.parentElement;
    }

    if (!ancestor) ancestor = document.body;

    if (!groups.has(ancestor)) {
      groups.set(ancestor, []);
    }
    groups.get(ancestor).push(textNode);
  });

  // Convert groups to chunks
  const chunks = [];
  groups.forEach((textNodes, ancestor) => {
    const text = ancestor.innerText;
    if (text.trim().length > 0) {
      chunks.push({
        element: ancestor,
        text,
        length: text.length,
        textNodes: textNodes
      });
    }
  });

  return chunks;
}

/**
 * Unified function to translate a collection of text nodes
 * @param {Array} textNodes - Array of text nodes to translate
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Translation context ('page', 'selection', 'continuous')
 * @param {string} translationMode - Translation mode/style to use
 */
async function translateTextNodes(textNodes, targetLanguage, context = 'page', translationMode = 'natural') {
  // Merge text nodes into chunks
  const chunks = mergeTextNodes(textNodes);

  // Reset translation state
  shouldStopTranslation = false;
  isTranslationActive = true;

  // Reset request count for new translation session
  if (context === 'page' || context === 'selection') {
    translationRequestCount = 0;
    isTranslationPaused = false;
  }

  // Log the list of chunks to be translated with actual node objects for dev tools inspection
  Logger.info(`Starting ${context} translation - ${chunks.length} chunks to translate`);
  console.log(`${chunks.length} chunks are translatable in ${context}`);

  // Show pause/resume button for page and selection translations
  if (context === 'page' || context === 'selection') {
    createPauseResumeButton();
  }

  if (chunks.length === 0) {
    showNotification('No translatable text found');
    return;
  }

  // Show appropriate progress indicator
  if (context === 'page') {
    showProgressIndicator(chunks.length, targetLanguage);

    let translatedCount = 0;
    let chunkIndex = 0;

    // Translate in contextual batches for page translation
    for (const chunk of chunks) {
      if (shouldStopTranslation) {
        Logger.info('Translation cancelled by user');
        hidePauseResumeButton();
        return;
      }

      // Check for pause state before processing each batch
      while (isTranslationPaused && !shouldStopTranslation) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (shouldStopTranslation) {
        Logger.info('Translation cancelled while paused');
        hidePauseResumeButton();
        return;
      }

      updateProgress(translatedCount, chunks.length, chunkIndex + 1, chunks.length, chunk);

      await translateBatch(chunk, targetLanguage, chunkIndex, translationMode);
      translatedCount += chunk.length;
      chunkIndex++;

      if (chunkIndex < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    isTranslationActive = false;
    hidePauseResumeButton();
    setTimeout(() => hideProgressIndicator(), 3000);

    if (!shouldStopTranslation) {
      showNotification(`Page translation complete! ${translatedCount} chunks translated to ${targetLanguage}`);
    }
  } else if (context === 'continuous') {
    // For continuous translation, translate silently in background
    Logger.info(`Starting continuous translation of ${chunks.length} new chunks`);

    for (const chunk of chunks) {
      if (shouldStopTranslation) break;

      await translateBatch(chunk, targetLanguage, chunkIndex, translationMode);
      chunkIndex++;

      // Shorter delay for continuous translation
      if (chunkIndex < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (!shouldStopTranslation && chunks.length > 0) {
      Logger.info(`Continuous translation complete: ${chunks.length} chunks translated`);
    }
  } else {
    showLoadingIndicator();
    // For selection, translate immediately without progress UI
    for (const chunk of chunks) {
      await translateBatch(chunk, targetLanguage, 0, translationMode);
    }

    hideLoadingIndicator();
    hidePauseResumeButton();

    if (!shouldStopTranslation) {
      showNotification(`Selection translated to ${targetLanguage}`);
    }
  }
}

/**
 * Translate a batch of text nodes
 * @param {Array} batch - Array of text nodes to translate
 * @param {string} targetLanguage - Target language code
 * @param {number} chunkIndex - Index of the current chunk
 * @param {string} translationMode - Translation mode/style to use
 */
async function translateBatch(chunk, targetLanguage, chunkIndex, translationMode = 'natural') {
  // Highlight current chunk being translated (for page translation)
  const element = chunk.element;
  console.log("Translating chunk", chunk);
  element.classList.add('ai-translating');

  // Check for pause state before starting chunk
  while (isTranslationPaused && !shouldStopTranslation) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (shouldStopTranslation) {
    return;
  }

  // Translate the chunk
  const promises = chunk.textNodes.map(async (node, nodeIndex) => {
    const text = node.textContent.trim();
    const requestId = `chunk-${chunkIndex}-node-${nodeIndex}-${Date.now()}`;

    try {
      Logger.debug(`Translation Request [${requestId}]`, {
        chunkIndex: chunkIndex,
        nodeIndex: nodeIndex,
        originalText: text,
        targetLanguage: targetLanguage,
        context: chunk.text
      });

      // Increment request count and check auto-pause
      translationRequestCount++;
      Logger.debug(`Translation request #${translationRequestCount} for chunk ${chunkIndex}, node ${nodeIndex}`);

      const response = await browser.runtime.sendMessage({
        action: 'translateText',
        text: text,
        targetLanguage: targetLanguage,
        requestId: requestId,
        chunkIndex: chunkIndex,
        context: chunk.text,
        translationMode: translationMode
      });

      // Check auto-pause after each request
      checkAutoPause();

      if (!response.error && response.translatedText) {
        Logger.debug(`Translation Success [${requestId}]`, {
          translatedText: response.translatedText,
          fullResponse: response
        });

        // Preserve whitespace structure when replacing text
        const originalText = node.textContent;
        const leadingWhitespace = originalText.match(/^\s*/)[0];
        const trailingWhitespace = originalText.match(/\s*$/)[0];
        const trimmedTranslation = response.translatedText.trim();
        const finalText = leadingWhitespace + trimmedTranslation + trailingWhitespace;

        node.textContent = finalText;

        Logger.debug(`Text Replacement [${requestId}]`, {
          originalText: originalText,
          finalText: finalText,
          leadingWhitespace: leadingWhitespace,
          trailingWhitespace: trailingWhitespace
        });

        // Update element styling
        if (element) {
          element.classList.remove('ai-translating');
          element.classList.add('ai-translated', `chunk-${chunkIndex % 5}`, 'ai-hover-enabled');

          // Store translation data for re-translation features
          element.setAttribute('data-translation-chunk', chunkIndex.toString());
          element.setAttribute('data-original-text', originalText.trim());
          element.setAttribute('data-translated-text', trimmedTranslation);
          element.setAttribute('data-target-language', targetLanguage);
          element.setAttribute('data-request-id', requestId);
        }
      } else {
        // Remove translating class if translation failed
        if (element) {
          element.classList.remove('ai-translating');
        }
      }
    } catch (error) {
      console.error('Failed to translate text node:', error);

      // Remove translating class if translation failed
      if (element) {
        element.classList.remove('ai-translating');
      }
    }
  });

  // Wait for current batch to complete
  await Promise.all(promises);
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
      translateSelectedText();
      break;

    case 'translatePage':
      translateEntirePage(message.translationMode);
      break;

    case 'stopTranslation':
      stopTranslation();
      break;

    case 'logMessage':
      // Forward log from background script
      Logger[message.level](`[BG] ${message.message}`, ...message.args);
      break;
  }
}

/**
 * Translate entire page by finding and translating all text content
 * @param {string} translationMode - Translation mode/style to use
 */
async function translateEntirePage(translationMode = 'natural') {
  Logger.info(`Starting full page translation with ${translationMode} mode...`);
  hideLoadingIndicator(); // Hide the basic loading indicator

  try {
    // Get target language from options
    const options = await browser.runtime.sendMessage({ action: 'getOptions' });
    const targetLanguage = options.defaultTargetLanguage || 'en';

    // Find all text nodes in the page
    const textNodes = getTextNodes(document.body);
    Logger.info(`Found ${textNodes.length} text nodes to translate`);

    // Use the unified translation logic with translation mode
    await translateTextNodes(textNodes, targetLanguage, 'page', translationMode);

  } catch (error) {
    Logger.error('Page translation failed:', error);
    hideProgressIndicator();
    showError('Page translation failed. Please check your API configuration.');
  }
}

/**
 * Handle clicks on translated elements
 */
function handleTranslatedElementClick(event) {
  const element = event.target.closest('.ai-hover-enabled');

  if (element && element.hasAttribute('data-original-text')) {
    event.preventDefault();
    event.stopPropagation();
    showTranslationMenu(element, event.clientX, event.clientY);
  }
}

/**
 * Show translation adjustment menu
 */
function showTranslationMenu(element, x, y) {
  // Remove any existing menu
  hideTranslationMenu();

  const originalText = element.getAttribute('data-original-text');
  const translatedText = element.getAttribute('data-translated-text');
  const targetLanguage = element.getAttribute('data-target-language');

  const menu = document.createElement('div');
  menu.id = 'ai-translation-menu';
  menu.innerHTML = `
    <div class="menu-header">
      Translation Options
      <button class="close-btn">&times;</button>
    </div>
    <div class="menu-content">
      <div class="original-text">
        <div class="text-label">Original:</div>
        <div class="text-content">${escapeHtml(originalText)}</div>
      </div>
      <div class="current-translation">
        <div class="text-label">Current Translation:</div>
        <div class="text-content">${escapeHtml(translatedText)}</div>
      </div>
      <div class="menu-actions">
        <button class="action-btn" data-action="natural">Natural Translation</button>
        <button class="action-btn" data-action="literal">Literal Translation</button>
        <button class="action-btn" data-action="word-by-word">Word-by-Word</button>
        <button class="action-btn" data-action="casual">Casual Style</button>
        <button class="action-btn" data-action="formal">Formal Style</button>
        <button class="action-btn" data-action="revert">Restore Original</button>
        <button class="action-btn primary" data-action="custom">Custom Prompt</button>
      </div>
    </div>
  `;

  // Position the menu
  menu.style.left = Math.min(x, window.innerWidth - 350) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 300) + 'px';

  // Add event listeners
  menu.querySelector('.close-btn').addEventListener('click', hideTranslationMenu);

  menu.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.target.getAttribute('data-action');
      handleTranslationAction(element, action, originalText, targetLanguage);
    });
  });

  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener('click', handleMenuOutsideClick);
  }, 100);

  document.body.appendChild(menu);
}

/**
 * Hide translation menu
 */
function hideTranslationMenu() {
  const menu = document.getElementById('ai-translation-menu');
  if (menu) {
    menu.remove();
  }
  document.removeEventListener('click', handleMenuOutsideClick);
}

/**
 * Handle clicks outside the translation menu
 */
function handleMenuOutsideClick(event) {
  const menu = document.getElementById('ai-translation-menu');
  if (menu && !menu.contains(event.target)) {
    hideTranslationMenu();
  }
}

/**
 * Handle translation action from menu
 */
async function handleTranslationAction(element, action, originalText, targetLanguage) {
  hideTranslationMenu();

  if (action === 'revert') {
    // Restore original text
    const textNode = getFirstTextNode(element);
    if (textNode) {
      textNode.textContent = originalText;
      element.classList.remove('ai-translated', 'ai-hover-enabled');
      element.removeAttribute('data-original-text');
      element.removeAttribute('data-translated-text');
      element.removeAttribute('data-target-language');
      element.removeAttribute('data-translation-batch');
    }
    showNotification('Original text restored');
    return;
  }

  if (action === 'custom') {
    const customPrompt = prompt('Enter custom translation instructions:');
    if (!customPrompt) return;

    showLoadingIndicator();

    try {
      const response = await browser.runtime.sendMessage({
        action: 'translateText',
        text: `${customPrompt} Translate to ${targetLanguage}: "${originalText}"`,
        targetLanguage: targetLanguage
      });

      hideLoadingIndicator();

      if (!response.error && response.translatedText) {
        const textNode = getFirstTextNode(element);
        if (textNode) {
          textNode.textContent = response.translatedText;
          element.setAttribute('data-translated-text', response.translatedText);
        }
        showNotification('Translation updated');
      } else {
        showError(response.error || 'Translation failed');
      }
    } catch (error) {
      hideLoadingIndicator();
      showError('Translation failed');
    }
    return;
  }

  // For unified translation modes, use the translation mode system
  if (['natural', 'literal', 'word-by-word', 'casual', 'formal'].includes(action)) {
    showLoadingIndicator();

    try {
      const response = await browser.runtime.sendMessage({
        action: 'translateText',
        text: originalText,
        targetLanguage: targetLanguage,
        translationMode: action,
        requestId: `interactive-${Date.now()}`,
        batchIndex: 0,
        context: getSurroundingContext(getFirstTextNode(element))
      });

      hideLoadingIndicator();

      if (!response.error && response.translatedText) {
        const textNode = getFirstTextNode(element);
        if (textNode) {
          textNode.textContent = response.translatedText;
          element.setAttribute('data-translated-text', response.translatedText);
        }
        showNotification(`Translation updated (${action} style)`);
      } else {
        showError(response.error || 'Translation failed');
      }
    } catch (error) {
      hideLoadingIndicator();
      showError('Translation failed');
    }
  }
}

/**
 * Enable continuous translation monitoring
 */
function enableContinuousTranslation() {
  if (mutationObserver) {
    Logger.debug('Continuous translation already enabled');
    return;
  }

  Logger.info('Enabling continuous translation monitoring');
  continuousTranslationEnabled = true;

  mutationObserver = new MutationObserver((mutations) => {
    handleMutations(mutations);
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

/**
 * Disable continuous translation monitoring
 */
function disableContinuousTranslation() {
  if (mutationObserver) {
    Logger.info('Disabling continuous translation monitoring');
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  continuousTranslationEnabled = false;
}

/**
 * Handle DOM mutations for continuous translation
 */
async function handleMutations(mutations) {
  if (!continuousTranslationEnabled || isTranslationActive) {
    return;
  }

  const newTextNodes = [];

  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      // Check for new elements
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const textNodes = getTextNodes(node);
          newTextNodes.push(...textNodes);
        } else if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.trim();
          if (text.length >= 3 && !/^[\d\s\p{P}]+$/u.test(text)) {
            newTextNodes.push(node);
          }
        }
      }
    } else if (mutation.type === 'characterData') {
      // Text content changed
      const text = mutation.target.textContent.trim();
      if (text.length >= 3 && !/^[\d\s\p{P}]+$/u.test(text)) {
        newTextNodes.push(mutation.target);
      }
    }
  }

  if (newTextNodes.length > 0) {
    // Filter out already translated nodes
    const untranslatedNodes = newTextNodes.filter(node => {
      const element = node.parentElement;
      return element && !element.classList.contains('ai-translated');
    });

    if (untranslatedNodes.length > 0) {
      Logger.info(`Found ${untranslatedNodes.length} new text nodes for continuous translation`);

      try {
        const options = await browser.runtime.sendMessage({ action: 'getOptions' });
        const targetLanguage = options.defaultTargetLanguage || 'en';

        // Get default translation mode
        const translationMode = options.defaultTranslationMode || 'natural';

        // Use a small delay to batch rapid changes
        setTimeout(() => {
          translateTextNodes(untranslatedNodes, targetLanguage, 'continuous', translationMode);
        }, 1000);
      } catch (error) {
        Logger.error('Failed to get options for continuous translation:', error);
      }
    }
  }
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
