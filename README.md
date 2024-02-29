# Valley Metro Transit Tracker

Simple web app to track Valley Metro buses and light rail in real time using their GTFS static and GTFS realtime feeds.

![image](https://i.imgur.com/otCZ2zF.jpeg)

## Getting Started

By default, the GTFS static feeds are _not included_ in this repository. You will need to download them from the [City of Phoenix Open Data website](https://www.phoenixopendata.com/dataset/valley-metro-bus-schedule) and place the unzipped .txt files in the `csv` directory. Now ensure the `json` directory exists (and is empty) and run `node csv2json.js` to convert the .txt files to .json files the system can use.

After that, it's like any other Node.js app. `npm install` then `npm start`. Default port is 3000.
