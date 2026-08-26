import React, { useState } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { db } from '../firebase';

// 🔑 EmailJS の設定情報
const EMAILJS_SERVICE_ID = 'service_1j4x24x';
const EMAILJS_PUBLIC_KEY = 'HuLscpmd-82AbIGAM';

// 💡 問い合わせ種別ごとの Template ID
const EMAILJS_TEMPLATE_ID_GENERAL = 'template_wy50b7o'; // 一般問い合わせ用
const EMAILJS_TEMPLATE_ID_REQUEST = 'template_cvyzrsg'; // 開催依頼用

// 💡 [ラベル](URL) 記法を <a href="URL">ラベル</a> に変換する関数
const renderFormattedAnswer = (text) => {
  if (!text) return null;

  // [ラベル](URL) を正規表現で抽出
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // リンク前のテキストを押し込み
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // リンク要素を生成
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline hover:text-blue-800 mx-1 font-semibold"
      >
        {match[1]}
      </a>
    );
    lastIndex = regex.lastIndex;
  }

  // 残りのテキストを押し込み
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
};

const ContactScreen = ({ contactType, setContactType, contactForm, setContactForm, faqList = [] }) => {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      alert("必須項目をすべて入力してください。");
      return;
    }

    setIsSubmitting(true);

    try {
      // ① reCAPTCHA v3 トークン取得
      let token = "";
      if (executeRecaptcha) {
        try {
          token = await executeRecaptcha("contact_submit");
        } catch (rErr) {
          console.warn("reCAPTCHA 取得スキップ:", rErr);
        }
      }

      const subjectText = contactType === 'general' ? (contactForm.subject || '件名なし') : '【出張・開催依頼のご相談】';

      // ② Firestore（データベース）へ保存
      await addDoc(collection(db, "contacts"), {
        type: contactType,
        name: contactForm.name,
        email: contactForm.email,
        subject: subjectText,
        message: contactForm.message,
        location: contactForm.location || "",
        date: contactForm.date || "",
        recaptchaToken: token,
        createdAt: serverTimestamp()
      });

      // ③ 種別に応じて送信するテンプレートIDを切り替え 🔀
      const targetTemplateId = contactType === 'general' 
        ? EMAILJS_TEMPLATE_ID_GENERAL 
        : EMAILJS_TEMPLATE_ID_REQUEST;

      // テンプレートへ渡すパラメータ
      const templateParams = {
        name: contactForm.name,       // {{name}}
        email: contactForm.email,     // {{email}}
        subject: subjectText,         // {{subject}}
        message: contactForm.message, // {{message}}
        location: contactForm.location || "未記入", // 出張依頼用 {{location}}
        date: contactForm.date || "未記入",         // 出張依頼用 {{date}}
      };

      // ④ EmailJS 送信実行
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        targetTemplateId,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      alert("お問い合わせを送信いたしました。確認メールをご確認ください！");
      
      // フォームの初期化
      setContactForm({ name: '', email: '', subject: '', message: '', location: '', date: '' });

    } catch (error) {
      console.error("送信・メール配信エラー:", error);
      alert("送信処理中にエラーが発生しました: " + (error.text || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-4 py-12 flex-grow w-full">
      <h1 className="text-3xl font-black text-center text-zinc-900 mb-2">お問い合わせ & 開催依頼</h1>
      <p className="text-center text-zinc-500 text-sm mb-8">講習の受講希望、企業・団体様からの出張開催依頼などはこちらから承ります。</p>
      
      {/* 問い合わせ種別切り替えボタン */}
      <div className="flex justify-center gap-3 mb-10">
        <button 
          type="button"
          onClick={() => setContactType('general')} 
          className={`px-5 py-2.5 rounded-md font-bold text-sm border transition-all ${contactType === 'general' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-gray-300 hover:bg-gray-50'}`}
        >
          ✉️ 一般問い合わせ
        </button>
        <button 
          type="button"
          onClick={() => setContactType('request')} 
          className={`px-5 py-2.5 rounded-md font-bold text-sm border transition-all ${contactType === 'request' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-gray-300 hover:bg-gray-50'}`}
        >
          🎪 出張・開催依頼のご相談
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">お名前 / 担当者名 <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required 
                placeholder="ペット 太郎" 
                value={contactForm.name || ''} 
                onChange={e => setContactForm({ ...contactForm, name: e.target.value })} 
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">メールアドレス <span className="text-red-500">*</span></label>
              <input 
                type="email"
                inputMode="email" 
                required 
                placeholder="petcpr@example.com" 
                value={contactForm.email || ''} 
                onChange={e => setContactForm({ ...contactForm, email: e.target.value })} 
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" 
              />
            </div>

            {/* 一般問い合わせの場合：件名 */}
            {contactType === 'general' && (
              <div className="animate-fadeIn">
                <label className="block text-sm font-bold text-zinc-700 mb-1">件名 <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="例：受講内容について" 
                  value={contactForm.subject || ''} 
                  onChange={e => setContactForm({ ...contactForm, subject: e.target.value })} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" 
                />
              </div>
            )}

            {/* 出張開催依頼の場合：開催場所・時期 */}
            {contactType === 'request' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">開催希望場所（都道府県・会場等）</label>
                  <input 
                    type="text" 
                    placeholder="東京都内/札幌市内など" 
                    value={contactForm.location || ''} 
                    onChange={e => setContactForm({ ...contactForm, location: e.target.value })} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">希望時期・日程</label>
                  <input 
                    type="text" 
                    placeholder="10月頃/土日祝日を希望など" 
                    value={contactForm.date || ''} 
                    onChange={e => setContactForm({ ...contactForm, date: e.target.value })} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" 
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">お問い合わせ内容 <span className="text-red-500">*</span></label>
              <textarea 
                required 
                placeholder="詳細なご要望をご記入ください。" 
                value={contactForm.message || ''} 
                onChange={e => setContactForm({ ...contactForm, message: e.target.value })} 
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm h-32 resize-none" 
              />
            </div>

            <p className="text-[11px] text-zinc-400">🛡 This site is protected by reCAPTCHA v3 and the Google Privacy Policy and Terms of Service apply.</p>
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-md shadow transition-colors disabled:bg-gray-400"
            >
              {isSubmitting ? "送信中..." : "上記内容で安全に送信する"}
            </button>
          </form>
        </div>

        {/* FAQエリア */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-zinc-900 mb-2">💡 よくあるご質問 (FAQ)</h3>
          {faqList.length > 0 ? (
            faqList.map(faq => (
              <div key={faq.id} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <strong className="text-sm text-zinc-900 block mb-1">Q. {faq.question}</strong>
                {/* 💡 whitespace-pre-line を追加して改行を反映 */}
                <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line">
                  A. {renderFormattedAnswer(faq.answer)}
                </p>
              </div>
            ))
          ) : (
            <>
              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <strong className="text-sm text-zinc-900 block mb-1">Q. ペット CPRの受講に資格は必要ですか？</strong>
                <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line">A. いいえ、一般の飼い主様からトリマー様、動物看護師様までどなたでも受講可能です。</p>
              </div>
              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <strong className="text-sm text-zinc-900 block mb-1">Q. 団体での出張講習は全国対応していますか？</strong>
                <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line">A. はい、全国の専門学校、サロン、ボランティア団体様への出張実績がございます。お気軽にご相談ください。</p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default ContactScreen;