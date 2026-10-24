# Recomp 83: the audited build prompt

This is the prompt the app was built from. It is the original brief after a scientific
audit. Part 1 lists every change and the reason for it. Part 2 is the full revised prompt.
Part 3 is the reference list.

The projection figures quoted here come from the app's own engine
(`src/lib/physiology.ts`, run through `scripts/audit.ts`). If you change the engine,
re-run `npm run audit` and update them.

---

## Part 1: What the audit changed, and why

### A. Arithmetic that didn't add up

| # | Original | Revised | Why |
|---|---|---|---|
| A1 | Start body fat **39.2%** | **40.8%** | 46.5 kg ÷ 114.0 kg = 40.8%. A figure of 39.2% would mean 44.7 kg of fat. The FFM (67.5 kg) and FFMI (23.4) were already consistent with 46.5 kg of fat. |
| A2 | Target body fat 18.5–20.5% | **18.7–20.5%** | 15.5 ÷ 83 = 18.7%. |
| A3 | Crash-diet FFMI 19.5 | **19.6** | 56.5 ÷ 1.70² = 19.55. |
| A4 | Mode 2 Phase 1: 170 P / 110 C / **40 F** = "1,500 kcal" | 170 / 110 / **42 F** = 1,498 kcal | The original macros add up to 1,480 kcal. |
| A5 | "1,000 mg sodium (½ tsp salt)" | "1,000 mg sodium (a **scant** ½ tsp)" | One teaspoon of table salt holds about 2,300 mg sodium, so ½ tsp is about 1,150 mg. |
| A6 | Creatine holds "~2 kg" of water | "~1–2 kg"; the model adds +1.0 kg over weeks 1–4 | Loading gives about 1–2 kg. At 5 g/day with no loading, muscles saturate in about 4 weeks and the typical gain is 0.5–1.5 kg (Kreider 2017). |

### B. The projection model

| # | Change | Why |
|---|---|---|
| B1 | **Energy density now depends on what is lost.** The model tracks fat mass and fat-free mass separately. It uses Hall's energy densities (fat 9,440 kcal/kg, lean 1,816 kcal/kg) and a Forbes partition, reduced by a *lean-protection* factor for lifting plus protein. | The usual "7,700 kcal per kg" rule quietly assumes about a quarter of the weight lost is lean tissue. Keeping the muscle is this plan's whole point. If he keeps it, nearly every kilo lost is fat, which holds about 8,800–9,300 kcal per kg, so **the scale moves slower than the 7,700 rule says**. The same partition with zero protection reproduces the prompt's own crash benchmark: an untrained Forbes path to 73 kg lands at 56.6 kg FFM and 16.4 kg fat, against the prompt's 56.5 and 16.5. |
| B2 | Creatine water is in the curve: +1.0 kg, phased in over weeks 1–4. | Without it, the weigh-ins look "behind" the projection in month 1 when they aren't. |
| B3 | Refeed weeks are in the curve: 2 days at 2,200 kcal. | They slightly reduce that week's deficit. |
| B4 | The 10% adaptive dampening is kept, phased in over weeks 1–4. It now explicitly covers three things: lower resting metabolism, less NEAT and a lower thermic effect of food. | After weight loss, people burn 10–15% less than their new body size predicts (Rosenbaum & Leibel 2010). |
| B5 | Weekly Mifflin-St Jeor recompute: kept. | The equation is the most accurate one for obese adults (Frankenfield 2005). Even so, an individual can sit 10–15% either side of it. |
| B6 | Weigh-ins are plotted with a **7-day trend line**. Every decision (the Phase 2 switch, all alerts) uses the 7-day average, never a single weigh-in. | Day-to-day water swings of ±1–2 kg are normal. |
| B7 | **Model check from about week 5.** Logged intake and the weight trend give an observed TDEE, with the known flush and creatine water taken out of the trend first. It shows ± its uncertainty, and offers one-tap recalibration only when the gap to the equation is bigger than twice that uncertainty. | It replaces the population equation with his own data once there's enough of it. "Enough" matters: a slope from 10 days of normal scale noise (±0.5 kg) is only good to about ±17%, and creatine water arriving in weeks 3–4 alone makes the burn read about 10% low. Both were caught by the audit's synthetic-client tests. |

### C. The timeline doesn't hold, so it's now shown honestly

Run with the brief's own assumptions (Mifflin-St Jeor × 1.375, 10% adaptation, 2.2 kg
early water loss), plus B1–B3:

