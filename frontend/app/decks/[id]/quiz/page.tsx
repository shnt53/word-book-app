'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

type QuizQuestion = {
  id: string;
  definition: string;
  correct_term: string;
  options: string[];
};

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`${API_URL}/decks/${id}/quiz`);
        if (!res.ok) {
          throw new Error('クイズデータの取得に失敗しました');
        }
        const data = await res.json();
        setQuestions(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'エラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchQuiz();
    }
  }, [id, API_URL]);

  const handleSelectOption = (option: string) => {
    if (selectedOption !== null || !questions[currentIndex]) return;

    setSelectedOption(option);
    const currentQ = questions[currentIndex];

    if (option === currentQ.correct_term) {
      setScore((prev) => prev + 1);
      fetch(`${API_URL}/words/${currentQ.id}/status?status=remembered`, {
        method: 'PATCH',
      }).catch(console.error);
    } else {
      fetch(`${API_URL}/words/${currentQ.id}/status?status=not_remembered`, {
        method: 'PATCH',
      }).catch(console.error);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      setIsFinished(true);
    }
  };

  // 1. ローディング表示
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <p className="text-gray-600 font-medium">クイズを読み込んでいます...</p>
      </div>
    );
  }

  // 2. エラー発生時
  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg border border-red-200 text-center max-w-md mx-auto my-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href={`/decks/${id}`} className="text-blue-600 hover:underline font-medium">
          ← 単語帳詳細に戻る
        </Link>
      </div>
    );
  }

  // 3. 単語数が不足（クイズ問題が取得できない）している場合
  if (!questions || questions.length === 0) {
    return (
      <div className="p-8 bg-white rounded-lg border border-gray-200 text-center max-w-md mx-auto my-8 text-gray-900">
        <h2 className="text-xl font-bold mb-2">クイズを開始できません</h2>
        <p className="text-gray-600 mb-6 text-sm">
          クイズを作成するには、単語帳に最低2つ以上の単語が必要です。
        </p>
        <Link
          href={`/decks/${id}`}
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          ← 単語帳に戻って単語を追加する
        </Link>
      </div>
    );
  }

  // 4. クイズ終了時
  if (isFinished) {
    return (
      <div className="p-8 bg-white rounded-lg border border-gray-200 text-center max-w-md mx-auto my-8 text-gray-900">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">クイズ完了！</h2>
        <p className="text-lg mb-6 text-gray-700">
          スコア: <span className="font-bold text-blue-600">{score}</span> / {questions.length} 問正解
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => {
              setCurrentIndex(0);
              setSelectedOption(null);
              setScore(0);
              setIsFinished(false);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            もう一度挑戦
          </button>
          <Link
            href={`/decks/${id}`}
            className="bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium"
          >
            単語帳に戻る
          </Link>
        </div>
      </div>
    );
  }

  // 5. 通常の問題表示処理（安全に問題を取得）
  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-xl mx-auto my-6">
      <div className="mb-4 flex justify-between items-center">
        <Link href={`/decks/${id}`} className="text-blue-600 hover:underline text-sm font-medium">
          ← 中断して単語帳に戻る
        </Link>
        <span className="text-sm font-medium text-gray-600">
          問題 {currentIndex + 1} / {questions.length}
        </span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm text-gray-900">
        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-1">
            定義・意味
          </span>
          <p className="text-lg font-medium text-gray-900 whitespace-pre-wrap">
            {currentQ?.definition}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {currentQ?.options?.map((option, idx) => {
            let buttonStyle = 'border-gray-300 text-gray-800 hover:bg-gray-50';

            if (selectedOption !== null) {
              if (option === currentQ.correct_term) {
                buttonStyle = 'bg-green-100 border-green-500 text-green-900 font-bold';
              } else if (option === selectedOption) {
                buttonStyle = 'bg-red-100 border-red-500 text-red-900';
              } else {
                buttonStyle = 'border-gray-200 text-gray-400 opacity-60';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(option)}
                disabled={selectedOption !== null}
                className={`w-full text-left p-4 rounded-lg border transition text-base ${buttonStyle}`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {selectedOption !== null && (
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button
              onClick={handleNextQuestion}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              {currentIndex + 1 < questions.length ? '次の問題へ' : '結果を見る'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}