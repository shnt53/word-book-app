'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Word = {
  id: string;
  term: string;
  definition: string;
};

export default function WordEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');
  const [existingWords, setExistingWords] = useState<Word[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const wordId = searchParams.get('wordId');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const initData = async () => {
      try {
        const res = await fetch(`${API_URL}/decks/${id}`);
        if (res.ok) {
          const result = await res.json();
          setExistingWords(result.words);

          if (wordId) {
            const target = result.words.find((w: Word) => w.id === wordId);
            if (target) {
              setTerm(target.term);
              setDefinition(target.definition);
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    initData();
  }, [id, wordId]);

  const handleTermChange = (value: string) => {
    setTerm(value);
    const isDuplicate = existingWords.some(
      (w) => w.term.toLowerCase() === value.trim().toLowerCase() && w.id !== wordId
    );
    setDuplicateWarning(isDuplicate);
  };

  const handleSave = async (isContinuous = false) => {
    if (!term.trim() || !definition.trim()) {
      alert('単語と定義を入力してください');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/decks/${id}/words`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term,
          definition,
          word_id: wordId || undefined,
        }),
      });

      if (res.ok) {
        if (isContinuous) {
          setTerm('');
          setDefinition('');
          setDuplicateWarning(false);
          const savedWord = await res.json();
          setExistingWords((prev) => [...prev, savedWord]);
        } else {
          router.push(`/decks/${id}`);
        }
      } else {
        alert('保存に失敗しました');
      }
    } catch (err) {
      alert('エラーが発生しました');
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/decks/${id}/import-csv`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        router.push(`/decks/${id}`);
      } else {
        const errData = await res.json();
        alert(`エラー: ${errData.detail}`);
      }
    } catch (err) {
      alert('CSVアップロード中にエラーが発生しました');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <Link href={`/decks/${id}`} className="text-sm text-blue-600 hover:underline">
        ← 管理画面に戻る
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">
        {wordId ? '単語の編集' : '新しい単語の追加'}
      </h1>

      <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">単語</label>
          <input
            type="text"
            value={term}
            onChange={(e) => handleTermChange(e.target.value)}
            className="w-full border rounded-md p-2"
            placeholder="例: apple"
          />
          {duplicateWarning && (
            <p className="text-amber-600 text-sm mt-1">
              ⚠️ 警告: 同名の単語がすでにこの単語帳に存在します。
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">定義・意味</label>
          <textarea
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            className="w-full border rounded-md p-2 h-28"
            placeholder="例: りんご（赤い果物）"
          />
        </div>

        <div className="flex gap-2 pt-2">
          {!wordId && (
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="flex-1 bg-gray-100 border border-gray-300 text-gray-700 py-2.5 rounded-md font-bold hover:bg-gray-200"
            >
              ＋ 連続で追加
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-md font-bold hover:bg-blue-700"
          >
            保存して戻る
          </button>
        </div>
      </div>

      {!wordId && (
        <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-bold text-lg mb-2">CSVファイルから一括インポート</h3>
          <p className="text-xs text-gray-600 mb-4">
            1列目に「単語」、2列目に「定義」を入力したCSV（UTF-8）を選択してください。
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {isUploading && <p className="text-sm text-blue-600 mt-2">読み込み中...</p>}
        </div>
      )}
    </div>
  );
}