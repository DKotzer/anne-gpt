import { Answer } from "@/components/Answer/Answer";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { PGChunk } from "@/types";
import {
  IconArrowRight,
  IconExternalLink,
  IconSearch,
  IconSend,
} from "@tabler/icons-react";
import endent from "endent";
import Head from "next/head";
import { KeyboardEvent, useEffect, useRef, useState } from "react";

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState<string>("");
  const [chunks, setChunks] = useState<PGChunk[]>([]);
  const [answer, setAnswer] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [auth, setAuth] = useState<boolean>(true);
  const [placeholder, setPlaceholder] = useState<string>("");

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [mode, setMode] = useState<"search" | "chat">("chat");
  const [matchCount, setMatchCount] = useState<number>(5);
  //load env variables Name, Image, Description, and URL
  const name = process.env.NEXT_PUBLIC_NAME;
  const image = process.env.NEXT_PUBLIC_IMAGE;
  const description = process.env.NEXT_PUBLIC_DESCRIPTION;
  const title = process.env.NEXT_PUBLIC_TITLE;
  let searchPlaceholder = process.env.NEXT_PUBLIC_SEARCH;
  let askPlaceholder = process.env.NEXT_PUBLIC_ASK;

  useEffect(() => {
    const primaryColor = process.env.NEXT_PUBLIC_PRIMARY_COLOR ?? "#8d1248";
    const backgroundColor =
      process.env.NEXT_PUBLIC_BACKGROUND_COLOR ?? "#c4dadb";
    const navbarColor = process.env.NEXT_PUBLIC_NAVBAR_COLOR ?? "white";
    const footerColor = process.env.NEXT_PUBLIC_FOOTER_COLOR ?? "white";

    document.documentElement.style.setProperty("--primary-color", primaryColor);
    document.documentElement.style.setProperty(
      "--background-color",
      backgroundColor
    );
    document.documentElement.style.setProperty("--navbar-color", navbarColor);
    document.documentElement.style.setProperty("--footer-color", footerColor);
  }, []);
  // const matchCount = 5;

  const handleSearch = async () => {
    if (!query) {
      alert("Please enter a query.");
      return;
    }

    setAnswer("");
    setChunks([]);

    setLoading(true);

    const searchResponse = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, matches: matchCount }),
    });

    if (!searchResponse.ok) {
      setLoading(false);
      throw new Error(searchResponse.statusText);
    }

    const results: any = await searchResponse.json();

    setChunks(results);
    console.log("found chunks:", results);

    setLoading(false);

    inputRef.current?.focus();

    return results;
  };

  const handleAnswer = async () => {
    if (!query) {
      alert("Please enter a query.");
      return;
    }

    setAnswer("");
    setChunks([]);

    setLoading(true);
    setPlaceholder(query);

    const searchResponse = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, matches: matchCount }),
    });

    if (!searchResponse.ok) {
      setLoading(false);
      throw new Error(searchResponse.statusText);
    }

    const results: PGChunk[] = await searchResponse.json();

    setChunks(results);

    const prompt = endent`
    Use the following passages to provide an answer to the query: "${query}."

    ${results?.map((d: any) => d.content).join("\n\n")}
    `;

    const answerResponse = await fetch("/api/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!answerResponse.ok) {
      setLoading(false);
      throw new Error(answerResponse.statusText);
    }

    const data = answerResponse.body;

    if (!data) {
      return;
    }

    setLoading(false);
    setQuery("");

    const reader = data.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);
      setAnswer((prev) => prev + chunkValue);
    }

    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (mode === "search") {
        handleSearch();
      } else {
        handleAnswer();
      }
    }
  };

  useEffect(() => {
    if (matchCount > 10) {
      setMatchCount(10);
    } else if (matchCount < 1) {
      setMatchCount(1);
    }
  }, [matchCount]);

  useEffect(() => {
    const PG_MATCH_COUNT = localStorage.getItem("PG_MATCH_COUNT");
    const PG_MODE = localStorage.getItem("PG_MODE");

    if (PG_MATCH_COUNT) {
      setMatchCount(parseInt(PG_MATCH_COUNT));
    }

    if (PG_MODE) {
      setMode(PG_MODE as "search" | "chat");
    }

    inputRef.current?.focus();
  }, []);
  // console.log("chunks", chunks);
  return (
    <>
      <Head>
        <title>{`${name} AI`}</title>
        <meta
          name='description'
          content={`Use AI to explore the wisdom of ${title}`}
        />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='icon' href={image} />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <meta property='og:title' content={name} />
        <meta property='og:description' content={description} />
        <meta property='og:image' content={image} />
      </Head>

      <div className={`flex flex-col h-screen w-screen backgroundColor`}>
        <Navbar mode={mode} setMode={setMode} />
        <div className='flex-1 overflow-auto w-full scrollDiv'>
          {answer === "" && <img src={image} className='mx-auto mt-6 '></img>}
          <div className='mx-auto flex min-h-content w-full  max-w-[750px] flex-col items-center px-3 '>
            {true && <div className='w-full sm:w-[355px]'></div>}

            {true === true ? (
              <div className={`relative w-full ${answer !== "" ? "mt-6" : ""}`}>
                <IconSearch className='navSelectedColor absolute top-3 w-10 left-1 h-6 rounded-full opacity-85 sm:left-3 sm:top-4 sm:h-8' />

                <input
                  ref={inputRef}
                  className='h-12 w-full rounded-3xl border border-zinc-600 pr-12 pl-11 focus:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800 sm:h-16 sm:py-2 sm:pr-16 sm:pl-16 sm:text-lg'
                  type='text'
                  placeholder={
                    placeholder !== ""
                      ? placeholder
                      : mode === "chat"
                      ? `${askPlaceholder}`
                      : `${searchPlaceholder}`
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />

                <button
                  disabled={query === ""}
                  className={`${
                    query === ""
                      ? "opacity-0 cursor-no-drop transition-opacity duration-500 ease-in-out"
                      : "opacity-100 transition-opacity duration-500 ease-in-out"
                  } `}
                >
                  <IconSend
                    onClick={mode === "search" ? handleSearch : handleAnswer}
                    className={` absolute chatButton right-2 top-2.5 h-7 w-7 rounded-full p-1.5  sm:right-3 sm:top-3 sm:h-9 sm:w-9 text-white `}
                  />
                </button>
              </div>
            ) : (
              <div className='text-center font-bold text-3xl mt-7'>
                <p>True is false, your in trouble</p>
              </div>
            )}

            {loading ? (
              <div className='mt-6 w-full'>
                {mode === "chat" && (
                  <>
                    <div className='font-bold text-2xl'>Answer</div>
                    <div className='animate-pulse mt-2'>
                      <div className='h-4 bg-gray-500 rounded'></div>
                      <div className='h-4 bg-gray-500 rounded mt-2'></div>
                      <div className='h-4 bg-gray-500 rounded mt-2'></div>
                      <div className='h-4 bg-gray-500 rounded mt-2'></div>
                      <div className='h-4 bg-gray-500 rounded mt-2'></div>
                    </div>
                  </>
                )}

                <div className='font-bold text-2xl mt-6'>Passages</div>
                <div className='animate-pulse mt-2'>
                  <div className='h-4 bg-gray-500 rounded'></div>
                  <div className='h-4 bg-gray-500 rounded mt-2'></div>
                  <div className='h-4 bg-gray-500 rounded mt-2'></div>
                  <div className='h-4 bg-gray-500 rounded mt-2'></div>
                  <div className='h-4 bg-gray-500 rounded mt-2'></div>
                </div>
              </div>
            ) : answer ? (
              <div className='mt-6'>
                <div className='bg-white p-5 border border-black rounded-xl min-h-[200px]'>
                  <div className='font-bold text-2xl mb-2'>Answer</div>
                  <Answer text={answer} />
                </div>
                <div className='mt-6 mb-16'>
                  <div className='font-bold text-2xl'>Passages</div>

                  {chunks.map((chunk, index) => (
                    <div key={index}>
                      <div className='mt-4 border bg-white border-zinc-600 rounded-lg p-5 '>
                        <div className='flex justify-between'>
                          <div>
                            <div className='font-bold text-xl'>
                              {chunk.essay_title}
                            </div>
                            <div className='mt-1 font-bold text-sm'>
                              {chunk.essay_date}
                            </div>
                          </div>
                          <div className='topRight relative top-0 right-0'>
                            <div className=' float-right'>
                              <a
                                className='hover:opacity-50'
                                href={chunk.essay_url}
                                target='_blank'
                                rel='noreferrer'
                              >
                                <IconExternalLink />
                              </a>
                            </div>
                            <div className=' break-keep '>
                              Relevancy:&nbsp;
                              {(chunk?.similarity! * 100).toFixed(2)}%{" "}
                            </div>
                          </div>
                        </div>
                        <div className='mt-2 w-[98%] mx-auto'>
                          {chunk.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : chunks.length > 0 ? (
              <div className='mt-6 pb-16'>
                <div className='font-bold text-2xl'>Passages</div>
                {chunks.map((chunk, index) => (
                  <div key={index}>
                    <div className='mt-4 border bg-white border-zinc-600 rounded-lg p-5'>
                      <div className='flex justify-between items-start'>
                        <div>
                          <div className='font-bold text-xl'>
                            {chunk.essay_title}
                          </div>
                          <div className='mt-1 font-bold text-sm'>
                            {chunk.essay_date}
                          </div>
                        </div>
                        <div className='topRight relative top-0 right-0'>
                          <div className=' float-right'>
                            <a
                              className='hover:opacity-50 '
                              href={chunk.essay_url}
                              target='_blank'
                              rel='noreferrer'
                            >
                              <IconExternalLink />
                            </a>
                          </div>
                          <div className=' break-keep '>
                            Relevancy:&nbsp;
                            {(chunk?.similarity! * 100).toFixed(2)}%{" "}
                          </div>
                        </div>
                      </div>
                      <div className='mt-2 w-[98%] mx-auto'>
                        {chunk.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='mt-6 mb-[50px] text-center text-lg'>{`${description}`}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
