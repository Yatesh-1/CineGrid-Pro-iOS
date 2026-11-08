import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompositionPicker } from '../../components/CompositionPicker';
import { GeoGridInfoModal } from '../../components/grid-engine/GeoGridInfoModal';
import { GeoGridSvg } from '../../components/grid-engine/GeoGridOverlay';
import { COMPREHENSIVE_GRID_LIBRARY } from '../../data/gridLibrary';
import { getGeoGrid } from '../../data/geoGrids';
import { geoGridParamsService } from '../../services/geoGridParamsService';

// The picker renders ~200 grid previews; allow for a busy machine when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30000 });

const baseProps = () => ({
  grids: COMPREHENSIVE_GRID_LIBRARY,
  selectedGridId: 'rule_of_thirds' as const,
  onSelectGrid: vi.fn(),
  selectedCategory: 'all' as const,
  onSelectCategory: vi.fn(),
  onOpenExplainer: vi.fn(),
  onOpenCustomizer: vi.fn(),
  onToggleFavorite: vi.fn(),
  onOpenMasterPresets: vi.fn(),
  onOpenReferencePhotos: vi.fn(),
});

describe('CompositionPicker library', () => {
  beforeEach(() => localStorage.clear());

  it('search finds new grids by name', () => {
    render(<CompositionPicker {...baseProps()} />);
    fireEvent.change(screen.getByLabelText('Search grids'), { target: { value: 'dynamic symmetry root 3' } });
    expect(screen.getByText('Dynamic Symmetry Root 3')).toBeInTheDocument();
  });

  it('search finds an existing overlay by the name used in the brief', () => {
    render(<CompositionPicker {...baseProps()} />);
    fireEvent.change(screen.getByLabelText('Search grids'), { target: { value: 'sixteen section' } });
    const grid4x4 = COMPREHENSIVE_GRID_LIBRARY.find((g) => g.id === 'grid_4x4')!;
    expect(screen.getByTitle(grid4x4.name)).toBeInTheDocument();
    expect(screen.queryByTitle('Rule of Thirds (3×3)')).toBeNull();
  });

  it('shows an honest empty state when nothing matches', () => {
    render(<CompositionPicker {...baseProps()} />);
    fireEvent.change(screen.getByLabelText('Search grids'), { target: { value: 'zzzzzz' } });
    expect(screen.getByRole('status')).toHaveTextContent('No grids match');
  });

  it('records recently used grids and lists them in the Recent view', () => {
    const props = baseProps();
    render(<CompositionPicker {...props} />);
    fireEvent.change(screen.getByLabelText('Search grids'), { target: { value: 'Hexagonal' } });
    fireEvent.click(screen.getByText('Hexagonal Composition Grid'));
    expect(props.onSelectGrid).toHaveBeenCalledWith(expect.objectContaining({ id: 'geo_hexagonal_composition_grid' }));

    fireEvent.change(screen.getByLabelText('Search grids'), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Recent'));
    expect(screen.getByText('Hexagonal Composition Grid')).toBeInTheDocument();
  });

  it('Suggested view shows the recommended grids', () => {
    render(<CompositionPicker {...baseProps()} recommendedIds={['geo_cinema_safe_area']} />);
    fireEvent.click(screen.getByLabelText('Suggested'));
    expect(screen.getByText('Cinema Safe Area')).toBeInTheDocument();
  });
});

describe('GeoGridSvg', () => {
  it('draws every primitive kind and hides nodes when disabled', () => {
    const prims = getGeoGrid('geo_cinema_safe_area')!.build(1.5, {});
    const { container, rerender } = render(<GeoGridSvg prims={prims} width={300} height={200} style={{}} />);
    expect(container.querySelectorAll('rect').length).toBe(2);
    expect(container.querySelectorAll('ellipse').length).toBe(1);
    rerender(<GeoGridSvg prims={prims} width={300} height={200} style={{ showIntersectionNodes: false }} />);
    expect(container.querySelectorAll('ellipse').length).toBe(0);
  });

  it('applies line style, colour and thickness', () => {
    const prims = getGeoGrid('geo_four_quadrant_grid')!.build(1, {});
    const { container } = render(<GeoGridSvg prims={prims} width={100} height={100} style={{ color: '#ff0000', strokeWidth: 3, lineStyle: 'dashed' }} />);
    const line = container.querySelector('line')!;
    expect(line.getAttribute('stroke')).toBe('#ff0000');
    expect(line.getAttribute('stroke-width')).toBe('3');
    expect(line.getAttribute('stroke-dasharray')).toBe('6 4');
  });

  it('applies rotation, scale and offset as a transform', () => {
    const prims = getGeoGrid('geo_four_quadrant_grid')!.build(1, {});
    const { container } = render(<GeoGridSvg prims={prims} width={100} height={100} style={{ rotation: 30, scale: 1.5, offsetX: 10 }} />);
    const t = container.querySelector('g')!.getAttribute('transform')!;
    expect(t).toContain('rotate(30)');
    expect(t).toContain('scale(1.5)');
    expect(t).toContain('translate(10 0)');
  });
});

describe('GeoGridInfoModal', () => {
  const def = getGeoGrid('geo_custom_circle_guide')!;
  const grid = COMPREHENSIVE_GRID_LIBRARY.find((g) => g.id === def.id)!;

  beforeEach(() => {
    localStorage.clear();
    geoGridParamsService.reset(def);
  });

  it('shows purpose, subjects, steps, three examples and the actions', () => {
    render(<GeoGridInfoModal grid={grid} def={def} isOpen onClose={vi.fn()} onTryInCamera={vi.fn()} />);
    expect(screen.getByText(def.description)).toBeInTheDocument();
    expect(screen.getByText('How to use')).toBeInTheDocument();
    expect(screen.getAllByRole('img').length).toBe(3);
    expect(screen.getByRole('button', { name: /Activate grid/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Favorite/ })).toBeInTheDocument();
  });

  it('replaces the illustrations with 3 real photos, each credited with its author and licence', async () => {
    render(<GeoGridInfoModal grid={grid} def={def} isOpen onClose={vi.fn()} onTryInCamera={vi.fn()} />);
    const credits = await screen.findAllByRole('link', {}, { timeout: 3000 });
    expect(credits.length).toBe(3);
    for (const a of credits) {
      expect(a.getAttribute('href')).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      expect(a.getAttribute('rel')).toContain('noopener');
    }
    expect(screen.getByText(/Wikimedia Commons under free licences/)).toBeInTheDocument();
  });

  it('Activate selects the grid and closes; Favorite reports the id', () => {
    const onTry = vi.fn();
    const onClose = vi.fn();
    const onFav = vi.fn();
    render(<GeoGridInfoModal grid={grid} def={def} isOpen onClose={onClose} onTryInCamera={onTry} onToggleFavorite={onFav} />);
    fireEvent.click(screen.getByRole('button', { name: /Favorite/ }));
    expect(onFav).toHaveBeenCalledWith(def.id);
    fireEvent.click(screen.getByRole('button', { name: /Activate grid/ }));
    expect(onTry).toHaveBeenCalledWith(grid);
    expect(onClose).toHaveBeenCalled();
  });

  it('custom sliders change the saved parameters and Reset restores defaults', () => {
    render(<GeoGridInfoModal grid={grid} def={def} isOpen onClose={vi.fn()} onTryInCamera={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Size %'), { target: { value: '20' } });
    expect(geoGridParamsService.get(def).size).toBe(20);
    expect(JSON.parse(localStorage.getItem('cinegrid.geoGridParams')!)[def.id].size).toBe(20);
    fireEvent.click(screen.getByText('Reset to default'));
    expect(geoGridParamsService.get(def).size).toBe(35);
  });
});
