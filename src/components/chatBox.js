import '../styles/chatBox.css';
import { sendChatMessage } from '../api/aiApi.js';

export class ChatBox {
  constructor() {
    this.isOpen = false;
    this.isLoading = false;
    this.isTyping = false;
    this.abortTyping = false;
    
    // Check if Chatbox is already initialized to prevent duplicate setups
    if (document.querySelector('.bv-chatbox-wrapper')) {
      return;
    }
    
    this.init();
  }

  init() {
    // 1. Create structure
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'bv-chatbox-wrapper';
    
    // Create Chat Panel
    this.panel = document.createElement('div');
    this.panel.className = 'bv-chatbox-panel';
    
    // Header
    const header = document.createElement('div');
    header.className = 'bv-chatbox-header';
    
    const titleContainer = document.createElement('div');
    titleContainer.className = 'bv-chatbox-title-container';
    
    const title = document.createElement('div');
    title.className = 'bv-chatbox-header-title';
    title.textContent = 'BioVerse AI Tutor';
    
    const badge = document.createElement('span');
    badge.className = 'bv-chatbox-badge';
    badge.textContent = 'Beta';
    title.appendChild(badge);
    
    const subtitle = document.createElement('div');
    subtitle.className = 'bv-chatbox-header-subtitle';
    subtitle.textContent = 'Hỏi đáp kiến thức Sinh học';
    
    titleContainer.appendChild(title);
    titleContainer.appendChild(subtitle);
    
    const actions = document.createElement('div');
    actions.className = 'bv-chatbox-header-actions';
    
    this.newChatBtn = document.createElement('button');
    this.newChatBtn.className = 'bv-chatbox-new-btn';
    this.newChatBtn.textContent = 'Chat mới';
    
    this.closeBtn = document.createElement('button');
    this.closeBtn.className = 'bv-chatbox-close-btn';
    this.closeBtn.textContent = '×';
    
    actions.appendChild(this.newChatBtn);
    actions.appendChild(this.closeBtn);
    header.appendChild(titleContainer);
    header.appendChild(actions);
    
    // Messages Area
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'bv-chatbox-messages';
    
    // Input Area
    const inputContainer = document.createElement('div');
    inputContainer.className = 'bv-chatbox-input-container';
    
    this.textarea = document.createElement('textarea');
    this.textarea.className = 'bv-chatbox-textarea';
    this.textarea.placeholder = 'Hỏi điều gì đó...';
    this.textarea.rows = 1;
    
    this.sendBtn = document.createElement('button');
    this.sendBtn.className = 'bv-chatbox-send-btn';
    this.sendBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    `;
    
    inputContainer.appendChild(this.textarea);
    inputContainer.appendChild(this.sendBtn);
    
    this.panel.appendChild(header);
    this.panel.appendChild(this.messagesContainer);
    this.panel.appendChild(inputContainer);
    
    // Floating Button
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'bv-chatbox-toggle-btn';
    this.toggleBtn.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    
    this.wrapper.appendChild(this.panel);
    this.wrapper.appendChild(this.toggleBtn);
    
    // Inject directly into document.body to avoid breaking grid overlays
    document.body.appendChild(this.wrapper);
    
    // Add default greeting
    this.showGreeting();
    
    // Attach event listeners
    this.setupEventListeners();
  }

  showGreeting() {
    this.messagesContainer.innerHTML = '';
    this.appendMessage('assistant', 'Xin chào! Mình là BioVerse AI Tutor. Bạn có thể hỏi mình về Sinh học, tế bào, ADN, cơ thể người, thực vật, động vật hoặc sinh thái.');
  }

  appendMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `bv-chatbox-message ${sender}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'bv-chatbox-bubble';
    bubble.textContent = text; // Safe rendering to prevent XSS
    
    messageDiv.appendChild(bubble);
    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  async appendAssistantMessageTyped(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'bv-chatbox-message assistant';
    
    const bubble = document.createElement('div');
    bubble.className = 'bv-chatbox-bubble';
    bubble.textContent = ''; // Start empty
    
    messageDiv.appendChild(bubble);
    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
    
    await this.typeText(bubble, text);
  }

  async typeText(element, text) {
    this.isTyping = true;
    this.updateInputState();
    
    // Add flashing cursor styling
    element.classList.add('bv-chatbox-message-typing');
    
    let index = 0;
    const chunkSize = 3; // Type 3 chars at a time for smoother flow
    const delay = 15; // ms
    
    while (index < text.length) {
      if (this.abortTyping) {
        element.classList.remove('bv-chatbox-message-typing');
        this.isTyping = false;
        this.updateInputState();
        return;
      }
      
      const chunk = text.slice(index, index + chunkSize);
      element.textContent += chunk;
      index += chunkSize;
      
      this.scrollToBottom();
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    element.classList.remove('bv-chatbox-message-typing');
    this.isTyping = false;
    this.updateInputState();
    this.textarea.focus();
  }

  showLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'bv-chatbox-message assistant bv-chatbox-loading-indicator';
    
    const bubble = document.createElement('div');
    bubble.className = 'bv-chatbox-bubble bv-chatbox-loading-bubble';
    
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'bv-chatbox-dot';
      bubble.appendChild(dot);
    }
    
    loadingDiv.appendChild(bubble);
    this.messagesContainer.appendChild(loadingDiv);
    this.scrollToBottom();
  }

