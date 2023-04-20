export type PGEssay = {
  title: string;
  url: string;
  date: string;
  content: string;
  category: string;
  length: number;
  tokens: number;
  chunks: PGChunk[];
};

export type PGChunk = {
  essay_title: string;
  essay_url: string;
  essay_date: string;
  essay_category: string;
  content: string;
  content_length: number;
  content_tokens: number;
  embedding: number[];
  similarity?: number;
};

export type PGJSON = {
  current_date: string;
  author: string;
  url: string;
  length: number;
  tokens: number;
  essays: PGEssay[];
};
