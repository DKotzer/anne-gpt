import { PGChunk, PGEssay, PGJSON } from "@/types";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import { encode } from "gpt-3-encoder";
import { title } from "process";

const CHUNK_SIZE = 600;

const getLinks = async () => {
  // const xml = await axios.get(
  //   `https://annehussain.com/wp-sitemap-posts-post-1.xml`
  // );
  // console.log(xml);
  // const $ = cheerio.load(xml.data);

  // let linksArr: { url: string }[] = [];

  // $("urlset")
  //   .find("loc")
  //   .each((i, el) => {
  //     linksArr.push({ url: $(el).text() });
  //   });
  // console.log("linksArr", linksArr);

  let linksArr = [{ url: "https://annehussain.com" }];
  // let linksArr = [{ url: "https://annehussain.com/about/" }, { url: "https://annehussain.com/pregnancy/" }, { url: "https://annehussain.com/acupuncture/" }];

  //done already
  // let linksArr = [{ url: "https://annehussain.com/services/" }];
  // let linksArr = [{ url: "https://annehussain.com/about" }];
  // let linksArr = [{ url: "https://annehussain.com/pregnancy" }];
  // let linksArr = [{ url: "https://annehussain.com/acupuncture" }];
  // let linksArr = [{ url: "https://annehussain.com/contact" }];
  //let linksArr = [{ url: "https://annehussain.com" }];
  //

  //

  return linksArr;
};

//exceptions to handle : ' rtl'  -
// add to acupuncture page post(s) that these are things anne offers. Fix headings in acupuncture setting so they are not all at the front.

const getEssay = async (linkObj: { url: string }) => {
  const { url } = linkObj;

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

  const fullLink = url;
  const html = await axios.get(fullLink);
  const $ = cheerio.load(html.data);

  const title = "Dr. Anne Hussain";
  const text = $("#content").text();
  const date = "2022-12-03";
  const category = "Dr. Anne Hussain's Home Page";
  // const relatedContent = $("#related-posts").text();
  // const postNavigation = $(".post-navigation").text();
  // const postCategory = category.replace("Post category:", " ").trim();
  //remove first instance of title and some other stuff
  let cleanedText = text.replace(/\s+/g, " ").replace(title, " ");
  //removes the PMIDs from the one post that has them
  cleanedText = cleanedText.replace(/PMID:\s*\d+\s*/g, "");

  // remove code comments
  cleanedText = cleanedText.replace(
    /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm,
    " "
  );
  // remove code between curly braces
  cleanedText = cleanedText.replace(/\{[^{}]*\}/gm, " ");
  cleanedText = cleanedText.replace("Post author:", " ");
  cleanedText = cleanedText.replace("Post category:", " ");
  cleanedText = cleanedText.replace(/^Anne\s+Hussain\s*/i, "");
  cleanedText = cleanedText.replace(/You Might Also Like[\s\S]*/gi, "");
  cleanedText = cleanedText.replace(/\s{2,}/g, " ");
  //removes the elementor classes
  cleanedText = cleanedText.replace(/\.elementor\S*/g, "");
  //removes the svg images
  cleanedText = cleanedText.replace(/a\s+a\s+img\[src\$=".svg"\]\s+img/g, "");
  // split words with capital letters in the middle
  cleanedText = cleanedText.replace(/([a-z])([A-Z])(?=[a-z])/g, "$1. $2");
  // add space after closing parenthesis followed by text or number
  cleanedText = cleanedText.replace(/\)(\S)/g, "). $1");
  // split words that have numbers in the middle
  cleanedText = cleanedText.replace(/([a-zA-Z]+)(\d+)/g, "$1 $2");
  // add space after period/question/exclamation followed by letter or number
  cleanedText = cleanedText.replace(/([.?!])([a-zA-Z0-9])/g, "$1 $2");
  cleanedText = cleanedText.replace(/\. e-con-inner>/g, " ");
  cleanedText = cleanedText.replace(/\. e-con/g, " ");

  let dateStr = date.replace("Post published:", " ").trim();
  let textWithoutExtras = "";

  if (date) {
    textWithoutExtras = cleanedText
      .replace(date, "")
      .replace(title, "")
      .replace(/\s{2,}/g, " ");
  }

  let essayText = textWithoutExtras.replace(/\n/g, " ");
  // console.log("essayText", essayText);

  console.log(cleanedText, "essayText");

  const trimmedContent = essayText
    .trim()
    .replace(/^(Anne\s+Hussain\.?|\bAnne\b)\s*/i, "")
    .replace(/^\./, "");

  essay = {
    title,
    url: fullLink,
    date: date,
    category: category,
    content: trimmedContent,
    length: trimmedContent.length,
    tokens: encode(trimmedContent).length,
    chunks: [],
  };

  return essay;
};

const chunkEssay = async (essay: PGEssay) => {
  const { title, url, date, content, category, ...chunklessSection } = essay;
  console.log("essay test", essay);
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
      if (sentence) {
        if (sentence[sentence.length - 1].match(/[a-z0-9]/i)) {
          chunkText += sentence + ". ";
        } else {
          chunkText += sentence + " ";
        }
      } else {
        // console.log("no sentence found");
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
    const chunkedEssay = await chunkEssay(essay!);
    if (chunkedEssay.chunks.length > 0 && chunkedEssay.title !== "") {
      essays.push(chunkedEssay);
    }
  }
  const json: PGJSON = {
    current_date: "2023-04-05",
    author: "Anne Hussain",
    url: "https://annehussain.com/wp-sitemap-posts-post-1.xml",
    length: essays.reduce((acc, essay) => acc + essay.length, 0),
    tokens: essays.reduce((acc, essay) => acc + essay.tokens, 0),
    essays,
  };

  fs.writeFileSync("scripts/pg.json", JSON.stringify(json));
})();

// last scrape April 5 2023
