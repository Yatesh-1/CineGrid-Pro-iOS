import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionsManagerModal } from '../../components/sessions/SessionsManagerModal';
import { sessionService } from '../../services/sessionService';

const props = () => ({
  isOpen: true,
  onClose: vi.fn(),
  onSelectSessionToShoot: vi.fn(),
  photos: [],
  onOpenPhotoEditor: vi.fn(),
});

describe('Sessions screen layout', () => {
  beforeEach(() => localStorage.clear());

  it('has one Back button in the header and no duplicate close button', () => {
    const p = props();
    render(<SessionsManagerModal {...p} />);
    fireEvent.click(screen.getByLabelText('Back to camera'));
    expect(p.onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps header actions at one height: Back, backup, New', () => {
    render(<SessionsManagerModal {...props()} />);
    for (const el of [screen.getByLabelText('Back to camera'), screen.getByLabelText('Backup sessions to JSON'), screen.getByText('New').closest('button')!]) {
      expect(el.className).toContain('h-9');
    }
  });

  it('lays tabs out as one sliding row of equal-height pills', () => {
    render(<SessionsManagerModal {...props()} />);
    const list = screen.getByRole('tablist');
    expect(list.className).toContain('overflow-x-auto');
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab.className).toContain('h-9');
      expect(tab.className).toContain('rounded-full');
    }
  });

  it('puts "Shoot this session" on its own full-width button when a session exists, and it starts the shoot', () => {
    const created = sessionService.createSession({
      name: 'Golden Hour',
      category: 'Portrait',
      date: '2026-10-31',
      preferredGridId: 'rule_of_thirds',
      preferredAspectRatio: '4:3',
    } as never);
    const p = props();
    render(<SessionsManagerModal {...p} />);
    const shoot = screen.getByText('Shoot this session').closest('button')!;
    expect(shoot.className).toContain('w-full');
    fireEvent.click(shoot);
    expect(p.onSelectSessionToShoot).toHaveBeenCalledWith(expect.objectContaining({ id: created.id }));
    expect(p.onClose).toHaveBeenCalled();
  });

  it('uses one font: no monospace text on the screen', () => {
    const { container } = render(<SessionsManagerModal {...props()} />);
    expect(container.innerHTML).not.toContain('font-mono');
  });
});
