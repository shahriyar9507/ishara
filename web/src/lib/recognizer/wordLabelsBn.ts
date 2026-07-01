// The bdslw60 word folders are English (e.g. "chocolate"). Map them to Bangla for display
// and for the Gemini sentence builder. Completed once the trained model's 60 labels are known
// (word_labels.json); unmapped words fall back to the English string.

const MAP: Record<string, string> = {
  chocolate: "চকলেট",
  water: "পানি",
  food: "খাবার",
  help: "সাহায্য",
  friend: "বন্ধু",
  family: "পরিবার",
  school: "স্কুল",
  home: "বাড়ি",
  book: "বই",
  doctor: "ডাক্তার",
  money: "টাকা",
  work: "কাজ",
  good: "ভালো",
  bad: "খারাপ",
  love: "ভালোবাসা",
  // …extended after inspecting word_labels.json from training
};

export function toBn(word: string): string {
  return MAP[word.toLowerCase().trim()] || word;
}
