# AI Translation Extension for Firefox

A Firefox extension that provides intelligent translation of web content using Large Language Models (LLMs). Translate selected text or entire pages with high-quality AI-powered translations.

## 🌟 Features

- **Smart Text Selection**: Select any text on a webpage and translate it instantly
- **Multiple LLM Support**: Works with OpenAI GPT, Anthropic Claude, and custom API endpoints
- **Context Menu Integration**: Right-click to translate selected text or entire pages
- **Quick Translation Popup**: Translate text directly from the extension popup
- **Multiple Languages**: Support for dozens of languages including English, Spanish, French, German, Japanese, Chinese, Arabic, and more
- **Customizable Settings**: Configure API endpoints, default languages, and translation preferences
- **Privacy-Focused**: Your API keys are stored locally in your browser
- **Modern UI**: Clean, responsive interface with dark mode support

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
2. **Click the translate button** that appears near your selection
3. **View the translation** in the overlay that appears
4. **Copy or replace** the original text with the translation

### Context Menu Translation

1. **Right-click on selected text** or anywhere on the page
2. **Choose "Translate Selected Text"** or **"Translate Entire Page"**
3. **View the results** in the translation overlay

### Quick Translation

1. **Click the extension icon** in the toolbar
2. **Enter text** in the popup's text area
3. **Choose your target language**
4. **Click "Translate"**
5. **Copy the result** to your clipboard

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

- [ ] **Page translation**: Full webpage translation with layout preservation
- [ ] **Translation history**: Browse and manage previous translations
- [ ] **Offline support**: Cache frequently translated phrases
- [ ] **Custom prompts**: User-defined translation prompts
- [ ] **Batch translation**: Translate multiple text selections at once
- [ ] **Language learning mode**: Enhanced features for language learners
- [ ] **Integration with other services**: Support for more AI providers

---

**Made with ❤️ for the Firefox community**
