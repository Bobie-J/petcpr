import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: 'sans-serif'
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  title: {
    fontSize: '1.8rem',
    color: '#2d3748',
    marginBottom: '10px'
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#718096'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px'
  },
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
    border: '1px solid #edf2f7',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  img: {
    width: '100%',
    height: '160px',
    objectFit: 'cover'
  },
  content: {
    padding: '20px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  itemTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: '10px'
  },
  desc: {
    fontSize: '0.9rem',
    color: '#4a5568',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    marginBottom: '20px',
    flex: 1
  },
  btn: {
    display: 'block',
    textAlign: 'center',
    background: '#3182ce',
    color: '#ffffff',
    padding: '12px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    marginTop: 'auto'
  },
  backBtn: {
    display: 'inline-block',
    marginBottom: '20px',
    color: '#4a5568',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 'bold'
  }
};

const BenefitsListScreen = ({ db, onBack }) => {
  const [benefits, setBenefits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBenefits = async () => {
      try {
        const q = query(collection(db, "benefits"), orderBy("order", "asc"));
        const snap = await getDocs(q);
        setBenefits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("特典取得エラー:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchBenefits();
  }, [db]);

  return (
    <div style={styles.container}>
      {/* 戻るボタン（react-routerのLinkやonClickなどで制御） */}
      {onBack && (
        <button onClick={onBack} style={{ ...styles.backBtn, border: 'none', background: 'none', cursor: 'pointer' }}>
          ← マイページへ戻る
        </button>
      )}

      <div style={styles.header}>
        <h1 style={styles.title}>🎁 会員限定特典</h1>
        <p style={styles.subtitle}>受講生・会員様限定でご利用いただける特別なサービス・特典一覧です。</p>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#a0aec0' }}>読み込み中...</p>
      ) : benefits.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: '#a0aec0' }}>
          現在利用可能な会員特典はありません。
        </div>
      ) : (
        <div style={styles.grid}>
          {benefits.map(item => (
            <div key={item.id} style={styles.card}>
              {item.imageUrl && (
                <img src={item.imageUrl} alt={item.title} style={styles.img} />
              )}
              <div style={styles.content}>
                <h2 style={styles.itemTitle}>{item.title}</h2>
                <p style={styles.desc}>{item.description}</p>
                {item.linkUrl ? (
                  <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" style={styles.btn}>
                    特典を利用する ➔
                  </a>
                ) : (
                  <div style={{ ...styles.btn, background: '#cbd5e0', cursor: 'default' }}>
                    利用準備中
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BenefitsListScreen;