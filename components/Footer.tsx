import { IconBrandGithub, IconBrandTwitter } from "@tabler/icons-react";
import { FC } from "react";

export const Footer: FC = () => {
  const title = process.env.NEXT_PUBLIC_TITLE;
  const url = process.env.NEXT_PUBLIC_URL;
  return (
    <div className='flex h-[50px] border-t border-gray-300 py-2 px-8 items-center sm:justify-between justify-center footerColor'>
      <div className='hidden sm:flex'></div>

      <div className='hidden sm:flex italic text-sm'>
        Created by
        <a
          className='hover:opacity-50 mx-1'
          href='https://dylankotzer.com'
          target='_blank'
          rel='noreferrer'
        >
          Dylan Kotzer
        </a>
        based on the works of
        <a
          className='hover:opacity-50 ml-1'
          href={url}
          target='_blank'
          rel='noreferrer'
        >
          {title}
        </a>
      </div>

      <div className='flex space-x-4'>
        {/* <a
          className="flex items-center hover:opacity-50"
          href="https://twitter.com/plato"
          target="_blank"
          rel="noreferrer"
        >
          <IconBrandTwitter size={24} />
        </a> */}
        <a
          className='flex items-center hover:opacity-50'
          href='https://github.com/DKotzer'
          target='_blank'
          rel='noreferrer'
        >
          <IconBrandGithub size={24} />
        </a>
      </div>
    </div>
  );
};
