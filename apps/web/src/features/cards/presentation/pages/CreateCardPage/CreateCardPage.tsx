import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Toast } from '@src/shared/ui/Toast/Toast';
import { IconCheck, IconRestart } from '@src/shared/ui/Icons/Icons';
import { useSelectionToAnswer } from '@src/features/sources/application/useSelectionToAnswer';
import { useSourceLoader } from '@src/features/sources/application/useSourceLoader';
import { extractSource } from '@src/features/sources/infrastructure/sourcesApi';
import { SourcePanel } from '@src/features/sources/presentation/components/SourcePanel/SourcePanel';
import { UrlBar } from '@src/features/sources/presentation/components/UrlBar/UrlBar';

import { useCreateCard } from '../../../application/useCreateCard';
import { createCard } from '../../../infrastructure/cardsApi';
import { CardPreview } from '../../components/CardPreview/CardPreview';
import { CreateCardForm } from '../../components/CreateCardForm/CreateCardForm';
import { ModeTabs, type CreateMode } from '../../components/ModeTabs/ModeTabs';
import { TopicPicker } from '@src/features/topics/presentation/components/TopicPicker/TopicPicker';

const ATOMIC_RULES = [
  'Mỗi thẻ chỉ nên hỏi một ý để bạn dễ nhớ và dễ trả lời.',
  'Ưu tiên câu hỏi “Tại sao?”, “Như thế nào?” hoặc “Điều gì?” thay vì Có/Không.',
  'Giữ câu trả lời ngắn; phần giải thích dài hơn có thể đặt trong ghi chú.',
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
                Mẹo tạo thẻ dễ nhớ
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
          ? 'Đã lưu thẻ. Bạn có thể chọn thêm ý từ bài viết này.'
          : 'Đã lưu thẻ. Bạn có thể tạo thêm hoặc quay lại Thư viện.'}
      </Toast>
    </div>
  );
}
