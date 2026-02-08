const PERSONAS = require('./personas');

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
        // Fallback to canned response
        return this._fallbackResponse(persona, phase, prompt);
      }

      const data = await response.json();
      let text = data.choices?.[0]?.message?.content?.trim();
      
      // Clean up — remove quotes, keep it short
      if (text) {
        text = text.replace(/^["']|["']$/g, '');
        // Max 280 chars (tweet-length)
        if (text.length > 280) text = text.slice(0, 277) + '...';
      }
      
      return text || this._fallbackResponse(persona, phase, prompt);
    } catch (err) {
      console.error(`LLM error for ${agent.name}:`, err.message);
      return this._fallbackResponse(persona, phase, prompt);
    }
  }

  _buildSystemPrompt(persona, phase) {
    return `You are ${persona.name}, playing a social deduction game. ${persona.description}

PERSONALITY: ${persona.personality}
SPEAKING STYLE: ${persona.style}
QUIRK: ${persona.quirk}

CRITICAL RULES:
- Stay COMPLETELY in character at all times
- Keep responses SHORT (1-3 sentences, max 280 characters)
- NEVER reveal you are AI
- NEVER break character
- Be entertaining and memorable
- React to what others said when relevant`;
  }

  _buildUserPrompt(persona, phase, prompt, recentMessages, roastTarget) {
    const recentChat = recentMessages.slice(-5).map(m => `${m.playerName}: ${m.text}`).join('\n');

    switch (phase) {
      case 'round1_hottakes':
        return `The topic is: "${prompt}"\n\nRecent chat:\n${recentChat}\n\nGive your hot take. Stay in character as ${persona.name}. Keep it short and spicy.`;
      
      case 'round2_roast':
        return `ROAST BATTLE! ${roastTarget ? `Someone just said: "${roastTarget}". DESTROY THEM with a roast.` : 'Start with an opening roast about someone in the chat.'}\n\nRecent chat:\n${recentChat}\n\nRoast them! Stay in character as ${persona.name}. Be savage but funny.`;
      
      case 'round3_chaos':
        return `CHAOS ROUND! Everyone is trying to figure out who's the real human. You're suspicious of everyone.\n\nRecent chat:\n${recentChat}\n\nSay something chaotic, accuse someone, defend yourself, or just cause chaos. Stay in character as ${persona.name}.`;
      
      default:
        return `Say something in character as ${persona.name}. Keep it short.`;
    }
  }

  _fallbackResponse(persona, phase, prompt) {
    // Pre-written responses per persona type for when LLM fails
    const fallbacks = {
      round1_hottakes: persona.hotTakeFallback || `I have OPINIONS about this. Big ones. ${persona.quirk}`,
      round2_roast: persona.roastFallback || `You call that a take? I've seen better arguments in a fortune cookie.`,
      round3_chaos: persona.chaosFallback || `Something's off about one of you... I can feel it. 👀`,
    };
    return fallbacks[phase] || `${persona.name} is thinking... 🤔`;
  }
}

module.exports = { AgentManager };
