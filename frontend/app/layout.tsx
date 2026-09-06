import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '自分専用単語帳',
  description: 'PC・スマホ同期型の単語暗記Webアプリ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <a href="/" className="text-xl font-bold text-blue-600">
              My Wordbook
            </a>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}