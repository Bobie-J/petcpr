import { PDFDocument, rgb } from 'pdf-lib';

/**
 * CDN経由で fontkit を動的に読み込む安全な関数
 */
const loadFontkit = async () => {
  if (window.fontkit) return window.fontkit;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@pdf-lib/fontkit/dist/fontkit.umd.min.js';
    script.onload = () => resolve(window.fontkit);
    script.onerror = () => reject(new Error('fontkit の読み込みに失敗しました。'));
    document.head.appendChild(script);
  });
};
/**
 * 修了証PDFを生成・ダウンロードする関数
 * @param {string} certTemplateUrl - 背景PDFのURL
 * @param {string} certName - 修了証用のユーザー氏名
 * @param {string} passDateText - 取得年月日文字列
 */
export const downloadCertificate = async (certTemplateUrl, certName, passDateText) => {
  try {
    // 1. fontkit の動的取得（バンドラーのエラーを回避）
    const fontkit = await loadFontkit();

    // 2. 背景テンプレートPDFの取得
    const pdfRes = await fetch(certTemplateUrl);
    if (!pdfRes.ok) throw new Error('PDFテンプレートの取得に失敗しました。');
    const existingPdfBytes = await pdfRes.arrayBuffer();

    // 3. PDFドキュメントの読み込みと fontkit の登録
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);

    // 4. 日本語フォントの取得
    const fontRes = await fetch('/fonts/aispec.ttf');
    if (!fontRes.ok) throw new Error('フォントファイルの取得に失敗しました。(/fonts/aispec.ttf)');

    const fontBytes = await fontRes.arrayBuffer();
    const customFont = await pdfDoc.embedFont(fontBytes);

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // 5. 氏名の描画 (36pt, 中央揃え)
    const nameFontSize = 36;
    const nameText = certName || 'PET TARO';
    const nameWidth = customFont.widthOfTextAtSize(nameText, nameFontSize);
    const nameX = (width - nameWidth) / 2;
    const nameY = height * 0.65;

    firstPage.drawText(nameText, {
      x: nameX,
      y: nameY,
      size: nameFontSize,
      font: customFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    // 6. 取得年月日の描画 (18pt, 中央揃え)
    const dateFontSize = 18;
    const dateText = passDateText ? `Completed on ${passDateText}` : 'Completed on ---';
    const dateWidth = customFont.widthOfTextAtSize(dateText, dateFontSize);
    const dateX = (width - dateWidth) / 2;
    const dateY = height * 0.32;

    firstPage.drawText(dateText, {
      x: dateX,
      y: dateY,
      size: dateFontSize,
      font: customFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    // 7. PDFデータの保存とダウンロード
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `修了証_${nameText}.pdf`;
    link.click();
  } catch (error) {
    console.error('修了証PDF生成エラー:', error);
    alert(`修了証の生成に失敗しました。\n詳細: ${error.message}`);
  }
};