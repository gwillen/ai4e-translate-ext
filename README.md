# AI Translation Extension for Firefox

A Firefox extension that provides intelligent translation of web content using Large Language Models (LLMs). Translate selected text or entire pages with high-quality AI-powered translations.

## 🌟 Features

- **🌐 Whole Page Translation**: Translate entire web pages while preserving HTML structure and formatting
- **📝 Selected Text Translation**: Translate specific text selections, even across multiple HTML elements
- **🎯 Visual Progress Tracking**: Real-time progress indicators with element highlighting and batch visualization
- **⏹️ Translation Control**: Stop button to cancel long-running translations (both in popup and on-page)
- **🎨 Interactive Translation Adjustment**: Click translated text to access different translation styles:
  - Literal Translation (word-for-word accuracy)
  - Natural Translation (fluent, idiomatic)
  - Formal Style (professional language)
  - Casual Style (conversational tone)
  - Custom Prompt (user-defined instructions)
  - Restore Original (undo translation)
- **🧠 Smart Batching**: Groups related text elements for better translation context and accuracy
- **🔄 Continuous Translation**: Automatically translates new content as it appears (lazy loading, infinite scroll, chat apps)
- **🐛 Advanced Debugging**: Comprehensive logging system with detailed translation information:
  - Original text and translation prompts
  - Complete API requests and responses
  - Batch numbers and unique request IDs
  - Final text placement tracking
- **🔧 Flexible API Support**: Works with OpenAI API and compatible services (Anthropic Claude, local models, etc.)
- **⚙️ Comprehensive Options**: Extensive customization through the options page
- **🌙 Dark Mode Support**: Seamless experience in both light and dark themes
- **💾 Whitespace Preservation**: Maintains proper spacing around links and HTML elements
- **🎨 Visual Feedback**: Hover effects, tooltips, and batch grouping visualization
- **🔒 Privacy-Focused**: Your API keys are stored locally in your browser

## 🚀 Installation

### From Firefox Add-ons Store (Coming Soon)
The extension will be available on the Firefox Add-ons store once published.

### Manual Installation (Developer Mode)

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/your-username/ai-translate-extension.git
   cd ai-translate-extension
   ```

2. **Open Firefox and navigate to `about:debugging`**

3. **Click "This Firefox" in the left sidebar**

4. **Click "Load Temporary Add-on"**

5. **Navigate to the extension directory and select the `manifest.json` file**

6. **The extension will be loaded and appear in your extensions list**

## ⚙️ Setup

### 1. Configure API Settings

After installation, you need to configure your AI service:

1. **Click the extension icon** in the toolbar
2. **Click "Settings"** or navigate to the options page
3. **Choose your translation provider:**
   - **OpenAI GPT**: Use `https://api.openai.com/v1/chat/completions`
   - **Anthropic Claude**: Use `https://api.anthropic.com/v1/messages`
   - **Custom API**: Enter your own endpoint

4. **Enter your API key** from your chosen provider
5. **Test the connection** to ensure everything works
6. **Save your settings**

### 2. API Key Setup

