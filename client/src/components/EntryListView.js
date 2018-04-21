import React from 'react';
import { Search, Dropdown, Rating, Container } from 'semantic-ui-react';
import axios from 'axios';
import proxify from 'proxify-url';
import _ from 'lodash';

import './EntryListView.css';
import BookDetail from './Entry/BookDetail';
import EntryDetail from './Entry/EntryDetail';

class EntryListView extends React.Component {
  constructor() {
    super();
    this.state = {
      category: 'books',
      results: [],
      resultDetail: false
    };
    this.search = this.search.bind(this);
    this.handleResultSelect = this.handleResultSelect.bind(this);
    this.renderResult = this.renderResult.bind(this);
  }

  handleResultSelect(e, data) {
    const params = {
      id: data.result.apiId,
      key: 'KB2ywbcnLjNO8pokkBVgg'
    };
    const self = this;
    const url = proxify(
      `https://www.goodreads.com/book/show.xml?id=${params.id}&key=${
        params.key
      }`,
      { inputFormat: 'xml' }
    );

    axios
      .get(url)
      .then(res => {
        const book = res.data.query.results.GoodreadsResponse.book;
        console.log('!!!!!!!!!!!!!', book);
        let authors;
        if (Array.isArray(book.authors.author)) {
          authors = book.authors.author
            .map(author => {
              if (author.role) {
                return `${author.name} (${author.role})`;
              }
              return author.name;
            })
            .join(', ');
        } else {
          authors = book.authors.author.name;
        }
        self.setState({
          resultDetail: {
            title: book.title,
            rating: book.average_rating,
            apiId: book.id,
            authors,
            yearPublished: book.publication_year,
            description: book.description
              .split('<br /><br />')
              .map(paragraph => paragraph.replace(/<.*?>/gm, '')),
            imageUrl: book.image_url,
            link: book.link
          }
        });
      })
      .catch(err => {
        console.error(err);
      });
  }

  search(e, data) {
    e.preventDefault();
    this.setState({
      results: []
    });
    const params = {
      q: data.value.replace(/\s+/g, '-'),
      key: 'KB2ywbcnLjNO8pokkBVgg'
    };
    const self = this;
    const url = proxify(
      `https://www.goodreads.com/search/index.xml?q=${params.q}&key=${
        params.key
      }`,
      { inputFormat: 'xml' }
    );

    axios
      .get(url)
      .then(res => {
        const resultItems =
          res.data.query.results.GoodreadsResponse.search.results.work;
        const books = resultItems.map(book => {
          return {
            title: book.best_book.title,
            rating: Number(book.average_rating),
            apiId: Number(book.best_book.id.content),
            author: book.best_book.author.name,
            imageUrl: book.best_book.image_url
          };
        });
        self.setState({
          results: books
        });
      })
      .catch(err => {
        console.error(err);
      });
  }

  renderResult(result) {
    return (
      <div>
        <img className="book-image" src={result.imageUrl} />
        <h4>{result.title}</h4>
        <p>{result.author}</p>
        <Rating
          size="tiny"
          maxRating={5}
          defaultRating={result.rating}
          disabled
          icon="star"
        />
      </div>
    );
  }

  render() {
    const throttledSearch = _.debounce(this.search, 300);

    if (this.state.resultDetail) {
      return <EntryDetail result={this.state.resultDetail} />;
    }
    return (
      <Container>
        <div className="page-title">
          <h1>Add Recommendations</h1>
        </div>

        <Dropdown
          placeholder="Select Category"
          selection
          options={[{ text: 'books', value: 'books' }]}
        />
        <Search
          onSearchChange={throttledSearch}
          results={this.state.results}
          resultRenderer={this.renderResult}
          onResultSelect={this.handleResultSelect}
        />
      </Container>
    );
  }
}

export default EntryListView;
