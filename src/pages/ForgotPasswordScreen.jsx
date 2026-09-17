import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { db } from '../firebase';

// 💡 EmailJS の設定情報（環境変数または定数から読み込み）
const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID || 'service_1j4x24x';
const EMAILJS_TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID || 'template_34mtj8s';
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY || 'HuLscpmd-82AbIGAM';

export default function ForgotPasswordScreen() {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const handleSendMail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const trimmedEmail = email.trim();

      // 1. DB照合（ユーザーが存在するか確認）
      const q = query(collection(db, "users"), where("email", "==", trimmedEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setIsError(true);
        setMessage("アカウントが存在しません。");
        setLoading(false);
        return;
      }

      // 2. 本人のみが開けるパスワード設定画面のURLを生成
      const resetUrl = `${window.location.origin}/set-password?email=${encodeURIComponent(trimmedEmail)}`;

      // 3. EmailJS でメール送信（認証セッションは作られません）
      const templateParams = {
        to_email: trimmedEmail,
        email: trimmedEmail,
        reset_url: resetUrl,
        link: resetUrl
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      setIsError(false);
      setMessage("パスワード設定用の案内メールを送信しました。届いたメール内のリンクから設定を行ってください。");

    } catch (error) {
      console.error("EmailJS Error:", error);
      setIsError(true);
      setMessage("メール送信に失敗しました。設定情報をご確認ください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto flex-grow w-full">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">パスワード設定・再設定</h1>
        <p className="text-xs text-zinc-500">
          ご登録のメールアドレスを入力してください。パスワード設定用のリンクをお送りします。
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 sm:p-10">
        <form onSubmit={handleSendMail} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-2">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@petcpr.jp"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-300"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-800 hover:bg-red-900 text-white font-bold py-3.5 rounded-lg text-sm shadow disabled:bg-gray-400"
          >
            {loading ? '送信中...' : '設定メールを送信'}
          </button>
        </form>

        {message && (
          <div className={`mt-6 p-4 text-xs font-bold rounded-lg text-center border ${
            isError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-800 border-green-200'
          }`}>
            {message}
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-xs text-zinc-600 underline hover:text-zinc-900"
          >
            ログイン画面に戻る
          </button>
        </div>
      </div>
    </div>
  );
}