| Plan | Week 26 projection | Reaches 83 kg | Composition at 83 kg |
|---|---|---|---|
| Mode 1 (strict 1,200 kcal / 120 g protein) | **≈ 88 kg** | ≈ week **32** | ≈ 63–64 kg FFM, 19–20 kg fat (≈ 23–24% BF) |
| Mode 1 with the Protein+ swap | ≈ 88 kg | ≈ week 33 | a little more FFM, a little less fat |
| Mode 2 (1,500 → 1,800 kcal, switch at 97 kg) | **≈ 95 kg** | ≈ week **59** (Phase 2 starts ≈ week 23) | ≈ 64 kg FFM, 19 kg fat (≈ 23% BF) |

Why: reaching 83 kg with the muscle kept means losing about 30 kg of fat, which is
about 280,000 kcal. Mode 1's average deficit is about 1,100 kcal/day, so that takes about
36 weeks. The original "83 kg in 20–26 weeks" only works if his real TDEE is about 10%
above the equation's estimate (that's within normal error, and the model check will show
it), or if a good part of the loss is muscle, which is exactly what the 73 kg crash diet
does.

**Revised:** treat 20–26 weeks as the protocol block and 83 kg as the destination. The
app shows each mode's week-26 weight and its ETA to 83 kg, then recalibrates from his own
data. **Don't shorten the timeline by going below 1,200 kcal without medical
supervision.** The Phase 2 switch weight is now a setting. Moving it from 97 kg to 90 kg
takes about 7 weeks off Mode 2.

### D. The composition target, stated honestly

- The prompt's 83 kg band (66.0–67.5 kg FFM, 15.5–17.0 kg fat) is the **best case**. It
  needs about 90% or more lean protection: every lift done, protein hit, creatine taken,
  plus some beginner muscle gain.
- The model's central estimate at 83 kg is about 63–64 kg FFM and 19–20 kg fat. That is
  still **+7 kg of FFM over the crash-diet body at about the same fat**, so the "83 beats
  73" message holds. The gauge shows the benchmark, the best-case band and his own
  projection side by side.
- A carb-restricted diet drains glycogen, so a scan reads FFM 1–2 kg low even with no
  muscle lost. Creatine offsets about 1 kg of that.

### E. Nutrition: safety and effectiveness

| # | Change | Why |
|---|---|---|
| E1 | **"Before you start" GP check.** Blood pressure; bloods (HbA1c, lipids, liver, kidney, uric acid); a medication review. | BMI 39.4 and a deficit of about 57% of TDEE. Blood-pressure and glucose-lowering medicines often need reducing as weight falls. SGLT2 inhibitors plus low carbs is a known risk. 1,200 kcal is below the guideline starting range for men, 1,500–1,800 kcal (Jensen 2014). It can still be run, but with a doctor involved. |
| E2 | **Fat bolus every day**: one meal with ≥ 15 g fat, on lifting days too, not only rest days. A **rapid-loss alarm** fires if the 7-day trend falls faster than 1.5 kg/week after week 2. | The gallbladder needs about 10 g or more of fat in a meal to empty properly (Festi 1998; Stokes 2014). Gallstone risk climbs steeply above 1.5 kg/week (Weinsier 1995). If fast loss persists, he should ask his GP about ursodeoxycholic acid. |
| E3 | **Protein+ swap** for Mode 1: 140 g protein, 20 g fewer carbs, same calories. It's one tap. The client's 120 g stays the default. | 120 g is 1.05 g/kg of body weight, or 1.8 g/kg of FFM. That's the low end for a deficit this large. Contest-prep guidance is 2.3–3.1 g/kg FFM (Helms 2014), and higher protein kept more lean mass in a 40% deficit (Longland 2016). |
| E4 | Inside the 12:00 window: **3 protein feeds of ≥ 35–40 g**. | Time-restricted eating adds no fat loss on top of the calorie deficit (Liu 2022). In one trial it cost lean mass when protein was low (Lowe 2020). It's an adherence tool. |
| E5 | Pre-workout wording: dizziness on a low-carb diet usually comes from low blood volume, as sodium and water are lost. It's rarely low blood sugar in non-diabetics. Skip the salt (or ask a GP) with high blood pressure, BP medicines, or kidney or heart disease. On glucose-lowering medicines, low blood sugar **is** a real risk, so see the GP first. | It's the correct mechanism, plus the contraindications. |
| E6 | Creatine: avoid with kidney disease. **Tell the GP before blood tests**: it raises serum creatinine, which can make eGFR read low. | Kreider 2017. |
| E7 | **Diet breaks** stay at weeks 7 and 14, and **week 21** is added to cover a 26-week block. Protein stays at the mode's target during a refeed, carbs stay at 300 g, and fat makes up the rest. The banner warns that the scale will rise 1–2 kg from water for 2–4 days. | A 48-hour refeed refills glycogen, improves training and gives a mental break. Hormonal "reset" claims for leptin and T3 are weak and short-lived (Campbell 2020; Dirlewanger 2000). The evidence-backed metabolic option is a 1–2 week break at maintenance (Byrne 2018, MATADOR). The app mentions it. |
| E8 | New checklist items: **daily fat bolus, protein feeds, multivitamin, steps ≥ 7,000, sleep ≥ 7 h**. | Micronutrients are hard to cover at 1,200 kcal. Lost NEAT is the biggest part of metabolic adaptation, and walking defends it with no "workout" involved. Sleeping 5.5 h instead of 8.5 h meant 55% less fat lost and 60% more lean lost (Nedeltcheva 2010). |

