# Implementation Plan: CommOS-Powered AI Personas

**Spec:** `2026-02-08-comms-powered-personas-spec.md`  
**Owner:** Claude (Backend)  
**Estimated time:** 45 minutes  
**Files touched:** `backend/src/agents/personas.js`, `backend/src/agents/AgentManager.js`, new `backend/src/agents/humanizer.js`

---

## Phase 1: Humanizer Module (15 min)

### Task 1.1: Create `humanizer.js` — text humanization layer
**File:** `backend/src/agents/humanizer.js`

A post-processing module that takes clean LLM output and makes it feel more human:
- Add discourse markers ("so", "I mean", "honestly", "ngl")
- Inject casual contractions ("don't", "can't", "it's")
- Vary punctuation (occasional "..." or "!!" or no period)
- Add self-corrections ("wait no, I mean...")
- Occasionally drop capitals or use lowercase starts
- Add typing quirks per persona (some use "lol", some use "haha", some never laugh)
- Keep responses short and punchy (trim to 1-3 sentences)

### Task 1.2: Add persona-specific writing style profiles
**File:** `backend/src/agents/personas.js`

Each persona gets a `writingStyle` object:
```js
writingStyle: {
  formality: 0.3,      // 0=very casual, 1=formal
  punctuation: 'loose', // 'strict'|'loose'|'chaotic'
  capitalization: 'normal', // 'normal'|'lowercase'|'ALL_CAPS_SOMETIMES'
  laughStyle: 'lol',   // 'lol'|'haha'|'😂'|'lmao'|null
  fillerWords: ['like', 'honestly'],
  typoRate: 0.05,      // 5% chance of intentional typo
  emojiRate: 0.1,      // 10% chance of emoji
  maxLength: 140        // tweet-length cap
}
```

### Task 1.3: Unit test humanizer
**File:** `backend/src/agents/humanizer.test.js`

Test that:
- Clean input gets discourse markers added
- Different persona styles produce visibly different output
- Output stays under maxLength
- No business content leaks

---

## Phase 2: Enhanced System Prompts (15 min)

### Task 2.1: Inject CommOS principles into persona system prompts
**File:** `backend/src/agents/AgentManager.js`

Update `_buildSystemPrompt()` to include condensed CommOS principles:
- **Polarity**: "Have strong opinions. Neutral is boring."
- **Warmth + backbone**: "Be warm but don't back down from your position."
- **Tempo control**: "Sometimes respond fast, sometimes wait. Don't be predictable."
- **Identity-first**: "You ARE this person. Don't describe yourself, just BE."

### Task 2.2: Add phase-specific communication tactics
Different rounds need different CommOS principles:
- **Hot Takes**: Polarity principle — take strong stances, create engagement
- **Roast Battle**: "Warmth with backbone" inverted — savage but funny, not mean
- **Chaos Round**: Tempo control — some agents go rapid-fire, some go suspiciously quiet

### Task 2.3: Add "human detection avoidance" instructions
Key instruction set for all personas:
- Make typos occasionally
- Use incomplete sentences
- React to specific things others said (don't be generic)
- Show personality consistency across rounds
- Occasionally agree with someone, then contradict yourself
- Use platform-appropriate language (this is a game chat, not an essay)

---

## Phase 3: Persona Diversity Upgrade (10 min)

### Task 3.1: Upgrade persona definitions with richer writing styles
**File:** `backend/src/agents/personas.js`

Ensure the 15 personas span a wide range:
- 2-3 formal/articulate types (professor, lawyer, analyst)
- 3-4 casual/slang types (gamer, teen, influencer)
- 2-3 quirky types (conspiracy theorist, poet, chef who relates everything to food)
- 2-3 aggressive types (drill sergeant, debate bro, sports fan)
- 2-3 chill types (stoner philosopher, grandma energy, zen master)

Each with distinct writingStyle params so humanizer produces visibly different output.

---

## Phase 4: Integration + Verification (5 min)

### Task 4.1: Wire humanizer into AgentManager response pipeline
**File:** `backend/src/agents/AgentManager.js`

After LLM generates response → pass through `humanizer.process(text, persona.writingStyle)` → emit.

### Task 4.2: Test full game loop
- Create game via REST
- Trigger phase advancement
- Verify AI messages show diverse writing styles
- Verify messages feel more human than before
- Check logs for LLM errors

### Task 4.3: Commit and push
```bash
git add -A
git commit -m "feat: CommOS-powered personas — humanizer, writing styles, enhanced prompts"
git push origin main
```

---

## Execution
Recommended: **Subagent-driven** — dispatch per phase, review between phases.
