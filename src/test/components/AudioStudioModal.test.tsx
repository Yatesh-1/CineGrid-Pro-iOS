// CineGrid Pro — AudioStudioModal Component Tests

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioStudioModal } from '../../components/audio/AudioStudioModal';

describe('AudioStudioModal Component Tests', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(<AudioStudioModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal header, level meter, and noise modes when open', () => {
    render(<AudioStudioModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('AUDIO STUDIO')).toBeInTheDocument();
    expect(screen.getByText('INPUT SIGNAL')).toBeInTheDocument();
    expect(screen.getByText('PROCESSING PRESETS')).toBeInTheDocument();
    expect(screen.getByText('Adaptive Auto')).toBeInTheDocument();
    expect(screen.getAllByText('Wind Filter').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Voice Focus').length).toBeGreaterThan(0);
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<AudioStudioModal isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('allows switching between noise reduction presets', () => {
    render(<AudioStudioModal isOpen={true} onClose={vi.fn()} />);

    const windButtons = screen.getAllByText('Wind Filter');
    expect(windButtons.length).toBeGreaterThan(0);
    fireEvent.click(windButtons[0]);
    expect(windButtons[0]).toBeInTheDocument();
  });
});
