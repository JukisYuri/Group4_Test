const { commonCases, registerSuite } = require('./nopcommerce-test-helpers');

const topics = {
  route: '/Admin/Topic/List',
  pageReady: '#topics-area',
  createPath: '/Admin/Topic/Create',
  searchButton: '#search-topics',
  deleteSelector: '#topic-delete',
  editSelector: 'a[href*="/Topic/Edit/"]',
  search: { selectors: ['#SearchKeywords', 'input[name="SearchKeywords"]'] },
  title: { selectors: ['#Title', 'input[name="Title"]'] },
  seoField: { selectors: ['#SeName'], visible: false },
  seed: 'ConditionsOfUse'
};

registerSuite('Topics', topics, commonCases('TOP'));
