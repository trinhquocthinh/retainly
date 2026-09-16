import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Toast } from '@src/shared/ui/Toast/Toast';
import { IconCheck } from '@src/shared/ui/Icons/Icons';
import { useSelectionToAnswer } from '@src/features/sources/application/useSelectionToAnswer';
import { useSourceLoader } from '@src/features/sources/application/useSourceLoader';
import { extractSource } from '@src/features/sources/infrastructure/sourcesApi';
import { SourcePanel } from '@src/features/sources/presentation/SourcePanel/SourcePanel';
import { UrlBar } from '@src/features/sources/presentation/UrlBar/UrlBar';

import { useCreateCard } from '../application/useCreateCard';
import { createCard } from '../infrastructure/cardsApi';
import { CreateCardForm } from './CreateCardForm';
import { ModeTabs, type CreateMode } from './ModeTabs';

const ATOMIC_RULES = [
  'Một ý chính trên mỗi thẻ: nếu câu hỏi có hơn 3 ý con, hãy chia nhỏ thành nhiều thẻ độc lập.',
  'Hỏi trực diện: tập trung vào "Tại sao" hoặc "Cái gì" thay vì câu trả lời Có/Không.',
  'Đọc lướt nhanh: tránh các đoạn văn giải thích dài dòng ở mặt trả lời.',
];

export function CreateCardPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<CreateMode>('manual');
  const sourceContentRef = useRef<HTMLDivElement>(null);

  const loader = useSourceLoader({ extractSource });
  const source = mode === 'url' ? loader.source : null;
  const form = useCreateCard({ createCard, sourceId: source?.sourceId });

  // Không đè lên câu trả lời người dùng đã gõ — bôi đen là để đỡ gõ, không
  // phải để mất chữ.
  useSelectionToAnswer(sourceContentRef, (text) => {
    if (form.draft.back.trim().length === 0) form.setField('back', text);
  });

  const hasSource = mode === 'url' && (loader.loading || source !== null);

  return (
    <div className={`create-card ${hasSource ? 'create-card--wide' : ''}`}>
      <nav className="create-card__breadcrumb text-caption" aria-label="Đường dẫn">
        <Link to="/cards">Thư viện</Link>
        <span aria-hidden="true">›</span>
        <span className="create-card__breadcrumb-current">Thẻ mới</span>
      </nav>

      <h1 className="text-h1 create-card__title">Thẻ mới</h1>

      <ModeTabs mode={mode} onModeChange={setMode} />

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

      <div className={`create-card__workspace ${hasSource ? 'create-card__workspace--split' : ''}`}>
        {hasSource ? (
          <SourcePanel source={source} loading={loader.loading} contentRef={sourceContentRef} />
        ) : null}

        <CreateCardForm
          draft={form.draft}
          canSave={form.canSave}
          saving={form.saving}
          banner={form.banner}
          errorOf={form.errorOf}
          onChange={form.onChange}
          onSubmit={form.onSubmit}
          onCancel={() => navigate(-1)}
        />
      </div>

      {mode === 'manual' ? (
        <aside className="create-card__rules">
          <h2 className="create-card__rules-title text-small">Quy tắc thẻ ghi nhớ nguyên tử</h2>
          <ul className="create-card__rules-list">
            {ATOMIC_RULES.map((rule) => (
              <li key={rule} className="create-card__rule text-caption">
                <IconCheck />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      <Toast open={form.justSaved}>
        {source
          ? 'Đã lưu thẻ. Tiếp tục rút ý từ bài viết này.'
          : 'Đã lưu thẻ. Nhập tiếp thẻ nữa hoặc mở Thư viện thẻ.'}
      </Toast>
    </div>
  );
}
