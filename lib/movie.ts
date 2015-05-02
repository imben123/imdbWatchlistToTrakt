class Movie {
	
    title: string;
    year: number;
	imdbId: string;
	
    constructor(title: string, year: number, imdbId: string) {
        this.title = title;
        this.year = year;
        this.imdbId = imdbId;
    }
    
    isEqualToMovie(other: Movie): boolean {
        return other.imdbId === this.imdbId;
    }
	
}

export = Movie;