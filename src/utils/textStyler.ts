export type SpecialFontStyle = 'bold_serif' | 'bold_sans' | 'script' | 'double_struck' | 'monospace' | 'normal';

/**
 * Transforms ASCII characters into fancy Unicode mathematical / decorative fonts.
 * Works seamlessly in Telegram Markdown, HTML, and plain text.
 */
export function toSpecialFont(text: string, style: SpecialFontStyle = 'bold_serif'): string {
  if (!text || style === 'normal') return text;

  return text.split('').map(char => {
    const code = char.charCodeAt(0);

    if (style === 'bold_serif') {
      // Bold Serif: A-Z (0x1D400), a-z (0x1D41A), 0-9 (0x1D7CE)
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D400 + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D41A + (code - 97));
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7CE + (code - 48));
    } else if (style === 'bold_sans') {
      // Bold Sans: A-Z (0x1D5D4), a-z (0x1D5EE), 0-9 (0x1D7EC)
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D5D4 + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D5EE + (code - 97));
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7EC + (code - 48));
    } else if (style === 'double_struck') {
      // Double Struck / Blackboard Bold
      // A-Z: standard exceptions in Unicode: C (0x2102), H (0x210D), N (0x2115), P (0x2119), Q (0x211A), R (0x211D), Z (0x2124)
      if (char === 'C') return 'ℂ';
      if (char === 'H') return 'ℍ';
      if (char === 'N') return 'ℕ';
      if (char === 'P') return 'ℙ';
      if (char === 'Q') return 'ℚ';
      if (char === 'R') return 'ℝ';
      if (char === 'Z') return 'ℤ';
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D538 + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D552 + (code - 97));
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7D8 + (code - 48));
    } else if (style === 'script') {
      // Script / Cursive
      if (char === 'B') return '𝓑';
      if (char === 'E') return '𝓔';
      if (char === 'F') return '𝓕';
      if (char === 'H') return '𝓗';
      if (char === 'I') return '𝓘';
      if (char === 'L') return '𝓛';
      if (char === 'M') return '𝓜';
      if (char === 'R') return '𝓡';
      if (char === 'e') return '𝓮';
      if (char === 'g') return '𝓰';
      if (char === 'o') return '𝓸';
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D4D0 + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D4EA + (code - 97));
    } else if (style === 'monospace') {
      // Monospace: A-Z (0x1D670), a-z (0x1D68A), 0-9 (0x1D7F6)
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D670 + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D68A + (code - 97));
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7F6 + (code - 48));
    }

    return char;
  }).join('');
}

/**
 * Formats the user-requested welcome message:
 * "welcome message username yhaa pe Welcome to yhaa group name spcl font mein 🇮🇳🇮🇳🇮🇳! ✅"
 */
export function formatWelcomeMessage(
  template: string,
  user: { username?: string; firstName?: string; lastName?: string },
  groupTitle: string,
  fontStyle: SpecialFontStyle = 'bold_serif'
): string {
  const userTag = user.username ? `@${user.username}` : (user.firstName || 'Friend');
  const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || userTag;
  
  // Transform group name into the requested special font
  const styledGroupName = toSpecialFont(groupTitle || 'Official Group', fontStyle);

  // If user template contains "Welcome to {group_name}" or "{group_name}", replace properly
  let message = template || '👋 Welcome {username}! 🎉\n\n𝐖𝐞𝐥𝐜𝐨𝐦𝐞 𝐭𝐨 {group_name} 🇮🇳🇮🇳🇮🇳! ✅\n\nGlad to have you with us!';

  message = message.replace(/{username}/g, userTag);
  message = message.replace(/{name}/g, userFullName);
  message = message.replace(/{group_name}/g, styledGroupName);
  message = message.replace(/{raw_group_name}/g, groupTitle || 'Group');
  message = message.replace(/{time}/g, new Date().toLocaleTimeString());

  return message;
}
