var Movie = (function () {
    function Movie(title, year, imdbId) {
        this.title = title;
        this.year = year;
        this.imdbId = imdbId;
    }
    Movie.prototype.isEqualToMovie = function (other) {
        return other.imdbId === this.imdbId;
    };
    return Movie;
})();
module.exports = Movie;
