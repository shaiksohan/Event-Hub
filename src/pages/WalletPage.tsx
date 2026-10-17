import { useEffect, useState, useCallback } from 'react';
import {
  Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Plus, Minus,
  TrendingUp, Receipt, Download, ArrowLeft, CheckCircle, Clock,
  XCircle, Smartphone, Gift,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import type { Wallet, WalletTransaction, WalletTransactionSource } from '@/lib/types';
import { WALLET_SOURCE_LABELS } from '@/lib/types';

export default function WalletPage() {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [showWithdraw, setShowWithdraw] = useState(false);

  const fetchWallet = useCallback(async () => {
    if (!user) return;
    const { data: w } = await supabase.rpc('get_or_create_wallet').maybeSingle();
    if (w) setWallet(w as Wallet);

    const { data: txs } = await supabase
      .from('wallet_transactions')
      .select('*')
      .order('created_at', { ascending: false });
    setTransactions((txs ?? []) as WalletTransaction[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchWallet();
  }, [user, fetchWallet]);

  const isProvider = profile?.role === 'provider';

  const totalCredit = transactions
    .filter((t) => t.type === 'credit' && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalDebit = transactions
    .filter((t) => t.type === 'debit' && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const filteredTx = transactions.filter((t) =>
    filter === 'all' ? true : t.type === filter
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#bdefff] border-t-[#0879c9] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/profile')}
          className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-[#10213f]">My Wallet</h1>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0879c9] via-[#0a6bc4] to-[#10213f] p-6 mb-5 shadow-xl shadow-[#0879c9]/20">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-[#e32d68]/10 blur-2xl translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-white/70 text-sm font-medium">
              {isProvider ? 'Available Earnings' : 'Available Balance'}
            </p>
            <WalletIcon className="w-5 h-5 text-white/40" />
          </div>
          <p className="text-4xl font-black text-white mb-4">
            ₹{(Number(wallet?.balance) || 0).toFixed(2)}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowWithdraw(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold backdrop-blur-sm transition-all duration-200 hover:scale-[1.03]"
            >
              <ArrowUpRight className="w-4 h-4" /> Withdraw
            </button>
            <button
              onClick={() => navigate('/refer')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold backdrop-blur-sm transition-all duration-200 hover:scale-[1.03]"
            >
              <Gift className="w-4 h-4" /> Earn More
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-400">Total Credited</span>
          </div>
          <p className="text-xl font-bold text-gray-900">₹{totalCredit.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-xs font-medium text-gray-400">Total Debited</span>
          </div>
          <p className="text-xl font-bold text-gray-900">₹{totalDebit.toFixed(2)}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'credit', 'debit'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === tab
                ? 'bg-[#0879c9] text-white shadow-sm shadow-[#0879c9]/20'
                : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-200'
            }`}
          >
            {tab === 'all' ? 'All' : tab === 'credit' ? 'Money In' : 'Money Out'}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gray-400" />
            <h3 className="font-bold text-gray-900">Transaction History</h3>
          </div>
          <span className="text-xs text-gray-400">{filteredTx.length} transactions</span>
        </div>

        {filteredTx.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-7 h-7 text-gray-200" />
            </div>
            <p className="text-gray-400 text-sm">No transactions yet</p>
            <p className="text-gray-400 text-xs mt-1">
              {isProvider
                ? 'Your booking payouts and withdrawals will appear here.'
                : 'Your refunds, top-ups, and withdrawals will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTx.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>

      {showWithdraw && (
        <WithdrawModal
          balance={Number(wallet?.balance) || 0}
          upiId={profile?.upi_id || ''}
          onClose={() => setShowWithdraw(false)}
          onSuccess={() => {
            setShowWithdraw(false);
            fetchWallet();
          }}
        />
      )}
    </div>
  );
}

function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const isCredit = tx.type === 'credit';
  const sourceLabel = WALLET_SOURCE_LABELS[tx.source as WalletTransactionSource] || tx.source;
  const statusIcon =
    tx.status === 'completed' ? (
      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
    ) : tx.status === 'pending' ? (
      <Clock className="w-3.5 h-3.5 text-amber-500" />
    ) : (
      <XCircle className="w-3.5 h-3.5 text-red-400" />
    );

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-50 hover:border-gray-100 transition-colors">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isCredit ? 'bg-green-50' : 'bg-red-50'
        }`}
      >
        {isCredit ? (
          <Plus className="w-5 h-5 text-green-600" />
        ) : (
          <Minus className="w-5 h-5 text-red-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {tx.description || sourceLabel}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-gray-400">{sourceLabel}</span>
          <span className="text-gray-200">·</span>
          <span className="text-xs text-gray-400">
            {new Date(tx.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span className="text-gray-200">·</span>
          {statusIcon}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p
          className={`text-sm font-bold ${
            isCredit ? 'text-green-600' : 'text-red-500'
          }`}
        >
          {isCredit ? '+' : '−'}₹{Number(tx.amount).toFixed(2)}
        </p>
        <p className="text-xs text-gray-300 capitalize mt-0.5">{tx.status}</p>
      </div>
    </div>
  );
}

function WithdrawModal({
  balance,
  upiId,
  onClose,
  onSuccess,
}: {
  balance: number;
  upiId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [upi, setUpi] = useState(upiId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (amt > balance) {
      setError('Insufficient balance');
      return;
    }
    if (!upi.trim() || !upi.includes('@')) {
      setError('Enter a valid UPI ID');
      return;
    }

    setLoading(true);
    const { error: rpcError } = await supabase.rpc('record_wallet_transaction', {
      p_type: 'debit',
      p_amount: amt,
      p_source: 'withdrawal',
      p_description: `Withdrawal to ${upi}`,
      p_status: 'pending',
    });

    setLoading(false);
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSuccess(true);
      setTimeout(() => onSuccess(), 1500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e9f8ff] flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-[#0879c9]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Withdraw Money</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-5 h-5 rotate-45" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-6">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-3">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-gray-900 font-semibold">Withdrawal requested!</p>
            <p className="text-sm text-gray-400 mt-1">
              Your withdrawal is being processed and will be sent to your UPI ID.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Available Balance
              </label>
              <div className="px-4 py-3 rounded-xl bg-gray-50 text-gray-500 font-semibold">
                ₹{balance.toFixed(2)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Withdrawal Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0879c9] focus:ring-1 focus:ring-[#0879c9] outline-none transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                UPI ID <span className="font-normal text-gray-400">(where to send money)</span>
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={upi}
                  onChange={(e) => setUpi(e.target.value)}
                  placeholder="yourname@upi"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0879c9] focus:ring-1 focus:ring-[#0879c9] outline-none transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#0879c9] hover:bg-[#0668a8] disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4" /> Request Withdrawal
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
