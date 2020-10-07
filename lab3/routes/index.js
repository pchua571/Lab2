const tv = require('./tv');

const constructorMethod = (app) => {
    app.use('/', tv);
    app.use('*', (req, res) => {
        res.sendStatus(404);
    });
};

module.exports = constructorMethod;