import { Category, CategorizationRule, OperationType, ParsedInput } from '../types/budget';
import { DEFAULT_CATEGORY_TEMPLATES } from './defaultCategories';

// Utility to normalize Russian text for matching
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/ё/g, 'е')
    .replace(/[«»"']/g, '')
    .replace(/\s+/g, ' ');
}

// Format date helper: YYYY-MM-DD
export function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse date expressions in Russian
function extractDate(text: string): { cleanText: string; dateStr: string } {
  let cleanText = text;
  const today = new Date();
  let targetDate = new Date();

  const lower = text.toLowerCase();

  if (/\bвчера\b/i.test(lower)) {
    targetDate.setDate(today.getDate() - 1);
    cleanText = cleanText.replace(/\bвчера\b/gi, ' ').trim();
  } else if (/\bпозавчера\b/i.test(lower)) {
    targetDate.setDate(today.getDate() - 2);
    cleanText = cleanText.replace(/\bпозавчера\b/gi, ' ').trim();
  } else if (/\bсегодня\b/i.test(lower)) {
    cleanText = cleanText.replace(/\bсегодня\b/gi, ' ').trim();
  } else {
    // Check for DD.MM or DD.MM.YYYY
    const dateMatch = cleanText.match(/\b(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\b/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1;
      let year = today.getFullYear();
      if (dateMatch[3]) {
        const y = parseInt(dateMatch[3], 10);
        year = y < 100 ? 2000 + y : y;
      }
      if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        targetDate = new Date(year, month, day);
        cleanText = cleanText.replace(dateMatch[0], ' ').trim();
      }
    }
  }

  return {
    cleanText: cleanText.replace(/\s+/g, ' ').trim(),
    dateStr: formatDateISO(targetDate),
  };
}

// Extract monetary amount from string
function extractAmount(text: string): { cleanText: string; amount: number | null } {
  let clean = text.trim();

  // Handle patterns with 'k' or 'к': e.g., '15к' -> 15000, '2.5k' -> 2500
  const kMatch = clean.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(?:k|к|тыс(?:\.|яч)?)(?:$|\s)/i);
  if (kMatch) {
    const rawVal = parseFloat(kMatch[1].replace(',', '.'));
    if (!isNaN(rawVal) && rawVal > 0) {
      const amount = Math.round(rawVal * 1000);
      clean = clean.replace(kMatch[0], ' ').trim();
      return { cleanText: clean, amount };
    }
  }

  // Handle numbers with currency suffix at the end or anywhere
  // e.g., "850", "2500 руб", "95 000 р", "240₽", "+5000"
  // Look for number with optional spaced thousands: "95 000" or "95000"
  const amountRegex = /(?:^|\s)([+-]?\d{1,3}(?:[ \t]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:₽|руб(?:лей|ля|\.)?|р\.?|usd|\$|eur|€)?(?:\s|$)/i;
  
  // Prefer checking at the end of the string first
  const endAmountRegex = /([+-]?\d{1,3}(?:[ \t]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:₽|руб(?:лей|ля|\.)?|р\.?|usd|\$|eur|€)?\s*$/i;
  
  const endMatch = clean.match(endAmountRegex);
  if (endMatch) {
    const numStr = endMatch[1].replace(/\s+/g, '').replace(',', '.');
    const parsed = Math.abs(parseFloat(numStr));
    if (!isNaN(parsed) && parsed > 0) {
      clean = clean.substring(0, endMatch.index).trim();
      return { cleanText: clean, amount: parsed };
    }
  }

  const anyMatch = clean.match(amountRegex);
  if (anyMatch) {
    const numStr = anyMatch[1].replace(/\s+/g, '').replace(',', '.');
    const parsed = Math.abs(parseFloat(numStr));
    if (!isNaN(parsed) && parsed > 0) {
      clean = clean.replace(anyMatch[0], ' ').trim();
      return { cleanText: clean, amount: parsed };
    }
  }

  return { cleanText: clean, amount: null };
}

// Income indicator keywords
const INCOME_CUES = [
  'зарплата', 'зп', 'аванс', 'получка', 'оклад', 'премия', 'бонус',
  'получил', 'получила', 'приход', 'доход', 'выручка', 'дивиденды',
  'подработка', 'фриланс', 'кэшбэк', 'кешбэк', 'проценты', 'вклад',
  'вернули долг', 'отдали долг', 'возврат', 'вычет'
];

// Transfer indicator keywords
const TRANSFER_CUES = [
  'перевод', 'перевел', 'перевела', 'скинул', 'перекинул', 'себе на счет',
  'между счетами', 'пополнение карты', 'на сбер', 'на тинькофф', 'на т-банк'
];

export function parseQuickEntry(
  rawInput: string,
  categories: Category[],
  rules: CategorizationRule[] = []
): ParsedInput {
  if (!rawInput.trim()) {
    return {
      raw: '',
      description: '',
      amount: null,
      type: 'expense',
      categoryId: 'uncategorized',
      date: formatDateISO(new Date()),
      confidence: 0,
    };
  }

  // 1. Extract date
  const { cleanText: textAfterDate, dateStr } = extractDate(rawInput);

  // 2. Extract amount
  const { cleanText: descriptionRaw, amount } = extractAmount(textAfterDate);

  // Clean description text
  let description = descriptionRaw.trim();
  // Capitalize first letter of description for neatness
  if (description.length > 0) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  } else {
    description = 'Операция';
  }

  const normalizedDesc = normalizeText(descriptionRaw);

  // 3. Check custom user rules first
  for (const rule of rules) {
    const normKeyword = normalizeText(rule.keyword);
    if (normKeyword && normalizedDesc.includes(normKeyword)) {
      return {
        raw: rawInput,
        description,
        amount,
        type: rule.type,
        categoryId: rule.categoryId,
        subcategoryId: rule.subcategoryId,
        date: dateStr,
        confidence: 0.95,
        matchedKeyword: rule.keyword,
      };
    }
  }

  // 4. Determine initial operation type
  let detectedType: OperationType = 'expense';
  if (rawInput.trim().startsWith('+')) {
    detectedType = 'income';
  } else if (TRANSFER_CUES.some((cue) => normalizedDesc.includes(cue))) {
    detectedType = 'transfer';
  } else if (INCOME_CUES.some((cue) => normalizedDesc.includes(cue))) {
    detectedType = 'income';
  }

  // 5. Match against existing user categories and subcategories
  let matchedCategoryId = 'uncategorized';
  let matchedSubcategoryId: string | undefined = undefined;
  let highestScore = 0;
  let matchedKeyword: string | undefined = undefined;

  // Search by exact category name or subcategory name
  for (const cat of categories) {
    const normName = normalizeText(cat.name);
    if (!normName) continue;

    // Direct match
    if (normalizedDesc === normName || normalizedDesc.startsWith(normName + ' ') || normalizedDesc.endsWith(' ' + normName)) {
      if (cat.parentId) {
        matchedCategoryId = cat.parentId;
        matchedSubcategoryId = cat.id;
      } else {
        matchedCategoryId = cat.id;
      }
      detectedType = cat.type;
      highestScore = 0.9;
      matchedKeyword = cat.name;
      break;
    }
  }

  // 6. Match against default template keywords if not matched yet
  if (highestScore < 0.8) {
    for (const template of DEFAULT_CATEGORY_TEMPLATES) {
      if (!template.keywords) continue;

      for (const kw of template.keywords) {
        const normKw = normalizeText(kw);
        // Word boundary match or contains match for key terms
        const words = normalizedDesc.split(' ');
        const matchesWord = words.some((w) => w.startsWith(normKw) || normKw.startsWith(w) && w.length >= 4);

        if (normalizedDesc.includes(normKw) || matchesWord) {
          detectedType = template.type;
          
          // Find corresponding user category
          const foundCat = categories.find(
            (c) => !c.parentId && c.type === template.type && normalizeText(c.name) === normalizeText(template.name)
          );

          if (foundCat) {
            matchedCategoryId = foundCat.id;

            // Attempt to match subcategory
            if (template.subcategories) {
              const foundSub = categories.find(
                (c) => c.parentId === foundCat.id && normalizedDesc.includes(normalizeText(c.name))
              );
              if (foundSub) {
                matchedSubcategoryId = foundSub.id;
              } else {
                // Check if kw hints at specific default subcategory
                if (normKw.includes('продукты') || normKw.includes('пятерочка') || normKw.includes('магнит')) {
                  const sub = categories.find((c) => c.parentId === foundCat.id && c.name.toLowerCase().includes('продукт'));
                  if (sub) matchedSubcategoryId = sub.id;
                } else if (normKw.includes('молок') || normKw.includes('сыр') || normKw.includes('творог')) {
                  const sub = categories.find((c) => c.parentId === foundCat.id && c.name.toLowerCase().includes('молочн'));
                  if (sub) matchedSubcategoryId = sub.id;
                } else if (normKw.includes('кофе') || normKw.includes('кафе') || normKw.includes('ресторан') || normKw.includes('додо') || normKw.includes('пицца')) {
                  const sub = categories.find((c) => c.parentId === foundCat.id && c.name.toLowerCase().includes('кафе'));
                  if (sub) matchedSubcategoryId = sub.id;
                } else if (normKw.includes('топливо') || normKw.includes('бензин') || normKw.includes('заправка') || normKw.includes('азс')) {
                  const sub = categories.find((c) => c.parentId === foundCat.id && c.name.toLowerCase().includes('топлив'));
                  if (sub) matchedSubcategoryId = sub.id;
                } else if (normKw.includes('такси')) {
                  const sub = categories.find((c) => c.parentId === foundCat.id && c.name.toLowerCase().includes('такси'));
                  if (sub) matchedSubcategoryId = sub.id;
                } else if (normKw.includes('аптека') || normKw.includes('врач') || normKw.includes('лекарств')) {
                  const sub = categories.find((c) => c.parentId === foundCat.id && c.name.toLowerCase().includes('медицин'));
                  if (sub) matchedSubcategoryId = sub.id;
                }
              }
            }

            highestScore = 0.85;
            matchedKeyword = kw;
            break;
          }
        }
      }
      if (highestScore >= 0.8) break;
    }
  }

  // If user entered only description (no amount)
  return {
    raw: rawInput,
    description,
    amount,
    type: detectedType,
    categoryId: matchedCategoryId,
    subcategoryId: matchedSubcategoryId,
    date: dateStr,
    confidence: highestScore,
    matchedKeyword,
  };
}
