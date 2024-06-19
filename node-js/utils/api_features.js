/**
 * APIFeatures class for filtering, sorting, limiting fields, and pagination.
 * @param {Object} query - The Mongoose query object.
 * @param {Object} queryString - The query string object.
 */
class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  /**
   * Filter the query based on the query string parameters.
   * @returns {APIFeatures} - The APIFeatures object.
   */
  filter() {
    // Basic filter
    const queryObj = { ...this.queryString };
    const expect = ["limit", "page", "fields", "sort"];
    expect.forEach((el) => delete queryObj[el]);

    // Advance filtering
    const query = JSON.stringify(this.queryString);
    const queryStr = query.replace(
      /\b(gte|gt|lte|lt|ne)\b/g,
      (match) => `$${match}`
    );

    // Execute the filtered query
    this.query.find(JSON.parse(queryStr));

    return this;
  }

  /**
   * Sort the query based on the sort parameter in the query string.
   * @returns {APIFeatures} - The APIFeatures object.
   */
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  /**
   * Limit the fields returned by the query based on the fields parameter in the query string.
   * @returns {APIFeatures} - The APIFeatures object.
   */
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }

    return this;
  }

  /**
   * Paginate the query based on the limit and page parameters in the query string.
   * @returns {APIFeatures} - The APIFeatures object.
   */
  pagination() {
    if (this.queryString.limit) {
      const page = this.queryString.page * 1 || 1;
      const limit = this.queryString.limit * 1;
      const skip = (page - 1) * limit;
      this.query = this.query.skip(skip).limit(limit);
    }
    return this;
  }
}

module.exports = APIFeatures;