### F. Training

| # | Change | Why |
|---|---|---|
| F1 | **Progression rule.** The brief said "≥ 10 reps on both sets", which can't work for the 6–8 rep exercises. Now it's double progression at the top of each exercise's own range: 8 for 6–8, 10 for 8–10, 12 for 10–12. | A fixed 10-rep trigger would leave the main presses badly under-loaded. |
| F2 | Load jumps by exercise: **+5 kg** for lower-body compounds, **+2.5 kg** for upper-body compounds and isolations, **+1.25 kg** (the smallest pin step) for lateral raises. | +5 kg on a 20 kg lateral raise is a 25% jump. |
| F3 | Dip warning: "CNS" became "fatigue/glycogen", and the warning now also asks about sleep. The trigger is 3 or more fewer total reps at the same or lighter load than the previous session. | "CNS fatigue" isn't what limits a 2-set session. Glycogen, sleep and the deficit are. |
| F4 | Rest: **2.5 min for compounds**, as specified, with a +30 s button. **2 min for isolations**, 90 s between superset rounds. | Rest beyond about 90–120 s adds little for isolation work (Singer 2024), and the shorter rests keep the session under 35 minutes. |
| F5 | The first exercise gets a **second ramp-up set** (75% × 4). | Going from 50% straight to a 1-RIR leg-press set is a big jump. |
| F6 | **RIR calibration tip** for weeks 1–3: take the last set until rep speed clearly slows. | Beginners stop 3–5 reps short of where they think they are (Zourdos 2016). |
| F7 | 2–3 s lowering, no bouncing. | Safer, and more tension per rep. |
| F8 | A/B alternation follows **the last session completed**, not the calendar. | A missed day doesn't unbalance the split. |
| F9 | The swap lists leave out Smith machines (a barbell) and assisted pull-ups (where progress means *less* weight). | They break the brief's rules and the progression logic. |

### G. Tracking additions

- **Waist (optional)** gives waist-to-height ratio, with a goal under 0.5 (Ashwell 2012).
  It's the best non-scale marker while creatine and refeeds move water around.
- **Scan body-fat % (optional)**, from DEXA or BIA, plots his actual FFM and fat against the projection.
- A weigh-in protocol tip: morning, after the toilet, before food, same clothes.

---

## Part 2: The revised prompt (as built)

> Build a complete, mobile-first web application for a client's 20-to-26-week Body
> Recomposition and Weight Loss protocol.

### 1. Tech stack and architecture
- React 19 + Vite 7 + TypeScript, Tailwind CSS 4, Lucide icons, Recharts 3 for the weight
  and body-composition curves.
- All state lives in `localStorage`: profile, settings, weigh-ins, macro logs, checklist,
  workout logs and machine swaps. It's versioned, with an **Export / Import JSON** backup
  in Settings, so the app runs as a static deployment (GitHub Pages) with no backend.
  Vite `base: './'` means it works from any sub-path.
- A high-contrast, clean, tactical dark UI: slate-950 background with emerald, amber and
  cyan accents. Tap targets are at least 44 px and clutter is kept to a minimum, under an
  "In & Out in 35 Minutes" philosophy. A bottom tab bar respects the safe area.

