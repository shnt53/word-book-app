'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Deck = {
  id: string;
  title: string;
  description: string;
  created_at: string;
};

export default function DeckListPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  const fetchDecks = async () => {
    try {
      const res = await fetch(`${API_URL}/decks`);
      if (res.ok) {
        const data = await res.json();
        setDecks(data);
      }
    } catch (err) {
      console.error(err);
      alert('単語帳の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecks();
  }, []);

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch(`${API_URL}/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });

      if (res.ok) {
        setTitle('');
        setDescription('');
        setIsModalOpen(false);
        fetchDecks();
      } else {
        alert('作成に失敗しました');
      }
    } catch (err) {
      alert('エラーが発生しました');
    }
  };

  const handleDeleteDeck = async (e: React.MouseEvent, deckId: string) => {
    e.preventDefault();
    if (!confirm('この単語帳を削除してもよろしいですか？（含まれる単語も削除されます）')) return;

    try {
      const res = await fetch(`${API_URL}/decks/${deckId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchDecks();
      } else {
        alert('削除に失敗しました');
      }
    } catch (err) {
      alert('エラーが発生しました');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">単語帳一覧</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          + 新規作成
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : decks.length === 0 ? (
        <p className="text-gray-500">単語帳がまだありません。新規作成してください。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="relative group p-5 bg-white rounded-lg border border-gray-200 hover:shadow-md transition"
            >
              <Link href={`/decks/${deck.id}`} className="block pr-12">
                <h2 className="text-xl font-bold text-gray-900 mb-2">{deck.title}</h2>
                <p className="text-gray-600 text-sm line-clamp-2">
                  {deck.description || '説明なし'}
                </p>
              </Link>
              <button
                onClick={(e) => handleDeleteDeck(e, deck.id)}
                className="absolute top-4 right-4 text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 transition font-medium"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 text-gray-900">
            <h2 className="text-xl font-bold mb-4 text-gray-900">単語帳を新規作成</h2>
            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">タイトル</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded-md p-2 text-gray-900 bg-white border-gray-300"
                  placeholder="例: IT用語集"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">説明</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border rounded-md p-2 h-24 text-gray-900 bg-white border-gray-300"
                  placeholder="例: 基本情報技術者試験の重要単語"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-100 text-gray-700"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  作成
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}