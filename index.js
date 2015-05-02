/// <reference path="typings/node/node.d.ts"/>
// Packages
var http = require('http');
var https = require('https');
var querystring = require('querystring');
var Movie = require('./lib/movie');
var csv = require('csv');
/****************************************************************************************/
/****************************************************************************************/
// Inputs
var authorId = "urXXXXXXXX"; // This is your IMDB user id e.g. found in the url of your watchlist
var imdbCookie = ''; // This is a cookie that is saved by imdb when you sign in using the browser
// it is stored under the url www.imdb.com and the key 'id'
var traktAccessToken = ''; // This is an access token created to authorise your trakt app to access your trakt user from OAuth
var traktAPIKey = ''; // This is the API key for your trakt app
/****************************************************************************************/
/****************************************************************************************/
// Constants
var imdbURL = "www.imdb.com";
var imdbExportPath = "/list/export";
var traktURL = "api-v2launch.trakt.tv";
var traktWatchlistPath = "/sync/watchlist";
var traktRemoveFromWatchlistPath = "/sync/watchlist/remove";
var traktGetWatchlistPath = "/sync/watchlist/movies";
function getCSVUsingHTTPOptions(options, callback) {
    var response = "";
    http.get(options, function (resp) {
        resp.on('data', function (chunk) {
            response += chunk;
        });
        resp.on('end', function () {
            csv.parse(response, function (err, data) {
                if (!err && data) {
                    callback(null, data);
                }
                else {
                    if (err) {
                        callback(Error("Failed to parse csv response - " + err.message), null);
                    }
                    else {
                        callback(Error("Failed to parse csv response"), null);
                    }
                }
            });
        });
    }).on("error", function (e) {
        callback(Error("Failed to make get request - " + e.message), null);
    });
}
function createHTTPOptionsForGettingIMDBWatchlist() {
    var imdbGetParams = querystring.stringify({
        list_id: 'watchlist',
        author_id: authorId
    });
    var cookie = 'id=' + imdbCookie + ';';
    var options = {
        host: imdbURL,
        port: 80,
        path: imdbExportPath + '?' + imdbGetParams,
        headers: {
            'Cookie': cookie
        }
    };
    return options;
}
function getIMDBWatchlist(callback) {
    var options = createHTTPOptionsForGettingIMDBWatchlist();
    getCSVUsingHTTPOptions(options, function (err, data) {
        if (!err) {
            var headers = data[0];
            var titleIndex = headers.indexOf("Title");
            var yearIndex = headers.indexOf("Year");
            var idIndex = headers.indexOf("const");
            var movies = new Array();
            for (var i = 1; i < data.length; i++) {
                var movieItem = data[i];
                var movieObject = new Movie(movieItem[titleIndex], Number(movieItem[yearIndex]), movieItem[idIndex]);
                movies.push(movieObject);
            }
            callback(movies);
        }
        else {
            if (err.message.search("Failed to make get request")) {
                console.log("Error getting imdb watchlist: " + err.message);
            }
            else {
                console.error("Error parsing imdb response: " + err);
            }
        }
    });
}
function postViaHTTPS(body, options, expectedStatusCode, callback) {
    var req = https.request(options, function (res) {
        if (res.statusCode == expectedStatusCode) {
            res.setEncoding('utf8');
            var data = '';
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end', function () {
                callback(null, data);
            });
        }
        else {
            var errorMessage = "Got bad status code posting to " + options.host + ": " + res.statusCode + "\n";
            errorMessage += "Response: ";
            res.on('data', function (chunk) {
                errorMessage += chunk;
            });
            res.on('end', function () {
                callback(Error(errorMessage), null);
            });
        }
        res.on('error', function (error) {
            callback(error, null);
        });
    });
    req.on('error', function (e) {
        callback(e, null);
    });
    req.write(body);
    req.end();
}
function createHTTPSOptionsForAddingMoviesToTrakt() {
    var options = {
        host: traktURL,
        path: traktWatchlistPath,
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + traktAccessToken,
            'trakt-api-key': traktAPIKey,
            'trakt-api-version': '2',
            'Content-type': 'application/json'
        }
    };
    return options;
}
// Upload watchlist to trakt
function addMoviesToTrakt(movies, callback) {
    var options = createHTTPSOptionsForAddingMoviesToTrakt();
    var body = JSON.stringify({ "movies": movies });
    postViaHTTPS(body, options, 201, function (error, data) {
        if (!error) {
            callback(data);
        }
        else {
            console.error("Error occurred trying to post movies to trakt:" + error);
        }
    });
}
function createHTTPSOptionsForRemovingMoviesFromTrakt() {
    var options = {
        host: traktURL,
        path: traktRemoveFromWatchlistPath,
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + traktAccessToken,
            'trakt-api-key': traktAPIKey,
            'trakt-api-version': '2',
            'Content-type': 'application/json'
        }
    };
    return options;
}
// Remove from watchlist on trakt
function deleteMoviesFromTraktWatchlist(movies, callback) {
    var options = createHTTPSOptionsForRemovingMoviesFromTrakt();
    var body = JSON.stringify({ "movies": movies });
    postViaHTTPS(body, options, 200, function (error, data) {
        if (!error) {
            callback(data);
        }
        else {
            console.error("Error occurred trying to post movies to trakt:" + error);
        }
    });
}
function printAddToTraktSuccessOutput(data) {
    var responseObject = JSON.parse(data);
    console.log("Success!");
    if (responseObject.added.movies == 1) {
        console.log("Added " + responseObject.added.movies + " movie.");
    }
    else {
        console.log("Added " + responseObject.added.movies + " movies.");
    }
    if (responseObject.existing.movies > 0) {
        console.log(responseObject.existing.movies + " existing.");
    }
    if (responseObject.not_found.movies > 0) {
        console.log("Failed to find these movies : " + responseObject.not_found.movies);
    }
}
function printRemoveFromTraktSuccessOutput(data) {
    var responseObject = JSON.parse(data);
    console.log("Success!");
    if (responseObject.deleted.movies == 1) {
        console.log("Deleted " + responseObject.deleted.movies + " movie.");
    }
    else {
        console.log("Deleted " + responseObject.deleted.movies + " movies.");
    }
    if (responseObject.not_found.movies > 0) {
        console.log("Failed to find these movies : " + responseObject.not_found.movies);
    }
}
function getJSONUsingHTTPSOptions(options, callback) {
    var response = "";
    https.get(options, function (resp) {
        resp.on('data', function (chunk) {
            response += chunk;
        });
        resp.on('end', function () {
            var responseObject = JSON.parse(response);
            callback(responseObject);
        });
    }).on("error", function (e) {
        console.error("Failed to make get request - " + e.message);
    });
}
function createHTTPSOptionsForGettingTraktWatchlist() {
    var options = {
        host: traktURL,
        path: traktGetWatchlistPath,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + traktAccessToken,
            'trakt-api-key': traktAPIKey,
            'trakt-api-version': '2',
            'Content-type': 'application/json'
        }
    };
    return options;
}
function getWatchlistFromTrakt(callback) {
    var options = createHTTPSOptionsForGettingTraktWatchlist();
    getJSONUsingHTTPSOptions(options, function (movieItems) {
        var movies = new Array();
        for (var i = 0; i < movieItems.length; i++) {
            var movieItem = movieItems[i].movie;
            movies.push(new Movie(movieItem.title, movieItem.year, movieItem.ids.imdb));
        }
        callback(movies);
    });
}
// First get watchlist from imdb
// http://www.imdb.com/list/export?list_id=watchlist&author_id=ur45425175
console.log("Getting watchlist from imdb...");
getIMDBWatchlist(function (imdbMovies) {
    console.log("Got watchlist from imdb. " + imdbMovies.length + " movies found.");
    console.log("Getting watchlist from trakt");
    getWatchlistFromTrakt(function (traktMovies) {
        console.log("Got watchlist from trakt. " + traktMovies.length + " movies found.");
        // Find movies to delete
        var moviesToDelete = new Array();
        for (var i = 0; i < traktMovies.length; i++) {
            var traktMovieObject = traktMovies[i];
            var foundMovieInImdb = false;
            for (var j = 0; j < imdbMovies.length; j++) {
                var imdbMovieObject = imdbMovies[j];
                if (traktMovieObject.isEqualToMovie(imdbMovieObject)) {
                    foundMovieInImdb = true;
                    break;
                }
            }
            if (!foundMovieInImdb) {
                moviesToDelete.push(traktMovieObject);
            }
        }
        console.log("Deleting " + moviesToDelete.length + " movies from trakt");
        deleteMoviesFromTraktWatchlist(moviesToDelete, function (response) {
            printRemoveFromTraktSuccessOutput(response);
            console.log("Adding movies to trakt...");
            addMoviesToTrakt(imdbMovies, function (data) {
                printAddToTraktSuccessOutput(data);
            });
        });
    });
});
