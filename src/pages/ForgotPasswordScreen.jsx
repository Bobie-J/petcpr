import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import emailjs from '@emailjs/browser';
import { db, auth } from '../firebase';

// 💡 EmailJS設定値（2種類のテンプレートを用意）
const EMAILJS_PUBLIC_KEY = 'HuLscpmd';
const EMAILJS_SERVICE_ID = 'service_1j4x24x';
const EMAILJS_TEMPLATE_SETUP = 'template_34mtj8s'; // ① 初回アカウント作成・移行用
const EMAILJS_TEMPLATE_RESET = 'template_rjhte95'; // ② パスワード再設定用

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
      const q = query(collection(db, "users"), where("email", "==", targetEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setLoading(false);
        return alert("ご指定のメールアドレスは登録されていません。");
      }

      const oldDoc = querySnapshot.docs[0];
      const userData = oldDoc.data();

      // ----------------------------------------------------
      // パターンA: Auth未作成 / 移行未済ユーザー（初回アカウント設定）
      // -> EMAILJS_TEMPLATE_SETUP を使用して初回設定メールを送信
      // ----------------------------------------------------
      if (oldDoc.id.includes('@')) {
        const tempKey = Math.random().toString(36).slice(-12) + "!";
        const userCredential = await createUserWithEmailAndPassword(auth, targetEmail, tempKey);
        const uid = userCredential.user.uid;

        await setDoc(doc(db, "users", uid), { ...userData, needsPasswordSetup: true });
        await deleteDoc(doc(db, "users", oldDoc.id));

        const settingUrl = `${window.location.origin}/set-password?uid=${uid}&email=${encodeURIComponent(targetEmail)}&key=${tempKey}`;
        
        // 初回設定用のテンプレートで送信
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_SETUP,
          { to_email: targetEmail, setting_url: settingUrl },
          EMAILJS_PUBLIC_KEY
        );
      } 
      // ----------------------------------------------------
      // パターンB: 既存Authユーザー（パスワード再設定）
      // -> EMAILJS_TEMPLATE_RESET を使用して再設定メールを送信
      // ----------------------------------------------------
      else {
        // Firebase標準の再設定処理（独自リンクまたは標準リンク）
        const actionCodeSettings = {
          url: `${window.location.origin}/set-password`,
          handleCodeInApp: true,
        };
        await sendPasswordResetEmail(auth, targetEmail, actionCodeSettings);

        // ※もし再設定メールも EmailJS から送信したい場合は、
        //  上の sendPasswordResetEmail の代わりに EMAILJS_TEMPLATE_RESET を指定して送信します。
      }

      setMessage({
        type: 'success',
        text: '案内メールを送信いたしました。メール内のリンクより設定を行ってください。'
      });
    } catch (error) {
      console.error("Reset Error:", error);
      alert("エラーが発生しました: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-zinc-900 mb-4 text-center">
        パスワードのお忘れ・設定
      </h2>
      <p className="text-xs text-zinc-600 mb-6 leading-relaxed text-center">
        ご登録済みのメールアドレスを入力してください。設定用の案内メールをお送りします。
      </p>

      {message ? (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg text-sm mb-6 text-center">
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