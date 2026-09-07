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
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`${API_URL}/decks/${id}/quiz`);
        if (res.ok) {
          const data = await res.json();
          setQuizzes(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id, API_URL]);

  const updateWordStatus = async (wordId: string, status: string) => {
    try {
      await fetch(`${API_URL}/words/${wordId}/status?status=${status}`, {
        method: 'PATCH',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnswer = (option: string) => {
    if (selectedOption !== null) return;

    setSelectedOption(option);
    const currentQuiz = quizzes[currentIndex];
    const isCorrect = option === currentQuiz.correct_term;

    if (isCorrect) {
      setStats((prev) => ({ ...prev, correct: prev.correct + 1 }));
      updateWordStatus(currentQuiz.id, 'remembered');
    } else {
      setStats((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
      updateWordStatus(currentQuiz.id, 'not_remembered');
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < quizzes.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      setIsFinished(true);
    }
  };

  if (loading) return <p className="text-gray-500">読み込み中...</p>;
  if (quizzes.length === 0)
    return (
      <div className="text-center py-10">
        <p className="text-gray-500 mb-4">クイズを出題するための単語が足りません。（選択肢を作るために複数の単語が必要です）</p>
        <Link href={`/decks/${id}`} className="text-blue-600 hover:underline font-medium">
          ← 単語帳に戻る
        </Link>
      </div>
    );

  if (isFinished) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg border border-gray-200 text-center text-gray-900">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">クイズ完了！</h1>
        <div className="space-y-2 mb-6">
          <p className="text-lg text-gray-800">解いた問題数: {quizzes.length}</p>
          <p className="text-green-600 font-bold text-xl">正解: {stats.correct}</p>
          <p className="text-red-600 font-bold text-xl">不正解: {stats.wrong}</p>
        </div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              setCurrentIndex(0);
              setSelectedOption(null);
              setStats({ correct: 0, wrong: 0 });
              setIsFinished(false);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            もう一度解く
          </button>
          <Link
            href={`/decks/${id}`}
            className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 transition font-medium text-gray-700"
          >
            単語帳に戻る
          </Link>
        </div>
      </div>
    );
  }

  const quiz = quizzes[currentIndex];

  return (
    <div className="max-w-2xl mx-auto text-gray-900">
      <div className="flex justify-between items-center mb-6">
        <Link href={`/decks/${id}`} className="text-blue-600 hover:underline text-sm font-medium">
          ← 終了して戻る
        </Link>
        <span className="text-sm font-semibold text-gray-600">
          {currentIndex + 1} / {quizzes.length} 問目
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6 text-center">
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">解いた問題数</p>
          <p className="text-lg font-bold text-gray-800">{currentIndex}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <p className="text-xs text-green-600 font-semibold">正解</p>
          <p className="text-lg font-bold text-green-600">{stats.correct}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <p className="text-xs text-red-600 font-semibold">不正解</p>
          <p className="text-lg font-bold text-red-600">{stats.wrong}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
          問題（定義）
        </span>
        <p className="text-lg font-bold text-gray-900 mt-3 whitespace-pre-wrap">
          {quiz.definition}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-6">
        {quiz.options.map((option, index) => {
          let buttonStyle = 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900 font-medium';

          if (selectedOption !== null) {
            if (option === quiz.correct_term) {
              buttonStyle = 'bg-green-100 border-green-500 text-green-900 font-bold';
            } else if (selectedOption === option) {
              buttonStyle = 'bg-red-100 border-red-500 text-red-900 font-bold';
            } else {
              buttonStyle = 'bg-white border-gray-200 opacity-50 text-gray-900';
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswer(option)}
              disabled={selectedOption !== null}
              className={`p-4 border rounded-lg text-left transition ${buttonStyle}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {selectedOption !== null && (
        <div className="flex justify-end">
          <button
            onClick={handleNext}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-bold"
          >
            {currentIndex + 1 < quizzes.length ? '次の問題へ →' : '結果を見る'}
          </button>
        </div>
      )}
    </div>
  );
}