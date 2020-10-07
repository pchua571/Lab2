const express = require('express');
const router = express.Router();
const flat = require('flat');
const unflatten = flat.unflatten;
const redis = require('redis');
const axios = require('axios');
const client = redis.createClient();
const bluebird = require('bluebird');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

//This route will show the list of shows. 
//It will check the cache to see if we have the show list homepage already cached. 
//If the show list homepage is already in the cache, you will serve it from the cache.
router.get('/', async (req, res) => {
    let doescacheExists = await client.getAsync('showList');
    if (doescacheExists) {
        res.status(200);
        res.send(doescacheExists);
    } else {
        try {
            let {data} = await axios.get('http://api.tvmaze.com/shows')
            // let f = flatten(data)
            res.render('showlist', {show: data}, function (err, html) {
                res.status(200);
                res.send(html);
                client.setAsync('showList', html)
            })
        } catch (e) {
            console.log(e)
        }
    }
    }
);
//This is just if you put in a bad show ID (not found)
router.get('/show/BAD_ID', async (req, res) => {
    res.status(404);
    res.render('error', {error:true})
});


router.get('/show/:id', async (req, res) => {
    let doesshowExists = await client.getAsync(req.params.id);
    //Shows can have the following:
    //Id, url, name, type, language, genre, status, runtime, premiered, officialSite, schedule, rating, weight, network, webchannel, externals, image, summary, updated, links
    //Important ones to have: Name, Type, Language, Genre, Status, Runtime, Premiered, Official Site, Rating, Image, Summary
    //Todo: add if/else for all info except name (in case if it isnt availble)
    if(doesshowExists) {
        res.status(200);
        res.send(doesshowExists);
    }
    else{
        try {
            let {data} = await axios.get('http://api.tvmaze.com/shows/' + req.params.id)
            res.render('singleshow', {showInfo: data}, function (err, html) {
                res.status(200);
                res.send(html);
                client.setAsync(req.params.id, html)
            })
        }
        catch (e) {
           res.redirect('/show/BAD_ID');
        }
}
    }
);

router.post('/search', async (req, res) => {
    // https://redislabs.com/solutions/use-cases/leaderboards/
    //Spaces between words is OK (Tested using the actual API)
    let lcase = req.body.search.toLowerCase();
    let nspace = lcase.trim();
    let no_results = false;
    let doessearchExist = await client.getAsync(nspace);
    if (doessearchExist) {
        client.ZINCRBY('search', 1, nspace)
        res.status(200).send(doessearchExist);
    } else {
    //This means either search is blank or you just pressed space a bunch
    if ((!req.body) || nspace.length == 0) {
        res.render('search', {error: true});
        res.status(400);
        return;
    }
   
    try {
        let {data} = await axios.get('http://api.tvmaze.com/search/shows?q=' + nspace)
        if (data.length == 0) {
            no_results = true;
        }
        res.render('search', {data: data, no_results: no_results}, function (err, html) {
        res.status(200)
        res.send(html);
        client.setAsync(nspace, html)
        client.ZADD("search", 1, nspace)
    })
    } catch (e) {
        console.log(e);
    }
    }
})

router.get('/popularsearches', async (req, res) => {
    //no need to cache this
    //https://redis.io/commands/zrevrange
    //ZREVRANGE key start stop [WITHSCORES]
    //https://stackoverflow.com/questions/24157632/node-redis-get-zrange-withscores
    client.ZREVRANGE("search", 0, 9, function(err, searches) {
        res.render('popSearch', {data: searches})
        res.status(200);
    })
  

})




module.exports = router;