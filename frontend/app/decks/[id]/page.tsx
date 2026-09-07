'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

type Word = {
  id: string;
  term: string;
  definition: string;
  status: string;
};

type Deck = {
  id: string;
  title: string;
  description: string;
  words: Word[];
};

export default function DeckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');

  const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  const fetchDeck = async () => {
    try {
      const res = await fetch(`${API_URL}/decks/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDeck(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeck();
  }, [id]);

  const handleOpenAddModal = () => {
    setEditingWord(null);
    setTerm('');
    setDefinition('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (word: Word) => {
    setEditingWord(word);
    setTerm(word.term);
    setDefinition(word.definition);
    setIsModalOpen(true);
  };

  const handleSaveWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim() || !definition.trim()) return;

    try {
      if (editingWord) {
        const res = await fetch(`${API_URL}/words/${editingWord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ term, definition, status: editingWord.status }),
        });
        if (res.ok) fetchDeck();
      } else {
        const res = await fetch(`${API_URL}/decks/${id}/words`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ term, definition }),
        });
        if (res.ok) fetchDeck();
      }
      setIsModalOpen(false);
    } catch (err) {
      alert('保存に失敗しました');
    }
  };

  const handleDeleteWord = async (wordId: string) => {
    if (!confirm('この単語を削除しますか？')) return;
    try {
      const res = await fetch(`${API_URL}/words/${wordId}`, {
        method: 'DELETE',
      });
      if (res.ok) fetchDeck();
    } catch (err) {
      alert('削除に失敗しました');
    }
  };

  if (loading) return <p className="text-gray-500">読み込み中...</p>;
  if (!deck) return <p className="text-gray-500">単語帳が見つかりません</p>;

  return (
    <div>
      <div className="mb-4">
        <Link href="/" className="text-blue-600 hover:underline text-sm font-medium">
          ← 単語帳一覧に戻る
        </Link>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{deck.title}</h1>
          <p className="text-gray-600 mt-1">{deck.description}</p>
        </div>
        <div className="flex gap-2">
          {deck.words.length > 0 && (
            <Link
              href={`/decks/${id}/quiz`}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
            >
              クイズを始める
            </Link>
          )}
          <button
            onClick={handleOpenAddModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + 単語を追加
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 text-sm">
              <th className="p-4 font-semibold">単語</th>
              <th className="p-4 font-semibold">定義</th>
              <th className="p-4 font-semibold">状態</th>
              <th className="p-4 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {deck.words.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  単語がまだ登録されていません。「+ 単語を追加」ボタンから追加してください。
                </td>
              </tr>
            ) : (
              deck.words.map((word) => (
                <tr key={word.id} className="hover:bg-gray-50">
                  <td className="p-4 font-semibold text-gray-900">{word.term}</td>
                  <td className="p-4 text-gray-900 whitespace-pre-wrap">{word.definition}</td>
                  <td className="p-4">
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                        word.status === 'remembered'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {word.status === 'remembered' ? '覚えた' : '未暗記'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(word)}
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDeleteWord(word.id)}
                      className="text-red-600 hover:underline text-sm font-medium"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 text-gray-900">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              {editingWord ? '単語を編集' : '新しい単語を追加'}
            </h2>
            <form onSubmit={handleSaveWord} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">単語</label>
                <input
                  type="text"
                  required
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full border rounded-md p-2 text-gray-900 bg-white border-gray-300"
                  placeholder="例: Serverless"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">定義・意味</label>
                <textarea
                  required
                  value={definition}
                  onChange={(e) => setDefinition(e.target.value)}
                  className="w-full border rounded-md p-2 h-24 text-gray-900 bg-white border-gray-300"
                  placeholder="例: サーバー管理が不要なクラウドモデル"
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
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}