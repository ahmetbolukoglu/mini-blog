import {
  createPost,
  updatePost,
  deletePost,
  togglePostStatus,
  filterPostsByTag,
  sortPosts,
  validatePost,
  formatDate,
  generateExportData,
  parseImportData
} from './logic.js';

const STORAGE_KEY = 'mini-blog:v1';
let posts = [];
let currentFilter = '';

// DOM Elements
const postsSection = document.getElementById('posts-section');
const postFormSection = document.getElementById('post-form-section');
const postsContainer = document.getElementById('posts-container');
const emptyState = document.getElementById('empty-state');
const tagFilter = document.getElementById('tag-filter');
const newPostBtn = document.getElementById('new-post-btn');
const createFirstPostBtn = document.getElementById('create-first-post');
const postForm = document.getElementById('post-form');
const postIdInput = document.getElementById('post-id');
const postTitleInput = document.getElementById('post-title');
const postContentInput = document.getElementById('post-content');
const postTagsInput = document.getElementById('post-tags');
const postPublishDateInput = document.getElementById('post-publish-date');
const cancelPostBtn = document.getElementById('cancel-post');
const savePostBtn = document.getElementById('save-post');
const formTitle = document.getElementById('form-title');

// Load data from localStorage
function loadState() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      posts = parsed.posts.map(post => ({
        ...post,
        createdAt: new Date(post.createdAt),
        publishDate: post.publishDate ? new Date(post.publishDate) : null
      }));
    }
    render();
  } catch (e) {
    console.error('Failed to load state:', e);
    posts = [];
    render();
  }
}

// Initialize design feedback
function initDesignFeedback() {
  const feedbackSection = document.getElementById('design-feedback-section');
  const feedbackForm = document.getElementById('design-feedback-form');
  
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(feedbackForm);
      const feedbackData = Object.fromEntries(formData);
      
      // Save feedback to localStorage
      try {
        const feedback = localStorage.getItem('design-feedback');
        const feedbackArray = feedback ? JSON.parse(feedback) : [];
        feedbackArray.push({
          ...feedbackData,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('design-feedback', JSON.stringify(feedbackArray));
        
        // Show confirmation
        const confirmation = document.getElementById('feedback-confirmation');
        if (confirmation) {
          confirmation.hidden = false;
          setTimeout(() => {
            confirmation.hidden = true;
            feedbackForm.reset();
          }, 3000);
        }
      } catch (error) {
        console.error('Failed to save feedback:', error);
      }
    });
  }
}

// Save data to localStorage
function saveState() {
  try {
    const data = {
      posts: posts.map(post => ({
        ...post,
        createdAt: post.createdAt.toISOString(),
        publishDate: post.publishDate ? post.publishDate.toISOString() : null
      }))
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

// Render posts list
function renderPosts() {
  if (posts.length === 0) {
    emptyState.hidden = false;
    postsContainer.innerHTML = '';
    return;
  }
  
  emptyState.hidden = true;
  const filteredPosts = currentFilter 
    ? filterPostsByTag(posts, currentFilter)
    : posts;
  
  const sortedPosts = sortPosts(filteredPosts, 'createdAt', 'desc');
  
  postsContainer.innerHTML = sortedPosts.map(post => `
    <article class="post-card" data-id="${post.id}">
      <header class="post-header">
        <h3 class="post-title">${post.title}</h3>
        <div class="post-meta">
          <span class="post-date">${formatDate(post.createdAt)}</span>
          <span class="post-status ${post.status}">${post.status === 'published' ? 'Yayınlandı' : 'Taslak'}</span>
        </div>
      </header>
      <div class="post-content">${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}</div>
      <footer class="post-footer">
        ${post.tags.length > 0 ? `<div class="post-tags">${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
        <div class="post-actions">
          <button class="btn btn-small btn-outline edit-btn" aria-label="Düzenle">Düzenle</button>
          <button class="btn btn-small btn-outline toggle-status-btn" aria-label="${post.status === 'published' ? 'Taslağa Dönüştür' : 'Yayınla'}">
            ${post.status === 'published' ? 'Taslağa Dönüştür' : 'Yayınla'}
          </button>
          <button class="btn btn-small btn-danger delete-btn" aria-label="Sil">Sil</button>
        </div>
      </footer>
    </article>
  `).join('');
}

// Render tag filter dropdown
function renderTagFilter() {
  const allTags = posts.flatMap(post => post.tags);
  const uniqueTags = [...new Set(allTags)];
  
  tagFilter.innerHTML = '<option value="">Tüm Etiketler</option>' +
    uniqueTags.map(tag => `<option value="${tag}">${tag}</option>`).join('');
}

// Render all UI
function render() {
  renderPosts();
  renderTagFilter();
}

// Show post form for creating new post
function showCreateForm() {
  postFormSection.hidden = false;
  formTitle.textContent = 'Yazı Oluştur';
  postForm.reset();
  postIdInput.value = '';
  postTitleInput.focus();
}

// Show post form for editing existing post
function showEditForm(post) {
  postFormSection.hidden = false;
  formTitle.textContent = 'Yazı Düzenle';
  postIdInput.value = post.id;
  postTitleInput.value = post.title;
  postContentInput.value = post.content;
  postTagsInput.value = post.tags.join(', ');
  if (post.publishDate) {
    postPublishDateInput.valueAsDate = post.publishDate;
  } else {
    postPublishDateInput.value = '';
  }
  postTitleInput.focus();
}

// Hide post form
function hideForm() {
  postFormSection.hidden = true;
}

// Validate and save post
function savePost(e) {
  e.preventDefault();
  
  const id = postIdInput.value;
  const title = postTitleInput.value.trim();
  const content = postContentInput.value.trim();
  const tags = postTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
  const publishDate = postPublishDateInput.value ? new Date(postPublishDateInput.value) : null;
  
  const { isValid, errors } = validatePost(title, content);
  
  if (!isValid) {
    alert(errors.join('\n'));
    return;
  }
  
  if (id) {
    // Update existing post
    posts = updatePost(posts, id, { title, content, tags, publishDate });
  } else {
    // Create new post
    posts = createPost(posts, title, content, tags, publishDate);
  }
  
  saveState();
  render();
  hideForm();
}

// Delete post with confirmation
function deletePostHandler(id) {
  if (confirm('Bu yazıyı silmek istediğinize emin misiniz?')) {
    posts = deletePost(posts, id);
    saveState();
    render();
  }
}

// Toggle post status
function togglePostStatusHandler(id) {
  posts = togglePostStatus(posts, id);
  saveState();
  render();
}

// Event Listeners
newPostBtn.addEventListener('click', showCreateForm);
createFirstPostBtn.addEventListener('click', showCreateForm);
cancelPostBtn.addEventListener('click', hideForm);
savePostBtn.addEventListener('click', savePost);
postForm.addEventListener('submit', savePost);

// Event delegation for posts container
postsContainer.addEventListener('click', (e) => {
  const postCard = e.target.closest('.post-card');
  if (!postCard) return;
  
  const id = postCard.dataset.id;
  
  if (e.target.classList.contains('edit-btn')) {
    const post = posts.find(p => p.id === id);
    showEditForm(post);
  } else if (e.target.classList.contains('delete-btn')) {
    deletePostHandler(id);
  } else if (e.target.classList.contains('toggle-status-btn')) {
    togglePostStatusHandler(id);
  }
});

// Tag filter change
tagFilter.addEventListener('change', (e) => {
  currentFilter = e.target.value;
  render();
});

// Initialize
loadState();
