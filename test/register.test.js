const request = require('supertest');
const app = require('../app');  // Your app file

describe('POST /register', () => {
    it('should register a user successfully', (done) => {
        request(app)
            .post('/register')
            .send({
                username: 'testuser',
                email: 'testuser@example.com',
                password: 'Test1234!',
                confirmPassword: 'Test1234!'
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                res.body.success.should.equal(true);
                done();
            });
    });

    it('should return error if passwords do not match', (done) => {
        request(app)
            .post('/register')
            .send({
                username: 'testuser',
                email: 'testuser@example.com',
                password: 'Test1234!',
                confirmPassword: 'Test12345!'
            })
            .expect('Content-Type', /json/)
            .expect(400)
            .end((err, res) => {
                if (err) return done(err);
                res.body.success.should.equal(false);
                done();
            });
    });
});
