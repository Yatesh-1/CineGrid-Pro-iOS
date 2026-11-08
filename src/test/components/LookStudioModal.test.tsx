import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LookStudioModal } from '../../components/look/LookStudioModal';
import { DEFAULT_LOOK_STATE } from '../../types/lut';

describe('LookStudioModal Component Tests', () => {
  it('renders modal when open and displays core tabs', () => {
    render(
      <LookStudioModal
        isOpen={true}
        onClose={vi.fn()}
        lookState={DEFAULT_LOOK_STATE}
        onChangeLookState={vi.fn()}
        onResetLook={vi.fn()}
      />
    );

    expect(screen.getByText('Look & Filter Studio')).toBeInTheDocument();
    expect(screen.getByText('3D LUTs')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Adjustments')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <LookStudioModal
        isOpen={false}
        onClose={vi.fn()}
        lookState={DEFAULT_LOOK_STATE}
        onChangeLookState={vi.fn()}
        onResetLook={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('switches between tabs when clicked', () => {
    render(
      <LookStudioModal
        isOpen={true}
        onClose={vi.fn()}
        lookState={DEFAULT_LOOK_STATE}
        onChangeLookState={vi.fn()}
        onResetLook={vi.fn()}
      />
    );

    // Initial tab is LUTs -> renders Import .CUBE
    expect(screen.getByText('Import LUT')).toBeInTheDocument();

    // Click Filters tab
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText('Clean Natural')).toBeInTheDocument();
    expect(screen.getByText('Cinematic Warm')).toBeInTheDocument();

    // Click Adjustments tab
    fireEvent.click(screen.getByText('Adjustments'));
    expect(screen.getByText('Precision Manual Controls')).toBeInTheDocument();
    expect(screen.getByText('Exposure')).toBeInTheDocument();
    expect(screen.getByText('Contrast')).toBeInTheDocument();
    expect(screen.getByText('Saturation')).toBeInTheDocument();
  });

  it('triggers onChangeLookState when selecting a filter preset', () => {
    const handleChange = vi.fn();
    render(
      <LookStudioModal
        isOpen={true}
        onClose={vi.fn()}
        lookState={DEFAULT_LOOK_STATE}
        onChangeLookState={handleChange}
        onResetLook={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Filters'));
    fireEvent.click(screen.getByText('Kodak-inspired Film'));

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        activeFilterId: 'flt_kodak_film',
      })
    );
  });

  it('never splits the live preview: Compare opens the last captured photo instead', () => {
    const handleChange = vi.fn();
    const handleCompare = vi.fn();
    render(
      <LookStudioModal
        isOpen={true}
        onClose={vi.fn()}
        lookState={DEFAULT_LOOK_STATE}
        onChangeLookState={handleChange}
        onResetLook={vi.fn()}
        hasCapturedPhoto={true}
        onCompareWithLastPhoto={handleCompare}
      />
    );

    fireEvent.click(screen.getByTitle('Compare the last photo before and after editing'));
    expect(handleCompare).toHaveBeenCalledTimes(1);
    expect(handleChange).not.toHaveBeenCalledWith(expect.objectContaining({ isCompareActive: expect.anything() }));
  });

  it('disables Compare until a photo has been captured', () => {
    const handleCompare = vi.fn();
    render(
      <LookStudioModal
        isOpen={true}
        onClose={vi.fn()}
        lookState={DEFAULT_LOOK_STATE}
        onChangeLookState={vi.fn()}
        onResetLook={vi.fn()}
        hasCapturedPhoto={false}
        onCompareWithLastPhoto={handleCompare}
      />
    );
    const btn = screen.getByTitle('Take a photo to compare before and after');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(handleCompare).not.toHaveBeenCalled();
  });
  it('calls onResetLook when clicking reset button in header', () => {
    const handleReset = vi.fn();
    render(
      <LookStudioModal
        isOpen={true}
        onClose={vi.fn()}
        lookState={DEFAULT_LOOK_STATE}
        onChangeLookState={vi.fn()}
        onResetLook={handleReset}
      />
    );

    const resetBtn = screen.getByTitle('Reset All Look Settings');
    fireEvent.click(resetBtn);

    expect(handleReset).toHaveBeenCalled();
  });
});
