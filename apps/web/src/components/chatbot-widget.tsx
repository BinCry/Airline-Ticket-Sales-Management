"use client";

import { useEffect, useRef, useState } from "react";

import {
  chatbotModeConfig,
  chatbotModeOrder,
  type ChatAuthor,
  type ChatMode,
  type ChatbotAction,
  type ChatbotApiResponse
} from "@/lib/chatbot-shared";

interface WidgetMessage {
  actions?: ChatbotAction[];
  content: string;
  id: string;
  pending?: boolean;
  role: ChatAuthor;
}

function createMessage(
  role: ChatAuthor,
  content: string,
  actions?: ChatbotAction[],
  pending = false
): WidgetMessage {
  return {
    actions,
    content,
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    pending,
    role
  };
}

function createInitialMessages(mode: ChatMode) {
  return [createMessage("assistant", chatbotModeConfig[mode].welcome)];
}

function looksLikeWeatherRequest(content: string) {
  const lowered = content.toLocaleLowerCase("vi-VN");
  const weatherCues = [
    "thời tiết",
    "thoi tiet",
    "nhiệt độ",
    "nhiet do",
    "độ ẩm",
    "do am",
    "gió",
    "gio"
  ];

  return weatherCues.some((weatherCue) => lowered.includes(weatherCue));
}

export function buildPendingLabel(mode: ChatMode, content: string) {
  if (looksLikeWeatherRequest(content)) {
    return "AI đang kiểm tra thời tiết...";
  }

  return mode === "travel" ? "AI đang gợi ý điểm đến..." : "Trợ lý đang trả lời...";
}

export function resolveRequestMode(mode: ChatMode, content: string): ChatMode {
  if (mode === "travel") {
    return mode;
  }

  return looksLikeWeatherRequest(content) ? "travel" : mode;
}

function buildFallbackErrorMessage(mode: ChatMode) {
  if (mode === "travel") {
    return "Mình vừa gặp chút trục trặc khi lấy gợi ý AI. Bạn có thể thử lại với ngân sách, số ngày hoặc điểm khởi hành rõ hơn để mình hỗ trợ tiếp.";
  }

  return "Mình vừa gặp chút trục trặc. Bạn có thể hỏi lại về check-in, hành lý, đổi vé hoặc mở trang hỗ trợ để được tiếp tục trợ giúp.";
}

const starterPromptLimit = 2;

