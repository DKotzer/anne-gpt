import { PGChunk, PGEssay, PGJSON } from "@/types";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import { encode } from "gpt-3-encoder";
import { title } from "process";

const CHUNK_SIZE = 200;

const getLinks = async () => {
  const linksArr: { title: string; text: string }[] = [];
  const html = await axios.get(`http://127.0.0.17:3000/period.html`);
  // console.log("getlink status", html.statusText);
  const $ = cheerio.load(html.data);

  const chapters: { title: string; text: string }[] = [];

  // create a variable to store the current chapter
  let currentChapter: { title: string; text: string } | null = null;

  // loop over each element in the document
  $("*").each((i, element) => {
    const $element = $(element);

    // check if this element is a chapter heading
    if ($element.hasClass("c35")) {
      // console.log("chapter found:", $element.text());
      // if it is, create a new chapter object and add it to the array
      currentChapter = {
        title: $element.text().trim(),
        text: "",
      };
      linksArr.push(currentChapter);
      console.log("currentChapterPush", currentChapter);
    } else if (currentChapter !== null) {
      // if it's not a chapter heading and we're currently in a chapter,
      // add the element's text content to the current chapter's text
      if (!currentChapter.text.includes($element.text())) {
        currentChapter.text += $element.text();
        console.log("NewChapter addition", $element.text());
      }
    }
  });
  console.log(linksArr[0], "linksArr[0]");

  // console.log(xml);

  // let linksArr = [{ url: "http://127.0.0.17:3000/period.html" }];

  return linksArr;
};

const getEssay = async (linkObj: { title: string; text: string }) => {
  const { title, text } = linkObj;

  let essay: PGEssay = {
    title: "",
    url: "",
    date: "",
    content: "",
    category: "",
    length: 0,
    tokens: 0,
    chunks: [],
  };

  // const html = await axios.get(fullLink);
  // const $ = cheerio.load(html.data);

  // const title = $("#content h2").text().replace("Read more articles", "");

  const date = "The Period Literacy Handbook - Coming Soon!";
  const category = "The Period Literacy Handbook";
  //remove first instance of title and some other stuff

  let cleanedText = text.replace(/\s+/g, " ");

  // let essayText = cleanedText.replace(/\n/g, " ").replace(regex, ". ");

  const trimmedContent = cleanedText.trim();

  essay = {
    title,
    url: `https://annehussain.com/`,
    date: date,
    category: category,
    content: trimmedContent,
    length: trimmedContent.length,
    tokens: encode(trimmedContent).length,
    chunks: [],
  };
  // console.log(essay);
  return essay;
};

const chunkEssay = async (essay: PGEssay) => {
  const { title, url, date, content, category, ...chunklessSection } = essay;
  let essayTextChunks = [];
  if (encode(content).length > CHUNK_SIZE) {
    const split = content.split(". ");
    let chunkText = "";
    for (let i = 0; i < split.length; i++) {
      const sentence = split[i];
      const sentenceTokenLength = encode(sentence);
      const chunkTextTokenLength = encode(chunkText).length;

      if (chunkTextTokenLength + sentenceTokenLength.length > CHUNK_SIZE) {
        essayTextChunks.push(chunkText);
        chunkText = "";
      }

      if (sentence[sentence.length - 1].match(/[a-z0-9]/i)) {
        chunkText += sentence + ". ";
      } else {
        chunkText += sentence + " ";
      }
    }
    essayTextChunks.push(chunkText.trim());
  } else {
    essayTextChunks.push(content.trim());
  }
  const essayChunks = essayTextChunks
    .map((text) => {
      const trimmedText = text.trim();
      const chunk: PGChunk = {
        essay_title: title,
        essay_url: url,
        essay_date: date,
        essay_category: category,
        content: trimmedText,
        content_length: trimmedText.length,
        content_tokens: encode(trimmedText).length,
        embedding: [],
      };
      return chunk;
    })
    .filter((chunk) => chunk.content !== "");

  if (essayChunks.length > 1) {
    for (let i = 0; i < essayChunks.length; i++) {
      const chunk = essayChunks[i];
      const prevChunk = essayChunks[i - 1];
      if (chunk.content_tokens < 100 && prevChunk) {
        prevChunk.content += " " + chunk.content;
        prevChunk.content_length += chunk.content_length;
        prevChunk.content_tokens += chunk.content_tokens;
        essayChunks.splice(i, 1);
        i--;
      }
    }
  }

  const chunkedSection: PGEssay = {
    ...essay,
    chunks: essayChunks,
  };

  return chunkedSection;
};

(async () => {
  const links = await getLinks();
  let essays = [];
  for (let i = 0; i < links.length; i++) {
    const essay = await getEssay(links[i]);
    const chunkedEssay = await chunkEssay(essay);
    essays.push(chunkedEssay);
  }
  const json: PGJSON = {
    current_date: "2023-03-31",
    author: "Anne Hussain",
    url: "https://annehussain.com/wp-sitemap-posts-post-1.xml",
    length: essays.reduce((acc, essay) => acc + essay.length, 0),
    tokens: essays.reduce((acc, essay) => acc + essay.tokens, 0),
    essays,
  };

  fs.writeFileSync("scripts/pg.json", JSON.stringify(json));
})();
