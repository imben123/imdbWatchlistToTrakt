/// <reference path="typings/node/node.d.ts"/>

// Packages
import http = require('http');
import https = require('https');
import querystring = require('querystring');
import Movie = require('./lib/movie');
import userCredentials = require('./credentials');
var csv = require('csv');

// Constants
var imdbURL = "www.imdb.com";
var traktURL = "api-v2launch.trakt.tv";
var imdbExportPath = "/list/export";
var traktWatchlistPath = "/sync/watchlist";
var traktRemoveFromWatchlistPath = "/sync/watchlist/remove";
var traktGetWatchlistPath = "/sync/watchlist/movies";

// Gets and parses imdb watchlist
function getIMDBWatchlist(callback: (movies: Array<Movie>) => void): void {
	let options = createHTTPOptionsForGettingIMDBWatchlist();
	getCSVUsingHTTPOptions(options, function(err, data) {
		if (!err) {
			let movies = parseIMDBWatchlistResponse(data);
			callback(movies);
		} else {
			if (err.message.search("Failed to make get request")) {
				console.log("Error getting imdb watchlist: " + err.message);
			} else {
				console.error("Error parsing imdb response: " + err);
			}
		}
	});
}

// Parses the response from an IMDB watchlist export to return an array of Movie objects
function parseIMDBWatchlistResponse(data: string[][]):Movie[] {
	var headers = data[0];

	var titleIndex = headers.indexOf("Title");
	var yearIndex = headers.indexOf("Year");
	var idIndex = headers.indexOf("const");

	var movies = new Array<Movie>();
	for (var i = 1; i < data.length; i++) {
		var movieItem = data[i];
		var movieObject = new Movie(movieItem[titleIndex], Number(movieItem[yearIndex]), movieItem[idIndex]);
		movies.push(movieObject);
	}

	return movies;
}

// Uses the http module and the http module request options to download csv formatted data and parses it
// into a 2d string array
function getCSVUsingHTTPOptions(options: Object, callback: (error: Error, result :string[][]) => void) {
	var response = "";
	http.get(options, function(resp) {
		resp.on('data', function(chunk) {
			response += chunk;
		});

		resp.on('end', function() {
			csv.parse(response, function(err: Error, data: string[][]) {
				if (!err && data) {
					callback(null, data);
				} else {
					if (err) {
						callback(Error("Failed to parse csv response - " + err.message), null);
					} else {
						callback(Error("Failed to parse csv response"), null);
					}
				}

			});
		});

	}).on("error", function(e) {
		callback(Error("Failed to make get request - " + e.message), null);
	});
}