function ResetIcon() {
  return (
    <svg
      aria-hidden="true"
      className="chatbot-icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M20 6v5h-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M4 18v-5h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M6.1 9a7 7 0 0 1 11.8-2.6L20 8.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M17.9 15a7 7 0 0 1-11.8 2.6L4 15.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      aria-hidden="true"
      className="chatbot-icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m21 3-6.8 18-3.6-8.1L3 9.3 21 3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m10.6 12.9 4.1-4.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<ChatMode>("support");
  const [draftByMode, setDraftByMode] = useState<Record<ChatMode, string>>({
    support: "",
    travel: ""
  });
  const [errorByMode, setErrorByMode] = useState<Record<ChatMode, string>>({
    support: "",
    travel: ""
  });
  const [isPendingByMode, setIsPendingByMode] = useState<Record<ChatMode, boolean>>({
    support: false,
    travel: false
  });
  const [messagesByMode, setMessagesByMode] = useState<Record<ChatMode, WidgetMessage[]>>({
    support: createInitialMessages("support"),
    travel: createInitialMessages("travel")
  });
  const conversationRef = useRef<HTMLDivElement | null>(null);

  const activeConfig = chatbotModeConfig[activeMode];
  const activeDraft = draftByMode[activeMode];
  const activeError = errorByMode[activeMode];
  const activeMessages = messagesByMode[activeMode];
  const isPending = isPendingByMode[activeMode];
  const showPromptGrid = !activeMessages.some((message) => message.role === "user");
  const starterPrompts = activeConfig.prompts.slice(0, starterPromptLimit);

  useEffect(() => {
    if (!isOpen || !conversationRef.current) {
      return;
    }

    const conversationElement = conversationRef.current;
    const messageElements = Array.from(
      conversationElement.querySelectorAll<HTMLElement>(".chat-message")
    );
    const latestMessage = messageElements.at(-1);

    if (!latestMessage) {
      return;
    }

    const conversationRect = conversationElement.getBoundingClientRect();
    const latestMessageRect = latestMessage.getBoundingClientRect();
    const latestMessageOffset =
      latestMessageRect.top - conversationRect.top + conversationElement.scrollTop;

    if (latestMessage.dataset.chatRole === "assistant") {
      conversationElement.scrollTop = Math.max(0, latestMessageOffset - 14);
      return;
    }

    conversationElement.scrollTop = Math.max(
      0,
      latestMessageOffset - conversationElement.clientHeight + latestMessageRect.height + 20
    );
  }, [activeMessages.length, activeMode, isOpen, isPending]);

  async function submitMessage(rawContent: string) {
    const content = rawContent.trim();

    if (!content || isPending) {
      return;
    }

    const currentMode = activeMode;
    const requestMode = resolveRequestMode(currentMode, content);
    const userMessage = createMessage("user", content);
    const pendingMessage = createMessage(
      "assistant",
      buildPendingLabel(requestMode, content),
      undefined,
      true
    );
    const outboundMessages = [...messagesByMode[currentMode], userMessage];

    setMessagesByMode((previousState) => ({
      ...previousState,
      [currentMode]: [...previousState[currentMode], userMessage, pendingMessage]
    }));
    setDraftByMode((previousState) => ({
      ...previousState,
      [currentMode]: ""
    }));
    setErrorByMode((previousState) => ({
      ...previousState,
      [currentMode]: ""
    }));
    setIsPendingByMode((previousState) => ({
      ...previousState,
      [currentMode]: true
    }));

    try {
      const response = await fetch("/api/chatbot", {
        body: JSON.stringify({
          messages: outboundMessages.map((message) => ({
            content: message.content,
            role: message.role
          })),
          mode: requestMode
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });

      const data = (await response.json()) as ChatbotApiResponse;

      if (!response.ok || !data.reply) {
        throw new Error("Không nhận được phản hồi hợp lệ từ chatbot.");
      }

      setMessagesByMode((previousState) => ({
        ...previousState,
        [currentMode]: previousState[currentMode].map((message) =>
          message.id === pendingMessage.id
            ? createMessage("assistant", data.reply, data.actions)
            : message
        )
      }));
    } catch {
      setErrorByMode((previousState) => ({
        ...previousState,
        [currentMode]:
          currentMode === "travel"
            ? "Gemini đang bận hoặc chưa phản hồi. Mình đã chuyển sang lời nhắc dự phòng nếu có thể."
            : "Mình chưa xử lý được yêu cầu hỗ trợ này. Bạn thử hỏi lại ngắn gọn hơn nhé."
      }));
      setMessagesByMode((previousState) => ({
        ...previousState,
        [currentMode]: previousState[currentMode].map((message) =>
          message.id === pendingMessage.id
            ? createMessage("assistant", buildFallbackErrorMessage(currentMode))
            : message
        )
      }));
    } finally {
      setIsPendingByMode((previousState) => ({
        ...previousState,
        [currentMode]: false
      }));
    }
  }

  function resetConversation(mode: ChatMode) {
    setMessagesByMode((previousState) => ({
      ...previousState,
      [mode]: createInitialMessages(mode)
    }));
    setDraftByMode((previousState) => ({
      ...previousState,
      [mode]: ""
    }));
    setErrorByMode((previousState) => ({
      ...previousState,
      [mode]: ""
    }));
  }

  return (
    <div className="chatbot-root">
      {isOpen ? (
        <div className="chatbot-panel surface-card">
          <div className="chatbot-header">
            <div className="chatbot-header-copy">
              <div className="chatbot-title-row">
                <strong>Trợ lý AI Vietnam Airlines</strong>
              </div>
              <p>{activeConfig.description}</p>
              <div className="chatbot-mode-switch" role="tablist" aria-label="Chế độ chatbot">
                {chatbotModeOrder.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`chatbot-mode-tab${
                      mode === activeMode ? " chatbot-mode-tab-active" : ""
                    }`}
                    onClick={() => setActiveMode(mode)}
                    aria-selected={mode === activeMode}
                    disabled={isPending}
                  >
                    {chatbotModeConfig[mode].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button
                type="button"
                className="icon-button chatbot-header-icon chatbot-reset-button"
                onClick={() => resetConversation(activeMode)}
                aria-label="Làm mới đoạn chat"
                disabled={isPending}
              >
                <ResetIcon />
              </button>
              <button
                type="button"
                className="icon-button chatbot-header-icon chatbot-close-button"
                onClick={() => setIsOpen(false)}
                aria-label="Đóng trợ lý hỗ trợ"
              >
                ×
              </button>
            </div>
          </div>
          <div
            className={`chatbot-body${showPromptGrid ? " chatbot-body-has-starter" : ""}`}
          >
            <div ref={conversationRef} className="chatbot-conversation">
              {activeMessages.map((message) => (
                <div
                  key={message.id}
                  data-chat-role={message.role}
                  className={`chat-message ${
                    message.role === "assistant"
                      ? "chat-message-bot"
                      : "chat-message-user"
                  }${message.pending ? " chat-message-pending" : ""}`}
                >
                  {message.pending ? (
                    <div className="chat-typing-dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                  ) : null}
                  <p>{message.content}</p>
                  {message.actions && message.actions.length > 0 && !message.pending ? (
                    <div className="chat-message-actions">
                      {message.actions.map((action) => (
                        <a
                          key={`${message.id}-${action.href}`}
                          href={action.href}
                          className="chat-message-action"
                        >
                          {action.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            {showPromptGrid ? (
              <div className="chatbot-starter-panel">
                <div className="chatbot-section-kicker">Gợi ý nhanh</div>
                <div className="chat-prompt-grid">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="prompt-chip"
                      onClick={() => submitMessage(prompt)}
                      disabled={isPending}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {activeError ? <div className="chatbot-status">{activeError}</div> : null}
            <form
              className="chatbot-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void submitMessage(activeDraft);
              }}
            >
              <div className="chatbot-input-wrap">
                <textarea
                  value={activeDraft}
                  onChange={(event) =>
                    setDraftByMode((previousState) => ({
                      ...previousState,
                      [activeMode]: event.target.value
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submitMessage(activeDraft);
                    }
                  }}
                  className="chatbot-input"
                  placeholder={activeConfig.placeholder}
                  rows={showPromptGrid ? 1 : 2}
                />
                <button
                  type="submit"
                  className="chatbot-send-icon-button"
                  aria-label={activeConfig.submitLabel}
                  disabled={isPending || !activeDraft.trim()}
                >
                  <SendIcon />
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        className="chatbot-button"
        onClick={() => setIsOpen((value) => !value)}
      >
        Trợ lý AI
      </button>
    </div>
  );
}
