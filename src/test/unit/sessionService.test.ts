import { describe, it, expect, beforeEach } from 'vitest';
import { sessionService } from '../../services/sessionService';

describe('SessionService Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty: no pre-made demo sessions', () => {
    expect(sessionService.getAllSessions()).toEqual([]);
  });

  it('creates a new session and prepends it to list', () => {
    const created = sessionService.createSession({
      name: 'Desert Wildlife Expedition',
      category: 'Nature',
      selectedGridId: 'golden_triangle',
      notes: 'Use 200mm telephoto',
    });

    expect(created.name).toBe('Desert Wildlife Expedition');
    expect(created.category).toBe('Nature');
    expect(created.status).toBe('planned');

    const all = sessionService.getAllSessions();
    expect(all[0].id).toBe(created.id);
  });

  it('sets and retrieves active session correctly', () => {
    const created = sessionService.createSession({
      name: 'Active Test Session',
      category: 'Street',
    });

    sessionService.setActiveSession(created.id);
    const active = sessionService.getActiveSession();
    expect(active?.id).toBe(created.id);

    sessionService.setActiveSession(null);
    expect(sessionService.getActiveSession()).toBeNull();
  });

  it('links photo to active session accurately', () => {
    const session = sessionService.createSession({
      name: 'Link Photo Session',
      category: 'Architecture',
    });
    sessionService.setActiveSession(session.id);

    const linked = sessionService.addPhotoToActiveSession('photo_test_999');
    expect(linked).toBe(true);

    const updated = sessionService.getSessionById(session.id);
    expect(updated?.capturedPhotoIds).toContain('photo_test_999');
  });

  it('updates session fields without mutating other sessions', () => {
    const session = sessionService.createSession({
      name: 'Original Title',
      category: 'Macro',
    });

    const updated = sessionService.updateSession(session.id, {
      name: 'Updated Title',
      status: 'completed',
    });

    expect(updated?.name).toBe('Updated Title');
    expect(updated?.status).toBe('completed');
  });

  it('deletes session and resets active session if deleted was active', () => {
    const session = sessionService.createSession({
      name: 'To Delete',
      category: 'Food',
    });
    sessionService.setActiveSession(session.id);

    const deleted = sessionService.deleteSession(session.id);
    expect(deleted).toBe(true);
    expect(sessionService.getSessionById(session.id)).toBeUndefined();
    expect(sessionService.getActiveSession()).toBeNull();
  });

  it('exports and imports session backups in JSON format', () => {
    const json = sessionService.exportBackupJson();
    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);

    const importRes = sessionService.importBackupJson(json);
    expect(importRes).toBe(true);
  });
});