### 2. Client profile and physiology engine
- **Baseline profile, editable in Settings:** male, 27, 170 cm, 114.0 kg (BMI 39.4),
  activity multiplier 1.375 (lifting 3×/week), goal 83 kg, a 26-week block.
- **Starting composition:** 67.5 kg FFM and 46.5 kg fat (**40.8%** BF; FFMI 23.4).
- **"Why 83 kg beats 73 kg" gauge** on the Dashboard. It compares:
  1. **Crash-dieted 73 kg benchmark:** 56.5 kg FFM, 16.5 kg fat (22.6% BF, FFMI **19.6**).
     This is an untrained Forbes path, labelled depleted, narrow-shouldered and "skinny-fat".
  2. **Target power-recomp 83 kg (best case):** 66.0–67.5 kg FFM, 15.5–17.0 kg fat
     (**18.7**–20.5% BF, FFMI 22.8–23.4), labelled thick, broad V-taper.
  3. **His projection at 83 kg** from the model at current settings, as the honest central estimate.
- **Dynamic weekly projection:**
  - BMR by Mifflin-St Jeor: `10·kg + 6.25·170 − 5·27 + 5` = 2,072.5 kcal at 114 kg.
    TDEE = BMR × 1.375 = 2,850 kcal.
  - Recomputed every week from the projected weight, so BMR falls 10 kcal per kg lost.
    A 10% adaptive dampening (adaptive thermogenesis, NEAT and TEF) is phased in over
    weeks 1–4. Water: −2.2 kg glycogen flush over weeks 1–2, and +1.0 kg creatine water
    over weeks 1–4 when creatine is on. Refeed weeks are included.
  - Tissue change per week = 7 × deficit ÷ energy density. Energy density = p·1,816 +
    (1−p)·9,440 kcal/kg, where p (the lean share) = 10.4 ÷ (10.4 + fat kg) × (1 − lean
    protection). Lean protection defaults to 60% in Mode 1, 65% with Protein+, and 70% in
    Mode 2; it can be overridden in the Simulator.
  - The chart shows (1) the projected trajectory, (2) actual weigh-ins as points with a
    7-day trend line, and (3) the 83 kg goal line, with refeed weeks marked. It also shows
    the week-26 projection and the ETA to 83 kg.
  - **Model check (from about week 5: 20+ days of weigh-ins after Day 15, 14+ logged
    days):** observed TDEE = average logged intake − (water-corrected) weight-trend
    slope × energy density, ± the slope's standard error. When the gap is bigger than
    twice that, one tap applies it as a calibration factor, clamped to 0.85–1.15.

### 3. Two nutrition modes and macro cycling
1. **Mode 1: the client's strict 1,200 kcal / 120 g protein plan (default)**
   - **Lifting days** (Mon/Wed/Fri, about 1,195 kcal): 120 P / 100 C / 35 F. Carbs sit on
     either side of the workout: 45 g about 60 minutes before, 35 g after.
   - **Rest days** (about 1,190 kcal): 120 P / 65 C / 50 F, as two meals with a 15–20 g
     fat bolus each.
   - **Protein+ swap (recommended, calorie-neutral):** 140 P, with carbs at 80 g on lifting
     days and 45 g on rest days.
2. **Mode 2: the two-phase recomp upgrade (recommended toggle)**
   - **Phase 1 (until the 7-day average ≤ 97 kg):** about 1,500 kcal: 170 P / 110 C / **42** F.
   - **Phase 2 (97 → 83 kg):** about 1,800 kcal: 180 P / 160 C / 48 F.
   - The switch weight can be set (default 97 kg). The Simulator shows the trade-off: more
     muscle kept, a much later 83 kg.
- Meal timing is generated from the targets. The window opens at 12:00. On lifting days
  carbs go 45 g before and 35 g after, and the rest of the protein, carbs and fat is split
  so that one meal always carries the ≥ 15 g fat bolus. A workout before 13:00 turns the
  pre-workout snack into the meal that opens the window.
- **Macro log:** an "Ate the plan" button, quick-add chips and exact entry, with progress
  bars and a 7-day history.
- **Daily action checklist** (per day, saved): the window opens at 12:00 · on lifting days,
  60 min before: 1,000 mg sodium (a scant ½ tsp salt) + 500 mL water + 45 g carbs ·
  creatine 5 g + multivitamin · a ≥ 15 g fat-bolus meal · 3 protein feeds of ≥ 35–40 g ·
  steps ≥ 7,000 · slept 7 h+. Each item has a one-line "why".
