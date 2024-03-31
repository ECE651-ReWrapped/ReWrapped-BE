const { createNewSharedPlaylist, getSharedPlaylists, addTrackToPlaylist, getAllTracksFromPlaylist } = require('../../controllers/playlistControllers');
const pool = require("../../db");

jest.mock('../../db', () => ({
    query: jest.fn(),
}));

describe('createNewSharedPlaylist unit tests', () => {
    beforeEach(() => {
        pool.query.mockClear();
    });

    it('should return 400 if required fields are missing', async () => {
        const req = { body: {} };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await createNewSharedPlaylist(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Missing required fields" });
    });

    it('should successfully add a playlist when all fields are provided and user exists', async () => {
        // Mock db responses
        pool.query.mockResolvedValueOnce({ rows: [{ user_email: 'sharedWithEmail@example.com' }] }); // Mock user lookup
        pool.query.mockResolvedValueOnce({ rowCount: 1 }); // Mock insert operation

        const req = {
            body: {
                playlist_name: 'Chill Vibes',
                createdByEmail: 'creator@example.com',
                sharedWithUsername: 'sharedUser'
            }
        };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await createNewSharedPlaylist(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: "Successfully added playlist!" });
    });

    it('should return 401 if sharedWithUsername does not exist', async () => {
        // Mock db response to simulate user not found
        pool.query.mockResolvedValueOnce({ rows: [] });

        const req = {
            body: {
                playlist_name: 'Workout Playlist',
                createdByEmail: 'creator@example.com',
                sharedWithUsername: 'nonExistentUser'
            }
        };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await createNewSharedPlaylist(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "User Does not Exist" });
    });

    it('should return 500 on server error', async () => {
        // Simulate a server error during user lookup
        pool.query.mockRejectedValueOnce(new Error('Server Error'));

        const req = {
            body: {
                playlist_name: 'Road Trip Songs',
                createdByEmail: 'creator@example.com',
                sharedWithUsername: 'friendUser'
            }
        };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

        await createNewSharedPlaylist(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith("Server Error");
    });
});

describe('getSharedPlaylists', () => {
    beforeEach(() => {
        // Clear all instances and calls to constructor and all methods:
        pool.query.mockClear();
    });

    it('should return playlists for a single user when sharedWithUsername is not provided', async () => {
        // Mock db response for playlists belonging to a single user
        pool.query.mockResolvedValueOnce({
            rows: [
                { playlist_name: 'Solo Playlist 1', createdbyemail: 'user@example.com', sharedwithemail: 'friend@example.com' },
                { playlist_name: 'Solo Playlist 2', createdbyemail: 'user@example.com', sharedwithemail: 'anotherfriend@example.com' }
            ]
        });

        const req = { query: { createdByUserEmail: 'user@example.com' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await getSharedPlaylists(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 2 }));
    });

    it('should return 404 when no playlists exist for a user', async () => {
        // Mock db response for no playlists
        pool.query.mockResolvedValueOnce({ rows: [] });

        const req = { query: { createdByUserEmail: 'user@example.com' } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

        await getSharedPlaylists(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith("No existing playlists for this user");
    });

    it('should return shared playlists between two users', async () => {
        // Mock db responses for user email lookup and playlist retrieval
        pool.query.mockResolvedValueOnce({ rows: [{ user_email: 'friend@example.com' }] }); // Mock user email lookup
        pool.query.mockResolvedValueOnce({
            rows: [ // Mock shared playlists
                { playlist_name: 'Shared Playlist 1', createdbyemail: 'user@example.com', sharedwithemail: 'friend@example.com' }
            ]
        });

        const req = { query: { createdByUserEmail: 'user@example.com', sharedWithUsername: 'friendUser' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await getSharedPlaylists(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));
    });

    it('should return 404 when no shared playlists exist between two users', async () => {
        // Mock db responses for user email lookup and no shared playlists
        pool.query.mockResolvedValueOnce({ rows: [{ user_email: 'friend@example.com' }] });
        pool.query.mockResolvedValueOnce({ rows: [] });

        const req = { query: { createdByUserEmail: 'user@example.com', sharedWithUsername: 'friendUser' } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

        await getSharedPlaylists(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith("No existing playlists between these two users");
    });

    it('should return 500 on server error during database query', async () => {
        // Simulate a server error
        pool.query.mockRejectedValueOnce(new Error('Server Error'));

        const req = { query: { createdByUserEmail: 'user@example.com', sharedWithUsername: 'friendUser' } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

        await getSharedPlaylists(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith("Server Error");
    });
});

describe('addTrackToPlaylist', () => {
    beforeEach(() => {
        // Reset mock calls before each test
        pool.query.mockClear();
    });

    it('should successfully add a track to an existing playlist', async () => {
        // Mock db response for playlist lookup
        pool.query.mockResolvedValueOnce({
            rows: [{ playlist_id: 1 }] // Assume this ID for the found playlist
        });
        // Assume successful insert operation for the track
        pool.query.mockResolvedValueOnce({ rowCount: 1 });

        const req = {
            body: {
                playlist_name: 'My Playlist',
                track_name: 'Track 1',
                artist_name: 'Artist 1'
            }
        };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await addTrackToPlaylist(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: "Track added to playlist successfully" });
    });

    it('should return 404 if the playlist does not exist', async () => {
        // Mock db response to simulate no playlist found
        pool.query.mockResolvedValueOnce({ rows: [] });

        const req = {
            body: {
                playlist_name: 'Nonexistent Playlist',
                track_name: 'Track 1',
                artist_name: 'Artist 1'
            }
        };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await addTrackToPlaylist(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Playlist not found" });
    });

    it('should return 500 on server error during database operations', async () => {
        // Simulate a server error during playlist lookup
        pool.query.mockRejectedValueOnce(new Error('Server Error'));

        const req = {
            body: {
                playlist_name: 'My Playlist',
                track_name: 'Track 1',
                artist_name: 'Artist 1'
            }
        };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), message: jest.fn() };

        await addTrackToPlaylist(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Server error", error: "Server Error" });
    });
});

describe('getAllTracksFromPlaylist', () => {
    beforeEach(() => {
        // Clear mock calls before each test
        pool.query.mockClear();
    });

    it('should return all tracks for an existing playlist', async () => {
        // Mock db response for playlist lookup
        pool.query.mockResolvedValueOnce({
            rows: [{ playlist_id: 1 }] // Assume this ID for the found playlist
        });
        // Mock db response for fetching tracks
        pool.query.mockResolvedValueOnce({
            rows: [
                { track_name: 'Track 1', artist_name: 'Artist 1', playlist_id: 1 },
                { track_name: 'Track 2', artist_name: 'Artist 2', playlist_id: 1 }
            ]
        });

        const req = {
            query: {
                playlist_name: 'My Playlist'
            }
        };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await getAllTracksFromPlaylist(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ tracks: expect.any(Array) });
        expect(res.json.mock.calls[0][0].tracks.length).toBe(2);
    });

    it('should return 404 if the playlist does not exist', async () => {
        // Mock db response to simulate no playlist found
        pool.query.mockResolvedValueOnce({ rows: [] });

        const req = {
            query: {
                playlist_name: 'Nonexistent Playlist'
            }
        };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await getAllTracksFromPlaylist(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Playlist not found" });
    });

    it('should return 500 on server error during database operations', async () => {
        // Simulate a server error during playlist lookup
        pool.query.mockRejectedValueOnce(new Error('Server Error'));

        const req = {
            query: {
                playlist_name: 'My Playlist'
            }
        };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await getAllTracksFromPlaylist(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Server error", error: "Server Error" });
    });
});

