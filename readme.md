 ⚠ This project is now obsolete, and doesn't work with any post-beta version of EdgeDB. It's recommended to instead use the official EdgeDB UI.

# Untitled EdgeDB GUI Client

A basic EdgeDB GUI Client for Windows (It should work on any platform supported by Electron, but currently it's only designed for Windows, so the UI will look a bit out of place on other OS's).

This project initally started as an experimental webapp for generating ER diagrams from EdgeDB schemas. However, I've since wrapped it up as an Electron app, and added a simple query repl and datatable view, so it should now be usable as a very basic EdgeDB client.

## Installation / Usage

``` sh
git submodule update --init

npm install

# Build edgedb-js submodule
cd src/edgedb
yarn install
yarn build
cd ../../

# Run app
npm start
```

## Screenshots

![Query](screenshots/query.png)
![Schema ER Diagram](screenshots/schema.png)
![Datatable](screenshots/datatable.png)
![Settings](screenshots/settings.png)
