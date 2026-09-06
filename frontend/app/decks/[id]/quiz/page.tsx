'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type QuizQuestion = {
  word_id: string;
  definition: string;
  correct_term: string;
  options: string[];
};

export default function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [quiz, setQuiz] = useState<QuizQuestion | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const onlyWrong = searchParams.get('only_wrong') === 'true';

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchQuestion = async () => {
    setSelectedOption(null);
    setIsCorrect(null);
    setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/decks/${id}/quiz?only_wrong=${onlyWrong}`
      );
      if (res.ok) {
        const data = await res.json();
        setQuiz(data);
      } else {
        const errData = await res.json();
        alert(errData.detail || 'クイズの取得に失敗しました');
        router.push(`/decks/${id}`);
      }
    } catch (err) {
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestion();
  }, [id]);

  const handleAnswer = async (option: string) => {
    if (!quiz || selectedOption !== null) return;

    setSelectedOption(option);
    const correct = option === quiz.correct_term;
    setIsCorrect(correct);

    setTotalCount((prev) => prev + 1);
    if (correct) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setWrongCount((prev) => prev + 1);
    }

    try {
      await fetch(
        `${API_URL}/words/${quiz.word_id}/status?is_wrong=${!correct}`,
        { method: 'PATCH' }
      );
    } catch (err) {
      console.error('ステータス更新失敗', err);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4">
        <Link
          href={`/decks/${id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← 終了して戻る
        </Link>
        <span className="text-xs bg-gray-200 px-2.5 py-1 rounded-full font-medium">
          {onlyWrong ? '間違えた単語のみ' : '全問モード'}
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 text-center flex justify-around">
        <div>
          <p className="text-xs text-gray-500">解いた問題数</p>
          <p className="text-xl font-bold">{totalCount}</p>
        </div>
        <div>
          <p className="text-xs text-green-600">正解</p>
          <p className="text-xl font-bold text-green-600">{correctCount}</p>
        </div>
        <div>
          <p className="text-xs text-red-600">不正解</p>
          <p className="text-xl font-bold text-red-600">{wrongCount}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-10">問題を取得中...</p>
      ) : quiz ? (
        <div>
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg mb-6 text-center">
            <p className="text-xs text-blue-600 mb-2 font-bold">問題（定義）</p>
            <p className="text-xl font-semibold text-gray-800 whitespace-pre-wrap">
              {quiz.definition}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {quiz.options.map((option, index) => {
              let buttonStyle = 'bg-white border-gray-200 hover:bg-gray-50';

              if (selectedOption !== null) {
                if (option === quiz.correct_term) {
                  buttonStyle = 'bg-green-100 border-green-500 text-green-800 font-bold';
                } else if (selectedOption === option) {
                  buttonStyle = 'bg-red-100 border-red-500 text-red-800 font-bold';
                } else {
                  buttonStyle = 'bg-white border-gray-200 opacity-50';
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

          {selectedOption && (
            <div className="mt-6 text-center space-y-4">
              <p className={`text-lg font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {isCorrect ? '⭕ 正解！' : `❌ 不正解... (正解: ${quiz.correct_term})`}
              </p>
              <button
                onClick={fetchQuestion}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
              >
                次の問題へ
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}