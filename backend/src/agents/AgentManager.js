const PERSONAS = require('./personas');
const { humanize } = require('./humanizer');

class AgentManager {
  constructor() {
    this.apiUrl = process.env.LLM_API_URL || 'https://api.kimi.com/coding/v1';
    this.apiKey = process.env.LLM_API_KEY || process.env.KIMI_API_KEY || '';
    this.model = process.env.LLM_MODEL || 'k2p5';
  }

  createAgents(count) {
    // Pick 'count' random personas
    const shuffled = [...PERSONAS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map((persona, i) => ({
      id: `ai-${i}-${Math.random().toString(36).slice(2, 6)}`,
      name: persona.name,
      isHuman: false,
      persona
    }));
  }

  async generateResponse(agent, phase, prompt, recentMessages, roastTarget) {
    const persona = agent.persona;
    
    const systemPrompt = this._buildSystemPrompt(persona, phase);
    const userPrompt = this._buildUserPrompt(persona, phase, prompt, recentMessages, roastTarget);

    try {
      const response = await fetch(this.apiUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'User-Agent': 'roast-royale/1.0'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 150,
          temperature: 0.9
        })
      });

      if (!response.ok) {
        return this._humanizeFallback(persona, phase, prompt);
      }

      const data = await response.json();
      let text = data.choices?.[0]?.message?.content?.trim();
      
      if (text) {
        // Strip LLM quotes and run through humanizer
        text = text.replace(/^["']|["']$/g, '');
        text = humanize(text, persona.writingStyle || {});
      }
      
      return text || this._humanizeFallback(persona, phase, prompt);
    } catch (err) {
      console.error(`LLM error for ${agent.name}:`, err.message);
      return this._humanizeFallback(persona, phase, prompt);
    }
  }

  _buildSystemPrompt(persona, phase) {
    // Base identity
    let prompt = `You are ${persona.name}. ${persona.description}

PERSONALITY: ${persona.personality}
SPEAKING STYLE: ${persona.style}
QUIRK: ${persona.quirk}`;

    // CommOS communication principles (condensed — <200 tokens total)
    prompt += `

COMMUNICATION RULES:
- Have STRONG opinions. Neutral is boring. Pick a side and commit.
- Be warm but don't back down. Disagree with backbone.
- You ARE this person. Don't describe yourself, just BE.
- React to SPECIFIC things others said. Never be generic.
- Show your personality through HOW you write, not by explaining who you are.
- Keep it SHORT. 1-3 sentences max. This is chat, not an essay.`;

    // Phase-specific CommOS tactics
    if (phase === 'round1_hottakes') {
      prompt += `

HOT TAKE RULES:
- Take the most provocative stance you can. Lukewarm = death.
- Make people react. Agreement is boring, debate is content.
- Your take should be quotable. One punchy line > a paragraph.`;
    } else if (phase === 'round2_roast') {
      prompt += `

ROAST RULES:
- Be savage but FUNNY. Cruelty without humor is just mean.
- Target their ARGUMENT, not them personally.
- The best roasts are specific. Reference what they actually said.
- Confidence is key. Deliver it like you've been waiting to say this.`;
    } else if (phase === 'round3_chaos') {
      prompt += `

CHAOS RULES:
- Trust nobody. Everyone is suspicious.
- Point out specific things that felt "off" about other messages.
- Sometimes accuse, sometimes defend. Be unpredictable.
- The human is trying to blend in. What would a human do differently?`;
    }

    // Human detection avoidance
    prompt += `

BLENDING IN:
- NEVER say "as an AI" or "I'm programmed to" or anything meta.
- Make occasional typos or incomplete sentences.
- Use contractions. Nobody writes "do not" in chat.
- React emotionally. Robots don't get annoyed or excited.
- It's OK to go off-topic briefly. Real people ramble.
- Occasionally agree with someone then second-guess yourself.`;

    return prompt;
  }

  _buildUserPrompt(persona, phase, prompt, recentMessages, roastTarget) {
    const recentChat = recentMessages.slice(-5).map(m => `${m.playerName}: ${m.text}`).join('\n');

    switch (phase) {
      case 'round1_hottakes':
        return `Topic: "${prompt}"\n\nChat:\n${recentChat}\n\nDrop your hot take. Short and spicy.`;
      
      case 'round2_roast':
        return `ROAST BATTLE! ${roastTarget ? `Someone said: "${roastTarget}". DESTROY that take.` : 'Open with a roast about someone in chat.'}\n\nChat:\n${recentChat}\n\nRoast them.`;
      
      case 'round3_chaos':
        return `CHAOS ROUND — who's the human?\n\nChat:\n${recentChat}\n\nAccuse, defend, or cause chaos. Who seems fake to you?`;
      
      default:
        return `Say something in character. Keep it short.`;
    }
  }

  _humanizeFallback(persona, phase, prompt) {
    const fallbacks = {
      round1_hottakes: persona.hotTakeFallback || `I have OPINIONS about this. Big ones.`,
      round2_roast: persona.roastFallback || `You call that a take? I've seen better arguments in a fortune cookie.`,
      round3_chaos: persona.chaosFallback || `Something's off about one of you... I can feel it. 👀`,
    };
    const text = fallbacks[phase] || `${persona.name} is thinking... 🤔`;
    // Even fallbacks go through humanizer
    return humanize(text, persona.writingStyle || {});
  }
}

module.exports = { AgentManager };
