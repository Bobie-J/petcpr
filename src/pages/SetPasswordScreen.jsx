import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function SetPasswordScreen() {
  const [searchParams] = useSearchParams();
  const docId = searchParams.get('docId');
  const email = searchParams.get('email');
  const mode = searchParams.get('mode'); // reset または setup

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 💡 アクセス制限の判定を修正
  // modeがresetの場合はemailがあればOK、setupの場合はdocIdとemailの両方が必要
  const isValidAccess = email && (mode === 'reset' || (mode === 'setup' && docId) || docId);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) return alert('パスワードは6文字以上で入力してください。');
    if (password !== confirmPassword) return alert('パスワードが一致しません。');

    setLoading(true);

    try {
      // --------------------------------------------------
      // パターン①：パスワード再設定（Authに既存のユーザー）
      // --------------------------------------------------
      if (mode === 'reset' || (!docId && email)) {
        // ※ すでにAuthアカウントがある場合の処理
        // Firebase Authの仕様上、クライアント側で完全ログインなしにパスワードを直接書き換えるには
        // 本来Admin APIを使うか、再設定コード(oobCode)が必要です。
        // Admin API / Cloud Functions がある場合はそこへリクエストを送ります：
        
        const response = await fetch('YOUR_CLOUD_FUNCTION_URL_UPDATE_PASSWORD', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, newPassword: password })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'パスワードの変更に失敗しました。');
        }

        // 変更成功後、新パスワードで自動ログイン
        await signInWithEmailAndPassword(auth, email, password);
        alert('パスワードの再設定が完了いたしました。');
        navigate('/mypage');
      } 
      // --------------------------------------------------
      // パターン②：初回パスワード設定（Firestoreのみ存在するユーザー）
      // --------------------------------------------------
      else {
        const response = await fetch('YOUR_CLOUD_FUNCTION_URL_CREATE_USER', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: docId, // 👈 FirestoreのドキュメントIDをAuthのUIDに指定
            email: email,
            password: password
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'アカウント作成に失敗しました。');
        }

        // 作成成功後、自動ログイン
        await signInWithEmailAndPassword(auth, email, password);
        alert('パスワードの設定が完了いたしました。');
        navigate('/mypage');
      }

    } catch (err) {
      console.error("パスワード設定エラー:", err);
      alert("エラーが発生しました: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 💡 条件を満たさない場合のみエラー表示
  if (!isValidAccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 text-center max-w-md w-full">
          <p className="font-bold mb-2">⚠️ アクセスエラー</p>
          <p className="text-xs">URLが不正か、必要なパラメータが含まれていません。もう一度メールの送信からお試しください。</p>
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
          <h1 className="text-2xl font-black text-zinc-900">
            {mode === 'reset' ? 'パスワード再設定' : '初回パスワード設定'}
          </h1>
          <p className="text-xs text-zinc-500 mt-2">
            ログイン時に使用する新しいパスワードを入力してください。
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 mb-6 text-center">
          <span className="text-xs text-zinc-500 block mb-0.5">対象アカウント</span>
          <span className="text-sm font-bold text-zinc-800">{email}</span>
        </div>

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
            {loading ? '処理中...' : 'パスワードを設定してログイン'}
          </button>
        </form>

      </div>
    </div>
  );
}