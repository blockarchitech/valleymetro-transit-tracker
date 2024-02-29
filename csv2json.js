// walmart csv to json converter

const fs = require('fs');

const csv_to_json = (csv_file) => {
  // get headers
  let headers = [];
  let data = [];
  let lines = csv_file.split('\n');
  headers = lines[0].split(',');
  for (let i = 0; i < headers.length; i++) {
    headers[i] = headers[i].replace(/\r/g, '');
  }
  for (let i = 1; i < lines.length; i++) {
    let obj = {};
    let currentline = lines[i].split(',');
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = currentline[j];
    }
    for (let key in obj) {
      if (obj[key]) {
        obj[key] = obj[key].replace(/\"/g, '');
        obj[key] = obj[key].replace(/\r/g, '');
      }
    }
    data.push(obj);
  }
  return data;
}

fs.readdir('./csv/', (err, files) => {
  if (err) {
    console.log(err);
  } else {
    files.forEach(file => {
      if (file.includes('.txt')) {
        fs.readFile(`./csv/${file}`, 'utf8', (err, data) => {
          if (err) {
            console.log(err);
          } else {
            let json = JSON.stringify(csv_to_json(data));
            fs.writeFile(`./json/${file.split('.')[0]}.json`, json, (err) => {
              if (err) {
                console.log(err);
              }
            });
          }
        });
      }
    }
    );
  }
});