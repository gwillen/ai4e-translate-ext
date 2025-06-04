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

  // Listen for messages from background script
  browser.runtime.onMessage.addListener(handleMessage);
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
 * Translate the currently selected text and replace it in place
 */
async function translateSelectedText() {
  const selectedText = getSelectedText();

  if (!selectedText) {
    console.log('No text selected for translation');
    showError('Please select some text to translate');
    return;
  }

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
      // Replace the selected text with translation
      replaceSelectedText(response.translatedText);
      showNotification(`Translated to ${targetLanguage}`);
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
  `;

  document.body.appendChild(progressDiv);

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
      translateEntirePage();
      break;
  }
}

/**
 * Translate entire page by finding and translating all text content
 */
async function translateEntirePage() {
  console.log('Starting full page translation...');
  hideLoadingIndicator(); // Hide the basic loading indicator

  try {
    // Get target language from options
    const options = await browser.runtime.sendMessage({ action: 'getOptions' });
    const targetLanguage = options.defaultTargetLanguage || 'en';

    // Find all text nodes in the page
    const textNodes = getTextNodes(document.body);
    console.log(`Found ${textNodes.length} text nodes to translate`);

    // Filter and prepare translatable nodes
    const translatableNodes = textNodes.filter(node => {
      const text = node.textContent.trim();
      return text.length >= 3 && !/^[\d\s\p{P}]+$/u.test(text);
    });

    console.log(`${translatableNodes.length} nodes are translatable`);

    if (translatableNodes.length === 0) {
      showNotification('No translatable text found on this page');
      return;
    }

    // Calculate batches
    const batchSize = 5;
    const totalBatches = Math.ceil(translatableNodes.length / batchSize);

    // Show progress indicator
    showProgressIndicator(translatableNodes.length, targetLanguage);

    let translatedCount = 0;
    let batchIndex = 0;

    // Translate text nodes in batches
    for (let i = 0; i < translatableNodes.length; i += batchSize) {
      const batch = translatableNodes.slice(i, i + batchSize);

      // Update progress
      updateProgress(translatedCount, translatableNodes.length, batchIndex + 1, totalBatches, batch);

      // Highlight current batch being translated
      batch.forEach(node => {
        const element = node.parentElement;
        if (element) {
          element.classList.add('ai-translating');
        }
      });

      // Translate the batch
      const promises = batch.map(async (node, nodeIndex) => {
        const text = node.textContent.trim();

        try {
          const response = await browser.runtime.sendMessage({
            action: 'translateText',
            text: text,
            targetLanguage: targetLanguage
          });

          if (!response.error && response.translatedText) {
            node.textContent = response.translatedText;

            // Update element styling
            const element = node.parentElement;
            if (element) {
              element.classList.remove('ai-translating');
              element.classList.add('ai-translated', `batch-${batchIndex % 5}`);

              // Store batch info for grouping
              element.setAttribute('data-translation-batch', batchIndex.toString());
            }

            translatedCount++;

            // Update progress in real-time
            updateProgress(translatedCount, translatableNodes.length, batchIndex + 1, totalBatches, batch);
          } else {
            // Remove translating class if translation failed
            const element = node.parentElement;
            if (element) {
              element.classList.remove('ai-translating');
            }
          }
        } catch (error) {
          console.error('Failed to translate text node:', error);

          // Remove translating class if translation failed
          const element = node.parentElement;
          if (element) {
            element.classList.remove('ai-translating');
          }
        }
      });

      // Wait for current batch to complete before processing next batch
      await Promise.all(promises);

      batchIndex++;

      // Small delay between batches to be respectful to the API
      if (i + batchSize < translatableNodes.length) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    // Hide progress indicator after completion
    setTimeout(() => {
      hideProgressIndicator();
    }, 3000);

    showNotification(`Page translation complete! ${translatedCount} elements translated to ${targetLanguage}`);
    console.log(`Page translation completed. Translated ${translatedCount} elements.`);

  } catch (error) {
    console.error('Page translation failed:', error);
    hideProgressIndicator();
    showError('Page translation failed. Please check your API configuration.');
  }
}

/**
 * Get all text nodes from an element
 * @param {Element} element - Root element to search
 * @returns {Array} Array of text nodes
 */
function getTextNodes(element) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip script, style, and other non-visible elements
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const tagName = parent.tagName.toLowerCase();
        const skipTags = ['script', 'style', 'noscript', 'code', 'pre'];

        if (skipTags.includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip if parent is hidden
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let node;
  while (node = walker.nextNode()) {
    if (node.textContent.trim()) {
      textNodes.push(node);
    }
  }

  return textNodes;
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
