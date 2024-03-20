const authController = require('../controllers/authController');
const request = require('request');

// Mock dependencies
jest.mock('request');
jest.mock('../utils/spotifyUtils', () => ({
    generateRandomString: jest.fn(() => 'randomString'),
    shuffleArray: jest.fn()
}));
jest.mock('../db', () => ({
    query: jest.fn(),
}));
jest.mock('../controllers/trackServices', () => ({
    getRecentlyPlayedTracks: jest.fn(),
    getRecommendedTracks: jest.fn()
}));

describe('Auth Controller', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('login', () => {
        it('should redirect to Spotify authorization URL', () => {
            const req = {
                session: {}, // Adding session property
                query: {},
            };
            const res = {
                redirect: jest.fn()
            };

            authController.login(req, res);

            // Check if redirect function is called with correct URL
            expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('https://accounts.spotify.com/authorize'));
        });
    });

    describe('callback', () => {
        it('should handle callback properly', async () => {
            const req = {
                query: { code: 'mockCode', state: 'randomString' },
                session: { spotifyState: 'randomString' }
            };
            const res = {
                redirect: jest.fn()
            };

            // Mock successful request.post
            request.post.mockImplementation((options, callback) => {
                callback(null, { statusCode: 200 }, { access_token: 'mockAccessToken', refresh_token: 'mockRefreshToken' });
            });

            // Mock successful request.get for profile
            request.get.mockImplementation((options, callback) => {
                callback(null, { statusCode: 200 }, { display_name: 'mockDisplayName' });
            });

            // Mock successful request.get for recently played tracks
            request.get.mockImplementationOnce((options, callback) => {
                callback(null, { statusCode: 200 }, { items: [] });
            });

            // Mock successful request.get for recommended tracks
            request.get.mockImplementationOnce((options, callback) => {
                callback(null, { statusCode: 200 }, { tracks: [] });
            });

            await authController.callback(req, res);

            expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/?displayName'));
        });
    });


    describe('getRecentlyPlayed', () => {
        it('should get recently played tracks', async () => {
            const req = { params: { userId: 'mockUserId' } };
            const res = {
                json: jest.fn()
            };
            const mockRecentlyPlayedTracks = [{ trackName: 'Track 1', artists: 'Artist 1' }];

            require('../controllers/trackServices').getRecentlyPlayedTracks.mockResolvedValueOnce(mockRecentlyPlayedTracks);

            await authController.getRecentlyPlayed(req, res);

            expect(res.json).toHaveBeenCalledWith(mockRecentlyPlayedTracks);
        });

        it('should handle error in getting recently played tracks', async () => {
            const req = { params: { userId: 'mockUserId' } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            require('../controllers/trackServices').getRecentlyPlayedTracks.mockRejectedValueOnce(new Error('Mock error'));

            await authController.getRecentlyPlayed(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'internal_server_error' });
        });
    });

    describe('getRecommended', () => {
        it('should get recommended tracks', async () => {
            const req = { params: { userId: 'mockUserId' } };
            const res = {
                json: jest.fn()
            };
            const mockRecommendedTracks = [{ trackName: 'Track 1', artists: 'Artist 1' }];

            require('../controllers/trackServices').getRecommendedTracks.mockResolvedValueOnce(mockRecommendedTracks);

            await authController.getRecommended(req, res);

            expect(res.json).toHaveBeenCalledWith(mockRecommendedTracks);
        });

        it('should handle error in getting recommended tracks', async () => {
            const req = { params: { userId: 'mockUserId' } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            require('../controllers/trackServices').getRecommendedTracks.mockRejectedValueOnce(new Error('Mock error'));

            await authController.getRecommended(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'internal_server_error' });
        });
    });
});
