import csv
import datetime
from io import StringIO
import random
import uuid
from typing import Optional

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, relationship, sessionmaker

# ------------------------------------------------------------------------------
# 1. データベース設定 & モデル定義
# ------------------------------------------------------------------------------
# 本番環境では環境変数などから取得します（例: SupabaseやNeonのPostgreSQL URL）
DATABASE_URL = os.getenv("postgresql://postgres:[GsTwFKmNkRpUUPuj]@db.gmdtbqlsdpbedgcjelya.supabase.co:5432/postgres", "sqlite:///./wordbook.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Deck(Base):
    __tablename__ = "decks"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    words = relationship("Word", back_populates="deck", cascade="all, delete-orphan")


class Word(Base):
    __tablename__ = "words"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    deck_id = Column(String, ForeignKey("decks.id"), nullable=False)
    term = Column(String, nullable=False)
    definition = Column(Text, nullable=False)
    is_wrong = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    deck = relationship("Deck", back_populates="words")


Base.metadata.create_all(bind=engine)

# ------------------------------------------------------------------------------
# 2. Pydantic スキーマ定義
# ------------------------------------------------------------------------------
class DeckCreate(BaseModel):
    title: str
    description: Optional[str] = ""


class WordUpsert(BaseModel):
    term: str
    definition: str
    word_id: Optional[str] = None


# ------------------------------------------------------------------------------
# 3. FastAPI アプリケーション設定
# ------------------------------------------------------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ------------------------------------------------------------------------------
# 4. API エンドポイント
# ------------------------------------------------------------------------------

# --- ① 一覧画面用 ---
@app.get("/decks")
def get_decks(db: Session = Depends(get_db)):
    return db.query(Deck).order_by(Deck.created_at.desc()).all()


@app.post("/decks")
def create_deck(deck_in: DeckCreate, db: Session = Depends(get_db)):
    deck = Deck(title=deck_in.title, description=deck_in.description)
    db.add(deck)
    db.commit()
    db.refresh(deck)
    return deck


# --- ② 管理画面用 ---
@app.get("/decks/{deck_id}")
def get_deck_detail(deck_id: str, db: Session = Depends(get_db)):
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="単語帳が見つかりません")
    words = db.query(Word).filter(Word.deck_id == deck_id).order_by(Word.created_at.desc()).all()
    return {
        "deck": {"id": deck.id, "title": deck.title, "description": deck.description},
        "words": [
            {
                "id": w.id,
                "term": w.term,
                "definition": w.definition,
                "is_wrong": w.is_wrong,
            }
            for w in words
        ],
    }


@app.delete("/words/{word_id}")
def delete_word(word_id: str, db: Session = Depends(get_db)):
    word = db.query(Word).filter(Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="指定された単語が見つかりません")
    db.delete(word)
    db.commit()
    return {"status": "success"}


# --- ③ 追加・更新画面用 ---
@app.post("/decks/{deck_id}/words")
def upsert_word(deck_id: str, payload: WordUpsert, db: Session = Depends(get_db)):
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="指定された単語帳が見つかりません")

    if payload.word_id:
        word = db.query(Word).filter(Word.id == payload.word_id).first()
        if not word:
            raise HTTPException(status_code=404, detail="更新対象の単語が見つかりません")
        word.term = payload.term
        word.definition = payload.definition
    else:
        word = Word(deck_id=deck_id, term=payload.term, definition=payload.definition)
        db.add(word)

    db.commit()
    db.refresh(word)
    return {"id": word.id, "term": word.term, "definition": word.definition}


@app.post("/decks/{deck_id}/import-csv")
async def import_csv(deck_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="CSVファイルをアップロードしてください")

    try:
        contents = await file.read()
        decoded = contents.decode("utf-8-sig")
        csv_reader = csv.reader(StringIO(decoded))
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="文字コードエラーです。UTF-8形式のCSVを使用してください。")
    except Exception:
        raise HTTPException(status_code=400, detail="ファイルの読み込みに失敗しました")

    new_words = []
    row_count = 0

    for row in csv_reader:
        if len(row) >= 2 and row[0].strip() and row[1].strip():
            term = row[0].strip()
            definition = row[1].strip()

            if row_count == 0 and (term == "単語" or term.lower() == "term"):
                row_count += 1
                continue

            new_words.append(Word(deck_id=deck_id, term=term, definition=definition))
        row_count += 1

    if not new_words:
        raise HTTPException(status_code=400, detail="有効な単語データが見つかりませんでした")

    db.add_all(new_words)
    db.commit()

    return {"message": f"{len(new_words)}件の単語をインポートしました"}


# --- ④ クイズ画面用 ---
@app.get("/decks/{deck_id}/quiz")
def get_quiz_question(deck_id: str, only_wrong: bool = False, db: Session = Depends(get_db)):
    all_words = db.query(Word).filter(Word.deck_id == deck_id).all()

    if len(all_words) < 4:
        raise HTTPException(status_code=400, detail="クイズを行うには単語帳に最低4つの単語が必要です")

    if only_wrong:
        target_candidates = [w for w in all_words if w.is_wrong]
        if not target_candidates:
            raise HTTPException(status_code=404, detail="間違えた単語がありません")
    else:
        target_candidates = all_words

    target = random.choice(target_candidates)

    other_words = [w for w in all_words if w.id != target.id]
    dummies = random.sample(other_words, 3)

    options = [target.term] + [d.term for d in dummies]
    random.shuffle(options)

    return {
        "word_id": target.id,
        "definition": target.definition,
        "correct_term": target.term,
        "options": options,
    }


@app.patch("/words/{word_id}/status")
def update_word_status(word_id: str, is_wrong: bool, db: Session = Depends(get_db)):
    word = db.query(Word).filter(Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="指定された単語が見つかりません")

    word.is_wrong = is_wrong
    db.commit()
    return {"status": "success"}