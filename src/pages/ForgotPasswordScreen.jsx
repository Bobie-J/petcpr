import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import emailjs from '@emailjs/browser';
import { db, auth } from '../firebase';

// 💡 EmailJS設定
const EMAILJS_PUBLIC_KEY = 'HuLscpmd-82AbIGAM';
const EMAILJS_SERVICE_ID = 'service_1j4x24x';
const EMAILJS_TEMPLATE_RESET = 'template_34mtj8s'; // パスワード再設定用テンプレート
const EMAILJS_TEMPLATE_SETUP = 'template_rjhte95'; // 新規Auth作成案内用テンプレート

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetEmail = email.trim();
    if (!targetEmail) return alert('メールアドレスを入力してください');

    setLoading(true);
    setMessage(null);

    try {
      // 1. Firebase Auth に存在するか確認
      const signInMethods = await fetchSignInMethodsForEmail(auth, targetEmail);
      const existsInAuth = signInMethods.length > 0;

      // 2. Firestore の users コレクションに存在するか確認
      const snapUsers = await getDocs(
        query(collection(db, "users"), where("email", "==", targetEmail))
      );
      const existsInFirestore = !snapUsers.empty;

      if (!existsInAuth && !existsInFirestore) {
        setLoading(false);
        return alert('ご指定のメールアドレスは会員登録されていません。');
      }

      // ----------------------------------------------------
      // パターン①：Authに既に存在するユーザー（パスワード再設定）
      // ----------------------------------------------------
      if (existsInAuth) {
        const userDoc = existsInFirestore ? snapUsers.docs[0] : null;
        const userName = userDoc ? (userDoc.data().name || '会員') : '会員';

        // 💡 1. 送信URLを変数 'resetUrl' として定義
        const resetUrl = `${window.location.origin}/set-password?email=${encodeURIComponent(targetEmail)}&mode=reset`;

        // 💡 2. EmailJS送信 (setting_url に resetUrl をセット)
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_RESET,
          {
            to_email: targetEmail,
            user_name: userName,
            setting_url: resetUrl
          },
          EMAILJS_PUBLIC_KEY
        );

        setMessage({
          type: 'success',
          text: 'パスワード再設定メールを送信いたしました。メール内のリンクより再設定を行ってください。'
        });
      } 
      // ----------------------------------------------------
      // パターン②：Firestoreのみに存在するユーザー（新規Auth作成用）
      // ----------------------------------------------------
      else if (existsInFirestore) {
        const userDoc = snapUsers.docs[0];
        const docId = userDoc.id; // FirestoreのドキュメントID

        // 💡 1. 送信URLを変数 'setupLink' として定義
        const setupLink = `${window.location.origin}/set-password?docId=${docId}&email=${encodeURIComponent(targetEmail)}&mode=setup`;

        // 💡 2. EmailJS送信 (テンプレートに合わせて signup_url / setting_url を指定)
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_SETUP,
          {
            to_email: targetEmail,
            user_name: userDoc.data().name || '会員',
            setting_url: setupLink, // 👈 テンプレート側が setting_url の場合はこちら
            signup_url: setupLink   // 👈 テンプレート側が signup_url の場合はこちら
          },
          EMAILJS_PUBLIC_KEY
        );

        setMessage({
          type: 'success',
          text: 'アカウント設定のご案内メールを送信いたしました。メール内のリンクからパスワードを設定してください。'
        });
      }
    } catch (err) {
      console.error("処理エラー:", err);
      alert("処理中にエラーが発生しました: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-zinc-900 mb-4 text-center">
        パスワードのお忘れ・初期設定
      </h2>
      <p className="text-xs text-zinc-600 mb-6 leading-relaxed">
        ご登録済みのメールアドレスを入力してください。パスワード設定・再設定のご案内をお送りします。
      </p>

      {message ? (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg text-sm mb-6">
          {message.text}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 hover:bg-black text-white font-bold py-2.5 rounded-lg text-sm transition-colors disabled:bg-gray-400"
          >
            {loading ? '送信中...' : '送信する'}
          </button>
        </form>
      )}

      <div className="mt-4 text-center">
        <button
          onClick={() => navigate('/login')}
          className="text-xs text-zinc-500 hover:underline"
        >
          ← ログイン画面に戻る
        </button>
      </div>
    </div>
  );
}