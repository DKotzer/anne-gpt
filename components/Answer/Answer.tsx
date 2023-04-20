import React, { useEffect, useState } from "react";
import styles from "./answer.module.css";

interface AnswerProps {
  text: string;
}

export const Answer: React.FC<AnswerProps> = ({ text }) => {
  const [words, setWords] = useState<string[]>([]);

  useEffect(() => {
    setWords(text.split(" "));
  }, [text]);

  return (
    <div className=' w-[98%] mx-auto'>
      {words.map((word, index) => (
        <span
          key={index}
          className={styles.fadeIn}
          style={{ animationDelay: `${index * 0.01}s` }}
        >
          {word}{" "}
        </span>
      ))}
    </div>
  );
};
