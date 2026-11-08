import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GridRenderer } from '../../components/grid-engine/GridRenderer';

describe('GridRenderer Component Tests', () => {
  it('renders SVG grid canvas when visible', () => {
    const { container } = render(
      <GridRenderer
        gridType="rule_of_thirds"
        styleOptions={{ isVisible: true, color: '#facc15' }}
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders nothing when styleOptions.isVisible is false', () => {
    const { container } = render(
      <GridRenderer
        gridType="rule_of_thirds"
        styleOptions={{ isVisible: false }}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders golden ratio lines with intersection power points', () => {
    const { container } = render(
      <GridRenderer
        gridType="golden_ratio"
        styleOptions={{ isVisible: true, showIntersectionNodes: true }}
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBeGreaterThan(0);
  });

  it('renders safe area guides when enabled', () => {
    const { container } = render(
      <GridRenderer
        gridType="rule_of_thirds"
        styleOptions={{ isVisible: true }}
        secondaryGuides={{ showSafeArea: true }}
      />
    );

    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThan(0);
  });
});
