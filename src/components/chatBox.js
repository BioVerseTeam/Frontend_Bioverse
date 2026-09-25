import '../styles/chatBox.css';
import {
  sendChatMessage,
  getUserConversations,
  getConversationMessages,
  deleteConversation
} from '../api/aiApi.js';
import { recordChatMessage } from '../features/progress/progressService.js';
import { AuthService } from '../features/auth/authService.js';

export class ChatBox {
  constructor() {
    this.isOpen = false;
    this.isLoading = false;
    this.isTyping = false;
    this.abortTyping = false;

    // History & Async race condition state
    this.conversations = [];
    this.activeConversationId = null;
    this.isHistoryOpen = false;
    this.isLoadingHistory = false;
    this.requestToken = 0;
    this.activeFetchController = null;
    
    // Check if Chatbox is already initialized to prevent duplicate setups
    if (document.querySelector('.bv-chatbox-wrapper')) {
      return;
    }
    
    this.init();
  }

  getActiveStorageKey() {
    const user = AuthService.getUser();
    if (user && user.id) {
      return `bioverse_active_conv_user_${user.id}`;
    }
    return 'bioverse_active_conv_guest';
  }

  getActiveConversationId() {
    return localStorage.getItem(this.getActiveStorageKey());
  }

  setActiveConversationId(id) {
    this.activeConversationId = id;
    const key = this.getActiveStorageKey();
    if (id) {
      localStorage.setItem(key, id);
    } else {
      localStorage.removeItem(key);
    }
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
    
    // Top Row: Title + Status + Close
    const topRow = document.createElement('div');
    topRow.className = 'bv-chatbox-header-top';

    const titleBox = document.createElement('div');
    titleBox.className = 'bv-chatbox-header-title-box';

    const title = document.createElement('div');
    title.className = 'bv-chatbox-header-title';
    title.innerHTML = `
      <span class="bv-chatbox-bot-icon">🤖</span>
      <span>BioVerse AI Tutor</span>
    `;
    
    const badge = document.createElement('span');
    badge.className = 'bv-chatbox-badge';
    badge.textContent = 'BETA';
    title.appendChild(badge);
    
    const subtitle = document.createElement('div');
    subtitle.className = 'bv-chatbox-header-subtitle';
    subtitle.innerHTML = `
      <span class="bv-chatbox-status-dot"></span>
      <span>Trợ lý học tập KHTN</span>
    `;

    titleBox.appendChild(title);
    titleBox.appendChild(subtitle);

    this.closeBtn = document.createElement('button');
    this.closeBtn.className = 'bv-chatbox-close-btn';
    this.closeBtn.setAttribute('aria-label', 'Đóng cửa sổ chat');
    this.closeBtn.title = 'Đóng';
    this.closeBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;

    topRow.appendChild(titleBox);
    topRow.appendChild(this.closeBtn);

    // Bottom Row: History & New Chat Buttons
    const actionsRow = document.createElement('div');
    actionsRow.className = 'bv-chatbox-header-actions';

    this.historyToggleBtn = document.createElement('button');
    this.historyToggleBtn.className = 'bv-chatbox-history-toggle-btn';
    this.historyToggleBtn.setAttribute('aria-label', 'Mở lịch sử trò chuyện');
    this.historyToggleBtn.title = 'Lịch sử trò chuyện';
    this.historyToggleBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      <span>Lịch sử</span>
    `;

    this.newChatBtn = document.createElement('button');
    this.newChatBtn.className = 'bv-chatbox-new-btn';
    this.newChatBtn.setAttribute('aria-label', 'Tạo cuộc trò chuyện mới');
    this.newChatBtn.title = 'Chat mới';
    this.newChatBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>Chat mới</span>
    `;

    actionsRow.appendChild(this.historyToggleBtn);
    actionsRow.appendChild(this.newChatBtn);

    header.appendChild(topRow);
    header.appendChild(actionsRow);
    
    // Main Body (Drawer + Content Panel)
    const mainBody = document.createElement('div');
    mainBody.className = 'bv-chatbox-main-body';

    // History Drawer Sidebar
    this.drawer = document.createElement('div');
    this.drawer.className = 'bv-chatbox-drawer';

    const drawerHeader = document.createElement('div');
    drawerHeader.className = 'bv-chatbox-drawer-header';
    drawerHeader.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span>LỊCH SỬ TRÒ CHUYỆN</span>
    `;

    this.drawerContent = document.createElement('div');
    this.drawerContent.className = 'bv-chatbox-drawer-content';
    
    this.drawer.appendChild(drawerHeader);
    this.drawer.appendChild(this.drawerContent);

    // Content Panel
    const contentPanel = document.createElement('div');
    contentPanel.className = 'bv-chatbox-content-panel';

    // Messages Area
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'bv-chatbox-messages';
    
    // Input Area
    const inputContainer = document.createElement('div');
    inputContainer.className = 'bv-chatbox-input-container';
    
    this.textarea = document.createElement('textarea');
    this.textarea.className = 'bv-chatbox-textarea';
    this.textarea.placeholder = 'Hỏi BioVerse AI về Sinh học...';
    this.textarea.rows = 1;
    this.textarea.setAttribute('aria-label', 'Nhập câu hỏi');
    
    this.sendBtn = document.createElement('button');
    this.sendBtn.className = 'bv-chatbox-send-btn';
    this.sendBtn.setAttribute('aria-label', 'Gửi tin nhắn');
    this.sendBtn.title = 'Gửi tin nhắn';
    this.sendBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    `;
    
    inputContainer.appendChild(this.textarea);
    inputContainer.appendChild(this.sendBtn);
    
    contentPanel.appendChild(this.messagesContainer);
    contentPanel.appendChild(inputContainer);

    mainBody.appendChild(this.drawer);
    mainBody.appendChild(contentPanel);

    this.panel.appendChild(header);
    this.panel.appendChild(mainBody);
    
    // Floating Button
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'bv-chatbox-toggle-btn';
    this.toggleBtn.setAttribute('aria-label', 'Mở trợ lý AI BioBot');
    this.toggleBtn.title = 'Trợ lý BioVerse AI';
    this.toggleBtn.innerHTML = `
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span class="bv-chatbox-fab-status-dot"></span>
    `;
    
    this.wrapper.appendChild(this.panel);
    this.wrapper.appendChild(this.toggleBtn);
    
    document.body.appendChild(this.wrapper);
    
    // Read active storage
    this.activeConversationId = this.getActiveConversationId();

    // Default Greeting
    this.showGreeting();
    
    // Event listeners
    this.setupEventListeners();

    // Load initial user state & restore history if logged in
    this.restoreUserSessionHistory();
  }