#### OpenAI
1. Go to [OpenAI API](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy and paste it into the extension settings

#### Anthropic
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Generate an API key
3. Copy and paste it into the extension settings

#### Custom API
- Ensure your API endpoint accepts OpenAI-compatible requests
- Use the appropriate authentication method

## 📖 Usage

### Text Selection Translation

1. **Select any text** on a webpage
2. **Right-click and choose "Translate Selected Text"**
3. **The selected text is automatically replaced** with the translation in-place

### Full Page Translation

1. **Right-click anywhere on the page** and choose **"Translate Entire Page"**
   - OR click the extension icon and select **"Translate Page"**
2. **Watch the real-time progress** with visual indicators:
   - **Progress overlay** appears in the top-right corner showing completion status
   - **Extension popup** displays detailed progress with batch information
   - **Elements being translated** show a subtle blue pulsing background
   - **Completed elements** are highlighted with green background and colored borders
3. **Observe batch groupings** - elements translated together have matching border colors
4. **Translation completes automatically** with all text replaced in-place

### Context Menu Translation

1. **Right-click on selected text** or anywhere on the page
2. **Choose "Translate Selected Text"** or **"Translate Entire Page"**
3. **View real-time progress** and automatic text replacement

### Quick Translation

1. **Click the extension icon** in the toolbar
2. **Enter text** in the popup's text area
3. **Choose your target language**
4. **Click "Translate"**
5. **Copy the result** to your clipboard

### Interactive Translation Adjustment

1. **After translating text**, hover over translated elements to see tooltips
2. **Click on any translated text** to open the adjustment menu
3. **Choose from 6 different translation styles**:
   - **Literal**: Word-for-word accuracy
   - **Natural**: Fluent and idiomatic
   - **Formal**: Professional language
   - **Casual**: Conversational tone
   - **Custom**: Enter your own instructions
   - **Restore**: Return to original text
4. **The text is re-translated** with your chosen style

### Debugging and Development

1. **Open browser console** (F12) to see detailed logs
2. **View comprehensive translation information**:
   - Original text and context
   - Full translation prompts
   - Complete API requests and responses
   - Batch numbers and unique request IDs
   - Final text placement details
3. **Monitor continuous translation** activity for dynamic content
4. **Track smart batching** decisions and groupings

## 🛠️ Configuration Options

### API Configuration
- **Translation Provider**: Choose between OpenAI, Anthropic, or custom endpoints
- **API Endpoint**: Full URL to your translation service
- **API Key**: Your authentication key
- **Model Name**: Specific model to use (e.g., `gpt-3.5-turbo`, `claude-3-sonnet`)

### Translation Settings
- **Default Target Language**: Language to translate to by default
- **Auto-detect Source Language**: Automatically detect the original language
- **Show Translation Overlay**: Display results in page overlay
- **Preserve Formatting**: Maintain original text formatting
- **Continuous Translation**: Automatically translate new content as it appears on the page

### Advanced Settings
- **Max Tokens**: Maximum response length (100-4000)
- **Temperature**: Translation creativity vs accuracy (0-1)
- **Request Timeout**: How long to wait for responses (5-60 seconds)

### Privacy Settings
- **Save Translation History**: Keep local history of translations
- **Export/Import Settings**: Backup and restore your configuration

## 🔧 Development

### Project Structure
```
ai-translate-extension/
├── manifest.json          # Extension manifest
├── background.js          # Background script
├── content.js            # Content script for page interaction
├── content.css           # Styles for content script
├── popup.html            # Extension popup
├── popup.css             # Popup styles
├── popup.js              # Popup functionality
├── options.html          # Settings page
├── options.css           # Settings styles
├── options.js            # Settings functionality
├── icons/                # Extension icons
└── README.md             # This file
```

### Building for Production

1. **Remove development files** (if any)
2. **Test thoroughly** in Firefox
3. **Zip the extension files**:
   ```bash
   zip -r ai-translate-extension.zip . -x "*.git*" "node_modules/*" "*.DS_Store"
   ```

### Testing

1. **Load the extension** in Firefox developer mode
2. **Test all features**:
   - Text selection translation
   - Context menu integration
   - Popup translation
   - Settings configuration
   - API connectivity

## 🔒 Privacy & Security

- **Local Storage**: All settings and API keys are stored locally in your browser
- **No Data Collection**: The extension doesn't collect or transmit user data
- **Secure API Calls**: All API communications use HTTPS
- **Optional History**: Translation history is optional and stored locally only

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/new-feature`
3. **Make your changes** and test thoroughly
4. **Commit your changes**: `git commit -am 'Add new feature'`
5. **Push to the branch**: `git push origin feature/new-feature`
6. **Create a Pull Request**

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

- **Report bugs**: [GitHub Issues](https://github.com/your-username/ai-translate-extension/issues)
- **Feature requests**: [GitHub Discussions](https://github.com/your-username/ai-translate-extension/discussions)
- **Documentation**: [Wiki](https://github.com/your-username/ai-translate-extension/wiki)

## 🙏 Acknowledgments

- **Firefox WebExtensions API** for providing the extension framework
- **OpenAI**, **Anthropic**, and other AI providers for translation services
- **Contributors** who help improve this extension

## 📊 Roadmap

- [x] **Page translation**: Full webpage translation with visual progress tracking ✅
- [x] **Batch processing**: Intelligent batching with visual feedback ✅
- [ ] **Translation history**: Browse and manage previous translations
- [ ] **Offline support**: Cache frequently translated phrases
- [ ] **Custom prompts**: User-defined translation prompts
- [ ] **Language learning mode**: Enhanced features for language learners
- [ ] **Integration with other services**: Support for more AI providers
- [ ] **Translation memory**: Remember and reuse previous translations
- [ ] **Keyboard shortcuts**: Quick access to translation features

---

**Made with ❤️ for the Firefox community**
