import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const chatbotStyles = readFileSync(
  new URL("../../src/app/globals.css", import.meta.url),
  "utf8"
);

describe("giao diện chatbot", () => {
  it("giữ bố cục chatbot trong phạm vi chatbot-root", () => {
    expect(chatbotStyles).toMatch(
      /\.chatbot-root\s*\{[^}]*position:\s*fixed;[^}]*display:\s*grid;/s
    );
    expect(chatbotStyles).toMatch(
      /\.chatbot-root \.chatbot-panel\s*\{[^}]*display:\s*flex;[^}]*overflow:\s*hidden;/s
    );
    expect(chatbotStyles).toMatch(
      /\.chatbot-root \.chatbot-body\s*\{[^}]*display:\s*flex;[^}]*min-height:\s*0;/s
    );
    expect(chatbotStyles).toMatch(
      /\.chatbot-root \.chatbot-send-icon-button\s*\{[^}]*position:\s*absolute;/s
    );
  });
});
