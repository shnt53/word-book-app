'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Word = {
  id: string;
  term: string;
  definition: string;
  is_wrong: boolean;
};

type DeckDetail = {
  deck: { id: string; title: string; description: string };
  words: Word[];
};

export default function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params); // React.use() で Promise を解除
  const [data, setData] = useState<DeckDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchDeckDetail = async () => {
    try {
      const res = await fetch(`${API_URL}/decks/${id}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        alert('データが見つかりません');
      }
    } catch (err) {
      console.error(err);
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeckDetail();
  }, [id]);

  const handleDeleteWord = async (wordId: string) => {
    if (!confirm('この単語を削除してもよろしいですか？')) return;

    try {
      const res = await fetch(`${API_URL}/words/${wordId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchDeckDetail();
      } else {
        alert('削除に失敗しました');
      }
    } catch (err) {
      alert('エラーが発生しました');
    }
  };

  if (loading) return <p className="text-gray-500">読み込み中...</p>;
  if (!data) return <p className="text-gray-500">データが見つかりません</p>;

  const wrongCount = data.words.filter((w) => w.is_wrong).length;

  return (
    <div>
      <div className="mb-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← 一覧に戻る
        </Link>
        <h1 className="text-3xl font-bold mt-2">{data.deck.title}</h1>
        {data.deck.description && (
          <p className="text-gray-600 mt-1">{data.deck.description}</p>
        )}
        <p className="text-sm text-gray-500 mt-2">
          登録数: {data.words.length} 件 (要復習: {wrongCount} 件)
        </p>
      </div>

      {/* 操作アクションボタン */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => router.push(`/decks/${id}/quiz`)}
          disabled={data.words.length < 4}
          className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition"
        >
          全問でクイズ開始
        </button>

        <button
          onClick={() => router.push(`/decks/${id}/quiz?only_wrong=true`)}
          disabled={wrongCount < 4}
          className="bg-amber-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-amber-700 disabled:opacity-50 transition"
        >
          間違えた単語のみ ({wrongCount})
        </button>

        <Link
          href={`/decks/${id}/edit`}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition ml-auto"
        >
          + 単語を追加
        </Link>
      </div>

      {/* 単語一覧テーブル */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
              <th className="p-4">単語</th>
              <th className="p-4">定義</th>
              <th className="p-4 w-28 text-center">状態</th>
              <th className="p-4 w-32 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.words.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  単語がまだ登録されていません。「+ 単語を追加」から登録してください。
                </td>
              </tr>
            ) : (
              data.words.map((word) => (
                <tr key={word.id} className="hover:bg-gray-50">
                  <td className="p-4 font-semibold">{word.term}</td>
                  <td className="p-4 text-gray-700 whitespace-pre-wrap">
                    {word.definition}
                  </td>
                  <td className="p-4 text-center">
                    {word.is_wrong && (
                      <span className="inline-block bg-red-100 text-red-700 text-xs px-2 py-1 rounded">
                        要復習
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() =>
                        router.push(`/decks/${id}/edit?wordId=${word.id}`)
                      }
                      className="text-sm text-blue-600 hover:underline"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDeleteWord(word.id)}
                      className="text-sm text-red-600 hover:underline"
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
    </div>
  );
}