// Hand-written, not generated: an LLM would add a wait and a cost per Shuffle, and some
// Topics would be bad. Each is a short, open-ended phrase, never an instruction or a
// question, so the speaker picks the angle. Four flavours, roughly even.
export const TOPICS: readonly string[] = [
  // Everyday objects and habits
  'Airplane mode',
  'The snooze button',
  'Leftovers',
  'Read receipts',
  'Your junk drawer',
  'Small talk',
  'Comfort food',
  'Group chats',
  'Self-checkout',
  'Passwords',
  'Packing a suitcase',
  'The last slice',
  // Bigger ideas, kept short
  'Second chances',
  'Being bored',
  'Getting lost',
  'Starting over',
  'The last day of something',
  'Home',
  'Saying no',
  'Patience',
  'Old friends',
  'Luck',
  'First impressions',
  'Growing up',
  // Light and a bit odd
  'Pigeons',
  'The year 2050',
  'A perfect Sunday',
  'Rainy days',
  'Socks with sandals',
  "Your phone's battery at 3%",
  'Elevators',
  'Houseplants',
  'Theme songs',
  'Being early',
  'Cereal for dinner',
  'Fridge magnets',
  // Serious
  'Public transport',
  'Privacy',
  'Rules nobody follows',
  'Who gets to be an expert',
  'Work from home',
  'Screen time',
  'The news',
  'Voting age',
  'Cheap flights',
  'Robots at work',
  'Tourism',
  'Tipping',
]

// `recent` is oldest first, so its last entry is the Topic on the card now. Recently seen
// Topics are skipped; if that leaves nothing, only the current one is.
// `random` is injectable so tests can choose the outcome.
export function pickTopic(recent: readonly string[], random: () => number = Math.random): string {
  let options = TOPICS.filter((topic) => !recent.includes(topic))
  if (options.length === 0) options = TOPICS.filter((topic) => topic !== recent.at(-1))
  return options[Math.floor(random() * options.length)]
}
