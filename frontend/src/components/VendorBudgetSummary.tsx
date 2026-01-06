'use client';

import { useState, useEffect } from 'react';
import { getVendorSummary, VendorSummary } from '@/lib/api';

interface VendorBudgetSummaryProps {
  token: string;
  weddingId: string;
}

export default function VendorBudgetSummary({ token, weddingId }: VendorBudgetSummaryProps) {
  const [summary, setSummary] = useState<VendorSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, [token, weddingId]);

  const loadSummary = async () => {
    try {
      setIsLoading(true);
      const data = await getVendorSummary(token, weddingId);
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budget summary');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!summary || summary.summary.total_vendors === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Vendor Budget
        </h3>
        <p className="text-gray-500 text-center py-4">
          Add vendors to track your wedding budget
        </p>
      </div>
    );
  }

  const { summary: stats, upcoming_payments, overdue_payments } = summary;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Vendor Budget
      </h3>

      {/* Budget Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">Total Budget</p>
          <p className="text-xl font-semibold text-gray-800">{formatCurrency(stats.total_contract)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">Paid</p>
          <p className="text-xl font-semibold text-green-600">{formatCurrency(stats.total_paid)}</p>
        </div>
        <div className="bg-rose-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">Remaining</p>
          <p className="text-xl font-semibold text-rose-600">{formatCurrency(stats.balance_due)}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>{stats.percent_paid}% paid</span>
          <span>{stats.total_vendors} vendors</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(stats.percent_paid, 100)}%` }}
          />
        </div>
      </div>

      {/* Overdue Payments Alert */}
      {overdue_payments.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium text-red-700">Overdue Payments</span>
          </div>
          <div className="space-y-2">
            {overdue_payments.slice(0, 3).map((payment, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <div>
                  <span className="text-red-800">{payment.vendor_name}</span>
                  <span className="text-red-500 ml-2">({payment.description})</span>
                </div>
                <div className="text-right">
                  <span className="font-medium text-red-700">{formatCurrency(payment.amount)}</span>
                  <span className="text-red-500 ml-2">was due {formatDate(payment.due_date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Payments */}
      {upcoming_payments.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">Upcoming Payments</h4>
          <div className="space-y-2">
            {upcoming_payments.slice(0, 5).map((payment, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className="text-gray-800">{payment.vendor_name}</span>
                  <span className="text-gray-400 ml-2">({payment.description})</span>
                </div>
                <div className="text-right">
                  <span className="font-medium text-gray-800">{formatCurrency(payment.amount)}</span>
                  <span className="text-gray-400 ml-2">due {formatDate(payment.due_date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcoming_payments.length === 0 && overdue_payments.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-2">No upcoming payments scheduled</p>
      )}
    </div>
  );
}
