---
title: "🚀 From Silent Developer to Open Source Contributor: My 4-Month Journey"
author: zakaria
date: 2025-06-04 22:18:00 +0100
categories: [Career Development, Open Source]
tags: [Open Source, Software Engineering, Career Development, GitLab, JavaScript]
media_subpath: /assets/img/posts/2025-06-04-from-silent-developer-to-open-source-contributor
image: cover.webp
mermaid: true
---

Four months ago, I was that developer who stayed quiet, focused solely on my day job, and never touched open source for about 10 years. Today, I'm sharing an incredible transformation that every software engineer should experience.

## 🌱 The Journey Began Small

It started with tiny personal projects — scratching my own itches, building small tools I needed. Then courage grew:

- 📝 Rails contributions (still learning the ropes — PRs didn't merge, but the feedback was invaluable!)
- 🎨 Jekyll themes for the community
- 💎 Rails gems solving specific problems
- 🦊 GitLab contributions — where everything changed

## 🏆 The GitLab Experience: A Masterclass in Culture

Just earned my GitLab Contributor Level 3 badge 🎉 — but that's just a symbol. The real treasure is discovering GitLab's incredible culture and values.

Every single team I interacted with — from engineering to technical writing, from security to UX — demonstrated the same amazing qualities:

- 🤝 Genuine helpfulness that goes beyond politeness
- 🌍 Inclusive collaboration that welcomes newcomers
- 💡 Thoughtful feedback that elevates your thinking
- 🎯 Mission-driven approach where everyone cares about the bigger picture

Those qualities perfectly reflect GitLab's core values: Collaboration; Results for Customers; Efficiency; Diversity, Inclusion & Belonging; Iteration; and Transparency. So you know their values aren't just words on a wall, they're lived daily by real people who make you feel valued as a contributor, regardless of your experience level.

I even had a few merge requests in GitLab that didn't get merged — but the feedback I received on those MRs was so constructive that it pushed me to refine my approach and iterate faster.

## 📚 What Open Source Really Taught Me

The learning explosion was beyond anything I expected:

### 🔧 Technical Skills:
- Code quality standards that transformed how I write software
- Architecture thinking — seeing systems from multiple perspectives
- Some Testing approaches I never knew existed
- Performance considerations for global-scale applications

### 💬 Communication & Collaboration:
- Asynchronous communication across timezones and cultures
- Technical writing that actually serves users
- Code review etiquette that builds rather than tears down
- Constructive feedback that helps everyone grow

### 🧠 Problem-Solving Approaches:
- User empathy — real people with real pain points
- Constraint thinking — working within existing ecosystems
- Community dynamics — how decisions impact thousands of users
- Iterative improvement over perfect solutions

### 🌍 Global Perspectives:
The diversity of thinking is mind-blowing. Contributors from different countries, backgrounds, and experience levels all bring unique insights that make solutions infinitely better than what any individual could create.

## 🔍 A Real Problem, A Real Solution

During my GitLab contributions, I discovered a recurring issue: dozens of requests for zoom/pan functionality in Mermaid diagrams. The pain was real for anyone working with large, complex diagrams that required detailed exploration — be it system architecture overviews or extensive flowcharts.

The Mermaid team has explicitly indicated that zoom/pan functionality should be provided via an external library rather than added to their base code — see their comment here: https://github.com/mermaid-js/mermaid/issues/4022#issuecomment-1499098685. In other words, they prefer that any enhancements remain decoupled so that upgrading Mermaid itself is uninterrupted.

Existing solutions either required heavy dependencies like D3.js or were too simplistic for real-world use.

## 💡 From Contribution to Innovation

I created comprehensive merge requests for GitLab's platform — but here's where GitLab's amazing culture shined again:

Instead of just saying "no," the technical writing team gave me transformative feedback: (shortly) "This is incredible work, but it's too much new code for our codebase (about 29% new code). Have you considered making it a standalone package that could help the entire ecosystem and would work for GitLab too?"

That suggestion changed everything. 💡

## 📦 The Result: SVG Toolbelt

What started as a GitLab-specific solution became something for everyone:

- 🔗 **Demo:** https://zakariaf.github.io/svg-toolbelt
- 🔗 **GitHub:** https://github.com/zakariaf/svg-toolbelt

Zero dependencies. Full accessibility. Mobile-first. TypeScript native.

Born from real GitLab needs, refined by open source collaboration, now helping the ecosystem make their documentation more accessible.

## 🌟 My Strong Advice to Fellow Developers

**Contribute to open source. Start today.**

Not for your resume (though it helps), but for the incredible learning experience:

- ✅ You'll see how world-class teams actually work
- ✅ You'll learn from developers much smarter than you
- ✅ You'll build real empathy for end users
- ✅ You'll improve code quality through rigorous review
- ✅ You'll discover new approaches to old problems
- ✅ You'll experience true global collaboration

## 🚀 What's Next

This is just the beginning. Open source has shown me a world where:

- 🤝 Collaboration trumps competition
- 📚 Learning never stops
- 🌍 Impact transcends job descriptions
- 💝 Giving back creates unexpected opportunities

To my fellow developers: What's stopping you from making your first contribution? The community is welcoming, the learning is invaluable, and your unique perspective is needed.

To everyone at GitLab: Thank you for showing what incredible culture looks like. Your values, paired with genuine care for contributors and users alike — is truly inspiring. You've created something special! 🙏

**P.S.** — From a small GitLab issue to a published package helping developers worldwide — this is the magic that happens when amazing people collaborate on meaningful problems! ✨

---

## Links:

- 🔗 **SVG Toolbelt Demo:** https://zakariaf.github.io/svg-toolbelt
- 🔗 **NPM Package:** https://www.npmjs.com/package/svg-toolbelt
- 🔗 **GitHub Repository:** https://github.com/zakariaf/svg-toolbelt
- 🔗 **GitLab Profile:** https://gitlab.com/zakaria-fatahi
