import type { PhotographySession, SessionCategory } from '../types/session';

const STORAGE_SESSIONS_KEY = 'cinegrid_photography_sessions';
const STORAGE_ACTIVE_SESSION_KEY = 'cinegrid_active_session_id';

class SessionService {
  private sessions: PhotographySession[] = [];
  private activeSessionId: string | null = null;

  constructor() {
    this.sessions = this.loadSessions();
    this.activeSessionId = localStorage.getItem(STORAGE_ACTIVE_SESSION_KEY);
  }

  private loadSessions(): PhotographySession[] {
    try {
      const raw = localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PhotographySession[];
        // Remove the old built-in demo sessions unless they were used (have photos)
        const DEMO_IDS = ['sess_vogue_fashion', 'sess_sunset_portrait', 'sess_modern_architecture'];
        return parsed.filter((s) => !(DEMO_IDS.includes(s.id) && (s.capturedPhotoIds?.length ?? 0) === 0));
      }
    } catch (err) {
      console.warn('Failed to parse stored sessions:', err);
    }

    // No demo content: a new install starts with no sessions (the app used to ship three made-up ones).
    return [];
  }

  private saveSessions(sessions: PhotographySession[]) {
    this.sessions = sessions;
    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (err) {
      console.warn('Failed to save sessions:', err);
    }
  }

  public getAllSessions(): PhotographySession[] {
    return this.sessions;
  }

  public getSessionById(id: string): PhotographySession | undefined {
    return this.sessions.find((s) => s.id === id);
  }

  public getActiveSession(): PhotographySession | null {
    if (!this.activeSessionId) return null;
    return this.getSessionById(this.activeSessionId) || null;
  }

  public setActiveSession(id: string | null) {
    this.activeSessionId = id;
    if (id) {
      localStorage.setItem(STORAGE_ACTIVE_SESSION_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_ACTIVE_SESSION_KEY);
    }
  }

  public createSession(data: {
    name: string;
    category: SessionCategory;
    date?: string;
    description?: string;
    notes?: string;
    selectedGridId?: string;
    preferredAspectRatio?: any;
    referencePhotos?: { id: string; url: string; title?: string }[];
  }): PhotographySession {
    const now = Date.now();
    const newSession: PhotographySession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim() || 'Untitled Session',
      category: data.category || 'Custom',
      date: data.date || new Date().toISOString().split('T')[0],
      description: data.description,
      notes: data.notes,
      referencePhotos: data.referencePhotos || [],
      selectedGridId: data.selectedGridId || 'rule_of_thirds',
      preferredAspectRatio: data.preferredAspectRatio || '4:3',
      capturedPhotoIds: [],
      isFavorite: false,
      status: 'planned',
      createdAt: now,
      updatedAt: now,
    };

    const updated = [newSession, ...this.sessions];
    this.saveSessions(updated);
    return newSession;
  }

  public updateSession(id: string, patch: Partial<PhotographySession>): PhotographySession | null {
    const session = this.getSessionById(id);
    if (!session) return null;

    Object.assign(session, patch, { updatedAt: Date.now() });
    this.saveSessions([...this.sessions]);
    return session;
  }

  public deleteSession(id: string): boolean {
    const idx = this.sessions.findIndex((s) => s.id === id);
    if (idx === -1) return false;

    this.sessions.splice(idx, 1);
    if (this.activeSessionId === id) {
      this.setActiveSession(null);
    }
    this.saveSessions([...this.sessions]);
    return true;
  }

  public duplicateSession(id: string): PhotographySession | null {
    const original = this.getSessionById(id);
    if (!original) return null;

    const duplicate: PhotographySession = {
      ...original,
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${original.name} (Copy)`,
      capturedPhotoIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [duplicate, ...this.sessions];
    this.saveSessions(updated);
    return duplicate;
  }

  public toggleFavorite(id: string): boolean {
    const session = this.getSessionById(id);
    if (!session) return false;

    session.isFavorite = !session.isFavorite;
    session.updatedAt = Date.now();
    this.saveSessions([...this.sessions]);
    return session.isFavorite;
  }

  public addPhotoToActiveSession(photoId: string): boolean {
    const active = this.getActiveSession();
    if (!active) return false;

    if (!active.capturedPhotoIds.includes(photoId)) {
      active.capturedPhotoIds.unshift(photoId);
      active.status = 'in_progress';
      active.updatedAt = Date.now();
      this.saveSessions([...this.sessions]);
      return true;
    }
    return false;
  }

  public exportBackupJson(): string {
    return JSON.stringify(this.sessions, null, 2);
  }

  public importBackupJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        this.saveSessions(parsed);
        return true;
      }
    } catch (err) {
      console.warn('Session import parse error:', err);
    }
    return false;
  }
}

export const sessionService = new SessionService();
