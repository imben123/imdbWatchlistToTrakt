# imdbWatchlistToTrakt
A simple command line tool to push your imdb watchlist to trakt

##Prerequisites

1. An imdb account
2. A trakt.tv account
3. node and npm
4. TypeScript compiler

You also need to create a trakt.tv app to get an api key. Once you've created the app use the PIN authentication method to get an access token.

##To run this script

1. run 'npm install'
2. fill out the inputs at the top of index.ts
3. run 'tsc index.ts lib/movie.ts --module commonjs'
4. run 'node index.js'
