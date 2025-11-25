import axios from 'axios';

/**
 * Represents a social media post from platforms like Reddit or HackerNews.
 */
export interface SocialPost {
  /** The source platform (e.g., 'reddit', 'hackernews'). */
  source: string;
  /** The title of the post. */
  title: string;
  /** The external URL to the post content. */
  url: string;
  /** The score or points associated with the post. */
  score: number;
}

const TIMEOUT = 7000;

/**
 * Fetches social media suggestions from multiple sources based on a query.
 * Aggregates results from Reddit and HackerNews.
 *
 * @param query - The search query string.
 * @returns A promise that resolves to an array of SocialPost objects.
 */
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
