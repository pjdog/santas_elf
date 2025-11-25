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

/**
 * Represents a product deal found online.
 */
export interface ProductDeal {
    /** The title of the deal post. */
    title: string;
    /** The price if extractable (otherwise 0). */
    price: number;
    /** The URL to the deal. */
    url: string;
    /** The source subreddit or site. */
    source: string;
}

/**
 * Fetches recent product deals from shopping-related subreddits.
 * 
 * @param query - The product name to search for.
 * @returns List of potential deals.
 */
export const fetchProductDeals = async (query: string): Promise<ProductDeal[]> => {
    const q = encodeURIComponent(query);
    // Search specific deal subreddits
    const url = `https://www.reddit.com/r/deals+coupons+buildapcsales+gamedeals/search.json?q=${q}&restrict_sr=on&sort=new&limit=5`;
    
    try {
        const res = await axios.get(url, { timeout: TIMEOUT });
        return (res.data?.data?.children || []).map((c: any) => {
            const title = c?.data?.title || '';
            // Try to extract price from title like "$199" or "199$"
            const priceMatch = title.match(/\$(\d+(?:\.\d+)?)/);
            const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
            
            return {
                title,
                price,
                url: c?.data?.url || '',
                source: `reddit/${c?.data?.subreddit}`
            };
        });
    } catch (e) {
        return [];
    }
};
