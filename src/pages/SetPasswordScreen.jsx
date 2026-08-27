import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  confirmPasswordReset, 
  signInWithEmailAndPassword, 
  updatePassword,
  verifyPasswordResetCode 
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function SetPasswordScreen() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email');
  const keyParam = searchParams.get('key');       // 一時キー
  const oobCode = searchParams.get('oobCode');   // Firebase標準トークン
  const uidParam = searchParams.get('uid');

  const [email, setEmail] = useState(emailParam || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);

  const navigate = useNavigate();

  // URLの検証
  useEffect(() => {
    // パターン1: oobCode (Firebase標準リセット)
    if (oobCode) {
      verifyPasswordResetCode(auth, oobCode)
        .then((userEmail) => {
          setEmail(userEmail);
          setIsValid(true);
        })
        .catch(() => setIsValid(false))
        .finally(() => setVerifying(false));
    } 
    // パターン2: keyParam + emailParam (一時キー)
    else if (keyParam && emailParam) {
      setIsValid(true);
      setVerifying(false);
    } 
    else {
      setIsValid(false);
      setVerifying(false);
    }
  }, [oobCode, keyParam, emailParam]);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) return alert('パスワードは6文字以上で入力してください。');
    if (password !== confirmPassword) return alert('パスワードが一致しません。');

    setLoading(true);

    try {
      // 1. Firebase標準 oobCode がある場合
      if (oobCode) {
        await confirmPasswordReset(auth, oobCode, password);
      } 
      // 2. 独自の一時キーがある場合
      else if (keyParam && emailParam) {
        await signInWithEmailAndPassword(auth, emailParam, keyParam);
        await updatePassword(auth.currentUser, password);
        if (uidParam) {
          await updateDoc(doc(db, "users", uidParam), { needsPasswordSetup: false });
        }
      } else {
        throw new Error("無効なアクセスです。");
      }

      alert("パスワードを保存しました。");
      navigate('/login');
    } catch (error) {
      console.error("Setting Error:", error);
      alert("エラー: リンクの期限が切れているか、既に使用されています。");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <p className="text-zinc-500 text-sm">認証情報を確認中...</p>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 text-center max-w-md w-full">
          <p className="font-bold mb-2">⚠️ アクセスエラー</p>
          <p className="text-xs">URLが不正か、有効期限が切れています。もう一度メールの送信からお試しください。</p>
          <button
            onClick={() => navigate('/forgot-password')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold"
          >
            再設定画面へ戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto flex-grow w-full">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 sm:p-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-red-100 text-red-800 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl">
            🔒
          </div>
          <h1 className="text-2xl font-black text-zinc-900">パスワード設定</h1>
          <p className="text-xs text-zinc-500 mt-2">新しいパスワードを入力してください。</p>
        </div>

        {email && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 mb-6 text-center">
            <span className="text-xs text-zinc-500 block mb-0.5">対象アカウント</span>
            <span className="text-sm font-bold text-zinc-800">{email}</span>
          </div>
        )}

        <form onSubmit={handleSetPassword} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              新しいパスワード <span className="text-red-500">*</span> (半角英数6文字以上)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              新しいパスワード (確認用) <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-800 hover:bg-red-900 text-white font-bold py-3 rounded-lg text-sm shadow transition-colors disabled:bg-gray-400 mt-2"
          >
            {loading ? '保存中...' : 'パスワードを更新して保存'}
          </button>
        </form>
      </div>
    </div>
  );
}