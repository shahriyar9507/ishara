"""Ishara — Bangla label maps.

Dataset folders are typically named in Bangla already (labels are Bangla), so the
"dictionary" (sign -> Bangla) is built in. This module provides a canonical ordering
and helpers to map between folder names, integer class ids, and Bangla display text.

Labels are discovered from the dataset folder names at extraction time; this canonical
list is a reference/fallback ordering for the 36-character BdSL sets (BdSL36 / BAUST Lipi).
"""

# Canonical 36 Bangla characters commonly used by BdSL36 / BAUST Lipi.
# (Vowels + frequent consonants + digits vary by dataset; extraction uses the actual
# folder names, so this is a reference ordering only.)
BANGLA_VOWELS = ["অ", "আ", "ই", "ঈ", "উ", "ঊ", "ঋ", "এ", "ঐ", "ও", "ঔ"]
BANGLA_CONSONANTS = [
    "ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ", "ঝ", "ঞ",
    "ট", "ঠ", "ড", "ঢ", "ণ", "ত", "থ", "দ", "ধ", "ন",
    "প", "ফ", "ব", "ভ", "ম", "য", "র", "ল", "শ", "ষ", "স", "হ",
]
BANGLA_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"]

# A few everyday words for Phase 2-4 word model (recorded by the team).
COMMON_WORDS = ["পানি", "খাবার", "সাহায্য", "ধন্যবাদ", "হ্যাঁ", "না", "আমি", "তুমি", "স্কুল", "বাড়ি"]


def build_label_index(class_names):
    """Given a sorted list of class folder names, return (name->id, id->name) maps."""
    names = sorted(class_names)
    name_to_id = {name: i for i, name in enumerate(names)}
    id_to_name = {i: name for name, i in name_to_id.items()}
    return name_to_id, id_to_name
