import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import * as logic from '../src/logic.js';

test('createPost creates a new post with correct structure', () => {
  const posts = [];
  const newPost = logic.createPost(posts, 'Test Title', 'Test Content', ['tag1'], new Date('2023-01-01'));
  assert.ok(newPost.length === 1);
  assert.ok(newPost[0].id);
  assert.strictEqual(newPost[0].title, 'Test Title');
  assert.strictEqual(newPost[0].content, 'Test Content');
  assert.strictEqual(newPost[0].status, 'draft');
  assert.deepStrictEqual(newPost[0].tags, ['tag1']);
  assert.ok(newPost[0].createdAt instanceof Date);
});

test('updatePost updates existing post', () => {
  const posts = [{ id: '1', title: 'Old Title', content: 'Old Content' }];
  const updated = logic.updatePost(posts, '1', { title: 'New Title' });
  assert.strictEqual(updated[0].title, 'New Title');
  assert.strictEqual(updated[0].content, 'Old Content');
});

test('deletePost removes post by id', () => {
  const posts = [{ id: '1', title: 'Post 1' }, { id: '2', title: 'Post 2' }];
  const result = logic.deletePost(posts, '1');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, '2');
});

test('togglePostStatus switches between draft and published', () => {
  const posts = [{ id: '1', status: 'draft' }];
  const toggled = logic.togglePostStatus(posts, '1');
  assert.strictEqual(toggled[0].status, 'published');
  
  const toggledAgain = logic.togglePostStatus(toggled, '1');
  assert.strictEqual(toggledAgain[0].status, 'draft');
});

test('filterPostsByTag filters posts by tag', () => {
  const posts = [
    { id: '1', tags: ['tag1', 'tag2'] },
    { id: '2', tags: ['tag2'] }
  ];
  const filtered = logic.filterPostsByTag(posts, 'tag1');
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, '1');
});

test('sortPosts sorts by title ascending', () => {
  const posts = [
    { title: 'Z Title', createdAt: new Date() },
    { title: 'A Title', createdAt: new Date() }
  ];
  const sorted = logic.sortPosts(posts, 'title', 'asc');
  assert.strictEqual(sorted[0].title, 'A Title');
});

test('validatePost returns errors for invalid data', () => {
  const result = logic.validatePost('', '');
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.errors.length, 2);
});

test('formatDate formats date correctly', () => {
  const date = new Date('2023-01-01');
  const formatted = logic.formatDate(date);
  assert.strictEqual(formatted, '01.01.2023');
});

test('generateExportData returns JSON string', () => {
  const posts = [{ id: '1', title: 'Test' }];
  const exported = logic.generateExportData(posts);
  assert.ok(exported.includes('"title": "Test"'));
});

test('parseImportData parses valid JSON', () => {
  const data = JSON.stringify([{ id: '1', title: 'Test' }]);
  const parsed = logic.parseImportData(data);
  assert.strictEqual(parsed[0].title, 'Test');
});

test('createPost throws error for invalid inputs', () => {
  assert.throws(() => logic.createPost('not array', 'title', 'content', [], null), 
    /posts must be an array/);
});

test('filterPostsByTag throws error for invalid tag', () => {
  assert.throws(() => logic.filterPostsByTag([], ''), /tag must be a non-empty string/);
});

test('sortPosts throws error for invalid sort parameters', () => {
  assert.throws(() => logic.sortPosts([], 'invalid', 'asc'), 
    /sortBy must be one of/);
});

test('formatDate throws error for invalid date', () => {
  assert.throws(() => logic.formatDate('not a date'), /date must be a Date object/);
});

test('parseImportData throws error for invalid JSON', () => {
  assert.throws(() => logic.parseImportData('invalid json'), /Invalid JSON data/);
});
