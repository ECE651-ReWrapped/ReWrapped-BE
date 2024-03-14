const { checkUserEmail, setNewPassword, validateToken } = require('../../controllers/dbControllers'); 
const pool = require("../../db"); 
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const request = require("supertest"); 
const app = require("../../app");

// Mocking nodemailer's createTransport function
jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockImplementation((mailOptions, callback) => {
            callback(null, {message: 'Email sent successfully'});
        })
    })
}));

describe('checkUserEmail', () => {
    let mockRequest;
    let mockResponse;

    beforeEach(() => {
        mockRequest = {
            body: {
                email: 'test@example.com'
            }
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    it('should return 401 if user does not exist', async () => {
        pool.query = jest.fn().mockResolvedValue({ rows: [] });
        
        await checkUserEmail(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User Does not Exist' });
    });

    it('should send an email and return 200 if user exists', async () => {
        pool.query = jest.fn().mockResolvedValue({ rows: [{ user_email: 'test@example.com' }] });
        crypto.randomBytes = jest.fn().mockImplementation((_, callback) => callback(null, Buffer.from('token')));
        
        await checkUserEmail(mockRequest, mockResponse);

        expect(nodemailer.createTransport().sendMail).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User has an account and email sent' });
    });

    it('should return 500 if there is a server error', async () => {
        const querySpy = jest.spyOn(pool, "query");
        querySpy.mockRejectedValue(new Error("Database Error"));

        const resp = await request(app).post("/reset-password").send({
            email: "register@gmail.com",
        });

        // expected items
        expect(resp.statusCode).toBe(500);

        querySpy.mockRestore();
    });
});

describe('validateToken', () => {
    let mockRequest;
    let mockResponse;

    beforeEach(() => {
        mockRequest = {
            params: {
                token: 'token'
            }
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    it('should return 405 if token is invalid', async () => {
        pool.query = jest.fn().mockResolvedValue({ rows: [] });
        
        await validateToken(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(405);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid token!' });
    });

    it('should return 200 if token is valid', async () => {
        pool.query = jest.fn().mockResolvedValue({ rows: [{ user_reset_token: 'token' }] });
        
        await validateToken(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Token is valid' });
    });

    it('should return 500 if there is a server error', async () => {
        const querySpy = jest.spyOn(pool, "query");
        querySpy.mockRejectedValue(new Error("Database Error"));

        const resp = await request(app).get("/reset-password/166bhufvhs6534");

        // expected items
        expect(resp.statusCode).toBe(500);

        querySpy.mockRestore();
    });
});

describe('setNewPassword', () => {
    let mockRequest;
    let mockResponse;

    beforeEach(() => {
        mockRequest = {
            body: {
                urlToken: 'token',
                password: 'newPassword',
                confirmPassword: 'newPassword'
            }
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    it('should return 405 if user does not exist', async () => {
        pool.query = jest.fn().mockResolvedValue({ rows: [] });
        
        await setNewPassword(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(405);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User Does not Exist' });
    });

    it('should return 401 if passwords do not match', async () => {
        pool.query = jest.fn().mockResolvedValue({ rows: [{ user_reset_token: 'token' }] });
        
        mockRequest.body.confirmPassword = 'differentPassword';
        
        await setNewPassword(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Passwords do not match' });
    });

    it('should update password and return 200 if everything is correct', async () => {
        pool.query = jest.fn().mockResolvedValue({ rows: [{ user_reset_token: 'token' }] });
        bcrypt.genSalt = jest.fn().mockResolvedValue('salt');
        bcrypt.hash = jest.fn().mockResolvedValue('hashedPassword');
        
        await setNewPassword(mockRequest, mockResponse);

        expect(pool.query).toHaveBeenCalledWith('UPDATE users SET user_password = $1 WHERE user_reset_token = $2', ['hashedPassword', 'token']);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Password updated successfully' });
    });

    it('should return 500 if there is a server error', async () => {
        const querySpy = jest.spyOn(pool, "query");
        querySpy.mockRejectedValue(new Error("Database Error"));

        const resp = await request(app).put("/reset-password").send({
            urlToken: "tehcnkiguyfbfyf", 
            password: "password", 
            confirmPassword: "password"
        });

        // expected items
        expect(resp.statusCode).toBe(500);

        querySpy.mockRestore();
    });
});
