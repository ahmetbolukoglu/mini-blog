const createPost = (posts, title, content, tags, publishDate) => {
  if (!Array.isArray(posts)) throw new Error('posts must be an array');
  if (!title || typeof title !== 'string') throw new Error('title must be a non-empty string');
  if (!content || typeof content !== 'string') throw new Error('content must be a non-empty string');
  if (!Array.isArray(tags)) throw new Error('tags must be an array');
  if (publishDate && !(publishDate instanceof Date)) throw new Error('publishDate must be a Date object or null');

  const newPost = {
    id: Date.now().toString(),
    title,
    content,
    status: 'draft',
    tags,
    publishDate: publishDate || null,
    createdAt: new Date()
  };

  return [...posts, newPost];
};

const updatePost = (posts, id, updates) => {
  if (!Array.isArray(posts)) throw new Error('posts must be an array');
  if (!id || typeof id !== 'string') throw new Error('id must be a non-empty string');
  if (!updates || typeof updates !== 'object') throw new Error('updates must be an object');

  return posts.map(post => 
    post.id === id ? { ...post, ...updates } : post
  );
};

const deletePost = (posts, id) => {
  if (!Array.isArray(posts)) throw new Error('posts must be an array');
  if (!id || typeof id !== 'string') throw new Error('id must be a non-empty string');

  return posts.filter(post => post.id !== id);
};

const togglePostStatus = (posts, id) => {
  if (!Array.isArray(posts)) throw new Error('posts must be an array');
  if (!id || typeof id !== 'string') throw new Error('id must be a non-empty string');

  return posts.map(post => 
    post.id === id 
      ? { ...post, status: post.status === 'draft' ? 'published' : 'draft' }
      : post
  );
};

const filterPostsByTag = (posts, tag) => {
  if (!Array.isArray(posts)) throw new Error('posts must be an array');
  if (!tag || typeof tag !== 'string') throw new Error('tag must be a non-empty string');

  return posts.filter(post => 
    post.tags && post.tags.includes(tag)
  );
};

const sortPosts = (posts, sortBy, order) => {
  if (!Array.isArray(posts)) throw new Error('posts must be an array');
  if (!['title', 'createdAt', 'publishDate'].includes(sortBy)) throw new Error('sortBy must be one of: title, createdAt, publishDate');
  if (!['asc', 'desc'].includes(order)) throw new Error('order must be one of: asc, desc');

  const sorted = [...posts];
  
  sorted.sort((a, b) => {
    let valueA = a[sortBy];
    let valueB = b[sortBy];
    
    if (sortBy === 'title') {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }
    
    if (valueA < valueB) return order === 'asc' ? -1 : 1;
    if (valueA > valueB) return order === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sorted;
};

const validatePost = (title, content) => {
  const errors = [];
  
  if (!title || typeof title !== 'string') {
    errors.push('Başlık boş olamaz');
  }
  
  if (!content || typeof content !== 'string') {
    errors.push('İçerik boş olamaz');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const formatDate = (date) => {
  if (!(date instanceof Date)) throw new Error('date must be a Date object');
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}.${month}.${year}`;
};

const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) throw new Error('amount must be a valid number');
  
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount);
};

const generateExportData = (posts) => {
  if (!Array.isArray(posts)) throw new Error('posts must be an array');
  
  return JSON.stringify(posts, null, 2);
};

const parseImportData = (data) => {
  if (!data || typeof data !== 'string') throw new Error('data must be a non-empty string');
  
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) throw new Error('parsed data must be an array');
    return parsed;
  } catch (e) {
    throw new Error('Invalid JSON data');
  }
};

export {
  createPost,
  updatePost,
  deletePost,
  togglePostStatus,
  filterPostsByTag,
  sortPosts,
  validatePost,
  formatDate,
  formatCurrency,
  generateExportData,
  parseImportData
};
