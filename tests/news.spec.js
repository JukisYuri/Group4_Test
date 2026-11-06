const { commonCases, registerSuite } = require('./nopcommerce-test-helpers');

const news = {
  route: '/Admin/NewsAdmin/NewsItems',
  pageReady: '#newsitem-grid_wrapper, #newsitem-grid',
  createPath: '/Admin/NewsAdmin/NewsItemCreate',
  searchButton: '#search-newsitem',
  deleteSelector: '#newsitem-delete',
  editSelector: 'a[href*="/NewsAdmin/NewsItemEdit/"]',
  search: { selectors: ['#SearchTitle', 'input[name="SearchTitle"]'] },
  title: { selectors: ['#Title', 'input[name="Title"]'] },
  body: { selectors: ['#Short', '#Full', 'textarea[name="Short"]'] },
  seoField: { selectors: ['#SeName'], visible: false },
  seed: 'News'
};

registerSuite('News', news, commonCases('NEWS'));
