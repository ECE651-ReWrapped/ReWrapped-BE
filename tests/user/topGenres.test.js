const { getTopGenres } = require('../../controllers/trackServices'); 
const pool = require('../../db'); 

jest.mock('../../db', () => ({
    query: jest.fn(),
}));

describe('getTopGenres', () => {
    beforeEach(() => {
        pool.query.mockClear();
    });

    it('should return the top 5 genres correctly sorted by count', async () => {
        const mockGenres = [
            { genres: 'Rock, Pop, Jazz' },
            { genres: 'Rock, Blues' },
            { genres: 'Pop, Blues, Jazz, Electronic' },
            { genres: 'Classical, Jazz' },
            { genres: 'Rock, Hip Hop, Jazz' },
        ];
        pool.query.mockResolvedValueOnce({ rows: mockGenres });

        const topGenres = await getTopGenres('user123');

        expect(topGenres).toEqual([
            { genre: 'Jazz', count: 4 },
            { genre: 'Rock', count: 3 },
            { genre: 'Pop', count: 2 },
            { genre: 'Blues', count: 2 },
            { genre: 'Electronic', count: 1 },
        ]);
    });

    it('should handle cases with fewer than 5 genres available', async () => {
        const mockGenres = [
            { genres: 'Rock' },
            { genres: 'Rock, Blues' },
        ];
        pool.query.mockResolvedValueOnce({ rows: mockGenres });

        const topGenres = await getTopGenres('user456');

        expect(topGenres).toEqual([
            { genre: 'Rock', count: 2 },
            { genre: 'Blues', count: 1 },
        ]);
    });

    it('should return an empty array when no genres are available', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        const topGenres = await getTopGenres('user789');

        expect(topGenres).toEqual([]);
    });
});