  removeLoadingIndicator() {
    const indicator = this.messagesContainer.querySelector('.bv-chatbox-loading-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.panel.classList.add('active');
      this.toggleBtn.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      // Auto-focus input on open
      setTimeout(() => this.textarea.focus(), 100);
    } else {
      this.panel.classList.remove('active');
      this.toggleBtn.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      `;
    }
  }

  updateInputState() {
    const disabled = this.isLoading || this.isTyping;
    this.textarea.disabled = disabled;
    this.sendBtn.disabled = disabled;
  }

  setLoading(isLoading) {
    this.isLoading = isLoading;
    this.updateInputState();
    
    if (isLoading) {
      this.showLoadingIndicator();
    } else {
      this.removeLoadingIndicator();
    }
  }

  async sendMessage() {
    const text = this.textarea.value.trim();
    if (!text || this.isLoading || this.isTyping) return;
    
    this.abortTyping = false; // Reset abort flag
    this.appendMessage('user', text);
    this.textarea.value = '';
    this.textarea.style.height = 'auto'; // Reset height
    
    this.setLoading(true);
    
    try {
      const conversationId = localStorage.getItem('bioverse_conversation_id');
      const response = await sendChatMessage({ question: text, conversationId });
      
      this.setLoading(false);
      
      if (response && response.answer) {
        await this.appendAssistantMessageTyped(response.answer);
      }
      
      if (response && response.conversationId) {
        localStorage.setItem('bioverse_conversation_id', response.conversationId);
      }
    } catch (error) {
      this.setLoading(false);
      this.appendMessage('system', 'Mình chưa kết nối được với máy chủ AI. Bạn hãy kiểm tra backend rồi thử lại nhé.');
    }
  }

  startNewChat() {
    this.abortTyping = true;
    localStorage.removeItem('bioverse_conversation_id');
    this.showGreeting();
    this.textarea.value = '';
    this.textarea.style.height = 'auto';
    this.isTyping = false;
    this.isLoading = false;
    this.updateInputState();
    
    // Reset abort flag for subsequent calls
    setTimeout(() => {
      this.abortTyping = false;
    }, 50);
    
    this.textarea.focus();
  }

  setupEventListeners() {
    // Open/Close toggle
    this.toggleBtn.addEventListener('click', () => this.toggle());
    this.closeBtn.addEventListener('click', () => this.toggle());
    
    // New chat button
    this.newChatBtn.addEventListener('click', () => this.startNewChat());
    
    // Send button
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    
    // Textarea auto-resize and keyboard send
    this.textarea.addEventListener('input', () => {
      this.textarea.style.height = 'auto';
      this.textarea.style.height = `${Math.min(this.textarea.scrollHeight, 100)}px`;
    });
    
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }
}
