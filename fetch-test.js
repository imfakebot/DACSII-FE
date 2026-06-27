fetch('http://localhost:4200/fields')
  .then(res => {
    console.log('Status:', res.status);
    return res.text();
  })
  .then(text => console.log('Body:', text.substring(0, 500)))
  .catch(err => console.error('Error:', err));
