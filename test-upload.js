const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

const form = new FormData();
form.append('cnicPhoto', fs.createReadStream('./test-cnic.jpg'));
form.append('licensePhoto', fs.createReadStream('./test-license.jpg'));

fetch('http://localhost:5000/api/users/upload-documents', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    ...form.getHeaders()
  },
  body: form
})
.then(r => r.json())
.then(console.log);