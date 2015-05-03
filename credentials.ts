/**
 * Credentials
 */

class Credentials {
	
	// This is your IMDB user id e.g. found in the url of your watchlist
	authorId: string;
	
	// This is a cookie that is saved by imdb when you sign in using the browser
	// it is stored under the url www.imdb.com and the key 'id'
	imdbCookie: string;

	 // This is an access token created to authorise your trakt app to access your trakt user from OAuth
	traktAccessToken: string;
	
	// This is the API key for your trakt app
	traktAPIKey: string;
	
	constructor() {};
}
 
var credentials: Credentials = new Credentials();
credentials.authorId = '';
credentials.imdbCookie = '';
credentials.traktAccessToken = '';
credentials.traktAPIKey = '';

export = credentials;