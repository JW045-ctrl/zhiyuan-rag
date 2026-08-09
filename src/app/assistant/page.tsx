import type { Metadata } from "next";

import { AssistantClient } from "./assistant-client";

export const metadata: Metadata = {
  title: "AI 学习助手｜知源",
  description: "基于大一微积分课程资料回答问题并展示真实检索来源。",
};

export default function AssistantPage() {
  return <AssistantClient />;
}

