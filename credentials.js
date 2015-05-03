/**
 * Credentials
 */
var Credentials = (function () {
    function Credentials() {
    }
    ;
    return Credentials;
})();
var credentials = new Credentials();
credentials.authorId = '';
credentials.imdbCookie = '';
credentials.traktAccessToken = '';
credentials.traktAPIKey = '';
module.exports = credentials;
