import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

import { MessageResponse } from "./message";

const formulaMarkdown = String.raw`行内公式：函数 $f(x)$ 在 $x=a$ 处展开。

块级公式：
$$
f(x)=\sum_{n=0}^{\infty}\frac{f^{(n)}(a)}{n!}(x-a)^n
$$`;

test("renders inline and display LaTeX with KaTeX", () => {
  const html = renderToStaticMarkup(
    createElement(MessageResponse, null, formulaMarkdown)
  );

  assert.match(html, /class="katex"/);
  assert.match(html, /class="katex-display"/);
  assert.doesNotMatch(html, /\$f\(x\)\$/);
  assert.doesNotMatch(html, /\$\$/);
});

test("keeps Markdown headings, bold text, and lists", () => {
  const html = renderToStaticMarkup(
    createElement(
      MessageResponse,
      null,
      "# 标题\n\n这是 **重点**。\n\n- 第一项\n- 第二项"
    )
  );

  assert.match(html, /<h1>标题<\/h1>/);
  assert.match(html, /<strong>重点<\/strong>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<li>第一项<\/li>/);
});

test("tolerates partial streaming delimiters and renders after completion", () => {
  assert.doesNotThrow(() =>
    renderToStaticMarkup(
      createElement(MessageResponse, {
        children: "函数 $f(x",
        isAnimating: true,
      })
    )
  );
  assert.doesNotThrow(() =>
    renderToStaticMarkup(
      createElement(MessageResponse, {
        children: "**尚未完成",
        isAnimating: true,
      })
    )
  );

  const completedHtml = renderToStaticMarkup(
    createElement(MessageResponse, {
      children: "函数 $f(x)$，以及 **已完成**。",
      isAnimating: false,
    })
  );

  assert.match(completedHtml, /class="katex"/);
  assert.match(completedHtml, /<strong>已完成<\/strong>/);
});
