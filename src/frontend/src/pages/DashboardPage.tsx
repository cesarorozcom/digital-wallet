import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useCategoryContext } from '../context/CategoryContext';
import { useTransactionContext } from '../context/TransactionContext';
import { Category } from '../services/api';

type SpendingItem = {
  categoryId: string;
  label: string;
  icon: string;
  color: string;
  actual: number;
  transactionCount: number;
  incomeShare: number | null;
};

type TransactionCard = {
  id?: string;
  date: string;
  merchant: string;
  categoryLabel: string;
  amount: number;
  balance: number;
  tone: 'income' | 'expense' | 'neutral';
};

const FALLBACK_TRANSACTIONS: TransactionCard[] = [
  {
    id: undefined,
    date: 'Sep. 31, 2024',
    merchant: 'Salary Deposit',
    categoryLabel: 'Monthly Salary',
    amount: 3000,
    balance: 4500,
    tone: 'income',
  },
  {
    id: undefined,
    date: 'Sep. 31, 2024',
    merchant: 'Rent Payment',
    categoryLabel: 'Housing Expense',
    amount: -1500,
    balance: 1500,
    tone: 'expense',
  },
  {
    id: undefined,
    date: 'Sep. 31, 2024',
    merchant: 'Grocery Store Purchase',
    categoryLabel: 'Weekly Groceries',
    amount: -150,
    balance: 3000,
    tone: 'expense',
  },
];

