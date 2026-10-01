import React, { useState } from 'react';
import emailjs from '@emailjs/browser';

export default function DiagUserScreen({
  diagQuestions = [],
  diagAnswers = {},
  handleSelectDiag = () => {},
  handleRunDiagnostic = () => {},
  diagResultText = null,
  currentUser = null
}) {
  const [showResultPage, setShowResultPage] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [emailSentError, setEmailSentError] = useState(false);

  // 👤 ユーザー情報の取得（usersコレクションの email / name フィールドを確実に取得）
  const userEmail = currentUser?.email || '';
  const userName = currentUser?.name || currentUser?.displayName || '受講生';

  // ----------------------------------------------------
  // 診断実行処理（画面切り替え）
  // ----------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. 診断の判定実行（App.js の handleRunDiagnostic を実行）
    const result = await handleRunDiagnostic();

    // 必須未回答などで中断された場合は処理しない
    if (!result && !diagResultText) return;

    // 2. 結果表示画面へ切り替え
    setShowResultPage(true);
    setEmailSentSuccess(false);
    setEmailSentError(false);
  };

  // ----------------------------------------------------
  // 「この結果をメールで送る」ボタン押下時の送信処理
  // ----------------------------------------------------
const handleSendEmail = async () => {
    if (!userEmail) {
      alert('メールアドレスが確認できません。ユーザー情報のログイン状態をご確認ください。');
      return;
    }

    setSendingEmail(true);
    setEmailSentSuccess(false);
    setEmailSentError(false);

    const resultTitle = diagResultText?.title || '診断結果';
    const rawContent = diagResultText?.content || '';

    // 不適合理由のHTMLを作成（メール末尾に追加用）
    let failedReasonsHtml = '';
    if (!diagResultText?.isPassed && diagResultText?.failedQuestions?.length > 0) {
      failedReasonsHtml = `
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #fcd34d;">
          <p style="font-weight: bold; color: #92400e; margin-bottom: 12px;">【要条件不適合となった質問】</p>
          <ul style="padding-left: 20px; margin: 0; color: #78350f;">
            ${diagResultText.failedQuestions.map(item => `
              <li style="margin-bottom: 8px;">
                <strong>Q${item.questionNumber}.${item.questionText}</strong><br />
                ご回答：${item.selectedChoiceText}
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // HTML本文を組み立て
    const fullHtmlContent = `
      <div style="font-family: sans-serif; line-height: 1.8; color: #333;">
        ${rawContent}
        ${failedReasonsHtml}
      </div>
    `;

    // EmailJS テンプレートパラメータ
    const templateParams = {
      to_email: userEmail,
      to_name: userName,
      result_title: resultTitle,
      result_content: fullHtmlContent, // 👈 HTML構造を維持したまま渡す
      submitted_at: new Date().toLocaleString('ja-JP')
    };

    try {
      await emailjs.send(
        'service_1j4x24x',   // Service ID
        'template_rjhte95',  // Template ID
        templateParams,
        'HuLscpmd-82AbIGAM'   // Public Key
      );
      setEmailSentSuccess(true);
    } catch (error) {
      console.error('EmailJS 送信エラー:', error);
      setEmailSentError(true);
    } finally {
      setSendingEmail(false);
    }
  };

  // ----------------------------------------------------
  // A. 診断結果表示画面（別ビュー）
  // ----------------------------------------------------
  if (showResultPage && diagResultText) {
    const isPassed = diagResultText.isPassed;
    const failedQuestions = diagResultText.failedQuestions || [];

    return (
      <div className="py-12 px-4 max-w-3xl mx-auto flex-grow w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            診断結果
          </h1>

          <div className={`p-6 rounded-xl border mb-6 ${
            isPassed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <h2 className="text-xl font-bold mb-4 text-center text-gray-800">
              {diagResultText.title}
            </h2>

            {/* 本文表示 */}
            <div 
              className="text-sm text-gray-700 leading-relaxed space-y-3 
                         [&_a]:text-blue-600 [&_a]:underline [&_a]:font-medium hover:[&_a]:text-blue-800"
              dangerouslySetInnerHTML={{ __html: diagResultText.content }}
            />

            {/* ❌ 不適合理由の表示エリア（不合格時のみ） */}
            {!isPassed && failedQuestions.length > 0 && (
              <div className="mt-6 pt-6 border-t border-amber-200">
                <h3 className="font-bold text-sm text-amber-900 mb-3 flex items-center gap-1.5">
                  <span>⚠️</span> 条件を満たしていない質問事項：
                </h3>
                <ul className="space-y-3">
                  {failedQuestions.map((item, idx) => (
                    <li key={idx} className="bg-white/80 p-3.5 rounded-lg border border-amber-200/60 text-xs">
                      <p className="font-bold text-gray-800 mb-1">
                        Q{item.questionNumber}. {item.questionText}
                      </p>
                      <p className="text-amber-800">
                        ご回答：<span className="font-semibold">{item.selectedChoiceText}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* メール送信エリア */}
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 text-center mb-8">
            <p className="text-xs text-gray-600 mb-3">
              送付先アドレス： <span className="font-bold text-gray-800">{userEmail || '（未設定・ログイン状態をご確認ください）'}</span>
            </p>

            <button
              onClick={handleSendEmail}
              disabled={sendingEmail || !userEmail}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-bold text-white transition-colors shadow-sm ${
                emailSentSuccess 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-zinc-800 hover:bg-zinc-900 disabled:bg-gray-400 cursor-pointer disabled:cursor-not-allowed'
              }`}
            >
              {sendingEmail 
                ? '送信中...' 
                : emailSentSuccess 
                  ? '✓ メールを送信しました（再送信する）' 
                  : '✉️ この結果をメールで送る'}
            </button>

            {emailSentError && (
              <p className="text-xs text-red-500 mt-2">
                ⚠ 送信に失敗しました。EmailJSの設定等をご確認ください。
              </p>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={() => setShowResultPage(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold py-2.5 px-6 rounded-lg transition-colors cursor-pointer"
            >
              診断入力画面に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // B. 診断設問入力フォーム画面
  // ----------------------------------------------------
  return (
    <div className="py-12 px-4 max-w-3xl mx-auto flex-grow w-full">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-8">
          受講資格・適合診断
        </h1>

        {diagQuestions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">診断設問を読み込んでいます...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-8 mb-10">
              {diagQuestions.map((q, qIdx) => {
                const isReq = q.isRequired ?? q.required ?? false;
                const isTextType = q.type === 'text' || q.type === 'input' || (!q.choices || q.choices.length === 0);

                return (
                  <div key={q.id || qIdx} className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-sm text-gray-800">
                        Q{qIdx + 1}. {q.questionText}
                      </p>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        isReq ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {isReq ? '必須' : '任意'}
                      </span>
                    </div>

                    {q.description && (
                      <p className="text-xs text-gray-500 mb-3 whitespace-pre-wrap leading-relaxed px-1">
                        {q.description}
                      </p>
                    )}

                    {/* テキスト入力欄 または 選択肢ラジオボタン */}
                    {isTextType ? (
                      <textarea
                        rows={3}
                        placeholder="ご回答をご記入ください"
                        value={diagAnswers[q.id] || ''}
                        onChange={(e) => handleSelectDiag(q.id, e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                      />
                    ) : (
                      <div className="space-y-2">
                        {q.choices.map((choice, cIdx) => (
                          <label
                            key={cIdx}
                            className={`flex items-center p-3 rounded-lg border text-sm cursor-pointer transition-colors ${
                              diagAnswers[q.id] === cIdx
                                ? 'bg-red-50 border-red-500 text-red-900 font-medium'
                                : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              checked={diagAnswers[q.id] === cIdx}
                              onChange={() => handleSelectDiag(q.id, cIdx)}
                              className="mr-3 accent-red-600"
                            />
                            {choice.text}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-center mb-4">
              <button
                type="submit"
                className="bg-red-700 hover:bg-red-800 text-white font-bold py-3.5 px-8 rounded-xl shadow transition-colors text-sm cursor-pointer"
              >
                診断結果を確認する
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}