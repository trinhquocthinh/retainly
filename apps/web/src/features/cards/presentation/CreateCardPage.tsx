import { useNavigate } from 'react-router';

import { useCreateCard } from '../application/useCreateCard';
import { createCard } from '../infrastructure/cardsApi';
import { CreateCardForm } from './CreateCardForm';

export function CreateCardPage() {
  const navigate = useNavigate();
  const form = useCreateCard({ createCard });

  return <CreateCardForm {...form} onCancel={() => navigate(-1)} />;
}
