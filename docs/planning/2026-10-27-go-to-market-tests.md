# Go-to-market: two tests before December

| | |
|---|---|
| Date | 2026-10-27 |
| Status | **Decided by the founder**: run both tests in parallel; the one that produces advance payment decides the channel |
| Inputs | VC-style critique (2026-10-24), PRD §3 (competitors), Revenue plan §7 (channels), founder's position (2026-10-27) |

## 1. The disagreement, stated fairly

**Founder's position.** Students will pay for a one-click, fully formatted, page-count-correct report with the research done, because doing it in ChatGPT costs them a weekend of pasting and formatting. The student has the pain and is the natural buyer.

**Critique's position.** The pain is real and brief. The cost asymmetry runs against us: a student finishes on a free tier for ₹0 while a grounded report costs us ₹300–500 in model calls. One-click convenience is already sold by InternReport (₹499, claims 10,000 students) and LivoDraft (per page). Our differentiator, "it is about my real project", needs more inputs and review, not fewer clicks. Student acquisition through WhatsApp and ambassadors is expensive and resets every year.

**Agreed.** The student is the user. The product (grounded pipeline, format-driven compiler, approval workflow) does not change under either channel. What is undecided is who pays for acquisition and who pays the invoice.

## 2. Options considered

| Option | Buyer | Why it helps | Why it may fail |
|---|---|---|---|
| A. Students direct | Student, once, ₹499–699 | Owner of the pain; market proven by competitors | Third entrant at a higher price; CAC vs. ₹0 alternative; one purchase ever; seasonal |
| B. Project centres / training institutes | Centre owner, per season, ₹15k–1L | Repeat buyer; 50–300 reports per season; they already hold code, screenshots and formats; distribution built in; no free-preview compute | They may use ChatGPT themselves; small total number of centres; grey-zone businesses |
| C. Departments / colleges | HOD, annual licence | Format compliance, viva banks, rubric scoring; template library becomes a moat | Semester-long procurement; tiny budgets; interns cannot run enterprise sales. Year-two expansion |
| D. Leave academia | Software teams (release notes, audit narratives) | Large recurring TAM | No buyer access; funded incumbents; only if A and B both fail |

**Hybrid under test:** student is user and payer, centre is the channel for a referral cut.

## 3. The two tests (zero engineering)

### Test 1 — student pre-orders
- One landing page: real positioning, 2-minute demo video, **₹499 pre-order for the April–May 2027 season**, refund promise.
- Drive ~500 visitors from two college WhatsApp groups and one ambassador.
- **Pass:** ≥25 paid pre-orders. **Fail:** <10. Between: inconclusive, examine objections.

### Test 2 — project-centre pilots
- List 30 centres across Bengaluru, Belagavi, Hubballi, Mysuru (Google Maps, JustDial).
- Call 20. Ask only: reports per season, who writes them, staff hours per report. No pitch.
- Offer 3 pilots for the April season at **₹15,000 per centre, paid in advance**.
- **Pass:** ≥3 advance payments. **Fail:** 0 of 20.

### Deadline
Both results by **2026-11-30**. Whichever produces advance payment decides the channel for the April season. Both passing → hybrid.

## 4. Engineering decision that cannot wait

Add **organisations** to the data model now: `organizations`, `organization_members` (role: owner / staff), and `projects.organization_id`. A solo student is an organisation of one. B-03 (projects) has not been built, so this is a one-day change today and a painful migration in December. Needed for test 2; harmless for test 1. Contract amendment + ticket B-03a to follow.

Everything else in slice 1 and slice 2 stays as planned. Code and screenshot understanding matter more for centres, not less.

## 5. What would change my mind
- Test 1 clears 25 pre-orders with CAC under ₹150 → student direct is viable; centres become an add-on channel.
- Test 2 produces 3 payments → B2B2C first; the student pre-order page stays as the SEO/referral funnel.
- Both fail → stop building features; spend December on option D customer discovery before writing more code.
