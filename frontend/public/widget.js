(function() {
  'use strict';

  // Get script element and attributes
  var scriptTag = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  // Configuration - allow custom host for development/self-hosting
  var WIDGET_HOST = scriptTag.getAttribute('data-host') || 'https://the-wedding-concierge.vercel.app';

  var accessCode = scriptTag.getAttribute('data-wedding');
  var primaryColor = scriptTag.getAttribute('data-color') || '#f43f5e'; // rose-500 default
  var position = scriptTag.getAttribute('data-position') || 'right'; // 'left' or 'right'

  if (!accessCode) {
    console.error('Wedding Concierge Widget: Missing data-wedding attribute');
    return;
  }

  // Styles
  var styles = document.createElement('style');
  styles.textContent = `
    #wc-widget-container {
      position: fixed;
      bottom: 20px;
      ${position === 'left' ? 'left: 20px;' : 'right: 20px;'}
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    #wc-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${primaryColor};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    #wc-widget-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    #wc-widget-button svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    #wc-widget-button.open svg.chat-icon {
      display: none;
    }

    #wc-widget-button:not(.open) svg.close-icon {
      display: none;
    }

    #wc-widget-iframe-container {
      display: none;
      position: absolute;
      bottom: 70px;
      ${position === 'left' ? 'left: 0;' : 'right: 0;'}
      width: 380px;
      height: 520px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }

    #wc-widget-iframe-container.open {
      display: block;
      animation: wc-slide-up 0.3s ease-out;
    }

    @keyframes wc-slide-up {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    #wc-widget-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    #wc-widget-header {
      background: ${primaryColor};
      color: white;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    #wc-widget-header-title {
      font-weight: 600;
      font-size: 14px;
    }

    #wc-widget-header-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #wc-widget-header-close:hover {
      opacity: 0.8;
    }

    @media (max-width: 480px) {
      #wc-widget-iframe-container {
        width: calc(100vw - 40px);
        height: calc(100vh - 140px);
        bottom: 80px;
        ${position === 'left' ? 'left: 0;' : 'right: -10px;'}
      }
    }
  `;
  document.head.appendChild(styles);

  // Create widget container
  var container = document.createElement('div');
  container.id = 'wc-widget-container';

  // Create iframe container with header
  var iframeContainer = document.createElement('div');
  iframeContainer.id = 'wc-widget-iframe-container';

  var header = document.createElement('div');
  header.id = 'wc-widget-header';
  header.innerHTML = `
    <span id="wc-widget-header-title">Wedding Concierge</span>
    <button id="wc-widget-header-close">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  `;

  var iframe = document.createElement('iframe');
  iframe.id = 'wc-widget-iframe';
  iframe.src = WIDGET_HOST + '/chat/' + encodeURIComponent(accessCode) + '?embed=true';
  iframe.allow = 'clipboard-write';

  iframeContainer.appendChild(header);
  iframeContainer.appendChild(iframe);

  // Create toggle button
  var button = document.createElement('button');
  button.id = 'wc-widget-button';
  button.innerHTML = `
    <svg class="chat-icon" viewBox="0 0 24 24">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
    </svg>
    <svg class="close-icon" viewBox="0 0 24 24">
      <path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" fill="none"/>
    </svg>
  `;

  container.appendChild(iframeContainer);
  container.appendChild(button);
  document.body.appendChild(container);

  // Toggle functionality
  var isOpen = false;

  function toggleWidget() {
    isOpen = !isOpen;
    button.classList.toggle('open', isOpen);
    iframeContainer.classList.toggle('open', isOpen);
  }

  button.addEventListener('click', toggleWidget);

  // Close button in header
  document.getElementById('wc-widget-header-close').addEventListener('click', function(e) {
    e.stopPropagation();
    toggleWidget();
  });

  // Close on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen) {
      toggleWidget();
    }
  });

})();
