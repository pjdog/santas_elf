import request from 'supertest';
import app from '../index';
import { tools } from '../tools';
import { fetchProductDeals } from '../utils/social';

// Mock dependencies
jest.mock('../utils/social', () => ({
  fetchProductDeals: jest.fn(),
}));

describe('Shopping Tools', () => {
  it('find_product_insights tool returns formatted deal data', async () => {
    // Mock social fetch
    const mockDeals = [
        { title: 'Great Deal: $100 Headphones', price: 100, url: 'http://deal.com', source: 'reddit/deals' }
    ];
    (fetchProductDeals as jest.Mock).mockResolvedValue(mockDeals);

    // Run tool
    const result = await tools['find_product_insights'].function('headphones');

    expect(result.deals).toEqual(mockDeals);
    expect(result.message).toContain('Found 1 discussions');
    expect(fetchProductDeals).toHaveBeenCalledWith('headphones');
  });
});