- **Diet break alerts** at **weeks 7, 14 and 21**: a 48-hour refeed at 2,200 kcal with
  protein at the mode's target (at least 120 g), 300 g carbs and fat making up the rest,
  plus an "expect +1–2 kg of water" note and the evidence in one line.
- **Safety:** a "Before you start" GP card (dismissible, and it can be brought back) with
  red-flag symptoms, the gallstone rate alarm, and caveats for sodium and creatine.

### 4. The "I hate working out" 35-minute machine protocol (3×/week)
- **Rules shown in the UI:** machines only (pin, plate or cable), so no barbells and no
  spotters. 1 warm-up set at 50% (plus a 75% × 4 ramp set on the first exercise), then
  **2 hard working sets** to **1 RIR**, lowered over 2–3 s. 5 machines, 35-minute cap.
  Rest is 2.5 min on compounds and 2 min on isolations. A floating countdown starts
  automatically when a set is checked, with −15/+30/skip buttons and vibration at zero.
  V-taper priority: keep the legs, build lats, side delts and upper chest.
- **A/B alternation** follows the last completed session (A/B/A then B/A/B on Mon/Wed/Fri),
  and either session can be picked by hand.
  - **Session A (V-taper width and quad retention):** seated leg press 2×6–8 · incline
    chest press 2×6–8 · wide/neutral lat pulldown 2×8–10 · seated leg curl 2×8–10 · seated
    lateral raise machine 2×10–12.
  - **Session B (upper-back density and shoulder press):** chest-supported machine row
    2×6–8 · seated machine shoulder press 2×6–8 · hack or pendulum squat 2×6–8 · pec deck
    2×8–10 · preacher curl machine + cable pushdown superset 2×8–10 each, 90 s between rounds.
- **Smart features:**
  - **"Machine busy / I hate this machine" swap:** one tap cycles through equivalent pin,
    plate and cable alternatives. The choice is remembered, and progression is tracked per machine.
  - **Auto-progression badge (double progression):** if both working sets reached the top
    of that exercise's range last time, the weight input turns green with "Move the pin
    down 1 plate (+X kg) today", where X is 5 kg for lower-body compounds, 2.5 kg for
    upper-body work and 1.25 kg for lateral raises.
  - **Dip warning:** if total reps fell by more than 2 against the previous session at the
    same or a lighter load: "Fatigue/glycogen dip detected: keep the weight the same and
    check pre-workout carbs + sodium and last night's sleep."
  - A session clock against the 35-minute cap, autosave mid-session, and session history.

### 5. Deliverables and verification
1. Clean component separation: `DashboardView`, `WorkoutLoggerView`, `NutritionCycleView`
   and `RecompSimulatorView`, with a pure `lib/` engine (physiology, nutrition, workouts,
   stats, storage, demo).
2. Realistic Week 1 demo data on first launch: 6–7 weigh-ins following the projection, 3
   sessions (A/B/A) and macro logs. It shows green progression badges on several machines
   and one dip warning (lat pulldown). The header has a **"Reset to Day 1 (114.0 kg)"**
   button, with a confirm step and a nudge to export first. Settings can reload the demo.
3. `npm run build` (tsc + vite) and `npm run lint` pass with zero errors. The engine audit
   script reproduces the numbers in this document. The layout is checked at 375 px.

---

## Part 3: References