function formatMoney(amount: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

function formatShortDate(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTransactionDate(dateString: string): string {
  const parsedDate = new Date(dateString);

  if (Number.isNaN(parsedDate.getTime())) {
    return dateString;
  }

  return parsedDate.toLocaleDateString('en-US');
}

function toInputDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getMonthBounds(value: Date): { start: string; end: string } {
  const start = new Date(value.getFullYear(), value.getMonth(), 1);
  const end = new Date(value.getFullYear(), value.getMonth() + 1, 0);

  return {
    start: toInputDate(start),
    end: toInputDate(end),
  };
}

function roundTo(amount: number, step: number): number {
  return Math.round(amount / step) * step;
}

function getCategoryMeta(
  categoryId: string,
  categories: Category[],
): { label: string; icon: string; color: string } {
  const category = categories.find((item) => item.categoryId === categoryId);

  return {
    label: category?.name || 'Other',
    icon: category?.icon || '📁',
    color: category?.color || '#94a3b8',
  };
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.05)] ${className}`}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const { user } = useAuthContext();
  const { categories } = useCategoryContext();
  const { transactions, isLoading } = useTransactionContext();

  const [selectedCategoryId, setSelectedCategoryId] = React.useState('');
  const [isRangeOpen, setIsRangeOpen] = React.useState(false);
  const spendingScrollRef = React.useRef<HTMLDivElement | null>(null);

  const initialRange = React.useMemo(() => getMonthBounds(new Date()), []);
  const [rangeDraft, setRangeDraft] = React.useState(initialRange);
  const [selectedRange, setSelectedRange] = React.useState(initialRange);

  const combinedCategories = React.useMemo(() => {
    return categories.length > 0 ? categories : [];
  }, [categories]);

  const filteredTransactions = React.useMemo(() => {
    const rangeStart = selectedRange.start;
    const rangeEnd = selectedRange.end;

    return transactions.filter((transaction) => {
      const transactionDate = transaction.transactionDate.slice(0, 10);

      if (transactionDate < rangeStart || transactionDate > rangeEnd) {
        return false;
      }

      if (selectedCategoryId && transaction.categoryId !== selectedCategoryId) {
        return false;
      }

      return true;
    });
  }, [selectedCategoryId, selectedRange.end, selectedRange.start, transactions]);

  const totalIncome = React.useMemo(() => {
    return filteredTransactions
      .filter((transaction) => transaction.amount > 0)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  }, [filteredTransactions]);

  const spendingItems = React.useMemo<SpendingItem[]>(() => {
    const grouped = new Map<string, { actual: number; count: number }>();

    filteredTransactions
      .filter((transaction) => transaction.amount < 0)
      .forEach((transaction) => {
        const current = grouped.get(transaction.categoryId) || { actual: 0, count: 0 };

        grouped.set(transaction.categoryId, {
          actual: current.actual + Math.abs(transaction.amount),
          count: current.count + 1,
        });
      });

    const computed = Array.from(grouped.entries())
      .map(([categoryId, data], index) => {
        const meta = getCategoryMeta(categoryId, combinedCategories);
        const incomeShare = totalIncome > 0 ? (data.actual / totalIncome) * 100 : null;

        return {
          categoryId,
          label: meta.label,
          icon: meta.icon,
          color: meta.color,
          actual: data.actual,
          transactionCount: data.count,
          incomeShare,
        } satisfies SpendingItem;
      })
      .sort((left, right) => right.actual - left.actual)
      .slice(0, 5);

    return computed;
  }, [combinedCategories, filteredTransactions, totalIncome]);

  const topSpendingItems = React.useMemo(() => spendingItems.slice(0, 3), [spendingItems]);

  const totals = React.useMemo(() => {
    const totalSpent = spendingItems.reduce((sum, item) => sum + item.actual, 0);
    const net = totalIncome - totalSpent;

    return { totalIncome, totalSpent, net };
  }, [spendingItems, totalIncome]);

  const transactionCards = React.useMemo<TransactionCard[]>(() => {
    if (filteredTransactions.length === 0) {
      return FALLBACK_TRANSACTIONS;
    }

    const runningBalanceStart = filteredTransactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );

    let runningBalance = runningBalanceStart;

    return filteredTransactions.slice(0, 4).map((transaction) => {
      runningBalance -= transaction.amount;
      const categoryMeta = getCategoryMeta(transaction.categoryId, combinedCategories);
      const tone: TransactionCard['tone'] =
        transaction.amount > 0 ? 'income' : transaction.status === 'PENDING' ? 'neutral' : 'expense';

      return {
        id: transaction.transactionId,
        date: formatTransactionDate(transaction.transactionDate),
        merchant: transaction.merchantName,
        categoryLabel: categoryMeta.label,
        amount: transaction.amount,
        balance: Math.max(runningBalance, 0),
        tone,
      };
    });
  }, [combinedCategories, filteredTransactions]);

  const summary = React.useMemo(() => {
    const grossIncome = filteredTransactions
      .filter((transaction) => transaction.amount > 0)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const grossSpending = filteredTransactions
      .filter((transaction) => transaction.amount < 0)
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    const totalTransactions = filteredTransactions.length;
    const largestTransaction = filteredTransactions.reduce((largest, transaction) => {
      const amount = Math.abs(transaction.amount);
      return amount > largest ? amount : largest;
    }, 0);
    const averageTransaction = totalTransactions > 0 ? (grossIncome + grossSpending) / totalTransactions : 0;

    return {
      grossIncome,
      grossSpending,
      totalTransactions,
      largestTransaction,
      averageTransaction,
    };
  }, [filteredTransactions]);

  const rangeLabel = React.useMemo(() => {
    return `${formatShortDate(selectedRange.start)} - ${formatShortDate(selectedRange.end)}`;
  }, [selectedRange.end, selectedRange.start]);

  const categoryOptions = React.useMemo(
    () => [
      { categoryId: '', label: 'All categories' },
      ...combinedCategories.map((category) => ({
        categoryId: category.categoryId,
        label: category.name,
      })),
    ],
    [combinedCategories],
  );

  const chartSegments = React.useMemo(() => {
    const total = spendingItems.reduce((sum, item) => sum + item.actual, 0);

    return spendingItems.map((item, index) => ({
      ...item,
      total,
      radius: 92 - index * 12,
      strokeWidth: index === 0 ? 11 : 10,
      share: total > 0 ? item.actual / total : 0,
    }));
  }, [spendingItems]);

  const handleRangeApply = () => {
    setSelectedRange(rangeDraft);
    setIsRangeOpen(false);
  };

  const handleRangeReset = () => {
    setRangeDraft(initialRange);
    setSelectedRange(initialRange);
    setIsRangeOpen(false);
  };

  const handleDownloadCsv = () => {
    if (filteredTransactions.length === 0) {
      return;
    }

    const header = ['Date', 'Merchant', 'Category', 'Amount', 'Status'];
    const csvRows = filteredTransactions.map((transaction) => {
      const categoryMeta = getCategoryMeta(transaction.categoryId, combinedCategories);

      return [
        transaction.transactionDate.slice(0, 10),
        transaction.merchantName,
        categoryMeta.label,
        transaction.amount.toFixed(2),
        transaction.status,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(',');
    });

    const blob = new Blob([`${header.join(',')}\n${csvRows.join('\n')}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'transactions.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
        <div className="space-y-6 p-4 sm:p-5 lg:p-6">
          <SectionCard
            title="Categories with Biggest Expense"
            subtitle="Track how much each category has spent and how that compares with total income."
          >
            <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-stretch">
              <div className="flex-shrink-0 rounded-[22px] bg-slate-50/80 p-4 lg:w-52">
                <p className="text-sm text-slate-500">Total income</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  {formatMoney(totals.totalIncome)}
                </p>

                <div className="mt-5 space-y-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Spent</span>
                    <span className="font-semibold text-rose-500">{formatMoney(totals.totalSpent)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Net</span>
                    <span className="font-semibold text-emerald-500">
                      {formatMoney(totals.net)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <div className="mb-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => spendingScrollRef.current?.scrollBy({ left: -280, behavior: 'smooth' })}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
                    aria-label="Scroll left"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => spendingScrollRef.current?.scrollBy({ left: 280, behavior: 'smooth' })}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
                    aria-label="Scroll right"
                  >
                    →
                  </button>
                </div>

                <div
                  ref={spendingScrollRef}
                  className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {topSpendingItems.length === 0 ? (
                    <div className="min-w-full rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                      No spending transactions found in the selected range.
                    </div>
                  ) : (
                    topSpendingItems.map((item) => {
                    const incomeShare = item.incomeShare;

                    return (
                      <article
                        key={item.categoryId}
                        className="min-w-[190px] rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_12px_24px_rgba(15,23,42,0.05)]"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                            style={{ backgroundColor: `${item.color}18`, color: item.color }}
                          >
                            {item.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-slate-500">{item.label}</p>
                            <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                              {formatMoney(item.actual, 2)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                          <span>{item.transactionCount} transaction{item.transactionCount === 1 ? '' : 's'}</span>
                          <span className="font-semibold text-slate-700">
                            {incomeShare === null ? 'No income' : `${incomeShare.toFixed(1)}% of income`}
                          </span>
                        </div>

                        <div className="mt-2 h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${Math.min(incomeShare ?? 0, 100)}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>

                        <p className="mt-3 text-xs text-slate-400">Spent so far in the selected range</p>
                      </article>
                    );
                  }))}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Spending by Categories"
            subtitle="Review actual spend per category and its percentage of total income."
            action={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsRangeOpen((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-sky-100"
                  >
                    <span>🗓</span>
                    <span>{rangeLabel}</span>
                    <span>▾</span>
                  </button>

                  {isRangeOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-[320px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">September 2024</p>
                        <div className="flex items-center gap-1 text-slate-400">
                          <button type="button" className="rounded-md px-2 py-1 hover:bg-slate-100">
                            ←
                          </button>
                          <button type="button" className="rounded-md px-2 py-1 hover:bg-slate-100">
                            →
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <label className="space-y-1 text-xs text-slate-500">
                          <span>Start</span>
                          <input
                            type="date"
                            value={rangeDraft.start}
                            onChange={(event) =>
                              setRangeDraft((current) => ({ ...current, start: event.target.value }))
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400"
                          />
                        </label>
                        <label className="space-y-1 text-xs text-slate-500">
                          <span>End</span>
                          <input
                            type="date"
                            value={rangeDraft.end}
                            onChange={(event) =>
                              setRangeDraft((current) => ({ ...current, end: event.target.value }))
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400"
                          />
                        </label>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={handleRangeReset}
                          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleRangeApply}
                          className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <select
                  value={selectedCategoryId}
                  onChange={(event) => setSelectedCategoryId(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-sky-400"
                >
                  {categoryOptions.map((option) => (
                    <option key={option.categoryId || 'all'} value={option.categoryId}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:bg-slate-50">
                  ◔
                </button>
                <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:bg-slate-50">
                  ▥
                </button>
              </div>
            }
          >
            <div className="grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start lg:px-6">
              <div className="overflow-hidden rounded-[20px] border border-slate-200/80">
                <div className="grid grid-cols-[2rem_minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-slate-200/70 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <div />
                  <div>Category</div>
                  <div className="text-right">Actual cost</div>
                  <div className="text-right">% of income</div>
                  <div className="text-right">Transactions</div>
                </div>

                <div className="divide-y divide-slate-100 bg-white">
                  {spendingItems.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-slate-500">
                      No spending transactions found in the selected range.
                    </div>
                  ) : spendingItems.map((item, index) => {
                    const incomeShareText = item.incomeShare === null ? 'No income' : `${item.incomeShare.toFixed(1)}%`;

                    return (
                      <div
                        key={item.categoryId}
                        className="grid grid-cols-[2rem_minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-4 px-4 py-4 text-sm hover:bg-slate-50/80"
                      >
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
                          />
                        </div>

                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: item.color }}
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{item.label}</span>
                              <span className="text-[10px] text-slate-400">{item.icon}</span>
                            </div>
                            <p className="truncate text-xs text-slate-400">Spent so far in the selected range</p>
                          </div>
                        </div>

                        <div className="text-right font-medium text-slate-900">{formatMoney(item.actual, 2)}</div>
                        <div className="text-right font-medium text-slate-700">{incomeShareText}</div>
                        <div className="text-right font-medium text-slate-500">
                          {item.transactionCount}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-5 py-5 shadow-[0_12px_35px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total spending</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                      {formatMoney(totals.totalSpent)}
                    </p>
                  </div>
                  <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                    {spendingItems.length} categories
                  </div>
                </div>

                <div className="relative mx-auto mt-5 flex h-[280px] w-[280px] items-center justify-center">
                  <svg viewBox="0 0 240 240" className="h-full w-full overflow-visible">
                    <circle cx="120" cy="120" r="94" fill="none" stroke="#f8fafc" strokeWidth="14" />
                    {chartSegments.map((segment, index) => {
                      const circumference = 2 * Math.PI * segment.radius;
                      const dashLength = circumference * Math.max(segment.share, 0.02);
                      const gapLength = circumference - dashLength;

                      return (
                        <circle
                          key={`${segment.categoryId}-${index}`}
                          cx="120"
                          cy="120"
                          r={segment.radius}
                          fill="none"
                          stroke={segment.color}
                          strokeWidth={segment.strokeWidth}
                          strokeLinecap="round"
                          strokeDasharray={`${dashLength} ${gapLength}`}
                          strokeDashoffset={circumference * 0.25}
                          transform="rotate(-90 120 120)"
                        />
                      );
                    })}
                  </svg>

                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Total spending</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                      {formatMoney(totals.totalSpent)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {spendingItems.map((item) => {
                    const share = item.incomeShare;

                    return (
                      <div key={`${item.categoryId}-legend`} className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-600">{item.label}</span>
                        </div>
                        <span className="font-medium text-slate-900">
                          {share === null ? 'No income' : `${share.toFixed(1)}% of income`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Transactions"
            subtitle="Review the latest activity in the selected range and export the visible rows."
            action={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-white px-3 py-2 text-sm font-medium text-sky-600 shadow-sm transition hover:bg-sky-50"
                >
                  <span>↓</span>
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRangeOpen(false)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
                >
                  <span>🗓</span>
                  <span>{rangeLabel}</span>
                </button>
                <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300 bg-sky-50 text-sky-600 shadow-sm transition hover:bg-sky-100">
                  ⌕
                </button>
              </div>
            }
          >
            <div className="grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:px-6">
              <div className="space-y-3">
                {isLoading ? (
                  <div className="rounded-[20px] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                    Loading transactions...
                  </div>
                ) : null}

                {!isLoading && transactionCards.map((transaction) => {
                  const isIncome = transaction.tone === 'income';
                  const isNeutral = transaction.tone === 'neutral';
                  const amountTone = isIncome ? 'text-emerald-500' : isNeutral ? 'text-slate-500' : 'text-rose-500';
                  const badgeTone = isIncome
                    ? 'bg-emerald-50 text-emerald-600'
                    : isNeutral
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-rose-50 text-rose-600';

                  return (
                    <article
                      key={transaction.id || `${transaction.merchant}-${transaction.date}`}
                      className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-4 rounded-[20px] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_10px_25px_rgba(15,23,42,0.04)]"
                    >
                      <div>
                        <p className="text-xs text-slate-400">{transaction.date}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{transaction.merchant}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeTone}`}>
                            {isIncome ? 'Income' : isNeutral ? 'Pending' : 'Expense'}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                            {transaction.categoryLabel}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`text-sm font-semibold ${amountTone}`}>
                          {transaction.amount > 0 ? '+' : ''}{formatMoney(transaction.amount)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatMoney(transaction.balance)} Balance
                        </p>
                      </div>

                      {transaction.id ? (
                        <Link
                          to="/transactions"
                          state={{ editTransactionId: transaction.id }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100"
                          aria-label={`Edit ${transaction.merchant}`}
                        >
                          ↗
                        </Link>
                      ) : (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-300">
                          ↗
                        </span>
                      )}
                    </article>
                  );
                })}
              </div>

              <aside className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                <h3 className="text-base font-semibold text-slate-900">Summary</h3>

                <dl className="mt-5 space-y-4 text-sm">
                  <div className="flex items-center justify-between gap-4 border-b border-dashed border-slate-200 pb-3">
                    <dt className="text-slate-500">Total transactions</dt>
                    <dd className="font-semibold text-slate-900">{summary.totalTransactions.toLocaleString('en-US')}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-dashed border-slate-200 pb-3">
                    <dt className="text-slate-500">Largest transaction</dt>
                    <dd className="font-semibold text-slate-900">{formatMoney(summary.largestTransaction)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-dashed border-slate-200 pb-3">
                    <dt className="text-slate-500">Average transaction</dt>
                    <dd className="font-semibold text-slate-900">{formatMoney(summary.averageTransaction)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-dashed border-slate-200 pb-3">
                    <dt className="text-slate-500">Total income</dt>
                    <dd className="font-semibold text-slate-900">{formatMoney(summary.grossIncome)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">Total spending</dt>
                    <dd className="font-semibold text-slate-900">{formatMoney(summary.grossSpending)}</dd>
                  </div>
                </dl>
              </aside>
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
