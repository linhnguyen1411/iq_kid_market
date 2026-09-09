import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Coins, ArrowUpRight, ArrowDownLeft, 
  Sparkles, CheckCircle2, QrCode, X, DollarSign, ShieldCheck, TrendingUp, Copy, Check 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const WalletPage: React.FC = () => {
  const { user, wallet, updateUserWallet, refreshSession, authToken, openAuthModal } = useAuth();

  const [topupAmount, setTopupAmount] = useState<number>(50000);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [topupIntent, setTopupIntent] = useState<{
    tx_id: string;
    amount: number;
    qr_url: string;
    static_qr_url?: string;
    bank_name: string;
    bank_account: string;
    account_holder: string;
    transfer_content: string;
  } | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Creator earnings
  const [creatorEarnings, setCreatorEarnings] = useState<any>(null);

  const isCreatorOrTeacher = user?.role === 'teacher' || user?.role === 'creator' || user?.role === 'admin';

  useEffect(() => {
    if (isCreatorOrTeacher) {
      api.wallet.getCreatorEarnings()
        .then((data) => setCreatorEarnings(data))
        .catch((err) => console.warn('Lỗi tải thu nhập tác giả:', err));
    }
  }, [isCreatorOrTeacher, user?.id]);

  if (!authToken || !user) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl">🪙</div>
        <h2 className="mb-2 text-xl font-black text-slate-800">Đăng nhập để mở ví xu</h2>
        <p className="mb-5 text-sm text-slate-500">
          Ví và lịch sử giao dịch chỉ khả dụng sau khi xác thực JWT.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-white"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  const topupOptions = [
    { amount: 20000, label: '20.000 xu', bonus: '+0%' },
    { amount: 50000, label: '50.000 xu', bonus: '+10% bonus', popular: true },
    { amount: 100000, label: '100.000 xu', bonus: '+20% bonus' },
    { amount: 200000, label: '200.000 xu', bonus: '+25% bonus' },
    { amount: 500000, label: '500.000 xu', bonus: '+30% bonus' },
  ];

  const handleCreateIntent = async () => {
    if (!user) return;
    setLoading(true);
    setFeedbackMsg(null);
    try {
      const data = await api.wallet.createTopupIntent(user.id, topupAmount);
      setTopupIntent(data);
      setShowQRModal(true);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', message: err.message || 'Lỗi tạo yêu cầu nạp tiền VietQR' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTopup = async () => {
    if (!user || !topupIntent) return;
    setLoading(true);
    try {
      const res = await api.wallet.confirmTopup(user.id, topupIntent.tx_id, topupIntent.amount);
      if (res.success) {
        const nextBal = Number(res.balance);
        if (Number.isFinite(nextBal)) {
          updateUserWallet(nextBal);
        }
        await refreshSession();
        setShowQRModal(false);
        setTopupIntent(null);
        setFeedbackMsg({ type: 'success', message: res.message || 'Đã nạp tiền thành công vào ví!' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', message: err.message || 'Lỗi xác nhận nạp tiền' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8 text-left">
      {/* Wallet Balance Hero Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-6 bg-gradient-to-tr from-slate-900 via-indigo-950 to-purple-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-500/20 relative overflow-hidden flex flex-col justify-between h-56">
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <Coins className="w-6 h-6 text-amber-400 animate-spin" />
              <span className="font-mono text-xs font-bold tracking-widest text-indigo-300">VIETQR NAPAS 24/7</span>
            </div>
            <span className="text-[10px] font-bold bg-white/10 px-3 py-1 rounded-full border border-white/20">
              Chính Thức
            </span>
          </div>

          <div className="z-10 my-auto">
            <span className="text-xs text-slate-400 block mb-1">Số dư khả dụng</span>
            <div className="text-3xl md:text-4xl font-black text-amber-400 font-mono tracking-tight">
              {(wallet?.balance || 0).toLocaleString('vi-VN')} <span className="text-lg text-white font-sans">xu</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 z-10 pt-2 border-t border-white/10">
            <span>Chủ ví: <strong className="text-white font-bold">{user?.name}</strong></span>
            <span className="font-mono">ID: {user?.id}</span>
          </div>

          {/* Background shapes */}
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl"></div>
          <div className="absolute -left-8 -top-8 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl"></div>
        </div>

        {/* Top-up Preset Selector */}
        <div className="md:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between h-full">
          <div>
            <h3 className="text-base font-black text-slate-800 mb-1 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <span>NẠP XU VÀO VÍ</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Chọn mệnh giá nạp qua quét mã VietQR ngân hàng Napas 24/7 tự động
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {topupOptions.map((opt) => (
                <button
                  key={opt.amount}
                  onClick={() => setTopupAmount(opt.amount)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    topupAmount === opt.amount
                      ? 'bg-indigo-50 border-indigo-600 shadow-2xs'
                      : 'bg-slate-50 border-slate-200/60 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-black text-slate-800 block">{opt.label}</span>
                  <span className="text-[10px] text-indigo-600 font-bold block mt-0.5">{opt.bonus}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={loading}
            onClick={handleCreateIntent}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>SINH MÃ VIETQR ({topupAmount.toLocaleString('vi-VN')} Đ)</span>
          </button>
        </div>
      </div>

      {/* Feedback Message */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedbackMsg.message}
        </div>
      )}

      {/* Creator Revenue Dashboard for Teachers / Creators */}
      {isCreatorOrTeacher && creatorEarnings && (
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-purple-500/30">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-purple-300 block mb-1">
                DOANH THU TÁC GIẢ (CHIA SẺ 80%)
              </span>
              <h3 className="text-xl font-black">Báo Cáo Thu Nhập Sáng Tạo 🎨</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl">
              📊
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <span className="text-[10px] text-slate-300 font-bold uppercase block mb-1">Tổng Thu Nhập</span>
              <span className="text-2xl font-black text-amber-300 font-mono">
                {(creatorEarnings.totalRevenue || 0).toLocaleString('vi-VN')} xu
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <span className="text-[10px] text-slate-300 font-bold uppercase block mb-1">Số Lượt Mua Bản Quyền</span>
              <span className="text-2xl font-black text-white font-mono">
                {creatorEarnings.totalSalesCount || 0} lượt
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <span className="text-[10px] text-slate-300 font-bold uppercase block mb-1">Tỷ Lệ Nhận</span>
              <span className="text-2xl font-black text-emerald-300 font-mono">80.0%</span>
            </div>
          </div>
        </div>
      )}

      {/* Transactions History */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
          <span>🧾</span>
          <span>LỊCH SỬ GIAO DỊCH VÍ</span>
        </h3>

        <div className="flex flex-col gap-2">
          {(wallet?.transactions || []).map((tx, idx) => (
            <div
              key={tx.id || idx}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    tx.amount > 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {tx.amount > 0 ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">{tx.detail || tx.type}</h5>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {tx.date || tx.created_at || 'Hôm nay'}
                  </span>
                </div>
              </div>

              <span
                className={`font-mono text-xs font-black ${
                  tx.amount > 0 ? 'text-emerald-600' : 'text-slate-800'
                }`}
              >
                {tx.amount > 0 ? `+${tx.amount.toLocaleString('vi-VN')}` : `${tx.amount.toLocaleString('vi-VN')}`} xu
              </span>
            </div>
          ))}

          {(!wallet?.transactions || wallet.transactions.length === 0) && (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">
              Chưa có giao dịch nào được ghi nhận.
            </div>
          )}
        </div>
      </div>

      {/* VietQR Modal */}
      {showQRModal && topupIntent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 text-center relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              VIETQR CHUYỂN KHOẢN 24/7
            </span>

            <h3 className="text-base sm:text-lg font-black text-slate-800 mt-2 mb-1">
              Quét Mã Để Nạp {topupIntent.amount.toLocaleString('vi-VN')} Xu
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mb-3">
              Mở App Ngân hàng bất kỳ để quét mã QR Napas thanh toán tức thì
            </p>

            <div className="bg-white p-2 sm:p-3 rounded-2xl border border-slate-200 inline-block mb-3 shadow-xs">
              <img
                src={topupIntent.static_qr_url || '/techcombank_qr.png'}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = topupIntent.qr_url;
                }}
                alt="VietQR Techcombank Napas"
                className="w-44 sm:w-56 h-auto mx-auto rounded-xl"
              />
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-left text-xs space-y-2 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Ngân hàng:</span>
                <strong className="text-slate-800 font-semibold">{topupIntent.bank_name}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Số tài khoản:</span>
                <div className="flex items-center gap-1.5">
                  <strong className="text-slate-800 font-mono text-sm">{topupIntent.bank_account}</strong>
                  <button
                    type="button"
                    onClick={() => handleCopy(topupIntent.bank_account, 'account')}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                    title="Sao chép số tài khoản"
                  >
                    {copiedField === 'account' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Chủ tài khoản:</span>
                <strong className="text-slate-800 uppercase font-semibold">{topupIntent.account_holder}</strong>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60">
                <span className="text-slate-400">Nội dung CK:</span>
                <div className="flex items-center gap-1.5">
                  <strong className="text-indigo-600 font-mono text-sm">{topupIntent.transfer_content}</strong>
                  <button
                    type="button"
                    onClick={() => handleCopy(topupIntent.transfer_content, 'content')}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                    title="Sao chép nội dung chuyển khoản"
                  >
                    {copiedField === 'content' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              disabled={loading}
              onClick={handleConfirmTopup}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Đang kiểm tra giao dịch...' : 'TÔI ĐÃ CHUYỂN TIỀN THÀNH CÔNG'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletPage;
