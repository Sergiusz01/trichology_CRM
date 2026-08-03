import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function CarePlansPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/patients/${id}?tab=care-plans`, { replace: true });
  }, [id, navigate]);

  return null;
}
