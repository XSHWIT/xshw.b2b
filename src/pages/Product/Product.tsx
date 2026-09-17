import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { fetchProductDetails } from '../../api/productApi';
import { useCart } from '../../context/CartContext';
import { ORDER_EMAIL } from '../../config/orderConfig';
import { supabase } from '../../api/supabaseClient';
import { trackViewItem } from '../../api/analytics';

const Product: React.FC = () => {
  const { productId } = useParams();
  const { t, language } = useTranslation();
  const [matchedCat, setMatchedCat] = useState<{ id: string; name_zh: string; name_en: string } | null>(null);

  const getI18nText = (field: any, lang: string) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (field[lang] !== undefined) return field[lang];
    return field['zh-TW'] || '';
  };
  const { addItem, items } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const [selectedSpecIndex, setSelectedSpecIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasSelectedSpec, setHasSelectedSpec] = useState(false);
  const [queueToast, setQueueToast] = useState<'added' | 'duplicate' | null>(null);

  useEffect(() => {
    if (productId) {
      fetchProductDetails(productId).then(data => {
        setProduct(data);
        if (data && data.specs && data.specs.length > 0) {
          setSelectedSpecIndex(0);
          setHasSelectedSpec(true); // Automatically select first spec
        }
        if (data) {
          trackViewItem({
            item_id: data.id,
            item_name: getI18nText(data.name, language),
            item_category: data.categoryId,
          });
        }
      });
    }
  }, [productId, language]);

  useEffect(() => {
    if (product && product.categoryId) {
      supabase
        .from('categories')
        .select('id, name_zh, name_en')
        .eq('id', product.categoryId)
        .single()
        .then(({ data }) => {
          if (data) {
            setMatchedCat(data);
          }
        });
    }
  }, [product]);

  // 當選定規格改變時，重置圖片索引為 0
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedSpecIndex]);

  // Handle escape key to close lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!product) return <div style={{ padding: '60px', textAlign: 'center' }}>Loading...</div>;

  const specs = product.specs || [];
  const currentSpec = specs[selectedSpecIndex] || {};
  const priceDisplay = currentSpec.price ? `$${currentSpec.price}` : '';

  // 獲取目前規格的多圖 URL 列表，若無多圖，降級為單圖或產品主圖
  const currentSpecImageUrls: string[] = (currentSpec.imageUrls && currentSpec.imageUrls.length > 0)
    ? currentSpec.imageUrls
    : (currentSpec.imageUrl ? [currentSpec.imageUrl] : (product.imageUrl ? [product.imageUrl] : []));
  const currentImageUrl = currentSpecImageUrls[currentImageIndex] || '';
  const hasImage = currentImageUrl && currentImageUrl.trim() !== '';

  // Reverse mapping for breadcrumb (optional)
  const categoryName = matchedCat ? (language === 'zh-TW' ? matchedCat.name_zh : matchedCat.name_en) : '';
  const brandName = typeof product.brand === 'string' ? product.brand : (product.brand?.name || '');

  return (
    <div className="product-detail-page">
      <div className="breadcrumb" style={{ padding: '20px' }}>
        <Link to="/">{t('nav_home')}</Link> <span>/</span>
        <Link to="/category/00">{t('nav_catalog')}</Link> <span>/</span>
        {matchedCat && <><Link to={`/category/${matchedCat.id}`}>{categoryName}</Link> <span>/</span></>}
        <span style={{ color: 'var(--text-primary)' }}>{getI18nText(product.name, language)}</span>
      </div>

      <div className="product-detail-container">
        {/* Left Column: Image */}
        <div className="product-image-large">
          {hasImage ? (
            <>
              <img src={currentImageUrl} alt={getI18nText(product.name, language)} referrerPolicy="no-referrer" />

              {currentSpecImageUrls.length > 1 && (
                <>
                  <button
                    className="image-nav-arrow arrow-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => (prev === 0 ? currentSpecImageUrls.length - 1 : prev - 1));
                    }}
                    aria-label="Previous image"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    className="image-nav-arrow arrow-right"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => (prev === currentSpecImageUrls.length - 1 ? 0 : prev + 1));
                    }}
                    aria-label="Next image"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>

                  <div className="product-image-dots">
                    {currentSpecImageUrls.map((_, idx) => (
                      <span
                        key={idx}
                        className={`dot ${currentImageIndex === idx ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(idx);
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              <div className="zoom-icon" onClick={() => setIsLightboxOpen(true)} style={{ cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </div>
            </>
          ) : (
            <div style={{ width: '600px', height: '400px', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', borderRadius: '8px' }}>
              {t('image_pending')}
            </div>
          )}
        </div>

        {/* Right Column: Details */}
        <div className="product-info-right">
          {brandName && <div className="brand-label">{brandName}</div>}
          <h1 className="product-h1">{getI18nText(product.name, language)}</h1>
          {priceDisplay && <div className="product-price">{priceDisplay}</div>}
          {currentSpec.sku && <div className="sku-label" style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>SKU: {currentSpec.sku}</div>}
          {currentSpec.stockQty !== undefined && currentSpec.stockQty !== '' && (
            <div className="stock-qty-label" style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>
              {t('stock_qty')}: {currentSpec.stockQty}
            </div>
          )}

          {specs.length > 0 && (
            <>
              <div className="option-group">
                <span className="option-label">{t('spec_name')}</span>
                <div className="option-buttons">
                  {specs.map((opt: any, index: number) => (
                    <button
                      key={index}
                      className={`option-btn ${selectedSpecIndex === index ? 'selected' : ''}`}
                      onClick={() => { setSelectedSpecIndex(index); setHasSelectedSpec(true); }}
                    >
                      {getI18nText(opt.specName, language) || `規格 ${index + 1}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-group" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <span className="option-label" style={{ marginBottom: '8px' }}>{t('spec_details')}</span>
                <div style={{ width: '100%' }}>
                  <div
                    style={{
                      width: '100%',
                      minHeight: '60px',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #444',
                      backgroundColor: '#1e1e1e',
                      color: '#eeeeee',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {getI18nText(currentSpec.specDetail, language)}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {(getI18nText(currentSpec.specDetail, language) || '').length} / 500
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons — 規格選定後顯示 */}
          {hasSelectedSpec && (
            <div className="spec-action-buttons">
              <button
                className="spec-action-btn spec-action-btn--secondary"
                onClick={() => {
                  const specNameStr = getI18nText(currentSpec.specName, language);
                  const itemId = `${productId}-${specNameStr}`;
                  const alreadyInCart = items.some(i => i.id === itemId);
                  addItem({
                    id: itemId,
                    productId: productId ?? '',
                    productName: getI18nText(product?.name, language),
                    spec: specNameStr,
                    qty: 1,
                  });
                  setQueueToast(alreadyInCart ? 'duplicate' : 'added');
                  setTimeout(() => setQueueToast(null), 2500);
                }}
              >
                {t('add_to_queue')}
              </button>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSdWx8YvWJxxF-pDihwXEddwueI8zfDbkepvTKwd2IuTB61dVA/viewform?usp=header"
                target="_blank"
                rel="noopener noreferrer"
                className="spec-action-btn spec-action-btn--primary"
              >
                {t('direct_order')}
              </a>
              <button
                className="spec-action-btn spec-action-btn--mail"
                onClick={() => {
                  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
                  const spec = getI18nText(currentSpec.specName, language);
                  const pName = getI18nText(product?.name, language);
                  const subject = `${t('mail_purchase_subject_prefix')} ${pName} - ${spec}`;
                  const body =
                    `${t('mail_purchase_greeting')}

                    ──────────────────────
                    ${t('mail_date')}${today}
                    ${t('mail_product')}${pName}
                    ${t('mail_spec')}${spec}
                    ${t('mail_qty')}
                    ──────────────────────
                    ${t('mail_notes')}

                    `;
                  window.location.href = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                {t('mail_order')}
              </button>
            </div>
          )}

          {/* Queue Toast Notification */}
          {queueToast === 'added' && (
            <div className="spec-queue-toast">
              ✓ {t('add_to_queue_success') || '已加入清單'}
            </div>
          )}
          {queueToast === 'duplicate' && (
            <div className="spec-queue-toast spec-queue-toast--duplicate">
              ⚠ {t('add_to_queue_duplicate') || '該商品已加入清單'}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Overlay */}
      {isLightboxOpen && hasImage && (
        <div className="lightbox-overlay" onClick={() => setIsLightboxOpen(false)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setIsLightboxOpen(false)} aria-label="Close">
              &times;
            </button>

            {currentSpecImageUrls.length > 1 && (
              <>
                <button
                  className="lightbox-arrow arrow-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) => (prev === 0 ? currentSpecImageUrls.length - 1 : prev - 1));
                  }}
                  aria-label="Previous image"
                >
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  className="lightbox-arrow arrow-right"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) => (prev === currentSpecImageUrls.length - 1 ? 0 : prev + 1));
                  }}
                  aria-label="Next image"
                >
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </>
            )}

            <img src={currentImageUrl} alt={getI18nText(product.name, language)} className="lightbox-image" referrerPolicy="no-referrer" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Product;