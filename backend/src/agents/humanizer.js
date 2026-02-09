/**
 * Humanizer — post-processing layer that makes LLM output feel human.
 * Based on CommOS communication principles + voice naturalness research.
 * 
 * Key insight: Humans are MESSY writers in chat. Perfect grammar = AI tell.
 */

const DISCOURSE_MARKERS = {
  start: ['so ', 'honestly ', 'ok but ', 'ngl ', 'I mean ', 'look ', 'wait ', 'tbh ', 'like '],
  mid: [', like,', ', honestly,', ', you know,', ', I mean,', ', right,'],
  end: [' lol', ' haha', ' tbh', ' ngl', ' istg', ' fr', ' 💀', ' 😭', ' lmao']
};

const SELF_CORRECTIONS = [
  'wait no, ',
  'actually wait— ',
  'ok scratch that, ',
  'no actually ',
  'hmm actually '
];

const FILLER_PHRASES = [
  'idk but ',
  'not gonna lie, ',
  'hear me out tho— ',
  'ok this might be controversial but ',
  'lowkey ',
  'highkey '
];

/**
 * Intentional typos that humans make in chat
 */
const COMMON_TYPOS = {
  'the': ['teh', 'the'],
  'that': ['taht', 'that'],
  'with': ['wtih', 'with'],
  'just': ['jsut', 'just'],
  'have': ['ahve', 'have'],
  'really': ['realy', 'relly'],
  'because': ['becuase', 'bc', 'cuz'],
  'people': ['ppl'],
  'something': ['smth'],
  'probably': ['prolly'],
  'though': ['tho'],
  'definitely': ['def', 'deffo'],
  'obviously': ['obv', 'obvs']
};

function rand(n) { return Math.random() < n; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/**
 * Main humanization pipeline.
 * @param {string} text - Clean LLM output
 * @param {object} style - Persona's writingStyle config
 * @returns {string} Humanized text
 */
function humanize(text, style = {}) {
  if (!text || typeof text !== 'string') return text;
  
  let result = text.trim();
  
  // Strip surrounding quotes (LLM habit)
  result = result.replace(/^["']|["']$/g, '');
  
  // 1. Capitalization
  if (style.capitalization === 'lowercase') {
    result = result.toLowerCase();
  } else if (style.capitalization === 'ALL_CAPS_SOMETIMES' && rand(0.25)) {
    // Capitalize a random word for emphasis
    const words = result.split(' ');
    const idx = Math.floor(Math.random() * words.length);
    words[idx] = words[idx].toUpperCase();
    result = words.join(' ');
  } else if (style.formality < 0.4 && rand(0.3)) {
    // Casual: lowercase first letter
    result = result.charAt(0).toLowerCase() + result.slice(1);
  }
  
  // 2. Discourse markers
  if (style.formality < 0.6 && rand(0.35)) {
    result = pick(DISCOURSE_MARKERS.start) + result;
  }
  
  // 3. Filler phrases (casual personas only)
  if (style.formality < 0.3 && rand(0.2)) {
    result = pick(FILLER_PHRASES) + result;
  }
  
  // 4. Self-corrections (makes it feel like thinking out loud)
  if (rand(0.08)) {
    const sentences = result.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      const insertAt = Math.floor(Math.random() * (sentences.length - 1)) + 1;
      sentences[insertAt] = pick(SELF_CORRECTIONS) + sentences[insertAt].charAt(0).toLowerCase() + sentences[insertAt].slice(1);
      result = sentences.join(' ');
    }
  }
  
  // 5. Intentional typos
  if (style.typoRate && rand(style.typoRate)) {
    const words = result.split(' ');
    for (let i = 0; i < words.length; i++) {
      const lower = words[i].toLowerCase().replace(/[.,!?]/g, '');
      if (COMMON_TYPOS[lower] && rand(0.5)) {
        const punct = words[i].match(/[.,!?]+$/)?.[0] || '';
        words[i] = pick(COMMON_TYPOS[lower]) + punct;
        break; // One typo max
      }
    }
    result = words.join(' ');
  }
  
  // 6. Punctuation style
  if (style.punctuation === 'chaotic') {
    // Multiple punctuation, trailing off
    if (rand(0.3)) result = result.replace(/\.$/, pick(['...', '!!', '???', '!?', ' 😤', ' 🔥']));
    if (rand(0.2)) result = result.replace(/\.$/, '');
  } else if (style.punctuation === 'loose') {
    // Sometimes drop final period
    if (rand(0.4)) result = result.replace(/\.$/, '');
    if (rand(0.15)) result = result.replace(/\.$/, '...');
  }
  // 'strict' = leave as-is
  
  // 7. End markers (laugh style, emoji)
  if (style.laughStyle && rand(0.15)) {
    result += ' ' + style.laughStyle;
  }
  if (style.emojiRate && rand(style.emojiRate)) {
    const emojis = ['😭', '💀', '🔥', '😤', '🤡', '👀', '😂', '🫠', '💯'];
    result += ' ' + pick(emojis);
  }
  
  // 8. Trim to max length
  const maxLen = style.maxLength || 280;
  if (result.length > maxLen) {
    result = result.slice(0, maxLen - 3).replace(/\s+\S*$/, '') + '...';
  }
  
  return result;
}

module.exports = { humanize };
