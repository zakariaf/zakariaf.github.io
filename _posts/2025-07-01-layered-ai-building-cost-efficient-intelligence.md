---
title: "Layered AI: Building Cost-Efficient Intelligence"
author: zakaria
date: 2025-07-01 16:30:00 +0100
categories: [AI, Software Architecture]
tags: [ai, cost-optimization, multi-provider, batch-processing, free-tier, openai, anthropic, gemini]
media_subpath: /assets/img/posts/2025-07-01-layered-ai-building-cost-efficient-intelligence
image: cover.png
---

When people say **“I used AI in my app,”** it often sounds magical.

But behind the scenes, it’s a game of strategy—especially when it comes to cost.

For one feature, I had to analyze **15,000** code repositories. A quick calculation was alarming: at roughly **€0.15 per repo**, sounds small, right? But multiplied by 15,000, that’s a potential bill of **€2,250**. For a side project I’m building solo? That’s a hard no.

So I had to find a smarter way. Instead of accepting that cost, I built a **multi-provider AI system** to get the job done for **under €150**. Here’s how the tiered strategy worked:

## Layer 1: The Free Foundation (The first 80%)

I started with Google’s **Gemini 2.5 Flash**. Its powerful free tier (currently ~500 requests/day) is perfect for creating a cost-effective baseline analysis across the entire dataset. It handled **80%** of the repositories without costing a cent.

> **Catch:** Processing all 15,000 repos this way would take about **30 days**. For a background task, it’s a perfect first step—but some analyses required a second pass with a different model.

## Layer 2: The Quality-Driven Escalation

No single model is perfect for every task. For repos where the initial analysis needed more nuance, my system **automatically escalated** the job to the best model for that specific challenge:

- **Anthropic’s Claude 4 Sonnet** for deep, structured reasoning on complex code.
- **OpenAI’s GPT-o4 mini** for creative problem-solving and edge cases.

This matching of problem complexity to model strength shrank the “hard” set down to about **3,000 repos**, reducing the potential cost to **€450**.

## Layer 3: The Final Cost Cut (Optimizing the paid batch)

For this smaller paid batch, I used **Batch APIs** (offered by both OpenAI and Anthropic) to process jobs asynchronously with roughly a **50% discount**.

✅ **Final Bill:** That €450 cost dropped to **~€225**.

---

It’s not just about using AI. It’s about **architecting intelligent, adaptable systems** that use the right tool for the right job. By:

1. **Starting Free**
2. **Escalating Smartly**
3. **Optimizing Every Paid Call**

you can turn a project that seems financially impossible into something completely achievable.

**Start free, escalate smartly, and always optimize your paid usage.**
