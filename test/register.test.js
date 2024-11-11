const request = require('supertest');
const { server } = require('../app'); // Adjust the path to your app

describe('POST /register', function () {
    before(function (done) {
        this.server = server.listen(3001, function (err) {
            if (err) return done(err);
            done();
        });
    });

    after(function (done) {
        this.server.close(done);
    });

    it('should register a user successfully', function (done) {
        request(this.server)
            .post('/register')
            .send({ username: 'testuser', password: 'password', confirmPassword: 'password' })
            .expect(200, done);
    });

    it('should return error if passwords do not match', function (done) {
        request(this.server)
            .post('/register')
            .send({ username: 'testuser', password: 'password', confirmPassword: 'differentpassword' })
            .expect(400, done);
    });
});
