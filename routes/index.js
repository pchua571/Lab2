const movieRoutes = require("./movies");

const constructorMethod = app => {
    app.use("/", movieRoutes);
    app.use("*", (req, res) => {
        res.status(404).json({ "msg": "404 Invalid path" });
    });
};

module.exports = constructorMethod;