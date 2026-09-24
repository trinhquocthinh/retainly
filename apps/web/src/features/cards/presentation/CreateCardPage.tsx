import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Toast } from '@src/shared/ui/Toast/Toast';
import { IconCheck, IconRestart } from '@src/shared/ui/Icons/Icons';
import { useSelectionToAnswer } from '@src/features/sources/application/useSelectionToAnswer';
import { useSourceLoader } from '@src/features/sources/application/useSourceLoader';
import { extractSource } from '@src/features/sources/infrastructure/sourcesApi';
import { SourcePanel } from '@src/features/sources/presentation/SourcePanel/SourcePanel';
import { UrlBar } from '@src/features/sources/presentation/UrlBar/UrlBar';

import { useCreateCard } from '../application/useCreateCard';
import { createCard } from '../infrastructure/cardsApi';
import { CardPreview } from './CardPreview';
import { CreateCardForm } from './CreateCardForm';
import { ModeTabs, type CreateMode } from './ModeTabs';
import { TopicPicker } from '@src/features/topics/presentation/TopicSelector/TopicPicker';

const ATOMIC_RULES = [
  'Một ý chính trên mỗi thẻ: nếu câu hỏi có hơn 3 ý con, hãy chia nhỏ thành nhiều thẻ độc lập.',
  'Hỏi trực diện: tập trung vào "Tại sao" hoặc "Cái gì" thay vì câu trả lời Có/Không.',
  'Đọc lướt nhanh: tránh các đoạn văn giải thích dài dòng ở mặt trả lời.',
];

export function CreateCardPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<CreateMode>('manual');
  const [topicId, setTopicId] = useState('');
  const sourceContentRef = useRef<HTMLDivElement>(null);

  const loader = useSourceLoader({ extractSource });
  const source = mode === 'url' ? loader.source : null;
  const form = useCreateCard({
    createCard,
    sourceId: source?.sourceId,
    topicId: topicId || undefined,
  });

  // Không đè lên câu trả lời người dùng đã gõ — bôi đen là để đỡ gõ, không
  // phải để mất chữ.
  useSelectionToAnswer(sourceContentRef, (text) => {
    if (form.draft.back.trim().length === 0) form.setField('back', text);
  });

  const hasSource = mode === 'url' && (loader.loading || source !== null);

  function resetDraft() {
    if (window.confirm('Xoá toàn bộ nội dung đang soạn?')) form.reset();
  }

  return (
    <div className="create-card create-card--wide">
      <header className="create-card__header">
        <div className="create-card__heading">
          <nav className="create-card__breadcrumb text-caption" aria-label="Đường dẫn">
            <Link to="/cards">Thư viện</Link>
            <span aria-hidden="true">›</span>
            <span className="create-card__breadcrumb-current">Thẻ mới</span>
          </nav>
          <h1 className="text-h1 create-card__title">Thẻ mới</h1>
        </div>

        <div className="create-card__controls">
          <ModeTabs mode={mode} onModeChange={setMode} />
          <button
            type="button"
            className="create-card__reset text-small"
            disabled={!form.dirty}
            onClick={resetDraft}
          >
            <IconRestart />
            Làm mới
          </button>
        </div>
      </header>

      {mode === 'url' ? (
        <UrlBar
          url={loader.url}
          canLoad={loader.canLoad}
          loading={loader.loading}
          error={loader.error}
          onUrlChange={loader.onUrlChange}
          onLoad={loader.onLoad}
        />
      ) : null}

      <div className="create-card__workspace">
        {/* Cột trái: nguồn khi đang rút ý từ bài viết, còn lại là quy tắc soạn thẻ. */}
        {hasSource ? (
          <div className="create-card__aside">
            <SourcePanel source={source} loading={loader.loading} contentRef={sourceContentRef} />
          </div>
        ) : (
          <aside className="create-card__aside create-card__aside--rules">
            <div className="create-card__rules surface-panel">
              <h2 className="create-card__rules-title text-h2">
                <IconCheck size={20} />
                Quy tắc thẻ ghi nhớ nguyên tử
              </h2>
              <ul className="create-card__rules-list">
                {ATOMIC_RULES.map((rule) => (
                  <li key={rule} className="create-card__rule text-small">
                    <IconCheck />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}

        <div className="create-card__main">
          <CardPreview draft={form.draft} />

          <CreateCardForm
            topicSelector={<TopicPicker value={topicId} onChange={setTopicId} />}
            draft={form.draft}
            canSave={form.canSave}
            saving={form.saving}
            banner={form.banner}
            errorOf={form.errorOf}
            onFieldChange={form.setField}
            onSubmit={form.onSubmit}
            onCancel={() => navigate(-1)}
          />
        </div>
      </div>

      <Toast open={form.justSaved}>
        {source
          ? 'Đã lưu thẻ. Tiếp tục rút ý từ bài viết này.'
          : 'Đã lưu thẻ. Nhập tiếp thẻ nữa hoặc mở Thư viện thẻ.'}
      </Toast>
    </div>
  );
}
