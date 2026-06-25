// Hard guardrail for user-submitted reviews/tips. Runs at submission time AND again before any
// AI approval (defense in depth). Catches the unambiguous spam/abuse signals; the AI pass judges
// the rest (is it a genuine, on-topic review of THIS restaurant).

const URL_RE = /(https?:\/\/|www\.)\S+|\b[a-z0-9][a-z0-9-]*\.(com|net|org|io|co|info|biz|ru|cn|xyz|shop|store|link|click|online|site|app|me|tv)\b/i;
const PHONE_RE = /(?:\+?\d[\s().-]?){9,}\d/;
const EMAIL_RE = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i;
// strong profanity + slurs (word-boundary, light inflection). Mild words are intentionally absent.
const PROFANITY = ['fuck', 'shit', 'bitch', 'cunt', 'asshole', 'dick', 'bastard', 'nigger', 'nigga', 'faggot', 'whore', 'slut', 'cock', 'pussy', 'retard', 'motherfucker', 'jackass', 'douche'];
const PROFANITY_RE = new RegExp(`\\b(${PROFANITY.join('|')})(s|es|ing|ed|er|hole|head)?\\b`, 'i');
const SPAM_RE = /\b(viagra|cialis|casino|crypto|bitcoin|forex|loan|seo service|buy now|click here|promo code|coupon code|free money|earn \$|make money|work from home|telegram|whatsapp|onlyfans|escort|porn)\b/i;

export type Screen = { hardReject: boolean; reasons: string[]; message: string };

export function screenSubmission(text: string): Screen {
  const t = (text || '').trim();
  const reasons: string[] = [];
  if (t.length < 6) reasons.push('too short');
  if (t.length > 2000) reasons.push('too long');
  if (URL_RE.test(t)) reasons.push('external link');
  if (EMAIL_RE.test(t)) reasons.push('email address');
  if (PHONE_RE.test(t)) reasons.push('phone number');
  if (PROFANITY_RE.test(t)) reasons.push('profanity');
  if (SPAM_RE.test(t)) reasons.push('spam keywords');
  if (/(.)\1{7,}/i.test(t)) reasons.push('character spam');
  const letters = t.replace(/[^a-z]/gi, '').length;
  const caps = (t.match(/[A-Z]/g) || []).length;
  if (t.length > 25 && letters && caps / letters > 0.7) reasons.push('all caps');

  const hard = reasons.some((r) => ['external link', 'email address', 'phone number', 'profanity', 'spam keywords', 'character spam'].includes(r));
  let message = '';
  if (reasons.includes('external link') || reasons.includes('email address')) message = 'Please remove links and contact info.';
  else if (reasons.includes('profanity')) message = "Let's keep it civil. Please reword and try again.";
  else if (reasons.includes('phone number')) message = 'Please leave out phone numbers.';
  else if (reasons.includes('spam keywords') || reasons.includes('character spam')) message = "That looks like spam, so we can't post it.";
  else if (reasons.includes('too short')) message = 'Say a little more.';
  return { hardReject: hard, reasons, message };
}
