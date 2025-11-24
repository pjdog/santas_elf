import passport from '../config/passport';
import redisClient from '../config/db';

jest.mock('../config/db', () => ({
  hGetAll: jest.fn(),
  hSet: jest.fn(),
  on: jest.fn(),
  connect: jest.fn(),
}));

describe('Passport Deserialization Fix Verification', () => {
  const deserializeUser = (passport as any)._deserializers[0];

  it('should return null error and null user when user is not found (Fixed Behavior)', (done) => {
    // Mock Redis returning null (user not found)
    (redisClient.hGetAll as jest.Mock).mockResolvedValue(null);

    const userId = 'some-id';

    deserializeUser(userId, (err: any, user: any) => {
      try {
        // We expect NO error (err should be null)
        expect(err).toBeNull();
        // We expect user to be null/false
        expect(user).toBeFalsy();
        done();
      } catch (e) {
        done(e);
      }
    });
  });
});
