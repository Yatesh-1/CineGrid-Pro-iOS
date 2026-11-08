import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MainNavigationBar } from '../../components/navigation/MainNavigationBar';

describe('MainNavigationBar Component Tests', () => {
  it('renders all core navigation tabs', () => {
    render(
      <MainNavigationBar
        activeTab="camera"
        onSelectTab={vi.fn()}
        activeSession={null}
        photoCount={5}
      />
    );

    expect(screen.getByText('Camera')).toBeInTheDocument();
    expect(screen.getByText('Grid')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Look')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('Gallery')).toBeInTheDocument();
  });

  it('displays active badges for photo count and active sessions', () => {
    const mockSession = {
      id: 'sess_1',
      name: 'Vogue Portrait',
      category: 'Portrait' as const,
      date: '2026-10-30',
      capturedPhotoIds: ['p1', 'p2'],
      isFavorite: false,
      status: 'in_progress' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    render(
      <MainNavigationBar
        activeTab="camera"
        onSelectTab={vi.fn()}
        activeSession={mockSession}
        photoCount={12}
      />
    );

    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('has no big filled pill: icon-only tabs, the selected one is just amber', () => {
    render(<MainNavigationBar activeTab="camera" onSelectTab={vi.fn()} />);
    const selected = screen.getByText('Camera').closest('button')!;
    const other = screen.getByText('Grid').closest('button')!;

    expect(selected.className).toContain('text-amber-400');
    expect(selected.className).not.toMatch(/\bbg-amber/);
    expect(selected.className).not.toMatch(/scale-/);
    expect(other.className).not.toContain('text-amber-400');
    expect(screen.getByText('Camera')).toHaveClass('sr-only');
    expect(selected).toHaveAttribute('aria-current', 'page');
  });

  it('fires onSelectTab callback on tab button click', () => {
    const onSelect = vi.fn();
    render(
      <MainNavigationBar
        activeTab="camera"
        onSelectTab={onSelect}
      />
    );

    fireEvent.click(screen.getByText('Sessions'));
    expect(onSelect).toHaveBeenCalledWith('sessions');

    fireEvent.click(screen.getByText('Look'));
    expect(onSelect).toHaveBeenCalledWith('look');

    fireEvent.click(screen.getByText('Pro'));
    expect(onSelect).toHaveBeenCalledWith('pro');
  });
});