// Helper to create the http module request options for getting a imdb watchlist
function createHTTPOptionsForGettingIMDBWatchlist(): Object {
	var imdbGetParams = querystring.stringify({
		list_id: 'watchlist',
		author_id: userCredentials.authorId
	});

	var cookie = 'id=' + userCredentials.imdbCookie + ';';

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

// Add movies to watchlist on trakt
function addMoviesToTrakt(movies: Movie[], callback: (response: string) => void): void {
	var options = createHTTPSOptionsForAddingMoviesToTrakt();
	var body = JSON.stringify({ "movies": movies });
	postViaHTTPS(body, options, 201, function (error, data) {
		if (!error) {
			callback(data);
		} else {
			console.error("Error occurred trying to post movies to trakt:" + error);
		}
	});
}

// Helper to create the https module request options for adding movies to a trakt watchlist
function createHTTPSOptionsForAddingMoviesToTrakt(): Object {
	var options = {
		host: traktURL,
		path: traktWatchlistPath,
		method: 'POST',
		headers: {
			'Authorization': 'Bearer ' + userCredentials.traktAccessToken,
			'trakt-api-key': userCredentials.traktAPIKey,
			'trakt-api-version': '2',
			'Content-type': 'application/json'
		}
	};

	return options;
}

// Remove from watchlist on trakt
function deleteMoviesFromTraktWatchlist(movies: Movie[], callback: (response: string) => void): void {
	var options = createHTTPSOptionsForRemovingMoviesFromTrakt();
	var body = JSON.stringify({ "movies": movies });
	postViaHTTPS(body, options, 200, function (error, data) {
		if (!error) {
			callback(data);
		} else {
			console.error("Error occurred trying to post movies to trakt:" + error);
		}
	});
}

// Helper to create the https module request options for removing movies from a trakt watchlist
function createHTTPSOptionsForRemovingMoviesFromTrakt(): Object {
	var options = {
		host: traktURL,
		path: traktRemoveFromWatchlistPath,
		method: 'POST',
		headers: {
			'Authorization': 'Bearer ' + userCredentials.traktAccessToken,
			'trakt-api-key': userCredentials.traktAPIKey,
			'trakt-api-version': '2',
			'Content-type': 'application/json'
		}
	};

	return options;
}

// Makes a post request using the https module
// Everything needed other than the body should be defined in the https module request options dictionary
// The if the expectedStatusCode is not returned will pass an error to the 'error-first' callback
function postViaHTTPS(body: string, options: any, expectedStatusCode: number, callback: (error: Error, response:string)=>void) {
	var req = https.request(options, function(res) {

		if (res.statusCode == expectedStatusCode) {
			res.setEncoding('utf8');
			var data = '';
			res.on('data', function(chunk) {
				data += chunk;
			});
			res.on('end', function() {
				callback(null, data);
			});
		} else {
			var errorMessage = "Got bad status code posting to " + options.host + ": " + res.statusCode + "\n";
			errorMessage += "Response: ";
			res.on('data', function(chunk) {
				errorMessage += chunk;
			});
			res.on('end', function() {
				callback(Error(errorMessage), null);
			});
		}

		res.on('error', function(error) {
			callback(error, null)
		})

	});

	req.on('error', function(e) {
		callback(e, null)
	});

	req.write(body);
	req.end();
}

// Asynchronously gets a users watchlist from trakt
function getWatchlistFromTrakt(callback: (movies: Movie[])=>void) {
	var options = createHTTPSOptionsForGettingTraktWatchlist();
	getJSONUsingHTTPSOptions(options, function(movieItems: Array<any>) {
		let movies = parseTraktMovies(movieItems);
		callback(movies);
	});
}

// Helper to create the http module options for getting trakt watchlist
function createHTTPSOptionsForGettingTraktWatchlist(): Object {
	var options = {
		host: traktURL,
		path: traktGetWatchlistPath,
		method: 'GET',
		headers: {
			'Authorization': 'Bearer ' + userCredentials.traktAccessToken,
			'trakt-api-key': userCredentials.traktAPIKey,
			'trakt-api-version': '2',
			'Content-type': 'application/json'
		}
	};

	return options;
}

// Makes a https request using the https module give the https module request options 
function getJSONUsingHTTPSOptions(options: Object, callback: (result: any) => void) {
	var response = "";
	https.get(options, function(resp) {
		resp.on('data', function(chunk) {
			response += chunk;
		});

		resp.on('end', function() {
			var responseObject = JSON.parse(response);
			callback(responseObject);
		});

	}).on("error", function(e) {
		console.error("Failed to make get request - " + e.message);
	});
}

// Takes an array of movie dictionaries returned from trakt and returns
// an array of Movie objects
function parseTraktMovies(movieItems: Array<any>):Array<Movie> {
	var movies = new Array<Movie>();
	for (var i = 0; i < movieItems.length; i++) {
		let movieItem = movieItems[i].movie;
		movies.push(new Movie(movieItem.title, movieItem.year, movieItem.ids.imdb));
	}
	return movies;
}

// Returns true if a equivilent movie exists in the array, false otherwise
function movieExistsInArray(needle: Movie, haystack: Array<Movie>): boolean {
	for (var j = 0; j < haystack.length; j++) {
		let movieObject = haystack[j];
		if (movieObject.isEqualToMovie(movieObject)) {
			return true;
		}
	}
	return false;
}

// Compares the movies in the first and second array and returns the movies in the second
// that don't occur in the first
function findMoviesNotInFirst(first: Array<Movie>, second: Array<Movie>): Array<Movie> {
	var moviesNotInFirst = new Array<Movie>();
	for (var i = 0; i < second.length; i++) {
		let movieObject = second[i];
		
		if (!movieExistsInArray(movieObject, first)) {
			moviesNotInFirst.push(movieObject);
		}
	}
	return moviesNotInFirst;
}

// Parses response from webcall to a trakt endpoint adding movies and
// prints the output to the console.
function printAddToTraktSuccessOutput(data: string) {
	var responseObject = JSON.parse(data);

	console.log("Success!");

	if (responseObject.added.movies == 1) {
		console.log("Added " + responseObject.added.movies + " movie.");
	} else {
		console.log("Added " + responseObject.added.movies + " movies.");
	}

	if (responseObject.existing.movies > 0) {
		console.log(responseObject.existing.movies + " existing.");
	}

	if (responseObject.not_found.movies > 0) {
		console.log("Failed to find these movies : " + responseObject.not_found.movies);
	}
}

// Parses response from webcall to a trakt endpoint deleting movies and
// prints the output to the console.
function printRemoveFromTraktSuccessOutput(data: string) {
	var responseObject = JSON.parse(data);

	console.log("Success!");

	if (responseObject.deleted.movies == 1) {
		console.log("Deleted " + responseObject.deleted.movies + " movie.");
	} else {
		console.log("Deleted " + responseObject.deleted.movies + " movies.");
	}

	if (responseObject.not_found.movies > 0) {
		console.log("Failed to find these movies : " + responseObject.not_found.movies);
	}
}

// First get watchlist from imdb
console.log("Getting watchlist from imdb...");
getIMDBWatchlist(function (imdbMovies) {
	console.log("Got watchlist from imdb. " + imdbMovies.length + " movies found.");
	
	// Now get watchlist from trakt to compare
	console.log("Getting watchlist from trakt");
	getWatchlistFromTrakt(function (traktMovies) {
		console.log("Got watchlist from trakt. " + traktMovies.length + " movies found.");
		
		function addMoviesToTraktAndPrintResponse() {
			let moviesToAdd = findMoviesNotInFirst(traktMovies, imdbMovies);
			if (moviesToAdd.length > 0) {
				// Add movies to trakt
				console.log("Adding movies to trakt...");
				addMoviesToTrakt(imdbMovies, function(data) {
					printAddToTraktSuccessOutput(data);
				});
			} else {
				// If no movies to add we're already up to date
				console.log("No movies to add");
			}
		}
		
		
		// Find movies to delete
		let moviesToDelete = findMoviesNotInFirst(imdbMovies, traktMovies);
		if (moviesToDelete.length > 0) {
			// Delete movies that are removed from imdb
			console.log("Deleting " + moviesToDelete.length + " movies from trakt");
			deleteMoviesFromTraktWatchlist(moviesToDelete, function (response) {
				printRemoveFromTraktSuccessOutput(response);
				
				// Finally add new movies to trakt
				addMoviesToTraktAndPrintResponse();
			});
		} else {
			// If no movies to delete move on to adding new movies
			console.log("No movies to delete");
			addMoviesToTraktAndPrintResponse();
		}
		
	});
	

});