import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAnnouncementById } from '../../api/announcement';
import { Announcement } from '../../types/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import { trackSelectContent } from '../../api/analytics';
import './Announcements.css';

const AnnouncementDetail: React.FC = () => {
  const { t, language } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getTagLabel = (status: string) => {
    switch (status) {
      case '新活動': return t('announcement_tag_new') || status;
      case '更新': return t('announcement_tag_update') || status;
      default: return t('announcement_tag_notice') || status;
    }
  };

  const getTagClass = (status: string) => {
    switch (status) {
      case '新活動': return 'announcement-tag--new';
      case '更新': return 'announcement-tag--update';
      default: return 'announcement-tag--notice';
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (id) {
      setLoading(true);
      setError(null);
      getAnnouncementById(id)
        .then(data => {
          setAnnouncement(data);
          setLoading(false);
          if (data) {
            trackSelectContent({ content_type: 'announcement', content_id: String(data.id) });
          }
        })
        .catch(err => {
          setError(err.message || '撈取公告明細失敗，請檢查您的網路連線。');
          setLoading(false);
        });
    }
  }, [id]);

  if (!id) return <div className="announcement-page">Invalid ID</div>;

  if (loading) {
    return (
      <div className="announcement-page">
        <div className="detail-container" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="announcement-page">
        <div className="detail-container" style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444' }}>{error}</h2>
          <button onClick={() => navigate('/announcements')} style={{ marginTop: '20px', padding: '10px 20px', background: 'var(--accent-yellow)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {t('announcement_back')}
          </button>
        </div>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="announcement-page">
        <div className="detail-container" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--text-primary)' }}>找不到該筆公告</h2>
          <button onClick={() => navigate('/announcements')} style={{ marginTop: '20px', padding: '10px 20px', background: 'var(--accent-yellow)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {t('announcement_back')}
          </button>
        </div>
      </div>
    );
  }

  const title = language === 'en-US' ? announcement.title_en : announcement.title_zh;
  const content = language === 'en-US' ? announcement.content_en : announcement.content_zh;

  return (
    <div className="announcement-page">
      <div className="detail-container">
        <div style={{ marginBottom: '20px' }}>
          <Link to="/announcements" className="back-link">← {t('announcement_back')}</Link>
        </div>

        <div className="detail-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <span className={`announcement-tag ${getTagClass(announcement.status)}`}>
              {getTagLabel(announcement.status)}
            </span>
            <span className="meta-date">{announcement.date}</span>
          </div>

          <h1>
            {title}
          </h1>

          <div className="divider"></div>

          <div className="content" dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetail;