1. Mifflin MD, St Jeor ST, et al. A new predictive equation for resting energy expenditure in healthy individuals. *Am J Clin Nutr.* 1990;51:241–7.
2. Frankenfield D, Roth-Yousey L, Compher C. Comparison of predictive equations for resting metabolic rate in healthy nonobese and obese adults: a systematic review. *J Am Diet Assoc.* 2005;105:775–89.
3. Hall KD. What is the required energy deficit per unit weight loss? *Int J Obes.* 2008;32:573–6.
4. Forbes GB. Body fat content influences the body composition response to nutrition and exercise. *Ann N Y Acad Sci.* 2000;904:359–65.
5. Hall KD. Body fat and fat-free mass inter-relationships: Forbes's theory revisited. *Br J Nutr.* 2007;97:1059–63.
6. Rosenbaum M, Leibel RL. Adaptive thermogenesis in humans. *Int J Obes.* 2010;34 Suppl 1:S47–55.
7. Weinheimer EM, Sands LP, Campbell WW. A systematic review of the separate and combined effects of energy restriction and exercise on fat-free mass in middle-aged and older adults. *Nutr Rev.* 2010;68:375–88.
8. Cava E, Yeat NC, Mittendorfer B. Preserving healthy muscle during weight loss. *Adv Nutr.* 2017;8:511–9.
9. Bryner RW, et al. Effects of resistance vs. aerobic training combined with an 800 calorie liquid diet on lean body mass and resting metabolic rate. *J Am Coll Nutr.* 1999;18:115–21.
10. Longland TM, et al. Higher compared with lower dietary protein during an energy deficit combined with intense exercise promotes greater lean mass gain and fat mass loss. *Am J Clin Nutr.* 2016;103:738–46.
11. Helms ER, Aragon AA, Fitschen PJ. Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation. *J Int Soc Sports Nutr.* 2014;11:20.
12. Krieger JW, et al. Effects of variation in protein and carbohydrate intake on body mass and composition during energy restriction: a meta-regression. *Am J Clin Nutr.* 2006;83:260–74.
13. Weinsier RL, Wilson LJ, Lee J. Medically safe rate of weight loss for the treatment of obesity: a guideline based on risk of gallstone formation. *Am J Med.* 1995;98:115–7.
14. Festi D, et al. Gallbladder motility and gallstone formation in obese patients following very low calorie diets. Use it (fat) to lose it (well). *Int J Obes.* 1998;22:592–600.
15. Stokes CS, et al. Ursodeoxycholic acid and diets higher in fat prevent gallbladder stones during weight loss: a meta-analysis of randomized controlled trials. *Clin Gastroenterol Hepatol.* 2014;12:1090–100.
16. Kreider RB, et al. ISSN position stand: safety and efficacy of creatine supplementation in exercise, sport, and medicine. *J Int Soc Sports Nutr.* 2017;14:18.
17. Byrne NM, et al. Intermittent energy restriction improves weight loss efficiency in obese men: the MATADOR study. *Int J Obes.* 2018;42:129–38.
18. Campbell BI, et al. Intermittent energy restriction attenuates the loss of fat free mass in resistance trained individuals. *J Funct Morphol Kinesiol.* 2020;5:19.
19. Peos JJ, et al. Continuous versus intermittent dieting for fat loss and fat-free mass retention in resistance-trained adults: the ICECAP trial. *Med Sci Sports Exerc.* 2021;53:1685–98.
20. Dirlewanger M, et al. Effects of short-term carbohydrate or fat overfeeding on energy expenditure and plasma leptin concentrations in healthy female subjects. *Int J Obes.* 2000;24:1413–8.
21. Lowe DA, et al. Effects of time-restricted eating on weight loss and other metabolic parameters: the TREAT randomized clinical trial. *JAMA Intern Med.* 2020;180:1491–9.
22. Liu D, et al. Calorie restriction with or without time-restricted eating in weight loss. *N Engl J Med.* 2022;386:1495–504.
23. Nedeltcheva AV, et al. Insufficient sleep undermines dietary efforts to reduce adiposity. *Ann Intern Med.* 2010;153:435–41.
24. Singer A, et al. Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy. *Front Sports Act Living.* 2024;6:1429789.
25. Zourdos MC, et al. Novel resistance training-specific rating of perceived exertion scale measuring repetitions in reserve. *J Strength Cond Res.* 2016;30:267–75.
26. Bickel CS, Cross JM, Bamman MM. Exercise dosing to retain resistance training adaptations in young and older adults. *Med Sci Sports Exerc.* 2011;43:1177–87.
27. Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly resistance training volume and increases in muscle mass. *J Sports Sci.* 2017;35:1073–82.
28. Ashwell M, Gunn P, Gibson S. Waist-to-height ratio is a better screening tool than waist circumference and BMI for adult cardiometabolic risk factors. *Obes Rev.* 2012;13:275–86.
29. Jensen MD, et al. 2013 AHA/ACC/TOS guideline for the management of overweight and obesity in adults. *Circulation.* 2014;129(25 Suppl 2):S102–38.
30. Alpert SS. A limit on the energy transfer rate from the human fat store in hypophagia. *J Theor Biol.* 2005;233:1–13. (The theoretical case for shrinking the deficit as fat falls, which is the idea behind Mode 2.)
