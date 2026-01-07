'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { startChat, sendMessage, WeddingPreview, registerGuestByAccessCode, verifyGuest } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWidgetProps {
  accessCode?: string;
  weddingPreview?: WeddingPreview;
  embedded?: boolean;
}

// localStorage keys for session persistence
const STORAGE_KEY_PREFIX = 'wedding_chat_';
const getStorageKey = (accessCode: string) => `${STORAGE_KEY_PREFIX}${accessCode}`;

// Session expiry: 1 year (covers wedding planning timeline)
const SESSION_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000;

interface StoredSession {
  guestId: string;
  guestName: string;
  timestamp: number;
}

export default function ChatWidget({ accessCode: initialAccessCode, weddingPreview, embedded = false }: ChatWidgetProps) {
  const [accessCode, setAccessCode] = useState(initialAccessCode || '');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [weddingTitle, setWeddingTitle] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(!!weddingPreview);

  // Returning guest state
  const [rememberedGuest, setRememberedGuest] = useState<{ id: string; name: string } | null>(null);
  const [isVerifyingGuest, setIsVerifyingGuest] = useState(true);

  // Registration form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Dark mode state - respects system preference by default
  const [isDarkMode, setIsDarkMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load dark mode preference and check for remembered guest on mount
  useEffect(() => {
    // Check for stored dark mode preference
    const storedDarkMode = localStorage.getItem('wedding_chat_dark_mode');
    if (storedDarkMode !== null) {
      setIsDarkMode(storedDarkMode === 'true');
    } else {
      // Respect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    }

    // Check for remembered guest session
    const code = weddingPreview?.access_code || initialAccessCode;
    if (code) {
      checkForReturningGuest(code);
    } else {
      setIsVerifyingGuest(false);
    }
  }, [weddingPreview, initialAccessCode]);

  // Check if there's a valid returning guest
  const checkForReturningGuest = async (code: string) => {
    try {
      const stored = localStorage.getItem(getStorageKey(code));
      if (stored) {
        const session: StoredSession = JSON.parse(stored);

        // Check if session is still valid (1 year expiry)
        if (Date.now() - session.timestamp < SESSION_EXPIRY_MS) {
          // Verify guest still exists in backend
          try {
            const verified = await verifyGuest(session.guestId);
            if (verified.valid) {
              setRememberedGuest({ id: verified.guest_id, name: verified.guest_name });
              setIsVerifyingGuest(false);
              return;
            }
          } catch {
            // Guest no longer valid, clear storage
            localStorage.removeItem(getStorageKey(code));
          }
        } else {
          // Expired, remove it
          localStorage.removeItem(getStorageKey(code));
        }
      }
    } catch {
      // Invalid stored data, ignore
    }
    setIsVerifyingGuest(false);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('wedding_chat_dark_mode', String(newMode));
  };

  // Clear remembered guest (user wants to switch)
  const clearRememberedGuest = () => {
    const code = weddingPreview?.access_code || accessCode;
    if (code) {
      localStorage.removeItem(getStorageKey(code));
    }
    setRememberedGuest(null);
  };

  // Save guest to localStorage after successful registration
  const saveGuestSession = (guestId: string, name: string) => {
    const code = weddingPreview?.access_code || accessCode;
    if (code && guestId) {
      const session: StoredSession = {
        guestId,
        guestName: name,
        timestamp: Date.now()
      };
      localStorage.setItem(getStorageKey(code), JSON.stringify(session));
    }
  };

  // Format phone number as user types
  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) {
      setPhone(digits);
    } else if (digits.length <= 6) {
      setPhone(`(${digits.slice(0, 3)}) ${digits.slice(3)}`);
    } else if (digits.length <= 10) {
      setPhone(`(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`);
    } else {
      setPhone(digits.slice(0, 15));
    }
  };

  // Scroll to bottom of chat container only (not the whole page)
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat starts
  useEffect(() => {
    if (sessionId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [sessionId]);

  // Handle registration and start chat for new guests
  const handleRegisterAndStartChat = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const code = weddingPreview ? weddingPreview.access_code : accessCode;
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    try {
      // Register the guest first
      const regResult = await registerGuestByAccessCode(code, {
        name: fullName,
        phone_number: phone,
        email: email || undefined,
      });

      // Save to localStorage
      if (regResult.guest_id) {
        saveGuestSession(regResult.guest_id, regResult.guest_name || fullName);
      }

      // Now start the chat
      const chatResponse = await startChat(code, fullName);
      setSessionId(chatResponse.session_id);
      setWeddingTitle(chatResponse.wedding_title);
      setMessages([{ role: 'assistant', content: chatResponse.greeting }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle start chat for returning guests
  const handleReturnGuestStartChat = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const code = weddingPreview ? weddingPreview.access_code : accessCode;
      const response = await startChat(code, rememberedGuest?.name);
      setSessionId(response.session_id);
      setWeddingTitle(response.wedding_title);
      setMessages([{ role: 'assistant', content: response.greeting }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !sessionId) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await sendMessage(sessionId, userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
    } catch (err) {
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick question buttons
  const quickQuestions = [
    "What's the dress code?",
    "Where should I stay?",
    "What time does it start?",
  ];

  const handleQuickQuestion = (question: string) => {
    if (sessionId && !isLoading) {
      setInputValue(question);
      setMessages(prev => [...prev, { role: 'user', content: question }]);
      setIsLoading(true);
      sendMessage(sessionId, question)
        .then(response => {
          setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
        })
        .catch(() => {
          setError('Failed to send message. Please try again.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  };

  // Dark mode styles
  const darkStyles = {
    bg: isDarkMode ? 'bg-gray-900' : 'bg-white',
    bgSecondary: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
    text: isDarkMode ? 'text-gray-100' : 'text-gray-800',
    textSecondary: isDarkMode ? 'text-gray-400' : 'text-gray-500',
    border: isDarkMode ? 'border-gray-700' : 'border-gray-200',
    input: isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200',
    inputFocus: isDarkMode ? 'focus:bg-gray-700' : 'focus:bg-white',
    userBubble: isDarkMode ? 'bg-rose-600 text-white' : 'bg-rose-600 text-white',
    assistantBubble: isDarkMode ? 'bg-gray-800 text-gray-100 border-gray-700' : 'bg-white text-gray-800 border-gray-100',
  };

  // Loading state while verifying returning guest
  if (isVerifyingGuest) {
    return (
      <div className={`${darkStyles.bg} overflow-hidden ${embedded ? 'h-full flex flex-col justify-center' : 'rounded-2xl shadow-lg'}`}>
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
        </div>
      </div>
    );
  }

  // Registration form screen (when accessed via direct link)
  if (showRegistrationForm && !sessionId) {
    return (
      <div className={`${darkStyles.bg} overflow-hidden ${embedded ? 'h-full flex flex-col justify-center' : 'rounded-2xl shadow-lg'}`}>
        <div className="p-6">
          <div className="text-center mb-6">
            <div className={`w-16 h-16 ${isDarkMode ? 'bg-rose-900/50' : 'bg-rose-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>

            {/* Welcome back message for remembered guests */}
            {rememberedGuest ? (
              <>
                <h3 className={`text-lg font-medium ${darkStyles.text} mb-1`}>
                  Welcome back, {rememberedGuest.name}!
                </h3>
                <p className={`${darkStyles.textSecondary} text-sm`}>
                  Ready to continue chatting?
                </p>
              </>
            ) : (
              <>
                <h3 className={`text-lg font-medium ${darkStyles.text} mb-1`}>
                  Start a Conversation
                </h3>
                <p className={`${darkStyles.textSecondary} text-sm`}>
                  I can help with venue details, accommodations, dress code, and more!
                </p>
              </>
            )}
          </div>

          {/* Form for returning guest - just a button */}
          {rememberedGuest ? (
            <form onSubmit={handleReturnGuestStartChat} className="space-y-4">
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </span>
                ) : (
                  'Continue Chatting'
                )}
              </button>

              <button
                type="button"
                onClick={clearRememberedGuest}
                className={`w-full text-sm ${darkStyles.textSecondary} hover:text-rose-600 transition-colors`}
              >
                Not {rememberedGuest.name}? Click here to change
              </button>
            </form>
          ) : (
            /* Full registration form for new guests */
            <form onSubmit={handleRegisterAndStartChat} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className={`block text-sm font-medium ${darkStyles.text} mb-1`}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors ${darkStyles.input}`}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className={`block text-sm font-medium ${darkStyles.text} mb-1`}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors ${darkStyles.input}`}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className={`block text-sm font-medium ${darkStyles.text} mb-1`}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(555) 123-4567"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors ${darkStyles.input}`}
                  required
                />
                <p className={`text-xs ${darkStyles.textSecondary} mt-1`}>
                  For wedding updates via text
                </p>
              </div>

              <div>
                <label htmlFor="email" className={`block text-sm font-medium ${darkStyles.text} mb-1`}>
                  Email <span className={darkStyles.textSecondary}>(optional)</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors ${darkStyles.input}`}
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !firstName.trim() || !lastName.trim() || !phone.trim()}
                className="w-full py-3 px-4 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Getting Started...
                  </span>
                ) : (
                  'Start Chatting'
                )}
              </button>

              <p className={`text-xs ${darkStyles.textSecondary} text-center`}>
                By continuing, you agree to receive SMS updates about this wedding.
              </p>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Original access code screen (when no weddingPreview)
  if (!sessionId && !weddingPreview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-gradient-to-b from-rose-50 to-white rounded-2xl shadow-lg max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-serif text-gray-800 mb-2">Wedding Assistant</h2>
          <p className="text-gray-600">Enter your access code to get started</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setShowRegistrationForm(true); }} className="w-full space-y-4">
          <div>
            <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-1">
              Access Code
            </label>
            <input
              type="text"
              id="accessCode"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="e.g., smith-jones-2025"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!accessCode}
            className="w-full py-3 px-4 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Continue
          </button>
        </form>
      </div>
    );
  }

  // Chat interface
  return (
    <div className={`flex flex-col ${darkStyles.bg} overflow-hidden ${embedded ? 'h-full' : 'h-[500px] rounded-2xl shadow-lg'}`}>
      {/* Header - hide in embedded mode since parent has header */}
      {!embedded && (
        <div className="bg-gradient-to-r from-rose-600 to-rose-500 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h2 className="font-medium">{weddingTitle}</h2>
                <p className="text-rose-100 text-sm">Wedding Assistant</p>
              </div>
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={messagesContainerRef} className={`flex-1 overflow-y-auto p-4 space-y-4 ${darkStyles.bgSecondary}`}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? `${darkStyles.userBubble} rounded-br-md`
                  : `${darkStyles.assistantBubble} shadow-sm border rounded-bl-md`
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className={`${darkStyles.assistantBubble} rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border`}>
              <div className="flex space-x-1">
                <div className={`w-2 h-2 ${isDarkMode ? 'bg-gray-500' : 'bg-gray-300'} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
                <div className={`w-2 h-2 ${isDarkMode ? 'bg-gray-500' : 'bg-gray-300'} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
                <div className={`w-2 h-2 ${isDarkMode ? 'bg-gray-500' : 'bg-gray-300'} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick questions (show only after first message if not loading) */}
      {messages.length === 1 && !isLoading && (
        <div className={`px-4 py-2 ${darkStyles.bgSecondary} border-t ${darkStyles.border}`}>
          <p className={`text-xs ${darkStyles.textSecondary} mb-2`}>Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleQuickQuestion(question)}
                className={`text-xs px-3 py-1.5 ${darkStyles.bg} border ${darkStyles.border} rounded-full ${darkStyles.textSecondary} hover:border-rose-300 hover:text-rose-600 transition-colors`}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSendMessage} className={`p-4 border-t ${darkStyles.border} ${darkStyles.bg}`}>
        {error && (
          <div className="text-red-600 text-xs bg-red-50 p-2 rounded-lg mb-2">
            {error}
          </div>
        )}
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question..."
            className={`flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors ${darkStyles.input} ${darkStyles.inputFocus}`}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
