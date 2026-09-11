'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

type QuizQuestion = {
  id: string;
  definition: string;
  correct_term: string;
  options: string[];
  option_definitions?: Record<string, string>; // 不正解選択肢の定義用マップ
};

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);             // 正解数
  const [wrongScore, setWrongScore] = useState(0);   // 不正解数
  const [isFinished, setIsFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch(`${API_URL}/decks/${id}/quiz`, {
          cache: 'no-store'
        });
        
        if (!res.ok) {
          throw new Error(`クイズデータの取得に失敗しました (Status: ${res.status})`);
        }
        
        const data = await res.json();
        
        if (Array.isArray(data)) {
          setQuestions(data);
        } else {
          setQuestions([]);
        }
      } catch (err: any) {
        console.error('Quiz Fetch Error:', err);
        setError(err.message || 'クイズの取得中にエラーが発生しました');
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

    const isCorrect = option === currentQ.correct_term;
    const nextStatus = isCorrect ? 'remembered' : 'not_remembered';

    if (isCorrect) {
      setScore((prev) => prev + 1);
    } else {
      setWrongScore((prev) => prev + 1);
    }

    // ステータス更新処理
    fetch(`${API_URL}/words/${currentQ.id}/status?status=${nextStatus}`, {
      method: 'PATCH',
    }).catch((err) => console.error('Status update failed:', err));
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      setIsFinished(true);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <p className="text-gray-600 font-medium">クイズを生成中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg border border-red-200 text-center max-w-md mx-auto my-8">
        <p className="text-red-600 mb-4 font-medium">{error}</p>
        <Link href={`/decks/${id}`} className="text-blue-600 hover:underline font-medium">
          ← 単語帳詳細に戻る
        </Link>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="p-8 bg-white rounded-lg border border-gray-200 text-center max-w-md mx-auto my-8 text-gray-900">
        <h2 className="text-xl font-bold mb-2 text-gray-900">クイズを開始できません</h2>
        <p className="text-gray-600 mb-6 text-sm">
          クイズを作成するには、単語帳に最低2つ以上の単語が必要です。
        </p>
        <Link
          href={`/decks/${id}`}
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          ← 単語帳に戻る
        </Link>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="p-8 bg-white rounded-lg border border-gray-200 text-center max-w-md mx-auto my-8 text-gray-900">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">クイズ完了！</h2>
        <div className="text-lg mb-6 text-gray-700 space-y-1">
          <p>正解数: <span className="font-bold text-green-600">{score}</span> 問</p>
          <p>不正解数: <span className="font-bold text-red-600">{wrongScore}</span> 問</p>
          <p className="text-sm text-gray-500 pt-2">（全 {questions.length} 問）</p>
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => {
              setCurrentIndex(0);
              setSelectedOption(null);
              setScore(0);
              setWrongScore(0);
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

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-xl mx-auto my-6">
      {/* ヘッダー：正解数・不正解数および進行状況の表示 */}
      <div className="mb-4 flex justify-between items-center">
        <Link href={`/decks/${id}`} className="text-blue-600 hover:underline text-sm font-medium">
          ← 中断して単語帳に戻る
        </Link>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span className="text-green-600 bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
            正解: {score}
          </span>
          <span className="text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
            不正解: {wrongScore}
          </span>
          <span className="text-gray-500 font-normal">
            ({currentIndex + 1} / {questions.length})
          </span>
        </div>
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

        {/* 選択肢一覧 */}
        <div className="space-y-3 mb-6">
          {currentQ?.options?.map((option, idx) => {
            const isCorrectOption = option === currentQ.correct_term;
            const isSelectedOption = option === selectedOption;
            
            let buttonStyle = 'border-gray-300 text-gray-800 hover:bg-gray-50';

            if (selectedOption !== null) {
              if (isCorrectOption) {
                buttonStyle = 'bg-green-100 border-green-500 text-green-900 font-bold';
              } else if (isSelectedOption) {
                buttonStyle = 'bg-red-100 border-red-500 text-red-900';
              } else {
                buttonStyle = 'border-gray-200 text-gray-400 opacity-60';
              }
            }

            // ホバー時に表示する定義テキストの取得
            const optionDef = currentQ.option_definitions?.[option];
            const showTooltip = selectedOption !== null && !isCorrectOption && optionDef;

            return (
              <div key={idx} className="relative group w-full">
                <button
                  onClick={() => handleSelectOption(option)}
                  disabled={selectedOption !== null}
                  className={`w-full text-left p-4 rounded-lg border transition text-base ${buttonStyle}`}
                >
                  {option}
                </button>

                {/* 解答後、不正解選択肢へのマウスホバーで定義をポップアップ表示 */}
                {showTooltip && (
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-20 w-full p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl pointer-events-none">
                    <span className="font-bold text-amber-300 block mb-1">
                      💡 意味: 【{option}】
                    </span>
                    <p className="whitespace-pre-wrap leading-relaxed">{optionDef}</p>
                    <div className="absolute top-full left-6 -mt-1 border-4 border-transparent border-t-gray-900" />
                  </div>
                )}
              </div>
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