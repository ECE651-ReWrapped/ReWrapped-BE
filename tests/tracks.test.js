const { getRecentlyPlayedTracks, getRecommendedTracks } = require('../controllers/trackServices'); 

jest.mock('../db', () => ({
    query: jest.fn(),
}));

describe('getRecentlyPlayedTracks test', () => {
    it('should return recently played tracks for a given user', async () => {
        const userId = 'user123';
        const expectedRows = [
            { track_name: 'Song A', artists: 'Artist 1' },
            { track_name: 'Song B', artists: 'Artist 2' },
        ];
        const mockQueryResult = { rows: expectedRows };
        const mockPool = require('../db');

        mockPool.query.mockResolvedValueOnce(mockQueryResult);

        const result = await getRecentlyPlayedTracks(userId);

        expect(result).toEqual(expectedRows);
        expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [userId]);
    });
});


describe('getRecommendedTracks test', () => {
    it('should return recommended tracks for a given user', async () => {
        const userId = 'user123';
        const expectedRows = [
            { track_name: 'Song X', artists: 'Artist X' },
            { track_name: 'Song Y', artists: 'Artist Y' },
        ];
        const mockQueryResult = { rows: expectedRows };
        const mockPool = require('../db');

        mockPool.query.mockResolvedValueOnce(mockQueryResult);

        const result = await getRecommendedTracks(userId);

        expect(result).toEqual(expectedRows);
        expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [userId]);
    });
});
