const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
// Sequelize Requests, use SQL queries
const {
  promiseQuery,
  insertQuery,
  updateQuery,
  deleteQuery,
  validateQuery
} = require('../database/index');
// SQL queries
const {
  FETCH_BOOKS,
  ADD_BOOK,
  DELETE_BOOK,
  ADD_REC,
  UPDATE_RECOMMENDATION,
  ADD_REC_TO_EXISTING_BOOK
} = require('../database/queries');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(`${__dirname}/../client/dist`));

// GET BOOKS AND RECOMMENDATIONS FOR USER
app.get('/u/:userId/:category', (req, res) => {
  const { userId, category } = req.params;

  promiseQuery(FETCH_BOOKS(userId, category))
    .then(books => {
      const parsedBooks = books.reduce((bookItems, recommendation) => {
        const {
          rec_id,
          recommender_id,
          user_id,
          recommender_name,
          comment,
          item_id,
          date_added,
          title,
          thumbnail_url,
          description,
          url,
          status,
          user_rating
        } = recommendation;

        const recEntry = {
          recommender_id,
          recommender_name,
          comment,
          date_added
        };

        const book = {
          title,
          thumbnail_url,
          description,
          url,
          status,
          user_rating
        };

        if (item_id in bookItems) {
          bookItems[item_id].recommendations.push(recEntry);
        } else {
          bookItems[item_id] = {
            book,
            recommendations: [recEntry]
          };
        }

        return bookItems;
      }, {});

      res.json(parsedBooks);
      res.end();
    })
    .catch(err => res.end('404', err));
});

// ADD NEW RECOMMENDATION
app.post('/u/:userId/:category', (req, res) => {
  const { userId, category } = req.params;
  //check if the book already exists (user_id + book_id)

  validateQuery(
    `select exists(select 1 from recommendations r inner join books b on b.id = r.item_id where r.user_id=${
      req.body.userId
    } AND b.api_id=${req.body.apiId});`
  ).then(exist => {
    if (exist[0][0].exists) {
      res.json({ alreadyExist: true });
    } else {
      insertQuery(ADD_REC(req.body))
        .then(sqlResponse => res.json({ inserted: "success" }))
        .catch(err => console.log(err));
    }
  });
});

// ADD NEW RECOMMENDATION
app.post("/u/:userId/:category/:bookId", (req, res) => {
  const { userId, category, bookId } = req.params;
  const { id, firstName, lastName, comments } = req.body;
  const recInfo = {
    userId,
    category,
    id,
    firstName,
    lastName,
    comments
  };
  insertQuery(ADD_REC_TO_EXISTING_BOOK(recInfo))
    .then(sqlResponse => res.json({ inserted: "success" }))
    .catch(err => console.log(err));
});

// UPDATE STATUS & RATING FOR RECOMMENDATION
app.put('/u/:userId/:category/:itemId', (req, res) => {
  const { userId, category, itemId } = req.params;
  const { status, rating } = req.body;

  updateQuery(
    UPDATE_RECOMMENDATION({
      userId,
      category,
      itemId,
      status,
      rating
    })
  )
    .then(sqlRes => {
      console.log(sqlRes);
      res.send('success');
    })
    .catch(err => console.log('could not update'));
});

// DELETE RECOMMENDATIONS FOR A BOOK
app.delete('/u/:userId/:category/:itemId', (req, res) => {
  const { userId, category, itemId } = req.params;

  deleteQuery(DELETE_BOOK({ userId, category, itemId }))
    .then(sqlRes => res.json({ deleted: itemId }))
    .catch(err => console.log(err));
});

// SERVE REACT INDEX.HTML FOR ALL UNHANDLED REQUESTS
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log('listening on port 3000!');
});
