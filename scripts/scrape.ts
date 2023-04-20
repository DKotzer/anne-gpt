import { PGChunk, PGEssay, PGJSON } from "@/types";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import { encode } from "gpt-3-encoder";
import { title } from "process";

const CHUNK_SIZE = 200;

const getLinks = async () => {
  const html = await axios.get(`http://127.0.0.17:3000/plato.html`);
  const $ = cheerio.load(html.data);
  const books: { title: string; text: string }[] = [];

  $(".newBook").each((i, bookElement) => {
    const $bookElement = $(bookElement);
    const title = $bookElement.find(".bookTitle").text().trim();

    const text = $bookElement
      .clone()
      // clone the element so we can modify it without affecting the original
      .find("div.fs12, div.m1, span.fff") // find all div elements with class fs12
      .remove()
      // .each((i, el) => {
      //   $(el)
      //     .html()
      //     .replace(/<\/div>/g, " </div>");
      // })
      .end()
      .text()
      .replace(title, " ")
      .replace(/\s+/g, " ")
      // remove concesecutive whitespace
      .replace(/(\r\n|\n|\r)/gm, " "); // remove newlines
    // console.log(text, "text");

    // const text = $bookElement
    //   .contents()
    //   .map((i, el) => {
    //     if (el.nodeType === 3) {
    //       // check if it's a text node
    //       return `${el.nodeValue} `;
    //     } else if ($(el).hasClass("fs12")) {
    //       // check if it has the fs12 class
    //       return ""; // exclude it
    //     } else {
    //       return $(el).text();
    //     }
    //   })
    //   .get()
    //   .join(" ")
    //   .replace(title, "")
    //   .replace(/\s+/g, " ")
    //   .replace(/(\r\n|\n|\r)/gm, " ")
    //   .trim();

    // const text = $bookElement.text().replace(title, "").replace(/\n/g, " ").trim();
    const book = {
      title,
      text,
    };
    // console.log(book, "book:", title);
    books.push(book);
  });

  return books;
};

//   $(".newBook").each((i, bookElement) => {
//     const $bookElement = $(bookElement);

//     const currentBook: { title: string; text: string } = {
//       title: $(".bookTitle").text(),
//       text: "",
//     };

//     books.push(currentBook);
//     // console.log("currentBookPush", currentBook);

//     $bookElement.nextUntil(".newBook").each((i, subElement) => {
//       const $subElement = $(subElement);
//       if (!currentBook.text.includes($subElement.text())) {
//         currentBook.text += $subElement.text();
//         // console.log("NewChapter addition", $subElement.text());
//       }
//     });
//   });
//   return books;
// };

// console.log(books[0], "books[0]");

// console.log(xml);

// let linksArr = [{ url: "http://127.0.0.17:3000/period.html" }];

const getEssay = async (linkObj: { title: string; text: string }) => {
  const { title, text } = linkObj;

  // console.log("essay processing: ", text, ":", title);

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
  // const page = $(".pageNumber").text()
  const date = `Plato Complete Works - ${title}`;
  const category = "Plato Complete Works";
  //remove first instance of title and some other stuff

  let cleanedText = text.replace(/\s+/g, " ");
  cleanedText = cleanedText.replace(/\n/g, " ");
  cleanedText = cleanedText.replace(/\s{2,}/g, " ");

  // split words with capital letters in the middle
  cleanedText = cleanedText.replace(/([a-z])([A-Z])(?=[a-z])/g, "$1. $2");
  // add space after closing parenthesis followed by text or number
  cleanedText = cleanedText.replace(/\)(\S)/g, "). $1");
  // split words that have numbers in the middle
  cleanedText = cleanedText.replace(/([a-zA-Z]+)(\d+)/g, "$1 $2");
  // add space after period/question/exclamation followed by letter or number
  cleanedText = cleanedText.replace(/([.?!])([a-zA-Z0-9])/g, "$1 $2");

  // let essayText = cleanedText.replace(/\n/g, " ").replace(regex, ". ");

  const trimmedContent = cleanedText.trim();

  essay = {
    title,
    url: `https://tinyurl.com/platosworks`,
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

      if (sentence) {
        if (sentence[sentence.length - 1].match(/[a-z0-9]/i)) {
          chunkText += sentence + ". ";
        } else {
          chunkText += sentence + " ";
        }
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
    author: "Plato",
    url: "https://tinyurl.com/platosworks",
    length: essays.reduce((acc, essay) => acc + essay.length, 0),
    tokens: essays.reduce((acc, essay) => acc + essay.tokens, 0),
    essays,
  };

  fs.writeFileSync("scripts/pg.json", JSON.stringify(json));
})();
