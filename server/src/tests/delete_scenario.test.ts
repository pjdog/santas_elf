import request from 'supertest';
import app from '../index';
import { tools } from '../tools';
import redisClient from '../config/db';

// Mock Redis
jest.mock('../config/db', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  lRange: jest.fn(),
  rPush: jest.fn(),
  lTrim: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
}));

describe('Delete Scenario Tool', () => {
  const userId = 'test-user';
  const scenario = 'test-scenario';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not delete if input is not "confirm"', async () => {
    const result = await tools['delete_scenario'].function('please delete', { userId, scenario });
    expect(result.success).toBe(false);
    expect(result.message).toContain("Deletion cancelled");
    expect(redisClient.del).not.toHaveBeenCalled();
  });

  it('should delete artifacts and chat history if input is "confirm"', async () => {
    const result = await tools['delete_scenario'].function('confirm', { userId, scenario });
    
    expect(result.success).toBe(true);
    expect(result.message).toContain("has been deleted");
    
    // Verify Redis deletions
    expect(redisClient.del).toHaveBeenCalledWith(`santas_elf:artifacts:${userId}:${scenario}`);
    expect(redisClient.del).toHaveBeenCalledWith(`chat:${userId}:${scenario}`);
  });

  it('should return error if no user context', async () => {
    const result = await tools['delete_scenario'].function('confirm');
    expect(result.success).toBe(false);
    expect(result.message).toContain("No user context");
  });
});
