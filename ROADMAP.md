# Portfolio Roadmap: 5.2 → 10/10

Findings from 7-persona interrogation (FAANG manager, YC partner, staff engineer, startup CTO, recruiter, VC partner, Indian tech manager). Average score: 5.2/10. This is the action plan to fix it.

---

## Phase 1: Fix What's Broken (Week 1)

### Code Bugs (Day 1)
- [x] `reducedMotion` declared but never used in main.js — 3D tilt + magnetic buttons fire on reduced-motion
- [x] Inconsistent null guards — progressBar, nav crash if missing from DOM
- [x] Zero error boundaries — Lenis CDN failure kills entire page
- [x] Color palette reads pink, not wine-red — shift accent from #8B2252 to #8B2035

### Broken Links (Day 1)
- [x] Sentinel GitHub link — confirmed correct (user is collaborator on RockeyyAbraham repo)
- [x] FixMyPrompt "View Source" removed (private repo, 404 for visitors)
- [x] Veridock link grayed out (repo not yet public)

### Content Inconsistencies (Day 1-2)
- [x] GitPulse tag changed from "Active" → "Paused"
- [x] Removed PyTorch and Kubernetes from tech marquee
- [ ] Title "AI Systems Engineer" → "CS Student Building AI Systems" or "AI Engineering Intern"

---

## Phase 2: Add Missing Signals (Week 1-2)

### Resume PDF (Day 2) — **Every persona flagged this**
- [x] Created clean 1-page PDF resume (fixed overclaims from original CV)
- [x] Added download button in hero CTA AND contact section
- [x] Includes: projects, skills, education, experience — ATS-friendly format
- [x] FixMyPrompt moved to #2 position in bento grid (was #4)

### Traction Numbers (Day 2-3)
- [ ] Add real user count to FixMyPrompt (even if 5 users, honest > empty)
- [ ] Add "prompts processed" count if available
- [ ] Replace "1 Live Product" stat with something more concrete

### Team Context (Day 3)
- [ ] Sentinel: add "My role: [specific contribution]" to project page
- [ ] Veridock: reframe from "Freelance AI Engineer" → "AI Engineer — Veridock AI (Contract)"
- [ ] Soften Technologies: add concrete metrics — "Designed X REST APIs serving Y daily requests"

---

## Phase 3: Rewrite Copy for Impact (Week 2)

### Lead with Impact, Not Implementation
Every persona said this. The portfolio describes technology, not solutions.

**Before:** "Cognitive State Objects with BOCPD-based episode segmentation"
**After:** "Persistent memory that reduced agent context loss by 41% vs stateless baselines"

**Before:** "Bayesian genome system, hash-chained action ledger"  
**After:** "Auditable AI agent where every decision is traceable and every parameter is explainable"

**Before:** "6-dimensional quality scoring"
**After:** "Breaks vague goals into executable multi-agent plans"

Apply this pattern to every project description — hero, bento cards, detail pages.

### Specific Rewrites Needed
- [ ] HCR subtitle: lead with the 41% number, explain BOCPD in plain English
- [ ] TARS subtitle: lead with auditability, not jargon
- [ ] Focus area "Stateful Reasoning" card: "zero-latency context restoration" is marketing — cut it
- [ ] About section: "20K-line cognitive runtime with 40+ MCP tools" → lead with what it does for users

---

## Phase 4: Pick ONE Project and Go Deep (Week 2-4)

### The Core Problem
> "Pick ONE project. Kill the other 12. Get 10 users. Charge them money." — YC Partner

> "40 tools, 1 product — that ratio tells the whole story. This person builds tools, not products." — VC Partner

### The Pick: FixMyPrompt
It's already live. It already has payments. It's the shortest path to real traction.

**Week 2:**
- [ ] Get 10 real users (friends, classmates, Reddit, Twitter, Discord communities)
- [ ] Track and display: registered users, prompts processed, challenges completed
- [ ] Add a public metrics dashboard or at minimum display numbers on portfolio

