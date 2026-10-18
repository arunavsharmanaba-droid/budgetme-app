import { Category, Operation } from '../types/budget';

export function formatCurrency(amount: number, currency: string = 'RUB'): string {
  const symbolMap: Record<string, string> = {
    RUB: '₽',
    USD: '$',
    EUR: '€',
    KZT: '₸',
    BYN: 'Br',
    UAH: '₴',
    AMD: '֏',
    GEL: '₾',
  };

  const symbol = symbolMap[currency] || currency;

  // Format with thousand separators
  const parts = Math.abs(amount).toFixed(amount % 1 === 0 ? 0 : 2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const formattedNum = parts.join('.');
  return `${formattedNum} ${symbol}`;
}

export const MONTH_NAMES_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export const MONTH_NAMES_GENITIVE_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

export function formatMonthName(monthKey: string): string {
  // monthKey is YYYY-MM
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  return `${MONTH_NAMES_RU[monthIdx] || ''} ${year}`;
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getAdjacentMonthKey(monthKey: string, offset: number): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1 + offset, 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatRelativeDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (dateStr === todayStr) {
    return 'Сегодня';
  }
  if (dateStr === yesterdayStr) {
    return 'Вчера';
  }

  const [y, m, d] = dateStr.split('-').map(Number);
  const monthName = MONTH_NAMES_GENITIVE_RU[m - 1] || '';
  const dateObj = new Date(y, m - 1, d);
  const weekDayNames = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const weekDay = weekDayNames[dateObj.getDay()];

  if (y === now.getFullYear()) {
    return `${d} ${monthName}, ${weekDay}`;
  }
  return `${d} ${monthName} ${y}`;
}

// Convert operations to CSV for download
export function exportOperationsToCSV(operations: Operation[], categories: Category[]): string {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const headers = ['Дата', 'Тип', 'Сумма', 'Валюта', 'Категория', 'Подкатегория', 'Описание', 'Примечание'];
  
  const typeLabels: Record<string, string> = {
    expense: 'Расход',
    income: 'Доход',
    transfer: 'Перевод',
  };

  const rows = operations.map((op) => {
    const catName = catMap.get(op.categoryId) || 'Без категории';
    const subName = op.subcategoryId ? catMap.get(op.subcategoryId) || '' : '';
    
    return [
      op.date,
      typeLabels[op.type] || op.type,
      op.amount.toString(),
      op.currency || 'RUB',
      `"${catName.replace(/"/g, '""')}"`,
      `"${subName.replace(/"/g, '""')}"`,
      `"${(op.description || '').replace(/"/g, '""')}"`,
      `"${(op.note || '').replace(/"/g, '""')}"`,
    ].join(';');
  });

  // Include UTF-8 BOM for Excel compatibility
  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}
