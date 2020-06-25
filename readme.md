# Untitled EdgeDB GUI Client

A basic EdgeDB GUI Client for Windows (It should work on any platform supported by Electron, but currently it's only designed for Windows, so the UI will look a bit out of place on other OS's).

This project initally started as an experimental webapp for generating ER diagrams from EdgeDB schemas. However, I've since wrapped it up as an Electron app, and added a simple query repl and datatable view, so it should now be usable as a very basic EdgeDB client.

## Installation / Usage

``` sh
npm install

# Build edgedb-js submodule
cd src/edgedb
yarn install
yarn build
cd ../../

# Run app
npm start
```
