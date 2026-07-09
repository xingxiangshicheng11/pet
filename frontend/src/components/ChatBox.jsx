import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import socket from '../services/socket';

export default function ChatBox({ orderId, productOrderId, currentUserId, otherUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const topRef = useRef(null);
  const isProduct = !orderId || orderId === 0;

  const fetchMessages = async (p) => {
    setLoading(true);
    const url = isProduct
      ? '/messages/0?productOrderId=' + productOrderId + '&page=' + p + '&limit=50'
      : '/messages/' + orderId + '?page=' + p + '&limit=50';
    try {
      const res = await api.get(url);
      const { messages: msgs, hasMore: more } = res.data;
      if (p === 1) {
        setMessages(msgs);
      } else {
        setMessages(prev => [...msgs, ...prev]);
      }
      setHasMore(more);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchMessages(1);
  }, [orderId, productOrderId]);

  useEffect(() => {
    const handler = (msg) => {
      const match = isProduct ? msg.productOrderId === productOrderId : msg.orderId === orderId;
      if (match) setMessages(prev => [...prev, msg]);
    };
    socket.on('message:new', handler);
    return () => socket.off('message:new', handler);
  }, [orderId, productOrderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMessages(nextPage);
  };

  const send = async () => {
    if (!text.trim()) return;
    try {
      const body = isProduct
        ? { content: text, productOrderId, receiverId: otherUser.id }
        : { content: text, orderId, receiverId: otherUser.id };
      const res = await api.post('/messages', body);
      setMessages(prev => [...prev, res.data]);
      setText('');
    } catch (err) {
      alert('发送失败');
    }
  };

  return (
    <div className="border rounded bg-white flex flex-col h-96">
      <div className="p-3 border-b bg-gray-50 font-semibold text-sm">与 {otherUser?.name} 聊天</div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {hasMore && (
          <div className="text-center">
            <button onClick={loadMore} disabled={loading}
              className="text-xs text-blue-500 hover:underline disabled:opacity-50">
              {loading ? '加载中...' : '加载更多消息'}
            </button>
          </div>
        )}
        <div ref={topRef} />
        {messages.map(m => (
          <div key={m.id} className={'flex ' + (m.senderId === currentUserId ? 'justify-end' : 'justify-start')}>
            <div className={'max-w-xs px-3 py-2 rounded-lg text-sm ' + (m.senderId === currentUserId ? 'bg-blue-500 text-white' : 'bg-gray-100')}>
              {m.content}
              <div className={'text-xs mt-1 ' + (m.senderId === currentUserId ? 'text-blue-200' : 'text-gray-400')}>
                {new Date(m.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          className="flex-1 p-2 border rounded text-sm" placeholder="输入消息..." />
        <button onClick={send} className="bg-blue-500 text-white px-4 py-2 rounded text-sm">发送</button>
      </div>
    </div>
  );
}
