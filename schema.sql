--  RUN 1st -- Create the vector extension
create extension vector;

-- RUN 2nd  -- Create the table pg - if you want to change the table name, change every instance of 'pg' except for  `language plpgsql`, need to change scraping and embedding code as well to handle different name
create table pg (
  id bigserial primary key,
  essay_title text,
  essay_url text,
  essay_date text,
  essay_category text,
  content text,
  content_length bigint,
  content_tokens bigint,
  embedding vector (1536)
);

-- RUN 3rd after running the 2nd scripts -- Create the pg_search function
create or replace function pg_search (
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int
)
returns table (
  id bigint,
  essay_title text,
  essay_url text,
  essay_date text,
  essay_category text,
  content text,
  content_length bigint,
  content_tokens bigint,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    pg.id,
    pg.essay_title,
    pg.essay_url,
    pg.essay_date,
    pg.essay_category,
    pg.content,
    pg.content_length,
    pg.content_tokens,
    1 - (pg.embedding <=> query_embedding) as similarity
  from pg
  where 1 - (pg.embedding <=> query_embedding) > similarity_threshold
  order by pg.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- RUN 4th -- Create the index on pg table
create index on pg 
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

