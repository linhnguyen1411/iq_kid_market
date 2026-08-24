import React, { useState } from 'react';
import { 
  X, Coins, CheckCircle2, AlertCircle, 
  CreditCard, Sparkles, Play, ArrowRight 
} from 'lucide-react';
import { Game } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { playSynthSound } from './game-engines/soundUtils';

interface PurchaseModalProps {
  game: Game;
  onClose: () => void;
  onSuccess: (game: Game) => void;
  onNavigateToWallet: () => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  game,
  onClose,
  onSuccess,
  onNavigateToWallet,
}) => {
  const { user, wallet, addPurchase, updateUserWallet, openAuthModal } = useAuth();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPurchasedSuccess, setIsPurchasedSuccess] = useState(false);

  const currentBalance = wallet?.balance || 0;
  const remainingBalance = currentBalance - game.price;
  const isBalanceEnough = remainingBalance >= 0;

  const handleConfirmPurchase = async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    if (!isBalanceEnough) {
      setErrorMsg('Số dư ví của bạn không đủ để mua game này!');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.games.purchaseGame(user.id, game.id);
      if (res.success) {
        playSynthSound('victory');
        addPurchase(game.id);
        updateUserWallet(res.newBalance);
        setIsPurchasedSuccess(true);
      }
    } catch (err: any) {
      playSynthSound('incorrect');
      setErrorMsg(err.message || 'Giao dịch mua game thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative text-left overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!isPurchasedSuccess ? (
          <>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              MỞ KHÓA 15 MÀN CÒN LẠI BẰNG VÍ
            </span>

            {/* Game Info Preview */}
            <div className="flex items-center gap-3.5 my-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-3xl shadow-2xs shrink-0">
                {game.thumbnail || '🎮'}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-slate-800 line-clamp-1">{game.title}</h4>
                <span className="text-xs text-slate-500 block">5 màn đầu miễn phí · mở khóa phần còn lại</span>
                <span className="text-xs font-mono font-black text-pink-600">
                  {game.price.toLocaleString('vi-VN')} xu
                </span>
              </div>
            </div>

            {/* Price & Balance Calculation Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs mb-4">
              <div className="flex items-center justify-between text-slate-600">
                <span>Số dư ví hiện tại:</span>
                <span className="font-mono font-bold text-slate-800">{currentBalance.toLocaleString('vi-VN')} xu</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Giá mở khóa màn còn lại:</span>
                <span className="font-mono font-bold text-pink-600">-{game.price.toLocaleString('vi-VN')} xu</span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold">
                <span className={isBalanceEnough ? 'text-slate-700' : 'text-rose-600'}>
                  {isBalanceEnough ? 'Số dư sau thanh toán:' : 'Số xu còn thiếu:'}
                </span>
                <span className={`font-mono font-black ${isBalanceEnough ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isBalanceEnough
                    ? `${remainingBalance.toLocaleString('vi-VN')} xu`
                    : `${Math.abs(remainingBalance).toLocaleString('vi-VN')} xu`}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            {isBalanceEnough ? (
              <button
                disabled={loading}
                onClick={handleConfirmPurchase}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-98"
              >
                <Coins className="w-4 h-4 text-amber-300" />
                <span>{loading ? 'Đang mở khóa...' : `MỞ KHÓA BẰNG ${game.price.toLocaleString('vi-VN')} XU 🪙`}</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs font-medium text-center">
                  ⚠️ Số dư trong ví của bạn không đủ để mua game này. Hãy nạp thêm xu để tiếp tục!
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToWallet();
                  }}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>NẠP THÊM XU VÀO VÍ NGAY ⚡</span>
                </button>
              </div>
            )}
          </>
        ) : (
          /* Success Screen */
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-md animate-bounce">
              🎉
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-800">
                Đã mở khóa toàn bộ màn chơi!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                "{game.title}" — bạn có thể chơi tiếp các màn sau màn free.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onSuccess(game);
              }}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>VÀO CHƠI NGAY (MÀN 1) 🚀</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseModal;
