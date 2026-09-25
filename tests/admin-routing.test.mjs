import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdminIndexRedirect, getLoginRedirect } from '../src/lib/adminRouting.ts';

test('admin index sends logged-out users to login', () => {
  assert.equal(getAdminIndexRedirect(false), '/admin/login');
});

test('admin index sends logged-in users to leads', () => {
  assert.equal(getAdminIndexRedirect(true), '/admin/leads');
});

test('login page leaves logged-out users on the form', () => {
  assert.equal(getLoginRedirect(false), null);
});

test('login page sends logged-in users to leads', () => {
  assert.equal(getLoginRedirect(true), '/admin/leads');
});
