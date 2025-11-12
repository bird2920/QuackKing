import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import HomeScreen from '../src/screens/HomeScreen.jsx';

describe('HomeScreen', () => {
  it('renders title and buttons disabled appropriately', () => {
    const noop = () => {};
    render(<HomeScreen onJoin={noop} onCreate={noop} screenName="" setScreenName={noop} prefilledCode={null} />);
    expect(screen.getByText('Smartish')).toBeInTheDocument();
    const joinBtn = screen.getByText('Join');
    expect(joinBtn).toBeDisabled();
    const createBtn = screen.getByText('Create Game');
    expect(createBtn).toBeDisabled();
  });
});
