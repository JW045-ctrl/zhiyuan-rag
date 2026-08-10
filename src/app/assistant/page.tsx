import type { Metadata } from "next";

import { AssistantClient } from "./assistant-client";

export const metadata: Metadata = {
  title: "项目知识助手｜知源",
  description:
    "面向悦享会员2.0项目资料回答问题，并展示资料依据。",
};

export default function AssistantPage() {
  return <AssistantClient />;
}