**Week 3:**
- [ ] Get first paying customer (even $1)
- [ ] Collect 3 user testimonials
- [ ] Add testimonials to FixMyPrompt project page

**Week 4:**
- [ ] Write a blog post: "How I Built a Prompt Engineering SaaS as a College Student"
- [ ] Post on dev.to, Medium, Twitter/X, Reddit r/webdev and r/ChatGPT
- [ ] Update portfolio with real numbers

---

## Phase 5: Build Credibility Signals (Month 2)

### Technical Writing (Highest-ROI credibility signal per multiple personas)
- [ ] Blog post 1: "How BOCPD Segments AI Agent Conversations" — deep technical, proves the CS is real
- [ ] Blog post 2: "Building 40+ MCP Tools: What I Learned" — practical, attracts MCP community
- [ ] Blog post 3: "FixMyPrompt: From Zero to [X] Users" — traction narrative
- [ ] Add blog section to portfolio or link to dev.to profile

### Open Source Contribution
- [ ] Find 1 active MCP-related open source project
- [ ] Submit 2-3 meaningful PRs (not typo fixes)
- [ ] Add "Open Source Contributions" to experience section

### Social Proof
- [ ] Build Twitter/X presence in AI tooling space (post about MCP, agent memory, shipping)
- [ ] Engage with MCP community, Claude Code community
- [ ] Get 1 person who isn't a friend to publicly reference your work

---

## Phase 6: Target the Right Market (Month 2-3)

### Primary Target: International Remote AI Companies
The portfolio is already 80% there for this market. 3-5x compensation vs Indian on-site.

- [ ] Apply to 20 companies building on MCP, Claude, AI coding assistants
- [ ] Target: YC-backed AI startups, companies using Claude Code, MCP ecosystem
- [ ] Update contact section: "looking for AI engineering roles" not "internships"
- [ ] Add timezone/availability to portfolio

### Secondary Target: Indian AI Startups
- [ ] Sarvam AI, Krutrim, smaller GenAI companies — they care about builders over DSA
- [ ] If targeting Razorpay/Flipkart tier: grind 300 LeetCode problems (separate workstream)

---

## Phase 7: Portfolio Design Polish (Month 2)

### Staff Engineer Code Fixes
- [ ] Add try/catch around all CDN library initialization
- [ ] Ensure consistent null guards on ALL querySelector results
- [ ] Add `reducedMotion` checks to ALL motion effects (not just animations.js)
- [ ] Consider adding a service worker for offline resilience

### Design Improvements
- [ ] Add dark/light mode toggle (even if dark is default)
- [ ] Add a "What I'm Working On" section with current project status
- [ ] Make FixMyPrompt the #1 or #2 featured project (not #4)
- [ ] Add a "Currently" indicator showing active project

---

## Success Metrics

| Metric | Current | Target (3 months) |
|---|---|---|
| FixMyPrompt users | 0 visible | 50+ |
| FixMyPrompt revenue | $0 visible | $50+ MRR |
| Blog posts published | 0 | 3+ |
| Open source PRs merged | 0 | 3+ |
| Portfolio score (re-eval) | 5.2/10 | 8+/10 |
| Applications sent | 0 | 20+ (international remote) |
| Testimonials/endorsements | 0 | 3+ |
| Resume PDF | missing | present |

---

## What NOT to Do

- Don't add more projects. You have enough. Go deep, not wide.
- Don't optimize for Indian service companies (TCS/Infosys). Waste of talent.
- Don't grind LeetCode unless specifically targeting Razorpay/Flipkart tier.
- Don't add Kubernetes/PyTorch to your stack unless you actually use them.
- Don't invent more terminology. Simplify existing descriptions.
- Don't build another MCP tool. Get users for the ones you have.

---

*Generated from 7-persona brutal interrogation. Scores: FAANG 4/10, YC 5.5/10, CTO 6.5/10, Recruiter 6.5/10, Staff Eng 6.5/10, VC 2/10 (invest) 8/10 (hire), Indian Market 5.5/10. Average: 5.2/10.*
