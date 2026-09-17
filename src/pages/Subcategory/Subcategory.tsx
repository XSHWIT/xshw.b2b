import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { getCategoriesTree, getProductsByCategory } from '../../api/catalog';
import { CategoryTree, Product } from '../../types/supabase';
import { trackViewItemList } from '../../api/analytics';

const Subcategory: React.FC = () => {
  const { categoryId, subcategoryId } = useParams();
  const { t, language } = useTranslation();

  const [categoriesTree, setCategoriesTree] = useState<CategoryTree[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // 1. 初始化時載入分類樹狀結構
  useEffect(() => {
    getCategoriesTree().then(data => {
      setCategoriesTree(data);
    });
  }, []);

  const effectiveCategoryId = categoryId || '00';
  const category = categoriesTree.find(c => c.id === effectiveCategoryId);
  const subcategory = category?.subcategories?.find(s => s.id === subcategoryId);

  const categoryName = category
    ? (language === 'zh-TW' ? category.name_zh : category.name_en)
    : effectiveCategoryId;

  const subcategoryName = subcategory
    ? (language === 'zh-TW' ? subcategory.name_zh : subcategory.name_en)
    : subcategoryId;

  // 2. 當分類或子分類改變時，向 Supabase 撈取產品
  useEffect(() => {
    if (effectiveCategoryId) {
      setLoading(true);
      getProductsByCategory(effectiveCategoryId, subcategoryId).then(data => {
        setProducts(data);
        setLoading(false);
        trackViewItemList({
          item_list_id: subcategoryId || effectiveCategoryId,
          item_list_name: (subcategoryName || categoryName) as string,
          items: data.map(p => ({
            item_id: p.id,
            item_name: language === 'zh-TW' ? p.name_zh : p.name_en,
            item_category: p.category_id,
          })),
        });
      });
    }
  }, [effectiveCategoryId, subcategoryId, language, categoryName, subcategoryName]);

  useEffect(() => {
    setCurrentPage(1);
    window.scrollTo(0, 0);
  }, [categoryId, subcategoryId]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const renderProductGrid = (productList: Product[]) => {
    const itemsPerPage = 15;
    const totalPages = Math.ceil(productList.length / itemsPerPage);
    const currentProducts = productList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
      <div>
        <div className="product-grid category-product-grid">
          {currentProducts.map((product, idx) => {
            const firstSpec = product.product_attributes?.[0];
            const primaryImage = firstSpec?.product_images?.find(img => img.is_primary);
            const coverImage = primaryImage?.image_url || firstSpec?.product_images?.[0]?.image_url || '';
            const hasImage = coverImage && coverImage.trim() !== '';
            const firstSpecSku = firstSpec?.sku || '';
            const productName = language === 'zh-TW' ? product.name_zh : product.name_en;

            return (
              <Link
                key={idx}
                to={`/product/${encodeURIComponent(productName)}`}
                className="card"
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                  border: '1px solid var(--border-color)',
                  padding: '15px',
                  borderRadius: '8px'
                }}
              >
                {hasImage ? (
                  <img src={coverImage} alt={productName} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'contain', marginBottom: '15px', borderRadius: '4px' }} referrerPolicy="no-referrer" />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '1 / 1', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', color: '#888', borderRadius: '4px' }}>
                    {t('image_pending')}
                  </div>
                )}
                <div className="card-info" style={{ marginBottom: '15px' }}>
                  <h3 style={{
                    fontSize: '1rem',
                    marginBottom: '5px',
                    lineHeight: '1.4',
                    minHeight: '2.8em',
                    wordBreak: 'break-all'
                  }}>
                    {productName || '\u00a0'}
                  </h3>
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    minHeight: '2.8em',
                    wordBreak: 'break-all'
                  }}>
                    {firstSpecSku ? `SKU: ${firstSpecSku}` : '\u00a0'}
                  </p>
                </div>
                <div className="card-btn" style={{
                  display: 'block',
                  textAlign: 'center',
                  textDecoration: 'none',
                  background: 'var(--primary-color)',
                  color: 'var(--bg-color)',
                  padding: '8px 0',
                  borderRadius: '4px'
                }}>
                  {t('btn_details')}
                </div>
              </Link>
            );
          })}
          {productList.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>{t('category_products_preparing')}</p>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '40px' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', background: currentPage === 1 ? '#f5f5f5' : '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              {t('btn_prev_page')}
            </button>

            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    background: currentPage === i + 1 ? 'var(--primary-color)' : '#fff',
                    color: currentPage === i + 1 ? 'var(--bg-color)' : '#333',
                    cursor: 'pointer'
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', background: currentPage === totalPages ? '#f5f5f5' : '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
            >
              {t('btn_next_page')}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="subcategory-page">
      <div className="breadcrumb" style={{ padding: '20px' }}>
        <Link to="/">{t('nav_home')}</Link> <span>/</span> <Link to="/category/00">{t('nav_catalog')}</Link>
        {effectiveCategoryId && (
          <>
            <span>/</span>
            <Link to={`/category/${effectiveCategoryId}`}>{categoryName}</Link>
          </>
        )}
        {subcategoryId && (
          <>
            <span>/</span>
            {subcategoryName}
          </>
        )}
      </div>
      <div className="category-layout" style={{ display: 'flex', padding: '0 20px', minHeight: '60vh' }}>
        <aside className="sidebar" style={{ width: '250px', borderRight: '1px solid var(--border-color)', paddingRight: '20px' }}>
          <h2 style={{ marginBottom: '20px' }}>{t('sidebar_categories')}</h2>
          <ul className="sidebar-cat-list" style={{ listStyle: 'none', padding: 0 }}>
            {categoriesTree.map(cat => {
              const catDisplayName = language === 'zh-TW' ? cat.name_zh : cat.name_en;
              return (
                // 渲染主分類項目，若為目前選取的大類，則套用 active 樣式
                <li key={cat.id} className={effectiveCategoryId === cat.id ? 'active' : ''} style={{ marginBottom: '15px' }}>
                  {/* 主分類連結，點擊後導向該大類的路由 */}
                  <Link to={`/category/${cat.id}`} style={{ textDecoration: 'none', color: effectiveCategoryId === cat.id ? 'var(--primary-color)' : 'var(--text-color)', fontWeight: effectiveCategoryId === cat.id ? 'bold' : 'normal' }}>
                    {catDisplayName}
                  </Link>
                  {/* 若此分類為當前選取的大類，且該大類下含有子分類，則展開渲染子分類列表 */}
                  {effectiveCategoryId === cat.id && cat.subcategories && cat.subcategories.length > 0 && (
                    <ul className="sidebar-subcat-list" style={{ listStyle: 'none', paddingLeft: '15px', marginTop: '10px' }}>
                      {cat.subcategories.map(sub => {
                        const subDisplayName = language === 'zh-TW' ? sub.name_zh : sub.name_en;
                        return (
                          // 子分類項目，若符合目前選取的子分類 ID 則套用 active 樣式
                          <li key={sub.id} className={subcategoryId === sub.id ? 'active' : ''} style={{ marginBottom: '8px' }}>
                            {/* 子分類連結，點擊後切換大類與子類別路由 */}
                            <Link to={`/category/${cat.id}/${sub.id}`} style={{ textDecoration: 'none', color: subcategoryId === sub.id ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
                              {subDisplayName}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>

        <main className="main-content" style={{ flex: 1, paddingLeft: '40px' }}>
          {loading ? (
            <div style={{ padding: '40px 0', color: 'var(--text-secondary)' }}>Loading...</div>
          ) : !subcategoryId ? (
            /* Show Category Overview OR Product Grid if no subcategories */
            <div className="category-overview">
              <h1 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', marginBottom: '30px' }}>
                {categoryName} {category?.subcategories && category.subcategories.length > 0 ? ' >' : ''}
              </h1>
              {category?.subcategories && category.subcategories.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '40px 20px' }}>
                  {category.subcategories.map(sub => {
                    const subDisplayName = language === 'zh-TW' ? sub.name_zh : sub.name_en;
                    return (
                      <div key={sub.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
                        <Link to={`/category/${effectiveCategoryId}/${sub.id}`} style={{
                          textDecoration: 'none',
                          color: 'var(--text-color)',
                          padding: '15px 0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontWeight: '600',
                          fontSize: '1.1rem'
                        }}>
                          {subDisplayName} <span>&gt;</span>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                renderProductGrid(products)
              )}
            </div>
          ) : (
            /* Show Product Grid for Subcategory */
            <>
              <div className="category-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', marginBottom: '30px' }}>
                <h1>{categoryName} &gt; {subcategoryName}</h1>
              </div>
              {renderProductGrid(products)}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Subcategory;
