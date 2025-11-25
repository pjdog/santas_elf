import axios from 'axios';

export interface SocialPost {
  source: string;
  title: string;
  url: string;
  score: number;
}

const TIMEOUT = 7000;

export const fetchSocialSuggestions = async (query: string): Promise<SocialPost[]> => {
  const q = encodeURIComponent(query);

  const reddit = axios
    .get(`https://www.reddit.com/search.json?q=${q}&limit=5&sort=top`, { timeout: TIMEOUT })
    .then((res) =>
      (res.data?.data?.children || []).map((c: any) => ({
        source: 'reddit',
        title: c?.data?.title || '',
        url: c?.data?.url || '',
        score: c?.data?.score || 0,
      }))
    )
    .catch(() => []);

  const hackerNews = axios
    .get(`https://hn.algolia.com/api/v1/search?query=${q}&hitsPerPage=5`, { timeout: TIMEOUT })
    .then((res) =>
      (res.data?.hits || []).map((h: any) => ({
        source: 'hackernews',
        title: h?.title || '',
        url: h?.url || '',
        score: h?.points || 0,
      }))
    )
    .catch(() => []);

  const results = await Promise.all([reddit, hackerNews]);
  return results.flat().filter((p) => p.title);
};
