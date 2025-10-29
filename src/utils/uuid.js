const { v4: uuidv4 } = require('uuid');

// Generate unique ID for auctions, bids, etc.
const generateId = () => {
  return uuidv4();
};

// Generate short unique ID using nanoid (if needed)
const { nanoid } = require('nanoid');
const generateShortId = (size = 10) => {
  return nanoid(size);
};

module.exports = {
  generateId,
  generateShortId
};