import { isAuthenticated } from '../middleware/auth';
import axios from 'axios';

jest.mock('axios');
jest.mock('../utils/configManager', () => ({
    getConfig: () => ({ google: { clientId: process.env.GOOGLE_CLIENT_ID || 'client-123' } })
}));

describe('isAuthenticated middleware', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        jest.clearAllMocks();
        Object.assign(process.env, originalEnv);
    });

    afterAll(() => {
        Object.assign(process.env, originalEnv);
    });

    const makeRes = () => {
        const res: any = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    };

    it('allows CLI secret bypass', async () => {
        process.env.CLI_SECRET = 'secret';
        const req: any = { headers: { 'x-cli-secret': 'secret' }, isAuthenticated: () => false };
        const res = makeRes();
        const next = jest.fn();

        await isAuthenticated(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('allows valid Google ID token', async () => {
        process.env.GOOGLE_CLIENT_ID = 'client-123';
        (axios.get as jest.Mock).mockResolvedValue({
            data: {
                aud: 'client-123',
                exp: Math.floor(Date.now() / 1000) + 60,
                sub: 'user-1',
                email: 'elf@test.com',
                name: 'Elf',
                picture: 'pic'
            }
        });

        const req: any = { headers: { authorization: 'Bearer tok' }, isAuthenticated: () => false };
        const res = makeRes();
        const next = jest.fn();

        await isAuthenticated(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects invalid audience', async () => {
        process.env.GOOGLE_CLIENT_ID = 'client-123';
        (axios.get as jest.Mock).mockResolvedValue({
            data: { aud: 'other-client', exp: Math.floor(Date.now() / 1000) + 60 }
        });

        const req: any = { headers: { authorization: 'Bearer tok' }, isAuthenticated: () => false };
        const res = makeRes();
        const next = jest.fn();

        await isAuthenticated(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });
});
