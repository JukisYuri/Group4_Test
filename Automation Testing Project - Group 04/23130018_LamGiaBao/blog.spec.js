const { commonCases, registerSuite } = require('./nopcommerce-test-helpers');

const blog = {
  route: '/Admin/Blog/BlogPosts',
  pageReady: '#blogpost-grid_wrapper, #blogpost-grid',
  createPath: '/Admin/Blog/BlogPostCreate',
  searchButton: '#search-blogpost',
  deleteSelector: '#blogpost-delete',
  editSelector: 'a[href*="/Blog/BlogPostEdit/"]',
  search: { selectors: ['#SearchTitle', 'input[name="SearchTitle"]'] },
  title: { selectors: ['#Title', 'input[name="Title"]'] },
  body: { selectors: ['#Body', 'textarea[name="Body"]'] },
  seoField: { selectors: ['#SeName'], visible: false },
  seed: 'Blog'
};

registerSuite('Blog', blog, commonCases('BLOG'));
