import { useState } from 'react';
import api from '../services/api';

export default function ReviewForm({ orderId, revieweeId, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post('/reviews', { rating, comment, orderId, revieweeId });
      onSubmitted?.();
    } catch (err) {
      alert(err.response?.data?.error || '提交失败');
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-white p-4 rounded shadow mt-4">
      <h3 className="font-semibold mb-3">评价服务</h3>
      <div className="flex gap-1 mb-3">
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => setRating(n)}
            className={'w-8 h-8 rounded text-lg ' + (n <= rating ? 'text-yellow-400' : 'text-gray-300')}>★</button>
        ))}
      </div>
      <textarea value={comment} onChange={e => setComment(e.target.value)}
        className="w-full p-2 border rounded text-sm mb-3" rows="2" placeholder="写下你的评价..." />
      <button onClick={submit} disabled={submitting}
        className="bg-yellow-500 text-white px-4 py-2 rounded text-sm">{submitting ? '提交中...' : '提交评价'}</button>
    </div>
  );
}