  showGreeting() {
    this.messagesContainer.innerHTML = '';
    this.appendMessage('assistant', 'Xin chào! Mình là BioVerse AI Tutor – Trợ lý học tập Khoa học Tự nhiên. Bạn có thể hỏi mình về Sinh học, tế bào, cơ thể người, hệ tuần hoàn, ADN, hoặc thực vật nhé!');
  }

  createAvatarElement() {
    const avatar = document.createElement('div');
    avatar.className = 'bv-chatbox-avatar';
    avatar.title = 'BioVerse AI Tutor';
    avatar.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#db3237" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path>
        <rect x="4" y="8" width="16" height="12" rx="4" ry="4"></rect>
        <circle cx="9" cy="13" r="1.5" fill="#db3237"></circle>
        <circle cx="15" cy="13" r="1.5" fill="#db3237"></circle>
        <path d="M9 17c1 1 5 1 6 0"></path>
      </svg>
    `;
    return avatar;
  }

  appendMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `bv-chatbox-message ${sender}`;
    
    if (sender === 'assistant') {
      messageDiv.appendChild(this.createAvatarElement());
    }

    const bubble = document.createElement('div');
    bubble.className = 'bv-chatbox-bubble';
    bubble.textContent = text; // Safe rendering preventing XSS
    
    messageDiv.appendChild(bubble);
    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  async appendAssistantMessageTyped(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'bv-chatbox-message assistant';
    
    messageDiv.appendChild(this.createAvatarElement());

    const bubble = document.createElement('div');
    bubble.className = 'bv-chatbox-bubble';
    bubble.textContent = '';
    
    messageDiv.appendChild(bubble);
    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
    
    await this.typeText(bubble, text);
  }

  async typeText(element, text) {
    this.isTyping = true;
    this.updateInputState();
    
    element.classList.add('bv-chatbox-message-typing');
    
    let index = 0;
    const chunkSize = 3;
    const delay = 15;
    
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
    
    loadingDiv.appendChild(this.createAvatarElement());

    const bubble = document.createElement('div');
    bubble.className = 'bv-chatbox-bubble bv-chatbox-loading-bubble';
    
    const textLabel = document.createElement('span');
    textLabel.className = 'bv-chatbox-loading-label';
    textLabel.textContent = 'BioVerse AI đang suy nghĩ';

    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'bv-chatbox-dots-container';

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'bv-chatbox-dot';
      dotsContainer.appendChild(dot);
    }
    
    bubble.appendChild(textLabel);
    bubble.appendChild(dotsContainer);
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

  toggleDrawer() {
    if (!AuthService.getUser()) {
      alert('Vui lòng đăng nhập để lưu và xem lại lịch sử trò chuyện AI!');
      return;
    }
    this.isHistoryOpen = !this.isHistoryOpen;
    if (this.isHistoryOpen) {
      this.panel.classList.add('drawer-open');
      this.loadUserConversations();
    } else {
      this.panel.classList.remove('drawer-open');
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

  cancelActiveRequests() {
    if (this.activeFetchController) {
      this.activeFetchController.abort();
      this.activeFetchController = null;
    }
    this.abortTyping = true;
    this.isTyping = false;
  }

  async restoreUserSessionHistory() {
    if (!AuthService.getUser()) {
      this.setActiveConversationId(null);
      this.showGreeting();
      return;
    }

    const storedId = this.getActiveConversationId();
    if (!storedId) {
      return;
    }

    try {
      this.activeConversationId = storedId;
      await this.openConversation(storedId, true);
    } catch (e) {
      console.warn('Failed to restore active conversation history:', e);
      this.setActiveConversationId(null);
      this.showGreeting();
    }
  }

  async loadUserConversations() {
    if (!AuthService.getUser()) {
      this.renderDrawerItems([]);
      return;
    }

    this.isLoadingHistory = true;
    this.drawerContent.innerHTML = '<div class="bv-chatbox-history-empty">Đang tải lịch sử...</div>';

    try {
      const paged = await getUserConversations({ limit: 30 });
      this.conversations = paged.items || [];
      this.renderDrawerItems(this.conversations);
    } catch (error) {
      if (error.name === 'AbortError') return;
      this.drawerContent.innerHTML = '<div class="bv-chatbox-history-empty">Không thể tải lịch sử trò chuyện.</div>';
    } finally {
      this.isLoadingHistory = false;
    }
  }

  renderDrawerItems(conversations) {
    this.drawerContent.innerHTML = '';

    // Quick New Chat Button inside Drawer
    const newChatDrawerBtn = document.createElement('button');
    newChatDrawerBtn.className = 'bv-chatbox-drawer-new-btn';
    newChatDrawerBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>+ Cuộc trò chuyện mới</span>
    `;
    newChatDrawerBtn.addEventListener('click', () => this.startNewChat());
    this.drawerContent.appendChild(newChatDrawerBtn);

    if (!conversations || conversations.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'bv-chatbox-history-empty';
      emptyDiv.innerHTML = `
        <div class="bv-chatbox-empty-icon">📖</div>
        <div class="bv-chatbox-empty-title">Chưa có cuộc trò chuyện nào</div>
        <div class="bv-chatbox-empty-desc">Bắt đầu hỏi BioVerse AI để lưu lại lịch sử học tập của bạn.</div>
      `;
      this.drawerContent.appendChild(emptyDiv);
      return;
    }

    // Group into Today, Yesterday, Older
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;

    const todayItems = [];
    const yesterdayItems = [];
    const olderItems = [];

    conversations.forEach(item => {
      const time = new Date(item.updatedAt || item.createdAt).getTime();
      if (time >= todayStart) {
        todayItems.push(item);
      } else if (time >= yesterdayStart) {
        yesterdayItems.push(item);
      } else {
        olderItems.push(item);
      }
    });

    const createGroup = (title, items) => {
      if (items.length === 0) return;

      const groupHeader = document.createElement('div');
      groupHeader.className = 'bv-chatbox-history-group-title';
      groupHeader.textContent = title;
      this.drawerContent.appendChild(groupHeader);

      items.forEach(conv => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `bv-chatbox-history-item ${conv.conversationId === this.activeConversationId ? 'active' : ''}`;
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'bv-chatbox-history-title-text';
        titleSpan.textContent = conv.title || 'Cuộc trò chuyện';
        
        const delBtn = document.createElement('button');
        delBtn.className = 'bv-chatbox-history-delete-btn';
        delBtn.title = 'Xóa cuộc trò chuyện';
        delBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        `;

        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleDeleteConversation(conv.conversationId);
        });

        itemDiv.addEventListener('click', () => {
          this.openConversation(conv.conversationId);
        });

        itemDiv.appendChild(titleSpan);
        itemDiv.appendChild(delBtn);
        this.drawerContent.appendChild(itemDiv);
      });
    };

    createGroup('Hôm nay', todayItems);
    createGroup('Hôm qua', yesterdayItems);
    createGroup('Cũ hơn', olderItems);
  }

  async openConversation(conversationId, isRestoring = false) {
    if (this.isLoading) return;
    
    this.cancelActiveRequests();

    const currentToken = ++this.requestToken;
    this.activeFetchController = new AbortController();
    const signal = this.activeFetchController.signal;

    this.setActiveConversationId(conversationId);
    this.messagesContainer.innerHTML = '';
    this.setLoading(true);

    try {
      const messages = await getConversationMessages(conversationId, { limit: 50, signal });

      // Stale check: if token changed or active conversation ID changed, discard!
      if (currentToken !== this.requestToken || this.activeConversationId !== conversationId) {
        return;
      }

      this.setLoading(false);

      if (!messages || messages.length === 0) {
        this.showGreeting();
        return;
      }

      // Render historical messages instantly without typewriter animation
      messages.forEach(msg => {
        this.appendMessage(msg.role, msg.content);
      });

      if (this.isHistoryOpen) {
        this.renderDrawerItems(this.conversations);
      }
    } catch (error) {
      if (error.name === 'AbortError') return;

      this.setLoading(false);
      if (currentToken === this.requestToken) {
        if (!isRestoring) {
          this.appendMessage('system', 'Không thể xem cuộc trò chuyện này (có thể đã bị xóa hoặc không có quyền).');
        }
        this.setActiveConversationId(null);
        this.showGreeting();
      }
    }
  }

  async handleDeleteConversation(conversationId) {
    if (!confirm('Bạn có chắc chắn muốn xóa cuộc trò chuyện này?')) {
      return;
    }

    try {
      await deleteConversation(conversationId);
      this.conversations = this.conversations.filter(c => c.conversationId !== conversationId);
      
      if (this.activeConversationId === conversationId) {
        this.cancelActiveRequests();
        this.setActiveConversationId(null);
        this.showGreeting();
      }

      this.renderDrawerItems(this.conversations);
    } catch (error) {
      alert('Không thể xóa cuộc trò chuyện: ' + (error.message || 'Lỗi không xác định'));
    }
  }

  async sendMessage() {
    const text = this.textarea.value.trim();
    if (!text || this.isLoading || this.isTyping) return;
    
    this.cancelActiveRequests();
    this.abortTyping = false;

    const targetConvId = this.activeConversationId;
    const currentToken = ++this.requestToken;
    this.activeFetchController = new AbortController();
    const signal = this.activeFetchController.signal;

    this.appendMessage('user', text);
    this.textarea.value = '';
    this.textarea.style.height = 'auto';
    
    this.setLoading(true);
    
    try {
      const response = await sendChatMessage({ question: text, conversationId: targetConvId, signal });
      
      // Stale check
      if (currentToken !== this.requestToken) {
        return;
      }

      this.setLoading(false);
      
      if (response && response.answer) {
        await this.appendAssistantMessageTyped(response.answer);
      }
      
      if (response && response.conversationId) {
        this.setActiveConversationId(response.conversationId);
        
        // Refresh local conversation summary in history array
        const existingIndex = this.conversations.findIndex(c => c.conversationId === response.conversationId);
        const titleSnippet = text.substring(0, 50) + (text.length > 50 ? '...' : '');
        const updatedItem = {
          conversationId: response.conversationId,
          title: existingIndex >= 0 ? this.conversations[existingIndex].title : titleSnippet,
          updatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
          this.conversations.splice(existingIndex, 1);
        }
        this.conversations.unshift(updatedItem);

        if (this.isHistoryOpen) {
          this.renderDrawerItems(this.conversations);
        }
      }

      try {
        recordChatMessage();
        window.dispatchEvent(new CustomEvent('bioverse_progress_updated'));
      } catch (err) {}
    } catch (error) {
      if (error.name === 'AbortError') return;

      if (currentToken === this.requestToken) {
        this.setLoading(false);
        const errorMsg = error.message || 'Mình chưa kết nối được với máy chủ AI. Bạn hãy kiểm tra rồi thử lại nhé.';
        this.appendMessage('system', errorMsg);

        // Clear stale/unauthorized conversation ID if 403 or 404 occurred
        if (targetConvId && (errorMsg.includes('không có quyền') || errorMsg.includes('không tồn tại') || errorMsg.includes('403') || errorMsg.includes('404'))) {
          this.setActiveConversationId(null);
        }
      }
    }
  }

  startNewChat() {
    this.cancelActiveRequests();
    this.setActiveConversationId(null);
    this.showGreeting();
    this.textarea.value = '';
    this.textarea.style.height = 'auto';
    this.isTyping = false;
    this.isLoading = false;
    this.updateInputState();

    if (this.isHistoryOpen) {
      this.renderDrawerItems(this.conversations);
    }
    
    setTimeout(() => {
      this.abortTyping = false;
    }, 50);
    
    this.textarea.focus();
  }

  setupEventListeners() {
    // Open/Close toggle
    this.toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    this.closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    
    // History drawer toggle button
    this.historyToggleBtn.addEventListener('click', () => this.toggleDrawer());

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

    // Support external triggers on the page
    document.querySelectorAll('[aria-label="Mở trợ lý ảo AI BioBot"], [data-open-chat]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.isOpen) {
          this.toggle();
        }
      });
    });

    // Close chatbot when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.isOpen) return;

      const path = e.composedPath ? e.composedPath() : [];
      if (path.includes(this.wrapper) || this.wrapper.contains(e.target)) return;

      const isExternalTrigger = e.target.closest && e.target.closest('[aria-label="Mở trợ lý ảo AI BioBot"], [data-open-chat]');
      if (isExternalTrigger) return;

      this.toggle();
    });

    // Re-check user session history on auth state changes
    window.addEventListener('storage', (e) => {
      if (e.key === 'bioverse_user') {
        this.restoreUserSessionHistory();
      }
    });
  }
}
